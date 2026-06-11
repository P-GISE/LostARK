import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("AWS failover deployment artifacts", () => {
  it("defines the Lambda controller inputs and EC2 actions", () => {
    const lambda = read("infra/aws-failover/lambda_function.py");

    expect(lambda).toContain("PRIMARY_URL");
    expect(lambda).toContain("BACKUP_URL");
    expect(lambda).toContain("CLOUDFLARE_ACCOUNT_ID");
    expect(lambda).toContain("PC_TUNNEL_ID");
    expect(lambda).toContain("PC_TUNNEL_TARGET");
    expect(lambda).toContain("AWS_TUNNEL_TARGET");
    expect(lambda).toContain('"healthy"');
    expect(lambda).toContain("200 <= response.status < 400");
    expect(lambda).toContain("start_instances");
    expect(lambda).toContain("stop_instances");
    expect(lambda).toContain("MINECRAFT_PUBLIC_HOST");
    expect(lambda).toContain("MINECRAFT_AWS_IP");
    expect(lambda).toContain("MINECRAFT_PORT");
    expect(lambda).toContain("origin_ip");
    expect(lambda).toContain("set_a_record");
    expect(lambda).toContain("is_tcp_open");
  });

  it("creates a scheduled Lambda with the minimum failover permissions", () => {
    const template = read("infra/aws-failover/template.yaml");

    expect(template).toContain("AWS::Lambda::Function");
    expect(template).toContain("Handler: index.handler");
    expect(template).toContain("200 <= r.status < 400");
    expect(template).toContain("AWS::Events::Rule");
    expect(template).toContain("rate(5 minutes)");
    expect(template).toContain("ec2:StartInstances");
    expect(template).toContain("ec2:StopInstances");
    expect(template).toContain("CLOUDFLARE_API_TOKEN");
    expect(template).toContain("CLOUDFLARE_ACCOUNT_ID");
    expect(template).toContain("PC_TUNNEL_ID");
    expect(template).toContain("Default: lostark-party.pigs0516.com");
    expect(template).toContain("Default: pigs0516.com");
    expect(template).toContain("MinecraftPublicHost");
    expect(template).toContain("Default: mc.pigs0516.com");
    expect(template).toContain("MinecraftAwsIp");
    expect(template).toContain("MinecraftPort");
  });

  it("does not commit live cloud or tunnel identifiers as template defaults", () => {
    const template = read("infra/aws-failover/template.yaml");

    expect(template).not.toMatch(/Default:\s+[0-9a-f]{32}/);
    expect(template).not.toMatch(/Default:\s+i-[0-9a-f]+/);
    expect(template).not.toMatch(/Default:\s+[0-9a-f-]{36}/);
    expect(template).not.toMatch(
      /Default:\s+[0-9a-f-]{36}\.cfargotunnel\.com/,
    );
  });
});
