# SiteLab Vercel 온라인 분석 베타 설정

GitHub `main`에 포함된 분석 버튼은 서버 함수 `inspectPublicPage`를 호출합니다.

## 배포 환경 변수

Vercel 프로젝트 → Settings → Environment Variables에서 다음 두 값을 등록하고 Redeploy 하세요.

| 키 | 값 예시 | 목적 |
|---|---|---|
| `SITELAB_INSPECTION_ENABLED` | `true` | 분석 기능 허용 |
| `SITELAB_ALLOWED_HOSTS` | `example.org,edu.yangyang.go.kr` | **관리자가 신뢰하고 허가한 호스트**만 접속 |

- 이 값이 없으면 사이트 분석 버튼이 오류를 보여주는 것이 정상입니다.
- 허용 호스트는 사용자 입력 URL과 정확히 일치해야 합니다. `https`만 지원하며, 사용자 인증정보나 비표준 포트가 포함된 URL은 거부합니다.
- 리디렉션은 따라가지 않으며, 8.5초 제한, 750KB 수집 한도를 적용합니다.
- 공개 HTML을 가져오는 단계이며 Playwright 실행 / REA 자동 호출 / 사이트 내부 코드 추출과는 다릅니다.
- 입력된 사이트의 robots 및 이용약관을 확인하고 허용된 대상에만 사용하십시오.
- **보안 중요**: 이 서버 함수는 공개 서비스 전체의 임의 도메인 분석용으로 설계되지 않았습니다. 도메인 화이트리스트 외에도 실제 운영 전 로그인·요청 횟수 제한·egress 필터·IP 검증·봇 남용 방지가 필요합니다.

## 검증
1. 환경 변수 설정 후 Vercel에서 새 배포가 `Ready`인지 확인
2. SiteLab에 허용된 `https://example.org` URL 입력
3. ‘사이트 분석 시작’ 클릭
4. 관찰 목록이 보이면 2단계에서 기능을 선택하고 명세를 생성
5. 미허용 URL은 경고가 나와야 함

## 미연결
- 동적 JavaScript 기반 사이트 Playwright 분석은 별도 격리 워커로 이전 필요
- REA 심층 분석은 로컬 CLI 환경에서 조건부로 시도할 수 있음
- Codex 작업 자동 실행은 로컬 승인 기반이며 Vercel 서버에서 실행하지 않음

Vercel과 GitHub 접근 계정이 다를 경우, 코드 변경 후 실제 배포를 확인할 수 있는 계정에서 빌드 로그를 확인하세요.
