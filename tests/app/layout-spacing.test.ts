import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  contentShellClassName,
  narrowContentClassName,
  narrowPageShellClassName,
  pageShellClassName,
} from "@/components/ui";

const root = process.cwd();

function source(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("layout spacing", () => {
  it("defines one horizontal shell used by full and narrow pages", () => {
    expect(contentShellClassName).toBe("mx-auto w-full max-w-7xl px-4 sm:px-6");
    expect(pageShellClassName).toContain(contentShellClassName);
    expect(narrowPageShellClassName).toContain(contentShellClassName);
    expect(narrowContentClassName).toBe("mx-auto w-full max-w-md");
  });

  it("uses the same shell spacing in the header and narrow entry pages", () => {
    const files = [
      "src/components/app-shell.tsx",
      "src/app/page.tsx",
      "src/app/auth/login/page.tsx",
      "src/app/auth/signup/page.tsx",
      "src/app/groups/new/page.tsx",
      "src/app/invite/[inviteCode]/page.tsx",
    ];

    for (const file of files) {
      expect(source(file), file).not.toContain("justify-center px-6");
    }
    expect(source("src/components/app-shell.tsx")).toContain("contentShellClassName");
  });

  it("loads the Google AdSense script once from the root layout", () => {
    const layout = source("src/app/layout.tsx");

    expect(layout).toContain("next/script");
    expect(layout).toContain("pagead2.googlesyndication.com/pagead/js/adsbygoogle.js");
    expect(layout).toContain("ca-pub-5055865634735480");
    expect(layout).toContain('crossOrigin="anonymous"');
    expect(layout).toContain('strategy="beforeInteractive"');
    expect(layout).toContain('"google-adsense-account": ADSENSE_CLIENT_ID');
  });
});
