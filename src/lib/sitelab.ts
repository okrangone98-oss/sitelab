export type Evidence = "observed" | "inferred" | "unknown";
export type SpecItem = { id: string; text: string; evidence: Evidence };
export type FeatureId = "enroll" | "filter" | "calendar" | "signup" | "custom";
export type FeatureSpec = { feature: FeatureId; title: string; items: SpecItem[] };
export type InspectionReport = { schema: "sitelab-inspection-v1"; url: string; observedAt: string; source: "playwright"; findings: Array<{kind: string; label: string; url: string}>; rea?: {status:string} }; 
export type Project = {
  id: string;
  url: string;
  features: FeatureId[];
  customNote: string;
  specs: FeatureSpec[];
  createdAt: number;
  inspection?: InspectionReport | null;
};

export function validateUrl(input: string): { ok: true; url: string } | { ok: false; error: string } {
  const v = input.trim();
  if (!v) return { ok: false, error: "URL을 입력해 주세요." };
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    return { ok: false, error: "올바른 URL 형식이 아닙니다. 예: https://example.com" };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:")
    return { ok: false, error: "http:// 또는 https:// 로 시작하는 주소만 지원합니다." };
  if (!u.hostname.includes(".") && u.hostname !== "localhost")
    return { ok: false, error: "도메인이 올바르지 않습니다." };
  return { ok: true, url: u.toString() };
}

export const FEATURES: { id: FeatureId; title: string; desc: string; code: string }[] = [
  { id: "enroll", title: "강의 수강신청", desc: "강의 목록, 정원, 신청/취소 흐름", code: "F-01" },
  { id: "filter", title: "필터링 · 검색", desc: "카테고리, 정렬, 키워드 검색", code: "F-02" },
  { id: "calendar", title: "캘린더 예약", desc: "날짜·시간 슬롯 선택과 예약 확정", code: "F-03" },
  { id: "signup", title: "회원가입 · 로그인", desc: "이메일 가입, 검증, 세션", code: "F-04" },
  { id: "custom", title: "직접 정의", desc: "원하는 기능을 직접 설명", code: "F-XX" },
];

const uid = () => Math.random().toString(36).slice(2, 10);
const it = (text: string, evidence: Evidence): SpecItem => ({ id: uid(), text, evidence });

const DEMO: Record<FeatureId, [string, Evidence][]> = {
  enroll: [
    ["강의 카드 목록 페이지가 있을 것으로 추정 (제목·강사·가격)", "inferred"],
    ["정원 마감 시 '마감' 배지 표시 여부", "unknown"],
    ["신청 버튼 클릭 → 로그인 필요 시 로그인 화면으로 이동", "inferred"],
    ["결제 연동 방식 (PG사, 무료 강의 여부)", "unknown"],
  ],
  filter: [
    ["상단 카테고리 탭 또는 사이드바 필터", "inferred"],
    ["정렬 옵션: 최신순 / 인기순 / 가격순", "inferred"],
    ["필터 상태가 URL 쿼리에 반영되는지", "unknown"],
  ],
  calendar: [
    ["월간 달력에서 날짜 선택 후 시간 슬롯 표시", "inferred"],
    ["예약 불가 슬롯 비활성화", "inferred"],
    ["시간대(타임존) 처리 및 중복 예약 방지 규칙", "unknown"],
  ],
  signup: [
    ["이메일 + 비밀번호 가입 폼", "inferred"],
    ["소셜 로그인 제공 여부", "unknown"],
    ["비밀번호 규칙 및 이메일 인증 절차", "unknown"],
  ],
  custom: [["사용자가 설명한 기능 요구사항 (직접 작성)", "unknown"]],
};

export function demoSpecs(features: FeatureId[], customNote: string): FeatureSpec[] {
  return features.map((f) => ({
    feature: f,
    title: FEATURES.find((x) => x.id === f)!.title,
    items:
      f === "custom" && customNote.trim()
        ? [it(customNote.trim(), "unknown")]
        : DEMO[f].map(([t, e]) => it(t, e)),
  }));
}

export const newItem = () => it("", "unknown");

const EV_LABEL: Record<Evidence, string> = { observed: "관찰됨", inferred: "추정", unknown: "미확인" };
export const evidenceLabel = (e: Evidence) => EV_LABEL[e];

export function buildMarkdown(p: Project): string {
  const host = safeHost(p.url);
  const lines: string[] = [
    `# SiteLab 요구사항 명세 — ${host}`,
    "",
    p.inspection ? `> ⚠️ 요구사항은 데모 예시입니다. 별도 Playwright 작업으로 수집한 실제 화면 관찰만 아래에 별도 표시합니다. 서버 내부 기능은 확인되지 않았습니다.` : `> ⚠️ 이 문서는 **데모 명세**입니다. 브라우저 분석 엔진(Playwright/REA)이 아직 연결되지 않아 대상 사이트를 실제로 방문·분석하지 않았습니다. "관찰됨" 항목은 사용자가 직접 확인해 표시한 것입니다.`,
    "",
    `- 참고 URL: ${p.url}`,
    `- 생성일: ${new Date(p.createdAt).toLocaleString("ko-KR")}`,
    `- 대상 기능: ${p.specs.map((s) => s.title).join(", ")}`,
    "",
    "## 목표",
    `참고 사이트(${host})의 기능 흐름을 참고하여, **디자인·코드·콘텐츠를 복제하지 않고** 동일한 사용자 목적을 달성하는 기능을 새로 구현한다.`,
    "",
  ];
  p.specs.forEach((s, i) => {
    lines.push(`## ${i + 1}. ${s.title}`, "");
    for (const e of ["observed", "inferred", "unknown"] as Evidence[]) {
      const items = s.items.filter((x) => x.evidence === e && x.text.trim());
      if (!items.length) continue;
      lines.push(`### ${EV_LABEL[e]}`);
      items.forEach((x) => lines.push(`- [ ] ${x.text.trim()}`));
      lines.push("");
    }
    lines.push(
      "### 수용 기준",
      "- [ ] 핵심 흐름을 처음부터 끝까지 수행할 수 있다",
      "- [ ] 빈 상태 · 로딩 · 오류 상태가 화면에 표시된다",
      "- [ ] 키보드만으로 조작 가능하고 모바일에서 깨지지 않는다",
      "",
    );
  });
  const unknowns = p.specs.flatMap((s) => s.items.filter((x) => x.evidence === "unknown" && x.text.trim()).map((x) => `${s.title}: ${x.text.trim()}`));
  lines.push("## 구현 전 확인할 질문", ...(unknowns.length ? unknowns.map((u) => `- ${u}`) : ["- 없음"]), "");
  if (p.inspection) {
    lines.push("## 실제 공개 화면 관찰 (Playwright)",
      `- 관찰 시각: ${p.inspection.observedAt}`,
      `- 분석 출처: ${p.inspection.url}`, "");
    for (const finding of p.inspection.findings.slice(0,100)) {
      lines.push(`- [관찰됨] ${finding.kind}: ${finding.label}`);
    }
    lines.push("", "관찰 자료는 외부 사이트의 서버/DB 구현 근거가 아닙니다.", "");
  }
  lines.push("## 비범위", "- 참고 사이트의 로고·이미지·문구·소스코드 복사", "- 참고 사이트 서버에 대한 자동 수집(스크래핑)", "");
  return lines.join("\n");
}

export function buildCodexPrompt(p: Project): string {
  const host = safeHost(p.url);
  const body = p.specs
    .map((s) => {
      const items = s.items.filter((x) => x.text.trim()).map((x) => `  - (${EV_LABEL[x.evidence]}) ${x.text.trim()}`);
      return `- ${s.title}\n${items.join("\n")}`;
    })
    .join("\n");
  return `당신은 시니어 풀스택 엔지니어입니다. 아래 요구사항으로 기존 저장소에 기능을 구현하세요.

[맥락]
참고 사이트: ${p.url} (${host})
주의: 이 요구사항은 사용자가 편집한 데모 명세입니다. ${p.inspection ? "Playwright로 관찰된 공개 화면 증거는 아래에 있으며 서버 로직은 확인되지 않았습니다." : "사이트 실제 분석 결과가 아닙니다."} "추정"/"미확인" 항목은 가정으로 취급하고, 가정한 내용을 PR 설명에 명시하세요. 참고 사이트의 코드·디자인·문구를 복제하지 마세요.

[실제 관찰 근거]
${p.inspection ? p.inspection.findings.slice(0,100).map(x => `- ${x.kind}: ${x.label} (${x.url})`).join("\n") : "없음 - 데모 모드"}

[구현할 기능]
${body}

[작업 지침]
1. 먼저 저장소 구조와 기존 컨벤션(라우팅, 상태관리, 스타일)을 파악하고 그대로 따르세요.
2. 기능별로 작은 단위 커밋을 만드세요.
3. 데이터 모델과 API 경계를 먼저 정의한 뒤 UI를 구현하세요.
4. 빈 상태·로딩·오류 상태와 접근성(레이블, 키보드 포커스)을 처리하세요.
5. 핵심 규칙(정원, 중복 예약, 입력 검증 등)에 대한 단위 테스트를 추가하세요.
6. "미확인" 항목은 구현하지 말고 TODO와 질문 목록으로 남기세요.

[완료 조건]
- 테스트 통과, 타입 오류 없음
- 변경 요약, 가정 목록, 남은 질문을 포함한 PR 설명 작성`;
}

export function safeHost(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

const KEY = "sitelab.history.v1";
export function loadHistory(): Project[] {
  try {
    const raw = localStorage.getItem(KEY);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
export function saveToHistory(p: Project): Project[] {
  const next = [p, ...loadHistory().filter((x) => x.id !== p.id)].slice(0, 20);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
export function clearHistory() {
  localStorage.removeItem(KEY);
}
export const newId = uid;