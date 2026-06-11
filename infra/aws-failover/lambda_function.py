import json
import os
import ipaddress
import socket
import urllib.parse
import urllib.error
import urllib.request

import boto3


ec2 = boto3.client("ec2")


def env(name):
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Missing environment variable: {name}")
    return value


def is_healthy(url):
    request = urllib.request.Request(url, method="HEAD")
    try:
        with urllib.request.urlopen(request, timeout=int(os.environ.get("HEALTH_TIMEOUT_SECONDS", "5"))) as response:
            return 200 <= response.status < 400
    except urllib.error.HTTPError:
        return False
    except Exception:
        return False


def cf_request(method, path, payload=None):
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")

    request = urllib.request.Request(
        f"https://api.cloudflare.com/client/v4{path}",
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {env('CLOUDFLARE_API_TOKEN')}",
            "Content-Type": "application/json",
        },
    )

    with urllib.request.urlopen(request, timeout=10) as response:
        body = json.loads(response.read().decode("utf-8"))

    if not body.get("success"):
        raise RuntimeError(json.dumps(body.get("errors", body)))

    return body["result"]


def set_cname(host, target):
    zone_id = env("CLOUDFLARE_ZONE_ID")
    records = cf_request(
        "GET",
        f"/zones/{zone_id}/dns_records?type=CNAME&name={host}",
    )
    payload = {
        "type": "CNAME",
        "name": host,
        "content": target,
        "proxied": True,
        "ttl": 1,
    }

    if records:
        cf_request("PUT", f"/zones/{zone_id}/dns_records/{records[0]['id']}", payload)
    else:
        cf_request("POST", f"/zones/{zone_id}/dns_records", payload)


def set_a_record(host, ip_address):
    zone_id = env("CLOUDFLARE_ZONE_ID")
    encoded_host = urllib.parse.quote(host, safe="")
    records = cf_request("GET", f"/zones/{zone_id}/dns_records?name={encoded_host}")
    payload = {
        "type": "A",
        "name": host,
        "content": ip_address,
        "proxied": False,
        "ttl": 1,
    }

    if records:
        cf_request("PUT", f"/zones/{zone_id}/dns_records/{records[0]['id']}", payload)
    else:
        cf_request("POST", f"/zones/{zone_id}/dns_records", payload)


def get_pc_tunnel():
    return cf_request(
        "GET",
        f"/accounts/{env('CLOUDFLARE_ACCOUNT_ID')}/cfd_tunnel/{env('PC_TUNNEL_ID')}",
    )


def is_pc_tunnel_healthy(tunnel):
    return tunnel.get("status") == "healthy" and len(tunnel.get("connections", [])) > 0


def pc_tunnel_origin_ip(tunnel):
    for connection in tunnel.get("connections", []):
        origin_ip = connection.get("origin_ip")
        if not origin_ip:
            continue
        try:
            ipaddress.ip_address(origin_ip)
            return origin_ip
        except ValueError:
            continue
    return None


def pc_primary_state():
    try:
        tunnel = get_pc_tunnel()
        return is_pc_tunnel_healthy(tunnel), pc_tunnel_origin_ip(tunnel)
    except Exception:
        return is_healthy(env("PRIMARY_URL")), None


def is_tcp_open(host, port):
    try:
        with socket.create_connection((host, int(port)), timeout=5):
            return True
    except Exception:
        return False


def instance_state(instance_id):
    response = ec2.describe_instances(InstanceIds=[instance_id])
    return response["Reservations"][0]["Instances"][0]["State"]["Name"]


def handler(event, context):
    primary_ok, pc_origin_ip = pc_primary_state()
    backup_url = env("BACKUP_URL")
    instance_id = env("EC2_INSTANCE_ID")
    state = instance_state(instance_id)
    minecraft_target = None
    minecraft_port = env("MINECRAFT_PORT")
    pc_minecraft_ok = primary_ok and pc_origin_ip and is_tcp_open(pc_origin_ip, minecraft_port)

    if primary_ok:
        target = env("PC_TUNNEL_TARGET")
        action = "primary"
        if pc_minecraft_ok:
            minecraft_target = pc_origin_ip
            set_a_record(env("MINECRAFT_PUBLIC_HOST"), pc_origin_ip)
        else:
            minecraft_target = env("MINECRAFT_AWS_IP")
            set_a_record(env("MINECRAFT_PUBLIC_HOST"), minecraft_target)
        if pc_minecraft_ok and state in {"pending", "running"}:
            ec2.stop_instances(InstanceIds=[instance_id])
            action = "primary-stop-backup"
        elif not pc_minecraft_ok and state in {"stopped", "stopping"}:
            ec2.start_instances(InstanceIds=[instance_id])
            action = "primary-web-backup-minecraft-start"
    else:
        target = env("AWS_TUNNEL_TARGET")
        action = "backup"
        minecraft_target = env("MINECRAFT_AWS_IP")
        set_a_record(env("MINECRAFT_PUBLIC_HOST"), minecraft_target)
        if state in {"stopped", "stopping"}:
            ec2.start_instances(InstanceIds=[instance_id])
            action = "backup-start"

    set_cname(env("PUBLIC_HOST"), target)
    public_www_host = os.environ.get("PUBLIC_WWW_HOST")
    if public_www_host:
        set_cname(public_www_host, target)

    return {
        "statusCode": 200,
        "body": json.dumps(
            {
                "primaryHealthy": primary_ok,
                "instanceStateBeforeAction": state,
                "action": action,
                "target": target,
                "minecraftTarget": minecraft_target,
                "pcMinecraftHealthy": bool(pc_minecraft_ok),
                "backupUrl": backup_url,
            }
        ),
    }
