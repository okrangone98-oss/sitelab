# SiteLab 개발·실행 안내

현재 목표: 공개 사이트의 **관찰 가능한 UI**를 Playwright로 확인하고, 필요하면 REA의 승인된 수동 관찰을 병행하여 Codex 개발 지시서를 생성합니다.

## 사전 요구사항
- Node.js 22.19 이상, Git, Chromium을 실행할 수 있는 로컬 개발환경
- `npm install` (또는 `bun install`) 후 `npx playwright install chromium`
- REA 사용 시 공식 문서에 따라 `npx rea-agents setup` 검토·승인 후 `rea doctor --json` 확인
- Codex 자동 코드 생성 시 `codex` CLI 설치 및 별도 로그인/설정

## 1. 로컬 UI
```bash
npm install
npm run dev
```

## 2. 공개 사이트 관찰
대상 호스트를 명시적으로 허용해야 합니다. 외부 서비스를 과도하게 탐색하거나 인증 우회하지 않습니다.

```bash
npm run inspect -- --url https://example.org --allow-host example.org --out ./sitelab-output
```

만들어지는 자료:
- `sitelab-output/inspection.json` — 관찰된 제목·버튼·입력 요소·링크
- `sitelab-output/inspection.md` — 사람이 읽을 수 있는 분석 보고서

**SiteLab 첫 번째 미션의 '실제 분석 결과 불러오기'**에서 inspection.json을 선택하십시오. 수집한 관찰과 가상 기능 명세는 구분되어 출력됩니다.

REA까지 시도하려면 `--rea`를 추가합니다. 현재 REA의 브라우저 관찰은 **CDP에 연결한 뒤 승인된 origin에 한해 수동으로 관찰**합니다. 준비되지 않았으면 결과에 unavailable을 남깁니다. REA는 서버나 내부 DB 코드를 복원하지 않습니다.

## 3. Codex 코드 생성
```bash
npm run codex:prepare -- --out ./sitelab-output --feature "검색 및 필터 화면"
```
위 명령은 작업 지시서(`codex-task.md`)만 생성합니다.

아래 명령은 **지정된 Git 작업 폴더의 파일을 수정할 수 있습니다.** 먼저 지시서를 검토하고 깨끗한 작업 트리인지 확인하십시오. 비용 및 안전성에 유의하십시오.

```bash
npm run codex:prepare -- --out ./sitelab-output --feature "검색 및 필터 화면" --project /absolute/path/to/target --execute --approve-write
```

Codex는 `workspace-write` 샌드박스에서 실행하며, 직접 배포하지 않습니다. 변경 diff·테스트를 반드시 검토한 뒤 반영하세요.

## 제한과 보안
- 이 명령은 **로컬 신뢰 환경 전용**입니다. 공개 API 또는 공개 서버에 연결해서는 안 됩니다.
- 사용자가 지정한 공개 도메인만 방문하도록 제한합니다. 로그인, 결제, 신청 제출 등은 자동화하지 않습니다.
- DNS·리다이렉트에 대한 기본 방어를 포함하지만, 이것만으로 악성 사이트에 대한 완벽한 네트워크 격리가 보장되지는 않습니다. 별도의 egress 방화벽·컨테이너 격리가 필수입니다.
- 사이트 이용약관·robots 정책·저작권을 존중합니다.
- 사이트의 소스/디자인/브랜드를 무단 복제하지 않고 기능 패턴을 참고하여 독립 구현합니다.
- Vercel에서는 이 로컬 Playwright/REA/Codex 프로세스를 직접 실행하지 않습니다. 웹 프런트엔드와 별도의 분석 워커로 분리해야 합니다.

## 현재 통합 범위
| 항목 | 상태 |
|--|--|
| React 화면 및 기능 명세 생성 | 구현 |
| 분석 JSON 불러오기 | 구현 |
| Playwright 로컬 분석 | 코드 구현 (실제 대상 현장 검증 필요) |
| REA CDP 관찰 시도 | 조건부 어댑터 구현 (REA 설치/환경 필요) |
| Codex CLI 작업 생성 및 선택적 실행 | 구현 (CLI 설치/환경 필요) |
| GitHub 자동 PR, 운영 배포, 서버 호스팅 | 아직 미구현 |

## 실행 테스트
```bash
npm test
npm run build
node --check scripts/sitelab-pipeline.mjs
```
