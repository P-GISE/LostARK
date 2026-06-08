import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("Cloudflare tunnel config examples", () => {
  it("routes every public hostname to the PC production port", () => {
    const config = read("infra/cloudflared/lostark-party-pc.example.yml");

    expect(config).toContain("hostname: lostark-party.pigs0516.com");
    expect(config).toContain("hostname: pigs0516.com");
    expect(config).toContain("hostname: www.pigs0516.com");
    expect(config).toContain("hostname: pc.pigs0516.com");
    expect(config.match(/service: http:\/\/127\.0\.0\.1:3001/g)).toHaveLength(
      4,
    );
  });

  it("routes every failover hostname to the server production port", () => {
    const config = read("infra/cloudflared/lostark-party-aws.example.yml");

    expect(config).toContain("hostname: lostark-party.pigs0516.com");
    expect(config).toContain("hostname: pigs0516.com");
    expect(config).toContain("hostname: www.pigs0516.com");
    expect(config).toContain("hostname: aws.pigs0516.com");
    expect(config.match(/service: http:\/\/127\.0\.0\.1:3000/g)).toHaveLength(
      4,
    );
  });
});
