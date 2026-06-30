# 영양제 추천 AI 앱

_Started 2026-06-29 05:40 UTC_

---

## User

본인이 먹는 영양제를 수집해서 각 영양제에 맞는 섭취 시간을 알려주는 앱을 만드려고 해. 거기에 더해 매일매일 몸 상태를 수집해서 ai 로 영양제를 추천해주는게 핵심 기능이야. 귀여운 메인 캐릭터가 있고, 비비드한 알약 느낌으로 앱을 만들고싶어

## Assistant

좋아요! 영양제 섭취 타이밍 + 매일 컨디션 기록 → AI 추천이 핵심인 앱이네요. 귀여운 캐릭터와 비비드한 알약 느낌도 좋아요. 시작 전에 방향을 잡기 위해 몇 가지 여쭤볼게요.

_[tool: questions_v2]_

## User

Questions answered:
- deliverable: 둘 다 (와이어프레임 → 추려서 하이파이)
- screens: 온보딩 (영양제 등록), 홈 / 오늘의 복용 일정, AI 추천 결과, 캐릭터 / 마이페이지
- variations: 3개
- explore_focus: 전체 화면 구성 / 레이아웃, 복용 일정을 보여주는 방식 (타임라인 vs 카드 등), 캐릭터의 역할 / 활용 방식, AI 추천을 보여주는 방식, 컨디션 입력 방식
- character: 젤리/물방울 같은 말랑한 형태
- character_role: 복용 알림/리마인드 도우미, 컨디션 따라 표정/기분이 변함, AI 추천을 말해주는 화자
- palette: 2
- condition_input: 짧은 자연어 입력 (한 줄 일기)
- tone: 귀엽고 친근 (말랑·둥글)

## Assistant

답변 감사합니다! 방향 잡혔어요. 먼저 **러프 와이어프레임**으로 3가지 방향을 한 캔버스에 펼쳐서 탐색할게요. 각 방향마다 4개 화면(온보딩·홈·AI추천·마이페이지)을 보여드립니다.

_[tool: update_todos]_

_[tool: dc_write]_

_[tool: ready_for_verification]_

3가지 방향을 한 캔버스에 펼쳤어요 (각 4화면):

- **방향 A · 타임라인 중심** — 하루 흐름(아침/점심/저녁)을 세로 타임라인으로, AI는 젤리와의 채팅으로
- **방향 B · 카드 덱 중심** — "지금 먹을 것"을 스와이프 카드로, AI 추천은 이유 태그가 붙은 결과 카드
- **방향 C · 캐릭터 중심** — 젤리가 화면 주인공이고 알약이 둥둥, 컨디션은 한 줄 일기로 입력

캔버스를 드래그해서 둘러보세요. 오른쪽 노란 메모에 각 방향의 강점을 적어뒀어요. 컨디션을 "짧은 자연어"로 입력하고 싶다 하셨으니 **C2의 한 줄 일기 입력**이 그 방향에 가장 잘 맞고, 캐릭터 비중도 원하셨던 만큼 **C 방향**이 전반적으로 잘 어울릴 것 같아요.

어떤 방향으로 갈까요? 통째로 하나를 고르셔도 되고, "홈은 A, AI추천은 C" 처럼 화면별로 섞으셔도 됩니다. 고르시면 비비드 알약 + 젤리 캐릭터로 하이파이 디자인에 들어갈게요.

## User

캐릭터를 좀 더 망고 슬랑이 느낌으로 만들어줄 수 있어 ?

## Assistant

망고 슬라임 느낌 좋네요! 🥭 캐릭터를 따뜻한 망고색 + 말랑 슬라임 형태(둥근 돔 + 젤리 광택)로 통일할게요.

_[tool: run_script]_

_[tool: show_html]_

_[tool: show_html]_

망고색으로 잘 바뀌었네요. 큰 캐릭터(C2 홈, A4 마이페이지)도 확인할게요.

_[tool: save_screenshot]_

망고색 + 젤리 광택으로 캐릭터를 통일했습니다. 확인용으로 검증을 돌릴게요.

_[tool: ready_for_verification]_

캐릭터를 **망고 슬라임 느낌**으로 통일했어요 🥭

- 따뜻한 망고 그라데이션(노랑→주황) 색상
- 둥근 돔 + 살짝 처진 말랑 슬라임 형태
- 젤리 같은 광택 하이라이트와 복숭아빛 볼터치
- 모든 화면에서 같은 캐릭터로 통일 (이전엔 화면마다 색이 달랐어요)

이제 방향을 정해주시면 하이파이로 들어갈게요. 어떤 방향(A/B/C)으로 갈지, 아니면 화면별로 섞을지 알려주세요. 캐릭터 디테일도 더 다듬고 싶은 부분 있으면 말씀해 주세요!

## User

C 방향으로 가줘

## Assistant

C 방향(캐릭터 중심)으로 하이파이를 만들게요. 망고 슬라임 "젤리"를 주인공으로, 비비드한 알약이 둥둥 떠다니는 인터랙티브 모바일 앱으로 구성합니다. 큰 파일이라 화면을 나눠서 단계적으로 쌓을게요.

_[tool: update_todos]_

_[tool: dc_write]_

_[tool: show_html]_

홈 화면이 아주 귀엽게 나왔네요. 이제 나머지 화면(AI추천·기록·도감·온보딩)을 채울게요. 먼저 로직을 확장합니다.

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

이제 AI 추천 화면을 추가합니다.

_[tool: dc_html_str_replace]_

기록 화면을 추가합니다.

_[tool: dc_html_str_replace]_

마이페이지(도감) 화면을 추가합니다.

_[tool: dc_html_str_replace]_

전체 화면을 확인할게요.

_[tool: multi_screenshot]_

_[tool: multi_screenshot]_

_[tool: multi_screenshot]_

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: get_webview_logs]_

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: grep]_

_[tool: read_file]_

홈만 보이고 나머지 화면이 안 뜨네요 — `sc-if`의 hint 값 차이가 원인 같습니다. 동작하는 홈과 동일하게 맞출게요.

_[tool: dc_html_str_replace]_

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: eval_js]_

화면 상태를 직접 확인하기 위해 임시 디버그를 넣을게요.

_[tool: dc_js_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: eval_js]_

_[tool: eval_js]_

preview가 옛 버전이었네요 — 추가한 화면이 반영 안 된 상태로 테스트하고 있었습니다. 먼저 디버그를 되돌리고 새로 로드할게요.

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: show_html]_

Now the preview is fresh. Let me verify all screens render with navigation.

_[tool: eval_js]_

All screens render correctly. Let me capture each screen visually to confirm the design.

_[tool: multi_screenshot]_

전반적으로 잘 나왔어요. AI 화면의 칩/태그 텍스트가 줄바꿈되는 것만 다듬을게요.

_[tool: dc_html_str_replace]_

_[tool: str_replace_edit]_

_[tool: update_todos]_

C 방향 하이파이가 완성됐어요. 검증을 돌릴게요.

_[tool: ready_for_verification]_

**젤리 영양제** 하이파이 앱이 완성됐어요 🥭 (C 캐릭터 중심 방향)

망고 슬라임 "젤리"를 주인공으로, 비비드한 알약이 둥둥 떠다니는 인터랙티브 모바일 앱입니다. 하단 탭으로 4개 화면을 오갈 수 있어요:

- **홈** — 젤리 + 떠다니는 알약, 말풍선 리마인드, 한 줄 일기 입력, 오늘의 복용 체크(탭하면 완료 ✓)
- **기록** — 한 줄 일기 타임라인 (글에서 컨디션을 읽어 표정 이모지 자동 부여)
- **AI추천** — 최근 7일 일기 분석 → 이유 태그가 붙은 추천 카드, "내 영양제에 추가" 동작
- **젤리(마이페이지)** — 레벨·연속일·달성률, 영양제 도감, 성장 게이지
- **온보딩** — 젤리가 인사하고 영양제를 골라 시작 (도감의 "다시 등록하기"로 진입)

캐릭터는 깜빡임·둥실 떠오르는 모션이 들어가 있고, 알약 토글·일기 입력·추천 추가가 실제로 동작합니다.

다듬고 싶은 부분 알려주세요 — 예: 표정(졸림/신남) 추가, 알림 화면, 복용 시간 상세, 또는 특정 화면을 더 채워볼 수도 있어요.

## User

캐릭터에 다양한 표정 넣어주고, 터치하면 말랑말랑한 효과 넣어주라

## Assistant

표정 다양화 + 터치 시 말랑 효과를 위해, 젤리를 재사용 가능한 컴포넌트로 분리하고 모든 화면에서 쓸게요. 먼저 현재 캐릭터 마크업을 정확히 확인합니다.

_[tool: read_file]_

젤리를 표정·터치 효과를 가진 재사용 컴포넌트 `Jelly.dc.html`로 만들게요.

_[tool: dc_write]_

_[tool: show_html]_

_[tool: multi_screenshot]_

_[tool: eval_js]_

_[tool: show_html]_

_[tool: eval_js]_

Now it's loaded. Let me capture the 5 expressions by tapping.

_[tool: multi_screenshot]_

5가지 표정(기쁨·졸림·신남·하트·윙크) 모두 잘 나오고, 탭하면 말랑 스쿼시 + 하트 팝업까지 동작해요. 이제 앱의 4개 화면에 젤리 컴포넌트를 연결합니다.

_[tool: str_replace_edit]_

Now add the `jellyMood` value to the home screen logic so the character reflects the day's state.

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: show_html]_

_[tool: eval_js]_

_[tool: get_webview_logs]_

_[tool: multi_screenshot]_

모든 화면에 표정 있는 젤리가 연결됐어요. 검증을 돌릴게요.

_[tool: ready_for_verification]_

젤리에 표정과 말랑 효과를 넣었어요 🥭

**5가지 표정** — 기쁨😊, 졸림😴(💤 떠다님), 신남🤩(반짝 별눈+벌린 입), 하트🥰, 윙크😉

**화면마다 어울리는 표정으로 등장:**
- 홈 — 그날 상태에 따라 자동 변화 (피곤하다고 적으면 졸린 표정, 다 챙기면 신남, 방금 기록하면 하트)
- AI추천 — 신난 표정으로 분석
- 마이페이지 — 하트눈
- 온보딩 — 기쁜 표정으로 인사

**터치하면 말랑말랑 효과** — 젤리를 탭하면 통통 눌렸다 튀어오르는 스쿼시 애니메이션 + 💛✨ 하트가 팡 터지고, 탭할 때마다 표정이 차례로 바뀌어요. 직접 만지며 다섯 표정을 다 볼 수 있어요.

만져보고 더 추가하고 싶은 표정(예: 뿌듯·놀람)이나, 특정 상황에서 나올 반응이 있으면 말씀해 주세요!

