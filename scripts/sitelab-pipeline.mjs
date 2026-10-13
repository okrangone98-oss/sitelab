#!/usr/bin/env node
/**
 * SiteLab local pipeline. No public API. Opt-in actions and explicit host allowlist.
 * Uses Playwright, REA's passive CDP tools, and Codex CLI installed on the operator host.
 */
import { spawnSync } from "node:child_process";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const argv = process.argv.slice(2);
const flag = name => { const i = argv.indexOf(name); return i < 0 ? null : argv[i + 1]; };
const has = name => argv.includes(name);
const command = argv[0];
const fail = message => { console.error(message); process.exitCode = 1; };
const output = flag("--out") || "sitelab-output";
const target = flag("--url");
const allowHost = flag("--allow-host");

function publicIp(ip) {
  const h = ip.toLowerCase();
  if (isIP(h) === 4) {
    const [a,b,c] = h.split(".").map(Number);
    return !(a===0 || a===10 || a===127 || a>=224 || a===169&&b===254 ||
      a===172&&b>=16&&b<=31 || a===192&&b===168 || a===100&&b>=64&&b<=127 ||
      a===192&&b===0&&(c===0||c===2) || a===198&&(b===18||b===19||b===51||b===19) ||
      a===203&&b===0&&c===113 || a===198&&b===51&&c===100);
  }
  if (isIP(h) !== 6) return false;
  return !(h==="::1" || h==="::" || h.startsWith("fc") || h.startsWith("fd") ||
    /^fe[89ab]/.test(h) || h.startsWith("ff") || h.startsWith("2001:db8") ||
    h.startsWith("::ffff:"));
}
async function vettedUrl(input, allowed) {
  let u;
  try { u = new URL(input); } catch { throw Error("Invalid URL"); }
  if (!["https:","http:"].includes(u.protocol) || u.username || u.password ||
    u.port || u.hostname.toLowerCase()!==allowed.toLowerCase()) throw Error("URL outside explicit allowed hostname or invalid scheme/port");
  if (isIP(u.hostname) || u.hostname==="localhost" || u.hostname.endsWith(".local")) throw Error("IP and internal hostnames are not accepted");
  const records = await lookup(u.hostname, { all: true, verbatim:true });
  if (!records.length || records.some(r => !publicIp(r.address))) throw Error("DNS resolves to unsafe or non-public IP");
  u.hash="";
  return u.href;
}
function run(cmd, args, opts={}) {
  return spawnSync(cmd,args,{encoding:"utf8",timeout:opts.timeout??30000,maxBuffer:2_000_000,
    cwd:opts.cwd,env:opts.env??process.env,shell:false});
}
function parseToolJson(raw) {
  try { return JSON.parse(raw); } catch { return { raw: String(raw||"").slice(0,3000) }; }
}
function clipped(x,n=140) { return String(x??"").replace(/\s+/g," ").trim().slice(0,n); }
function asMarkdown(report) {
  const lines = ["# SiteLab 실제 관찰 보고서","",`- URL: ${report.url}`,`- 시간: ${report.observedAt}`,
    "- 출처: 브라우저의 공개 화면에서 확인한 DOM (서버 내부 로직은 미확인)","","## 관찰 항목"];
  for(const x of report.findings) lines.push(`- [관찰됨] ${x.kind}: ${x.label} (${x.url})`);
  lines.push("","## 미확인","- 인증·개인정보·서버 API와 DB의 내부 로직","- 정원 초과, 결제, 동시접수 처리 등 서버 규칙");
  return lines.join("\n");
}
async function inspect() {
  if (!target || !allowHost) throw Error("Usage: inspect --url https://example.org --allow-host example.org [--out path] [--rea]");
  const safe = await vettedUrl(target,allowHost);
  const { chromium } = await import("playwright");
  await mkdir(output,{recursive:true});
  // CDP used only for explicit passive REA opt-in; no click/form submit.
  const browser = await chromium.launch({headless:true, args:has("--rea")?["--remote-debugging-port=9222"]:[]});
  const context = await browser.newContext({acceptDownloads:false, serviceWorkers:"block",ignoreHTTPSErrors:false});
  await context.route("**/*", async route => {
    try {
      const candidate = new URL(route.request().url());
      // Drop third-party requests and all non-HTTP resources. No cross-origin navigation.
      if(candidate.origin!==new URL(safe).origin || !["http:","https:"].includes(candidate.protocol))
        return await route.abort();
      await vettedUrl(candidate.href,allowHost);
      await route.continue();
    } catch { await route.abort().catch(()=>{}); }
  });
  const page = await context.newPage();
  let rea = { status:"not_requested", findings:[] };
  try {
    await page.goto(safe,{waitUntil:"domcontentloaded",timeout:15000});
    await page.waitForTimeout(700);
    // Text only; exclude form field values and scripts.
    const findings = await page.evaluate(() => {
      const clean = value => (value||"").replace(/\s+/g," ").trim().slice(0,140);
      const seen=new Set(), out=[];
      const collect=(selector,kind,fn)=>{
        for(const el of Array.from(document.querySelectorAll(selector)).slice(0,70)){
          const label=clean(fn(el));const key=kind+":"+label;
          if(label&&!seen.has(key)){seen.add(key);out.push({kind,label,url:location.origin+location.pathname});}
        }
      };
      collect("h1,h2,h3","heading",e=>e.textContent);
      collect("button,[role=button],input[type=submit]","button",e=>e.getAttribute("aria-label")||e.getAttribute("value")||e.textContent);
      collect("form","form",e=>e.getAttribute("aria-label")||e.id||"이름 없는 양식");
      collect("input,select,textarea","input",e=>e.getAttribute("aria-label")||e.getAttribute("placeholder")||e.getAttribute("name"));
      collect("a[href]","link",e=>e.textContent||e.getAttribute("aria-label"));
      return out.slice(0,100);
    });
    if(has("--rea")){
      const env={...process.env,REA_BROWSER_OBSERVE_ENABLED:"true",
        REA_BROWSER_CDP_ENDPOINTS_JSON:JSON.stringify(["http://127.0.0.1:9222"]),
        REA_BROWSER_ALLOWED_ORIGINS_JSON:JSON.stringify([new URL(safe).origin])};
      const list=run("rea",["list-browser-targets","http://127.0.0.1:9222","--approved","--json"],{env});
      if(list.error||list.status!==0){
        rea={status:"unavailable",message:clipped(list.stderr||list.error?.message,300),findings:[]};
      }else{
        const data=parseToolJson(list.stdout);
        const serialized=JSON.stringify(data);
        // Never guess target IDs from partial text, capture only explicit targetId/id.
        const entries=Array.isArray(data)?data:(data.targets||data.result?.targets||[]);
        const match=entries.find(x=>x.url?.startsWith(new URL(safe).origin));
        const id=match?.targetId||match?.id;
        if(id){
          const obs=run("rea",["inspect-web-page","http://127.0.0.1:9222",id,"--approved","--json"],{env});
          rea=obs.status===0?{status:"observed",evidence:parseToolJson(obs.stdout)}:{status:"unavailable",message:clipped(obs.stderr,300)};
        }else rea={status:"unavailable",message:"REA target ID unavailable; inspect with the configured REA MCP agent.",summary:serialized.slice(0,1200)};
      }
    }
    const report={schema:"sitelab-inspection-v1",url:safe,observedAt:new Date().toISOString(),
      source:"playwright",findings,rea,
      limitations:["Public visible DOM only","Internal server logic unknown","No clicks, sign-in or form submissions"]};
    await writeFile(resolve(output,"inspection.json"),JSON.stringify(report,null,2));
    await writeFile(resolve(output,"inspection.md"),asMarkdown(report));
    console.log(JSON.stringify({status:"complete",findings:findings.length,output:resolve(output),rea:rea.status}));
  }finally{await browser.close();}
}
async function codex() {
  const cwd=resolve(flag("--project")||"");
  const report=JSON.parse(await readFile(resolve(output,"inspection.json"),"utf8"));
  if(report.schema!=="sitelab-inspection-v1"||!Array.isArray(report.findings)) throw Error("Invalid inspection report");
  const prompt=`You are a senior software engineer. Inspect this target repository before any change. Implement a NEW feature inspired by these publicly observed UI elements. Do not copy third-party code, branding, content or private API. Preserve existing functionality. Add unit tests. No deployment or destructive operations. Work only in this repository. Observed elements (not server behavior):\n${report.findings.map(x=>"- "+x.kind+": "+x.label).join("\n")}\nUnverified backend behavior must be labeled unknown.\nUser requirement: ${flag("--feature")||"Provide a safe, user-configurable feature demonstration"}.\nWhen finished run tests and summarize changes.`;
  await writeFile(resolve(output,"codex-task.md"),prompt);
  if(!has("--execute")) {console.log("Codex task exported. Add --execute --project /path after reviewing to run.");return;}
  if(!has("--approve-write")) throw Error("--execute requires --approve-write to explicitly authorize code changes.");
  if(cwd==="/"||cwd===process.cwd()&&!flag("--project")) throw Error("Explicit --project path required");
  const probe=run("git",["status","--porcelain"],{cwd});
  if(probe.status!==0||probe.stdout.trim()) throw Error("Target repository must be a clean git worktree");
  const result=run("codex",["exec","--sandbox","workspace-write",prompt],{cwd,timeout:600000});
  await writeFile(resolve(output,"codex-result.json"),JSON.stringify({status:result.status,stdout:clipped(result.stdout,10000),stderr:clipped(result.stderr,2000)},null,2));
  if(result.error||result.status!==0) throw Error("Codex could not finish; inspect codex-result.json");
  console.log("Codex finished. Review git diff and tests before merge or deploy.");
}
try {
  if(command==="inspect") await inspect();
  else if(command==="codex") await codex();
  else fail("Commands: inspect --url URL --allow-host HOST [--rea] | codex --out DIR --project DIR --feature TEXT [--execute --approve-write]");
}catch(error){fail(error instanceof Error?error.message:String(error));}
