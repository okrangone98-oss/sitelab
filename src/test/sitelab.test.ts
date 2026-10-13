import { describe, it, expect } from "vitest";
import { validateUrl, buildMarkdown, demoSpecs } from "@/lib/sitelab";

describe("validateUrl", () => {
  it("accepts https", () => expect(validateUrl("https://example.com").ok).toBe(true));
  it("accepts http", () => expect(validateUrl("http://example.com/a").ok).toBe(true));
  it("rejects ftp", () => expect(validateUrl("ftp://example.com").ok).toBe(false));
  it("rejects missing scheme", () => expect(validateUrl("example.com").ok).toBe(false));
});

describe("buildMarkdown", () => {
  it("marks output as demo and includes url", () => {
    const md = buildMarkdown({ id: "1", url: "https://ex.com/", features: ["signup"], customNote: "", specs: demoSpecs(["signup"], ""), createdAt: 0 });
    expect(md).toContain("데모 명세");
    expect(md).toContain("https://ex.com/");
  });
});