# HANDOFF — 젤리 영양제 (vita-mango)

> 이 문서는 **새 Claude Code 세션이 이전 세션의 맥락을 이어받기 위한** 인수인계 노트입니다.
> 코드/커밋 히스토리는 `git bundle`로 그대로 넘어왔고, 이 문서가 "왜 이렇게 짰는지 +
> 무엇이 끝났고 무엇이 남았는지"를 담습니다.

## 0. 새 세션에서 가장 먼저 할 일 (번들 가져오기 + 푸시)

이 세션은 `hyeoz/vita-mango`에 연결되어 있으니, 관리형 git 프록시가 origin push를
인증해줍니다(이전 세션은 연결 repo가 없어서 push가 막혔음 — 그래서 번들로 넘김).

```bash
# 1) 받은 번들 파일을 작업공간에 둔 뒤 (예: ./vita-mango.bundle)
git bundle verify vita-mango.bundle

# 2) 번들에서 브랜치를 가져온다
git fetch vita-mango.bundle feat/jelly-supplement-app:feat/jelly-supplement-app
git checkout feat/jelly-supplement-app

# 3) origin(=vita-mango)으로 푸시 (프록시가 인증해줌)
git push -u origin feat/jelly-supplement-app

# 4) 의존성은 번들에 없으므로(=node_modules 미포함) 다시 설치
cd app && npm install
cd ../server && npm install
```

커밋 4개(기능별)가 들어 있습니다:
- `chore(app): scaffold Expo React Native app`
- `feat(server): Claude API proxy for AI supplement recommendations`
- `feat(app): Google sign-in + Firestore-backed app state`
- `feat(app): Jelly mascot, five screens, and navigation`
- (+ 이 문서 `docs: handoff notes`)

## 1. 이 앱이 뭔가

Claude Design에서 나온 디자인(`project/젤리 영양제.dc.html`, 방향 C — 캐릭터 중심)을
실제 앱으로 구현. 망고 슬라임 캐릭터 "젤리"가 영양제 복용을 챙겨주고, 매일의 한 줄
일기를 **Claude로 분석**해 부족한 영양소를 추천.

자세한 사용자 문서는 `README.md` 참고. 이 문서는 그 위에 **맥락/결정/남은 일**을 더한 것.

## 2. 아키텍처 한눈에

```
RN 앱(dev build) ──Google 로그인──▶ Firebase Auth
              ──본인 문서 read/write──▶ Firestore (users/{uid})
              ──POST /api/recommend──▶ Express 프록시 ──▶ Claude(claude-opus-4-8)
```

- 앱은 Firestore에 **직접** 접근(보안규칙으로 uid 범위 제한).
- Express 백엔드는 **Claude API 키를 숨기기 위한 용도**뿐. 앱은 키를 절대 안 가짐.

## 3. 내려진 결정 (그리고 이유)

- **Expo Go가 아니라 dev build**: 사용자가 네이티브 구글 로그인 + Firestore를 원함
  → `@react-native-firebase/*`, `@react-native-google-signin` 사용 → Expo Go 불가,
  커스텀 dev build 필요. JS는 dev build에서도 핫리로드 됨.
- **Firestore 단일 문서 모델**(`users/{uid}` 하나에 배열들): 일기/영양제가 작아서
  문서 1개 + 실행 시 1회 read + 디바운스 write가 가장 단순/저렴. (실시간 onSnapshot은
  의도적으로 안 씀 — 에코 루프 회피, 단일 기기 가정. 필요하면 나중에 전환.)
- **Claude 구조화 출력**: `output_config.format`의 json_schema로 항상
  `{analysis, signals[], recommendations[]}` 형태 보장 → 파싱/검증 없이 카드에 바로 매핑.
- **추천 카탈로그 고정**: 모델이 정해진 영양제 목록에서만 추천 → 각 카드의 알약 색을
  앱이 매핑할 수 있음. 또 "이미 먹는 영양제는 추천 금지" 규칙을 시스템 프롬프트에 명시.
- **모델 = `claude-opus-4-8`** (claude-api 스킬 기본값). thinking 미사용(구조화 출력이라
  reasoning 누출 무관, 속도 우선).
- **네비게이션 = 로컬 상태 + 커스텀 하단탭** (라우터 의존성 없음, 프로토타입과 동일).

## 4. 끝난 것 (검증됨)

- 5개 화면 전부: 로그인 / 온보딩 / 홈 / 기록(한 줄 일기) / AI추천 / 마이페이지(도감)
- 젤리 캐릭터: 5표정(기쁨·졸림·신남·하트·윙크), 둥실+깜빡임, 터치 시 말랑 스쿼시 + 하트 팡
- 홈 화면 표정이 상태 따라 자동 변화(피곤 일기→졸림, 다 먹음→신남, 방금 기록→하트)
- 구글 로그인 + Firestore 영속화(계정별 저장, 신규계정 시드, 디바운스 저장)
- Firestore 보안규칙(`firestore.rules`) — 본인 문서만
- Claude 백엔드 프록시(`server/index.js`) — 구조화 출력 스키마/프롬프트 포함
- **검증**: `cd app && npx tsc --noEmit` → 0 errors. `npx expo export`(네이티브 번들) 정상.

## 5. 아직 안 된 것 / 주의할 점

- **실제 API 키로 라이브 Claude 호출은 안 해봄.** 코드/SDK/스키마는 검증했지만,
  `server/.env`에 `ANTHROPIC_API_KEY` 넣고 AI추천 탭을 실제로 눌러본 적은 없음.
- **실기기 빌드/실행 미수행.** 컴파일·번들은 통과했으나 시뮬레이터/실폰에서 눈으로
  확인한 단계는 아님. (이전 환경에 폰/Apple계정/EAS 로그인이 없었음)
- **Firebase 콘솔 값은 비어 있음(placeholder).** 사용자가 채워야 함:
  - `app/google-services.json`, `app/GoogleService-Info.plist` (콘솔에서 다운로드, git 제외)
  - `app/.env`의 `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
  - 번들ID/패키지 = `com.jelly.supplement`
  - 자세한 단계는 `README.md` → Setup.
- **알림 없음**: "자기 전 2개 남았어"는 화면 문구일 뿐. 실제 푸시 미구현
  (expo-notifications 후보).
- **실시간 동기화 없음**: 켤 때 load + 변경 시 save 방식. 다기기 동시편집은 미지원.
- **백엔드는 localhost HTTP**: 실배포 시 HTTPS 호스팅 필요. 실기기는
  `EXPO_PUBLIC_API_URL`로 LAN 주소 지정.

## 6. 사용자가 다음에 요청할 만한 것 (우선순위 후보)

1. 실제 키 넣고 Claude 라이브 호출 한 번 돌려서 응답 확인
2. 실기기 dev build → 화면 눈으로 검증/스크린샷
3. 복용 알림(expo-notifications)
4. Firestore 실시간 동기화(onSnapshot) 전환
5. main으로 머지 / PR

## 7. 파일 지도

```
app/
  App.tsx                      앱 루트 + 인증 게이트(loading→login→app)
  src/
    theme/{colors,fonts,ui}.ts 디자인 팔레트/폰트/청키카드 스타일
    api/{config,recommend}.ts  백엔드(Claude) 호출 클라이언트
    firebase/{config,auth,db}.ts  구글로그인 + Firestore 데이터 레이어
    state/AuthContext.tsx      Firebase 인증 상태
    state/AppContext.tsx       앱 상태 + Firestore hydrate/persist
    components/{Jelly,Pill,BottomNav}.tsx
    screens/{Login,Onboarding,Home,Record,Ai,My}Screen.tsx
server/
  index.js                     Express + @anthropic-ai/sdk, /api/recommend
firestore.rules                본인 문서만 read/write
project/, chats/               원본 디자인 프로토타입 + 디자인 대화(참고)
```
