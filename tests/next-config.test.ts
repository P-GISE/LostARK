import { describe, expect, it } from "vitest";
import nextConfig from "@/../next.config";

describe("next config security headers", () => {
  it("sets baseline security headers for all routes", async () => {
    expect(typeof nextConfig.headers).toBe("function");

    const headers = await nextConfig.headers?.();
    const allRoutes = headers?.find((entry) => entry.source === "/:path*");
    const headerValues = Object.fromEntries(
      allRoutes?.headers.map((header) => [header.key, header.value]) ?? [],
    );

    expect(headerValues["Content-Security-Policy"]).toContain(
      "frame-ancestors 'none'",
    );
    expect(headerValues["X-Content-Type-Options"]).toBe("nosniff");
    expect(headerValues["X-Frame-Options"]).toBe("DENY");
    expect(headerValues["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
  });
});
