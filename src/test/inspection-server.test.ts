import { describe, expect, it } from "vitest";
import { extractPublicHtml } from "../lib/inspection-server";

describe("public HTML inspection", () => {
  it("extracts visible structural labels without submitting forms", () => {
    const html = '<h1>강좌 신청</h1><form><input placeholder="검색어"><button>검색</button></form><a href="/list">강좌 목록</a>';
    const values = extractPublicHtml(html, "https://example.org/");
    expect(values).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "heading", label: "강좌 신청" }),
      expect.objectContaining({ kind: "button", label: "검색" }),
      expect.objectContaining({ kind: "input", label: "검색어" }),
      expect.objectContaining({ kind: "link", label: "강좌 목록" }),
    ]));
  });
  it("limits output to 100 distinct items", () => {
    const html = Array.from({ length: 120 }, (_, i) => `<h2>Heading ${i}</h2>`).join("");
    expect(extractPublicHtml(html, "https://example.org/")).toHaveLength(100);
  });
});
