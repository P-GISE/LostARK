import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function readSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return readSourceFiles(fullPath);
    }

    if (!/\.(tsx?|css)$/.test(entry.name)) {
      return [];
    }

    return [fullPath];
  });
}

describe("typography", () => {
  it("uses a Korean-first sans font stack without external font loading", () => {
    const css = readFileSync(join(root, "src/app/globals.css"), "utf8");

    expect(css).toContain("--font-sans:");
    expect(css).toContain('"Pretendard Variable"');
    expect(css).toContain('"Noto Sans KR"');
    expect(css).toContain('"Malgun Gothic"');
    expect(css).not.toContain("@import url(");
  });

  it("keeps letter spacing at zero across the app", () => {
    const css = readFileSync(join(root, "src/app/globals.css"), "utf8");
    const sourceFiles = readSourceFiles(join(root, "src"));
    const sourceWithTracking = sourceFiles
      .map((file) => ({
        file,
        content: readFileSync(file, "utf8"),
      }))
      .filter(({ content }) => /tracking-|uppercase/.test(content));

    expect(css).toMatch(/\*\s*\{[^}]*letter-spacing:\s*0;/s);
    expect(sourceWithTracking).toEqual([]);
  });
});
