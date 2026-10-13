import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  FEATURES, buildCodexPrompt, buildMarkdown, clearHistory, demoSpecs, evidenceLabel, loadHistory,
  newId, newItem, safeHost, saveToHistory, validateUrl,
  type Evidence, type FeatureId, type FeatureSpec, type Project,
} from "@/lib/sitelab";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SiteLab — AI 웹사이트 기능 리메이크 플래너" },
      { name: "description", content: "참고 사이트의 기능을 요구사항 명세와 Codex 작업 프롬프트로 바꿔주는 바이브 코더용 플래너." },
      { property: "og:title", content: "SiteLab — 기능 리메이크 플래너" },
      { property: "og:description", content: "URL과 기능을 고르면 마크다운 명세와 Codex 프롬프트를 생성합니다." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const STAGES = ["URL 입력", "기능 선택", "명세 편집", "내보내기"];
const EVS: Evidence[] = ["observed", "inferred", "unknown"];
const evDot: Record<Evidence, string> = { observed: "bg-ev-observed", inferred: "bg-ev-inferred", unknown: "bg-ev-unknown" };

function Index() {
  const [stage, setStage] = useState(0);
  const [urlInput, setUrlInput] = useState("");
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [features, setFeatures] = useState<FeatureId[]>([]);
  const [customNote, setCustomNote] = useState("");
  const [specs, setSpecs] = useState<FeatureSpec[]>([]);
  const [projectId, setProjectId] = useState(newId());
  const [createdAt, setCreatedAt] = useState(Date.now());
  const [history, setHistory] = useState<Project[]>([]);
  const [tab, setTab] = useState<"md" | "codex">("md");
  const [copied, setCopied] = useState("");

  useEffect(() => setHistory(loadHistory()), []);

  const project: Project = { id: projectId, url, features, customNote, specs, createdAt };
  const output = useMemo(() => (tab === "md" ? buildMarkdown(project) : buildCodexPrompt(project)), [tab, specs, url, createdAt]);

  const submitUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const r = validateUrl(urlInput);
    if (!r.ok) return setUrlError(r.error);
    setUrlError(""); setUrl(r.url); setStage(1);
  };
  const toggle = (id: FeatureId) => setFeatures((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  const toSpec = () => { setSpecs(demoSpecs(features, customNote)); setStage(2); };
  const updItem = (fi: number, ii: number, patch: Partial<{ text: string; evidence: Evidence }>) =>
    setSpecs((s) => s.map((sp, i) => (i !== fi ? sp : { ...sp, items: sp.items.map((it, j) => (j === ii ? { ...it, ...patch } : it)) })));
  const delItem = (fi: number, ii: number) => setSpecs((s) => s.map((sp, i) => (i !== fi ? sp : { ...sp, items: sp.items.filter((_, j) => j !== ii) })));
  const addItem = (fi: number) => setSpecs((s) => s.map((sp, i) => (i !== fi ? sp : { ...sp, items: [...sp.items, newItem()] })));
  const toExport = () => { const p = { ...project, createdAt: Date.now() }; setCreatedAt(p.createdAt); setHistory(saveToHistory(p)); setStage(3); };

  const copy = async () => {
    try { await navigator.clipboard.writeText(output); setCopied("복사 완료"); }
    catch { setCopied("복사 실패 — 직접 선택해 복사하세요"); }
    setTimeout(() => setCopied(""), 2000);
  };
  const download = () => {
    const blob = new Blob([output], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sitelab-${safeHost(url)}-${tab === "md" ? "requirements" : "codex-prompt"}.md`;
    a.click(); URL.revokeObjectURL(a.href);
  };
  const restore = (p: Project) => {
    setProjectId(p.id); setUrl(p.url); setUrlInput(p.url); setFeatures(p.features); setCustomNote(p.customNote);
    setSpecs(p.specs); setCreatedAt(p.createdAt); setStage(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const reset = () => { setProjectId(newId()); setStage(0); setUrl(""); setUrlInput(""); setFeatures([]); setCustomNote(""); setSpecs([]); };
  const canGo = (i: number) => i === 0 || (i === 1 && !!url) || (i === 2 && specs.length > 0) || (i === 3 && specs.length > 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <button onClick={reset} className="flex items-center gap-2 font-mono text-sm font-semibold tracking-tight">
            <span className="neon-tick inline-block h-3 w-3 bg-primary text-primary" aria-hidden /> SITELAB
          </button>
          <span className="rounded-sm border border-secondary px-2 py-1 font-mono text-[11px] text-secondary">DEMO · 분석 엔진 미연결</span>
        </div>
      </header>

      <main>
        <section className="grid-bg border-b border-border">
          <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
            <p className="font-mono text-xs text-muted-foreground">AI WEBSITE FEATURE REMAKE PLANNER</p>
            <h1 className="mt-4 max-w-4xl text-5xl font-black leading-[1.05] tracking-tight md:text-7xl">
              좋아 보이는 기능,<br />내 손으로 <span className="text-primary">다시 만들기</span><span className="text-tertiary">_</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">참고 사이트와 기능을 고르면, 바로 쓸 수 있는 요구사항 명세와 Codex 작업 프롬프트를 만들어 드립니다.</p>
          </div>
        </section>

        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[220px_1fr]">
          <nav aria-label="미션 진행 단계" className="lg:sticky lg:top-6 lg:self-start">
            <p className="mb-3 font-mono text-xs text-muted-foreground">MISSION {stage + 1}/4</p>
            <div className="mb-4 h-1 w-full bg-secondary"><div className="h-1 rounded-full bg-primary shadow-glow transition-all" style={{ width: `${((stage + 1) / 4) * 100}%` }} /></div>
            <ol className="flex gap-2 overflow-x-auto lg:flex-col">
              {STAGES.map((s, i) => (
                <li key={s}>
                  <button disabled={!canGo(i)} onClick={() => setStage(i)} aria-current={stage === i ? "step" : undefined}
                    className={`flex w-full items-center gap-3 whitespace-nowrap rounded-sm px-3 py-2 text-left text-sm transition-colors disabled:opacity-40 ${stage === i ? "bg-card text-foreground ring-1 ring-primary" : "hover:bg-muted"}`}>
                    <span className={`font-mono text-xs ${i < stage ? "text-primary" : ""}`}>{i < stage ? "✓" : `0${i + 1}`}</span>{s}
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <div key={stage} className="fade-up min-w-0">
            {stage === 0 && (
              <form onSubmit={submitUrl} noValidate>
                <StageTitle n="01" t="참고할 사이트 주소" d="기능을 참고하고 싶은 웹사이트의 URL을 입력하세요. 지금은 주소 형식만 확인하며 사이트에 접속하지 않습니다." />
                <label htmlFor="url" className="sr-only">웹사이트 URL</label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input id="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://example.com"
                    aria-invalid={!!urlError} aria-describedby="url-err"
                    className="h-14 flex-1 rounded-sm border border-input bg-card px-4 font-mono text-base outline-none focus:border-tertiary focus:ring-2 focus:ring-ring/30" />
                  <PrimaryBtn type="submit">다음 →</PrimaryBtn>
                </div>
                <p id="url-err" role="alert" className="mt-2 min-h-5 text-sm text-destructive">{urlError}</p>
              </form>
            )}

            {stage === 1 && (
              <div>
                <StageTitle n="02" t="리메이크할 기능 선택" d={`${safeHost(url)}에서 참고할 기능을 하나 이상 고르세요.`} />
                <div className="grid gap-px overflow-hidden rounded-sm border border-border bg-border sm:grid-cols-2">
                  {FEATURES.map((f) => {
                    const on = features.includes(f.id);
                    return (
                      <button key={f.id} onClick={() => toggle(f.id)} aria-pressed={on}
                        className={`p-6 text-left transition-colors ${on ? "bg-card text-foreground shadow-glow relative z-10" : "bg-background hover:bg-card active:scale-[0.99]"}`}>
                        <div className="flex items-center justify-between font-mono text-xs"><span className={on ? "text-primary" : "text-muted-foreground"}>{f.code}</span><span>{on ? "■ 선택됨" : "□"}</span></div>
                        <p className="mt-6 text-2xl font-bold">{f.title}</p>
                        <p className={`mt-1 text-sm ${on ? "text-bone-dim" : "text-muted-foreground"}`}>{f.desc}</p>
                      </button>
                    );
                  })}
                </div>
                {features.includes("custom") && (
                  <div className="mt-4">
                    <label htmlFor="custom" className="text-sm font-semibold">직접 정의할 기능 설명</label>
                    <textarea id="custom" rows={3} value={customNote} onChange={(e) => setCustomNote(e.target.value)} placeholder="예: 강의 후기 작성 및 별점 평균 표시"
                      className="mt-2 w-full rounded-sm border border-input bg-card p-3 outline-none focus:border-primary" />
                  </div>
                )}
                <div className="mt-6 flex justify-between"><GhostBtn onClick={() => setStage(0)}>← 이전</GhostBtn><PrimaryBtn disabled={!features.length} onClick={toSpec}>명세 만들기 →</PrimaryBtn></div>
              </div>
            )}

            {stage === 2 && (
              <div>
                <StageTitle n="03" t="분석 · 명세 카드 편집" d="아래 항목은 사이트를 분석한 결과가 아닌 일반적인 패턴의 예시입니다. 직접 사이트를 확인하고 근거 수준을 고쳐 주세요." />
                <div role="note" className="mb-6 rounded-sm border border-secondary bg-card p-4 text-sm text-bone">
                  <b className="text-secondary">데모 데이터</b> — 브라우저 분석 엔진이 연결되지 않아 {safeHost(url)}에 접속하지 않았습니다. 직접 확인한 항목만 “관찰됨”으로 바꾸세요.
                </div>
                <div className="mb-4 flex flex-wrap gap-4 text-xs">{EVS.map((e) => <span key={e} className="flex items-center gap-2"><i className={`h-2 w-2 rounded-full ${evDot[e]}`} />{evidenceLabel(e)}</span>)}</div>
                <div className="space-y-4">
                  {specs.map((sp, fi) => (
                    <article key={sp.feature} className="rounded-sm border border-border bg-ink p-5 text-bone">
                      <div className="mb-4 flex items-center justify-between"><h3 className="text-xl font-bold">{sp.title}</h3><span className="font-mono text-[11px] text-secondary">DEMO</span></div>
                      <ul className="space-y-2">
                        {sp.items.map((it, ii) => (
                          <li key={it.id} className="flex flex-col gap-2 border-t border-ink-line pt-2 sm:flex-row sm:items-center">
                            <i className={`hidden h-2 w-2 shrink-0 rounded-full sm:block ${evDot[it.evidence]}`} aria-hidden />
                            <input aria-label="요구사항 내용" value={it.text} onChange={(e) => updItem(fi, ii, { text: e.target.value })} placeholder="요구사항 입력"
                              className="min-w-0 flex-1 rounded-sm bg-ink-2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                            <div className="flex gap-2">
                              <select aria-label="근거 수준" value={it.evidence} onChange={(e) => updItem(fi, ii, { evidence: e.target.value as Evidence })}
                                className="rounded-sm bg-ink-2 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">
                                {EVS.map((e) => <option key={e} value={e}>{evidenceLabel(e)}</option>)}
                              </select>
                              <button onClick={() => delItem(fi, ii)} aria-label="항목 삭제" className="rounded-sm px-3 text-bone-dim hover:bg-ink-2 hover:text-primary">✕</button>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <button onClick={() => addItem(fi)} className="mt-3 font-mono text-xs text-primary hover:underline">+ 항목 추가</button>
                    </article>
                  ))}
                </div>
                <div className="mt-6 flex justify-between"><GhostBtn onClick={() => setStage(1)}>← 이전</GhostBtn><PrimaryBtn onClick={toExport}>문서 생성 →</PrimaryBtn></div>
              </div>
            )}

            {stage === 3 && (
              <div>
                <StageTitle n="04" t="명세 & Codex 프롬프트" d="복사하거나 .md 파일로 내려받아 Codex·Cursor 등에 붙여 넣으세요. 기록에 자동 저장되었습니다." />
                <div className="overflow-hidden rounded-sm border border-border bg-ink text-bone">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-line p-2">
                    <div role="tablist" className="flex">
                      {(["md", "codex"] as const).map((t) => (
                        <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                          className={`rounded-sm px-3 py-2 font-mono text-xs ${tab === t ? "bg-ink-2 text-primary" : "text-bone-dim hover:text-bone"}`}>
                          {t === "md" ? "requirements.md" : "codex-prompt.md"}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span aria-live="polite" className="font-mono text-xs text-primary">{copied}</span>
                      <button onClick={copy} className="rounded-sm border border-ink-line px-3 py-2 text-xs hover:border-primary">복사</button>
                      <button onClick={download} className="rounded-sm bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90">다운로드 .md</button>
                    </div>
                  </div>
                  <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap p-5 font-mono text-[13px] leading-relaxed">{output}</pre>
                </div>
                <div className="mt-6 flex justify-between"><GhostBtn onClick={() => setStage(2)}>← 명세 수정</GhostBtn><GhostBtn onClick={reset}>새 프로젝트</GhostBtn></div>
              </div>
            )}
          </div>
        </div>

        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-12">
            <div className="flex items-end justify-between"><h2 className="text-3xl font-black">기록</h2>
              {history.length > 0 && <button onClick={() => { clearHistory(); setHistory([]); }} className="text-sm text-muted-foreground hover:text-destructive">전체 삭제</button>}</div>
            {history.length === 0 ? <p className="mt-4 text-muted-foreground">아직 생성한 명세가 없습니다. 이 브라우저에만 저장됩니다.</p> : (
              <ul className="mt-6 divide-y divide-border border-y border-border">
                {history.map((h) => (
                  <li key={h.id}><button onClick={() => restore(h)} className="flex w-full flex-wrap items-center justify-between gap-2 py-4 text-left hover:text-primary">
                    <span className="font-mono text-sm">{safeHost(h.url)}</span>
                    <span className="text-sm text-muted-foreground">{h.specs.map((s) => s.title).join(" · ")} — {new Date(h.createdAt).toLocaleDateString("ko-KR")}</span>
                  </button></li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="border-t border-border bg-card text-bone">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <p className="font-mono text-xs text-tertiary">INTEGRATION ROADMAP</p>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">연결 로드맵</h2>
            <div className="mt-8 grid gap-px overflow-hidden rounded-sm bg-ink-line sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Playwright", "계획됨", "격리된 서버 워커에서 페이지 렌더링·상호작용 기록"],
                ["REA 엔진", "계획됨", "기존 오픈소스 리버스 엔지니어링 도구로 흐름·DOM 구조 추출"],
                ["Codex", "브리프 내보내기 가능", "작업 프롬프트 복사·다운로드 지원"],
                ["GitHub PR", "계획됨", "명세 기반 브랜치·PR 초안 생성"],
              ].map(([n, s, d]) => (
                <div key={n} className="bg-background p-6">
                  <p className={`font-mono text-[11px] ${s === "계획됨" ? "text-bone-dim" : "text-primary"}`}>● {s}</p>
                  <p className="mt-4 text-xl font-bold">{n}</p><p className="mt-1 text-sm text-bone-dim">{d}</p>
                </div>
              ))}
            </div>

            <h3 className="mt-14 font-mono text-xs text-tertiary">ADVANCED · 기술 설명</h3>
            <div className="mt-4 divide-y divide-ink-line border-y border-ink-line">
              {[
                ["왜 지금은 사이트에 접속하지 않나요?", "브라우저에서 임의 사이트를 가져오는 것은 CORS 제한, SSRF·악성 스크립트 위험, 이용약관 문제가 있습니다. 실제 분석은 네트워크가 격리되고 요청 제한이 걸린 서버 워커가 준비된 후에만 활성화됩니다."],
                ["관찰됨 / 추정 / 미확인의 차이", "관찰됨: 실제 화면·네트워크에서 확인된 사실. 추정: 일반적 패턴에서 유추한 가정. 미확인: 구현 전 반드시 답해야 할 질문. Codex 프롬프트는 미확인 항목을 구현하지 말고 TODO로 남기도록 지시합니다."],
                ["재사용 예정 오픈소스", "Playwright(브라우저 자동화·트레이스), HAR 기록 기반 네트워크 분석, axe-core(접근성), Readability·DOM 스냅샷 도구 등 검증된 도구를 조합하며, 리버스 엔지니어링 핵심을 새로 만들지 않습니다."],
                ["데이터는 어디에 저장되나요?", "모든 기록은 이 브라우저의 localStorage에만 저장되며 서버로 전송되지 않습니다. 유료 API를 사용하지 않습니다."],
              ].map(([q, a]) => (
                <details key={q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">{q}<span className="font-mono text-primary group-open:rotate-45 transition-transform">+</span></summary>
                  <p className="mt-3 max-w-3xl text-sm leading-relaxed text-bone-dim">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function StageTitle({ n, t, d }: { n: string; t: string; d: string }) {
  return (<div className="mb-8"><p className="font-mono text-xs text-tertiary">MISSION {n}</p><h2 className="mt-2 text-3xl font-black md:text-4xl">{t}</h2><p className="mt-2 max-w-2xl text-muted-foreground">{d}</p></div>);
}
function PrimaryBtn(p: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...p} className="h-14 rounded-sm bg-primary px-8 font-semibold text-primary-foreground transition-opacity hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-40" />;
}
function GhostBtn(p: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...p} className="h-12 rounded-sm px-4 text-sm font-semibold hover:bg-muted" />;
}