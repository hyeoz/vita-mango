import type { RuntimeLanguage } from '../i18n/runtime';

const ko = {
  brand: '비타망고', title: '오늘의 영양제', hint: '먹은 영양제를 눌러주세요',
  complete: '오늘도 잘 챙겼어요!', completeSubtitle: '오늘의 영양제 섭취 완료',
  expired: '섭취 현황을 새로 확인해요', openApp: '앱에서 다시 시작', taken: '먹었어요',
  control: '잠금화면 섭취 체크', description: '잠금화면과 다이내믹 아일랜드에서 바로 기록해요.',
  start: '시작', restart: '다시 표시', stop: '종료', active: '표시 중',
  limit: '최대 8시간 표시돼요. 종료 후 앱에서 다시 시작할 수 있어요.',
  disabled: 'iPhone 설정의 비타망고에서 실시간 현황을 허용해 주세요.',
  failed: '실시간 현황을 변경하지 못했어요. 잠시 후 다시 시도해 주세요.',
  empty: '영양제를 먼저 추가해 주세요.', done: '오늘 영양제를 모두 챙겼어요.',
};
type Copy = typeof ko;
const copies: Record<RuntimeLanguage, Copy> = {
  ko,
  en: { brand: 'Vita Mango', title: "Today's supplements", hint: 'Tap what you took', complete: 'All taken today!', completeSubtitle: 'Your daily routine is complete', expired: 'Refresh your intake status', openApp: 'Restart in the app', taken: 'Taken', control: 'Lock Screen intake check', description: 'Record from your Lock Screen or Dynamic Island.', start: 'Start', restart: 'Show again', stop: 'Stop', active: 'Showing', limit: 'Shows for up to 8 hours. Restart from the app after it ends.', disabled: 'Allow Live Activities for Vita Mango in iPhone Settings.', failed: 'Could not update Live Activities. Please try again.', empty: 'Add a supplement first.', done: 'You took all your supplements today.' },
  ja: { brand: 'ビタマンゴー', title: '今日のサプリ', hint: '飲んだサプリをタップ', complete: '今日も忘れずに！', completeSubtitle: '今日のサプリをすべて摂取しました', expired: '摂取状況を更新しましょう', openApp: 'アプリで再開', taken: '飲みました', control: 'ロック画面で摂取チェック', description: 'ロック画面やDynamic Islandから記録できます。', start: '開始', restart: '再表示', stop: '終了', active: '表示中', limit: '最大8時間表示します。終了後はアプリで再開できます。', disabled: 'iPhoneの設定でビタマンゴーのライブアクティビティを許可してください。', failed: '更新できませんでした。もう一度お試しください。', empty: '先にサプリを追加してください。', done: '今日のサプリをすべて摂取しました。' },
  fr: { brand: 'Vita Mango', title: 'Mes compléments', hint: 'Touchez le complément pris', complete: 'Tout est pris !', completeSubtitle: 'Votre routine du jour est terminée', expired: 'Actualisez vos prises', openApp: "Relancer dans l’app", taken: 'Pris', control: 'Suivi sur l’écran verrouillé', description: 'Notez vos prises depuis l’écran verrouillé ou Dynamic Island.', start: 'Démarrer', restart: 'Réafficher', stop: 'Arrêter', active: 'Affiché', limit: 'Affichage pendant 8 heures maximum. Relancez ensuite dans l’app.', disabled: 'Autorisez les activités en direct de Vita Mango dans les réglages de l’iPhone.', failed: 'Mise à jour impossible. Veuillez réessayer.', empty: 'Ajoutez d’abord un complément.', done: 'Tous vos compléments sont pris aujourd’hui.' },
  es: { brand: 'Vita Mango', title: 'Mis suplementos', hint: 'Toca lo que has tomado', complete: '¡Todo tomado!', completeSubtitle: 'Has completado tu rutina de hoy', expired: 'Actualiza tus tomas', openApp: 'Reiniciar en la app', taken: 'Tomado', control: 'Registro en pantalla bloqueada', description: 'Registra desde la pantalla bloqueada o Dynamic Island.', start: 'Iniciar', restart: 'Mostrar', stop: 'Detener', active: 'Visible', limit: 'Se muestra hasta 8 horas. Después puedes reiniciarlo en la app.', disabled: 'Permite las actividades en directo de Vita Mango en los ajustes del iPhone.', failed: 'No se pudo actualizar. Vuelve a intentarlo.', empty: 'Primero añade un suplemento.', done: 'Has tomado todos tus suplementos de hoy.' },
};
export const liveCopy = (language: RuntimeLanguage): Copy => copies[language];
