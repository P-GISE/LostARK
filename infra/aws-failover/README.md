# AWS Failover Controller

This creates a scheduled Lambda that checks `https://pc.pigs0516.com/` every five minutes.

- If the PC tunnel is healthy, it points `lostark-party.pigs0516.com` and `pigs0516.com` to the PC tunnel and stops the EC2 backup.
- If the PC tunnel is unhealthy, it starts the EC2 instance and points the public hostnames to the AWS tunnel.

Deploy this in AWS region `ap-southeast-2`.

The Cloudflare token is passed as a CloudFormation `NoEcho` parameter. Do not commit it.
