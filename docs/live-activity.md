# iOS 섭취 실시간 현황

승인 시안: `review-previews/vitamango-live-activity-v1.png`.

- iOS 17 이상에서 홈의 **잠금화면 섭취 체크 → 시작**으로 켠다. 종료와 다시 표시도 같은 위치에서 제공한다. Android와 구형 iOS는 기존 알림을 유지한다.
- 잠금화면과 다이내믹 아일랜드 확장 상태에는 다음 미섭취 항목 3개를 표시한다. 하나를 기록하면 뒤의 항목이 앞으로 온다. 3개를 초과하면 추가 항목 수를 표시한다.
- 기본/최소 아일랜드는 망고 마크와 진행률을 표시한다. 카드의 빈 영역을 누르면 홈을 연다.
- 모두 완료하면 아일랜드는 종료되고, 잠금화면에는 완료 카드를 최대 60초 남긴다.
- 최초 시작은 사용자가 앱에서 선택한다. 기능을 켜 둔 경우 다음 날 앱을 열면 새 현황을 시작한다. 사용자가 지운 현황이나 8시간 제한으로 끝난 현황을 같은 날 자동으로 다시 띄우지 않는다. **다시 표시**로 재시작한다. 서버나 앱 실행 없이 매일 자동으로 시작하는 기능은 포함하지 않는다.
- 현재 활동의 유효기간은 시작 후 최대 8시간 또는 다음 자정 중 이른 시각이다. 기간이 지나면 카드가 남아 있어도 체크 대신 앱 열기를 제공한다. 네이티브 액션에서도 날짜·세션·유효기간을 검증한다.

## 저장과 동기화

`LiveActivityIntent`는 containing app 프로세스에서 실행된다. 네이티브 앱 전용 Application Support 경로의 원자적 JSON 저널에 먼저 기록하므로 React Native가 실행되지 않아도 저장한다. 위젯은 ActivityKit content만 읽으므로 App Group이나 서버, APNs 권한이 필요하지 않다.

앱은 시작/복귀 때 이벤트를 병합한다. AsyncStorage 저장이 성공한 뒤에만 네이티브 이벤트에 수신 확인을 보낸다. 저장에 실패하면 저널은 남아 다음 실행에서 재시도한다. 네이티브는 아직 수신 확인이 없는 체크를 오래된 앱 스냅샷 위에 다시 적용한다. 전체 완료 이력도 보관해 다음 날 실행해도 전날의 연속 기록을 잃지 않는다.

한국어·영어·일본어·프랑스어·스페인어를 앱 언어에 맞춘다. 이름과 개수는 실제 사용자 목록을 사용하고, ActivityKit의 4 KB 제한을 위해 표시 목록만 제한한다.

## 재생성과 검증

`app/plugins/withLiveActivity.js`가 `native/live-activity`의 원본을 네이티브 프로젝트에 복사하고 Swift 위젯 확장, 앱 브리지, 임베딩 및 `NSSupportsLiveActivities`를 구성한다. 생성된 `app/ios`는 기존 정책대로 Git에서 제외한다. 같은 플러그인을 반복 적용해도 타깃/소스를 중복 추가하지 않는다.

```sh
cd app
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/tsx scripts/test-live-activity.ts
xcrun swiftc native/live-activity/VMIntakeModels.swift scripts/test-live-activity-native.swift -o /tmp/vitamango-live-native-tests
/tmp/vitamango-live-native-tests
```

실기기에서 최종 확인할 항목: 잠금 상태 인증 요구, 강제 종료 후 AppIntent 실행, iOS 설정에서 실시간 현황 비활성화, 작은 화면/큰 글자, 시스템의 8시간 종료. 이 기능 추가는 새 네이티브 빌드가 필요하며 OTA JavaScript 업데이트만으로 적용되지 않는다.

### 2026-09-30 검증 결과

- TypeScript 타입 검사 통과, JavaScript 복구 로직 11개 assertion 및 Swift 저널 11개 assertion 통과.
- Xcode 26 / iOS 26 시뮬레이터의 앱 + 위젯 확장 빌드 성공. 플러그인 반복 실행 시 타깃 중복 없음.
- 별도로 만든 `Vita Mango Live Activity QA` 시뮬레이터에서 예시 데이터로 시작·종료·다시 표시, 잠금화면 및 기본 아일랜드 표시를 확인.
- 앱 프로세스를 종료한 뒤 잠금화면 버튼으로 `2/5 → 3/5` 기록. 앱 재실행 시 `3/5` 복원, AsyncStorage 저장 후 저널의 pending 이벤트가 0개가 되는 것 확인.
- `5/5` 완료 메시지와 완료 날짜 저장 확인. 카드 높이 전환 중 하단 잘림을 발견해 SwiftUI의 intrinsic size와 뷰 identity를 고정하고 재검증.
- 캡처: `review-previews/live-activity-implementation-review.png`. **실기기 검증은 미실행.** TestFlight/App Store 배포 결과는 [1.2.0 릴리스 기록](release-1.2.0.md)에 정리했다. 확장 아일랜드는 네이티브 빌드에 포함되며, 실제 길게 누르기 및 확장 화면 체크는 실기기 검증 항목으로 남긴다.

## 스토어 서명

앱 `com.vitamango.app`과 확장 `com.vitamango.app.intake`에는 각각 별도의 App Store provisioning profile이 필요하다. `fastlane ios archive_release`는 두 타깃에 각자의 프로파일을 지정하고 같은 버전·빌드 번호로 임베딩한다. 빌드 전 `app.json`의 버전과 빌드 번호를 변경해 `main`에 커밋한다. 빌드 레인 안에서는 번호를 자동 증가시키지 않는다.
