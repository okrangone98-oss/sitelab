import { describe, it, expect } from "vitest";
import { validateUrl, buildMarkdown, demoSpecs } from "@/lib/sitelab";

describe("validateUrl", () => {
  it("accepts https", () => expect(validateUrl("https://example.com").ok).toBe(true));
  it("accepts http", () => expect(validateUrl("http://example.com/a").ok).toBe(true));
  it("rejects ftp", () => expect(validateUrl("ftp://example.com").ok).toBe(false));
  it("rejects missing scheme", () => expect(validateUrl("example.com").ok).toBe(false));
});

describe("inspection evidence", () => {
  it("keeps observed UI evidence separate from demo assumptions", () => {
    const base = { id: "demo", url: "https://example.org/", features: ["filter" as const], customNote: "", specs: demoSpecs(["filter"], ""), createdAt: 0 };
    const inspection = { schema: "sitelab-inspection-v1" as const, source: "playwright" as const,
      url: "https://example.org/", observedAt: "2026-10-14T00:00:00Z",
      findings: [{ kind: "button", label: "Search", url: "https://example.org/" }] };
    const document = buildMarkdown({ ...base, inspection });
    expect(document).toContain("실제 공개 화면 관찰");
    expect(document).toContain("button: Search");
    expect(document).toContain("서버 내부");
  });
});
describe("buildMarkdown", () => {
  it("marks output as demo and includes url", () => {
    const md = buildMarkdown({ id: "1", url: "https://ex.com/", features: ["signup"], customNote: "", specs: demoSpecs(["signup"], ""), createdAt: 0 });
    expect(md).toContain("데모 명세");
    expect(md).toContain("https://ex.com/");
  });
});