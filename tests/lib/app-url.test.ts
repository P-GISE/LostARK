import { describe, expect, it } from "vitest";
import { buildInviteUrl, getShareBaseUrl } from "@/lib/app-url";

describe("app URL helpers", () => {
  it("uses the configured public base URL for share links", () => {
    expect(
      getShareBaseUrl({
        configuredBaseUrl: "https://lostark-party.tail408126.ts.net/",
        requestHost: "localhost:3000",
        requestProto: "http",
      }),
    ).toBe("https://lostark-party.tail408126.ts.net");
  });

  it("uses the public request host when it is explicitly allowlisted", () => {
    expect(
      getShareBaseUrl({
        allowedRequestHosts: ["lostark-party.tail408126.ts.net"],
        configuredBaseUrl: "http://localhost:3000",
        requestHost: "lostark-party.tail408126.ts.net",
        requestProto: "https",
      }),
    ).toBe("https://lostark-party.tail408126.ts.net");
  });

  it("accepts URL-form allowlisted request hosts", () => {
    expect(
      getShareBaseUrl({
        allowedRequestHosts: ["https://lostark-party.tail408126.ts.net"],
        configuredBaseUrl: "http://localhost:3000",
        requestHost: "lostark-party.tail408126.ts.net",
        requestProto: "https",
      }),
    ).toBe("https://lostark-party.tail408126.ts.net");
  });

  it("ignores an unallowlisted public request host", () => {
    expect(
      getShareBaseUrl({
        allowedRequestHosts: ["lostark-party.tail408126.ts.net"],
        configuredBaseUrl: "http://localhost:3000",
        requestHost: "evil.example",
        requestProto: "https",
      }),
    ).toBe("http://localhost:3000");
  });

  it("builds encoded invite links from the share base URL", () => {
    expect(
      buildInviteUrl({
        baseUrl: "https://lostark-party.tail408126.ts.net/",
        inviteCode: "code/with space",
      }),
    ).toBe("https://lostark-party.tail408126.ts.net/invite/code%2Fwith%20space");
  });
});
