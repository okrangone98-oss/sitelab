/**
 * Inspect HTML that the user explicitly supplies. No network requests or scripts run.
 * DOMParser creates an inert document; only plain text findings are returned.
 */
export type HtmlFinding = {
  kind: "heading" | "button" | "form" | "input" | "link";
  label: string;
  source: "user-supplied-html";
};
const clean = (text: string | null | undefined) =>
  (text ?? "").replace(/\s+/g, " ").trim().slice(0, 140);

export function inspectHtml(html: string): HtmlFinding[] {
  if (html.length > 1_000_000) throw new Error("HTML 입력은 1MB 이하만 지원합니다.");
  if (!html.trim()) return [];
  if (typeof DOMParser === "undefined") throw new Error("브라우저에서만 HTML을 분석할 수 있습니다.");
  const doc = new DOMParser().parseFromString(html, "text/html");
  const result: HtmlFinding[] = [];
  const add = (kind: HtmlFinding["kind"], label: string) => {
    const normalized = clean(label);
    if (normalized && !result.some((item) => item.kind === kind && item.label === normalized)) {
      result.push({ kind, label: normalized, source: "user-supplied-html" });
    }
  };
  doc.querySelectorAll("h1,h2,h3").forEach(el => add("heading", el.textContent ?? ""));
  doc.querySelectorAll("button,[role=button],input[type=submit]").forEach(el =>
    add("button", el.getAttribute("aria-label") || el.getAttribute("value") || el.textContent || ""));
  doc.querySelectorAll("form").forEach(el => add("form", el.getAttribute("aria-label") || el.getAttribute("id") || "이름 없는 입력 양식"));
  doc.querySelectorAll("input,select,textarea").forEach(el => {
    const id = el.getAttribute("id");
    const label = id ? doc.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent : null;
    add("input", label || el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.getAttribute("name") || "");
  });
  doc.querySelectorAll("a[href]").forEach(el => add("link", el.textContent || el.getAttribute("aria-label") || ""));
  return result.slice(0, 100);
}
