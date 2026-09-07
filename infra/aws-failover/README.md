# AWS Failover Controller

Lost Ark Party Planner를 PC primary 서버와 AWS EC2 backup 서버로 운영하기 위한 장애 전환 실험 구성입니다. EventBridge가 5분마다 Lambda를 실행하고, Lambda는 Cloudflare Tunnel 상태와 EC2 상태를 확인해 공개 도메인의 DNS 레코드를 바꿉니다.

## 소스 검토 기준

이 문서는 `template.yaml`과 `lambda_function.py`를 기준으로 작성했습니다. Cloudflare API token, EC2 instance id, tunnel id, 실제 IP 같은 운영 민감값은 CloudFormation 파라미터로만 다루며 저장소에 커밋하지 않습니다.

## 구성 요소

| 파일 | 역할 |
| --- | --- |
| `template.yaml` | Lambda, IAM Role, EventBridge schedule, 환경변수 파라미터를 정의하는 CloudFormation 템플릿 |
| `lambda_function.py` | Cloudflare 상태 확인, DNS 변경, EC2 start/stop을 수행하는 Lambda 코드 |

## 동작 흐름

1. Lambda가 `PRIMARY_URL` 또는 Cloudflare PC tunnel 상태를 확인합니다.
2. PC tunnel이 healthy이고 연결 정보가 있으면 `PUBLIC_HOST`와 `PUBLIC_WWW_HOST`를 `PC_TUNNEL_TARGET`으로 연결합니다.
3. PC primary가 정상이고 Minecraft TCP 포트도 열려 있으면 `MINECRAFT_PUBLIC_HOST`를 PC origin IP로 연결하고, backup EC2가 실행 중이면 중지합니다.
4. PC 웹은 정상인데 Minecraft 포트가 열려 있지 않으면 웹 도메인은 PC로 유지하고 Minecraft A 레코드는 AWS IP로 돌린 뒤 EC2를 시작합니다.
5. PC primary가 비정상이면 공개 웹 도메인을 `AWS_TUNNEL_TARGET`으로 연결하고, Minecraft 도메인은 `MINECRAFT_AWS_IP`로 연결하며 EC2 backup을 시작합니다.

## 주요 파라미터

| 이름 | 설명 |
| --- | --- |
| `CloudflareApiToken` | Cloudflare DNS/tunnel 조회에 사용할 API token. `NoEcho` 파라미터이며 커밋 금지 |
| `CloudflareZoneId` | DNS 레코드를 수정할 Cloudflare zone id |
| `CloudflareAccountId` | PC tunnel 상태 조회에 필요한 Cloudflare account id |
| `Ec2InstanceId` | backup으로 켜고 끌 EC2 instance id |
| `PcTunnelId` | primary PC의 Cloudflare tunnel id |
| `PcTunnelTarget` | PC tunnel CNAME target |
| `AwsTunnelTarget` | AWS backup tunnel CNAME target |
| `PrimaryUrl` | PC primary health check URL. 기본값은 `https://pc.pigs0516.com/` |
| `BackupUrl` | AWS backup health check URL |
| `PublicHost` | 서비스 공개 도메인. 기본값은 `lostark-party.pigs0516.com` |
| `PublicWwwHost` | 함께 전환할 보조 도메인. 기본값은 `pigs0516.com` |
| `MinecraftPublicHost` | Minecraft 접속용 공개 도메인 |
| `MinecraftAwsIp` | Minecraft backup용 AWS public IP |
| `MinecraftPort` | PC Minecraft TCP health check 포트. 기본값은 `25565` |
| `ScheduleExpression` | Lambda 실행 주기. 기본값은 `rate(5 minutes)` |

## 배포 메모

`template.yaml`은 현재 backup EC2가 있는 AWS region `ap-southeast-2` 기준으로 배포합니다.

```bash
aws cloudformation deploy \
  --template-file infra/aws-failover/template.yaml \
  --stack-name lostark-party-failover \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    CloudflareApiToken=... \
    CloudflareZoneId=... \
    CloudflareAccountId=... \
    Ec2InstanceId=... \
    PcTunnelId=... \
    PcTunnelTarget=... \
    AwsTunnelTarget=... \
    MinecraftAwsIp=...
```

## 운영 주의

- Cloudflare token은 반드시 제한된 권한으로 발급하고 저장소에 커밋하지 않습니다.
- Lambda는 EC2 start/stop 권한을 가지므로 대상 instance id를 잘못 넣지 않도록 확인해야 합니다.
- DNS TTL은 Cloudflare proxied CNAME 기준으로 자동 처리되지만, 장애 전환 직후에는 캐시 때문에 접속 경로가 바로 바뀌지 않을 수 있습니다.
- 실제 장애 전환 전에 PC tunnel, AWS tunnel, Minecraft TCP 포트, EC2 start/stop 권한을 각각 따로 검증해야 합니다.
