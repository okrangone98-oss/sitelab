import { createServerFn } from "@tanstack/react-start";

export type LiveFinding = { kind: "heading" | "button" | "link" | "form" | "input"; label: string; url: string };
export type LiveResult = {
  schema: "sitelab-inspection-v1";
  url: string;
  observedAt: string;
  source: "public-html";
  findings: LiveFinding[];
  rea: { status: "not_requested" };
  method: "public-html";
};

const decode = (value: string) => value.replace(/&(?:amp|quot|lt|gt|nbsp|#39);/g, x =>
  ({ "&amp;": "&", "&quot;": '"', "&lt;": "<", "&gt;": ">", "&nbsp;": " ", "&#39;": "'" })[x] || x);
const plain = (value: string) => decode(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()).slice(0, 140);
const attr = (tag: string, key: string) => {
  const match = tag.match(new RegExp(`\\b${key}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? "";
};
/** This is a static HTML baseline, NOT Playwright or a claim about dynamic interactions. */
export function extractPublicHtml(html: string, pageUrl: string): LiveFinding[] {
  const found: LiveFinding[] = [];
  const seen = new Set<string>();
  const add = (kind: LiveFinding["kind"], label: string) => {
    label = plain(label);
    const key = kind + ":" + label;
    if (label && !seen.has(key) && found.length < 100) {
      seen.add(key);
      found.push({ kind, label, url: pageUrl });
    }
  };
  for (const m of html.matchAll(/<(h[1-3]|button|a)\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi)) {
    const tag = m[1].toLowerCase();
    add(tag.startsWith("h") ? "heading" : tag === "a" ? "link" : "button", attr(m[2], "aria-label") || m[3]);
  }
  for (const m of html.matchAll(/<(input|select|textarea|form)\b([^>]*)>/gi)) {
    const kind = m[1].toLowerCase() === "form" ? "form" : "input";
    add(kind, attr(m[2], "aria-label") || attr(m[2], "placeholder") || attr(m[2], "name") || attr(m[2], "id"));
  }
  return found;
}

export const inspectPublicPage = createServerFn({ method: "POST" })
  .inputValidator((value: { url: string }) => value)
  .handler(async ({ data }) => {
    // Deployment is disabled by default. The operator chooses a very narrow host allowlist.
    const allow = (process.env.SITELAB_ALLOWED_HOSTS || "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
    if (process.env.SITELAB_INSPECTION_ENABLED !== "true" || !allow.length)
      throw new Error("온라인 분석 서버가 비활성화되어 있습니다. 관리자가 허용 도메인을 설정해야 합니다.");
    let url: URL;
    try { url = new URL(data.url); } catch { throw new Error("올바른 URL이 아닙니다."); }
    if (url.protocol !== "https:" || url.port || url.username || url.password ||
      !allow.includes(url.hostname.toLowerCase()))
      throw new Error("현재 베타에서는 관리자가 허용한 HTTPS 사이트만 분석할 수 있습니다.");
    url.hash = "";
    const signal = AbortSignal.timeout(8500);
    const response = await fetch(url, { redirect: "manual", signal, headers: { Accept: "text/html" } });
    if (!response.ok || (response.status >= 300 && response.status < 400))
      throw new Error("사이트 응답을 분석할 수 없습니다. 리디렉션 또는 접근 제한이 있습니다.");
    const type = response.headers.get("content-type") || "";
    if (!type.toLowerCase().includes("text/html")) throw new Error("HTML 페이지가 아닙니다.");
    if (Number(response.headers.get("content-length") || "0") > 750_000)
      throw new Error("분석 가능한 페이지 크기를 초과했습니다.");
    const reader = response.body?.getReader();
    if (!reader) throw new Error("HTML 내용을 가져오지 못했습니다.");
    const chunks: Uint8Array[] = []; let length = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > 750_000) throw new Error("분석 가능한 페이지 크기를 초과했습니다.");
        chunks.push(value);
      }
    } finally { await reader.cancel().catch(() => {}); }
    const buffer = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length; }
    const html = new TextDecoder("utf-8").decode(buffer);
    return { schema: "sitelab-inspection-v1" as const, source: "public-html" as const,
      method: "public-html" as const, url: url.href, observedAt: new Date().toISOString(),
      findings: extractPublicHtml(html, url.href), rea: { status: "not_requested" as const } };
  });
