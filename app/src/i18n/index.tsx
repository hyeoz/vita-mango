import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { GENERATED_CATALOG } from "./catalog.generated";
import { OVERRIDES } from "./overrides";
import { setRuntimeLanguage } from "./runtime";

export type Language = "ko" | "en" | "ja" | "fr";
export type MessageKey =
  | "remaining"
  | "daysAgo"
  | "daysTogether"
  | "welcome"
  | "unlockExpression"
  | "selectedStart"
  | "deleteSupplement"
  | "notificationBody"
  | "sourceLink"
  | "safetyExcluded"
  | "safetyWarning"
  | "profileBalanced"
  | "profileBalancedBlurb"
  | "profileLabel"
  | "profileBlurb"
  | "overlap"
  | "approxTotal";

export const LANGUAGE_NAMES: Record<Language, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  fr: "Français",
};

const STORAGE_KEY = "vm.language";
const SUPPORTED = new Set<Language>(["ko", "en", "ja", "fr"]);
const REGION_DEFAULTS: Partial<Record<string, Language>> = {
  KR: "ko",
  JP: "ja",
  FR: "fr",
};

function deviceLanguage(): Language {
  const locale = getLocales()[0];
  const code = locale?.languageCode?.toLowerCase() as Language | undefined;
  if (code && SUPPORTED.has(code)) return code;

  // The device language is the most useful signal, but a user can keep a
  // different system language while living in one of the launch countries.
  // Use the region as a first-launch fallback, then default every other market
  // to English. A manual choice is persisted and always wins on later opens.
  const region = locale?.regionCode?.toUpperCase();
  return (region && REGION_DEFAULTS[region]) || "en";
}

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function lookup(language: Language, source: string): string {
  if (language === "ko" || !/[가-힣]/.test(source)) return source;
  const key = normalize(source);
  const override = OVERRIDES[language]?.[key];
  const generated = (GENERATED_CATALOG[language] as Record<string, string>)[key];
  const translated = override ?? generated ?? translateDynamic(language, key);
  if (!translated) return source;
  const leading = source.match(/^\s*/)?.[0] ?? "";
  const trailing = source.match(/\s*$/)?.[0] ?? "";
  return `${leading}${translated}${trailing}`;
}

function translateDynamic(language: Exclude<Language, "ko">, source: string): string | undefined {
  const ais = source.match(/^AIS 보충제 프레임워크 — Group ([ABC])$/);
  if (ais) {
    const prefix = {
      en: "AIS Supplement Framework",
      ja: "AISサプリメント・フレームワーク",
      fr: "Cadre des compléments de l’AIS",
    }[language];
    return `${prefix} — Group ${ais[1]}`;
  }
  const intake = source.match(/^(.+?)\s*·\s*(\d+)(정|회|포)$/);
  if (!intake) return undefined;
  const [, rawWhen, count, rawUnit] = intake;
  const when = lookup(language, rawWhen);
  const unit: Record<Exclude<Language, "ko">, Record<string, string>> = {
    en: { 정: "tablet(s)", 회: "serving(s)", 포: "sachet(s)" },
    ja: { 정: "錠", 회: "回分", 포: "包" },
    fr: { 정: "comprimé(s)", 회: "portion(s)", 포: "sachet(s)" },
  };
  return language === "ja"
    ? `${when}・${count}${unit[language][rawUnit]}`
    : `${when} · ${count} ${unit[language][rawUnit]}`;
}

const MESSAGES: Record<Language, Record<MessageKey, string>> = {
  ko: {
    remaining: "오늘 영양제 {count}개 남았어 🌙 잊지마!",
    daysAgo: "{count}일 전에 받은 결과",
    daysTogether: "{name}님과 함께한 지 {count}일째 🎉",
    welcome: "{name}님, 반가워요 🎉",
    unlockExpression: "Lv.{level} 달성하면 '{name}' 표정 해금!",
    selectedStart: "{count}개 담고 시작하기",
    deleteSupplement: "{name} 삭제",
    notificationBody: "{name} 먹을 시간이야! ({time})",
    sourceLink: "{name} 링크 열기",
    safetyExcluded: "{reasons} 때문에 제외했어요",
    safetyWarning: "{reason} 중이라면 복용 전 전문가와 상의하세요.",
    profileBalanced: "균형 잡힌 타입",
    profileBalancedBlurb: "특별히 튀는 신호가 없어요. 지금 컨디션을 잘 유지하고 있는 편이에요!",
    profileLabel: "{domains} 집중형",
    profileBlurb: "답변을 보니 {domains} 쪽 신호가 제일 뚜렷해. 거기부터 챙겨보자!",
    overlap: "🧩 {names} 효능이 겹쳐요. 단독으로는 {match}%였어요.",
    approxTotal: " / 약 {count}",
  },
  en: {
    remaining: "{count} supplement(s) left today 🌙 Don't forget!",
    daysAgo: "Results from {count} day(s) ago",
    daysTogether: "Day {count} with {name} 🎉",
    welcome: "Welcome, {name} 🎉",
    unlockExpression: "Reach Lv.{level} to unlock the '{name}' expression!",
    selectedStart: "Add {count} and start",
    deleteSupplement: "Delete {name}",
    notificationBody: "Time to take {name}! ({time})",
    sourceLink: "Open the {name} link",
    safetyExcluded: "Excluded because of: {reasons}",
    safetyWarning: "If {reason} applies to you, consult a healthcare professional before taking this.",
    profileBalanced: "Balanced type",
    profileBalancedBlurb: "No signal stands out. You're doing a good job maintaining your current condition!",
    profileLabel: "{domains} focus",
    profileBlurb: "Your answers show the clearest signals around {domains}. Let's start there!",
    overlap: "🧩 Its benefits overlap with {names}. On its own, it scored {match}%.",
    approxTotal: " / about {count}",
  },
  ja: {
    remaining: "今日のサプリはあと{count}個 🌙 忘れずに！",
    daysAgo: "{count}日前の結果",
    daysTogether: "{name}と一緒に{count}日目 🎉",
    welcome: "{name}さん、こんにちは 🎉",
    unlockExpression: "Lv.{level}で「{name}」の表情をアンロック！",
    selectedStart: "{count}個を追加して始める",
    deleteSupplement: "{name}を削除",
    notificationBody: "{name}を飲む時間です！({time})",
    sourceLink: "{name}のリンクを開く",
    safetyExcluded: "{reasons}のため除外しました",
    safetyWarning: "{reason}に該当する場合は、摂取前に医療専門家へ相談してください。",
    profileBalanced: "バランスタイプ",
    profileBalancedBlurb: "目立ったサインはありません。今のコンディションを上手に維持できています！",
    profileLabel: "{domains}ケアタイプ",
    profileBlurb: "回答では{domains}のサインが最もはっきりしています。まずそこから整えましょう！",
    overlap: "🧩 {names}と働きが重なります。単独では{match}%でした。",
    approxTotal: " / 約{count}",
  },
  fr: {
    remaining: "Il reste {count} complément(s) aujourd'hui 🌙 N'oubliez pas !",
    daysAgo: "Résultats d'il y a {count} jour(s)",
    daysTogether: "Jour {count} avec {name} 🎉",
    welcome: "Bienvenue, {name} 🎉",
    unlockExpression: "Atteignez le niv. {level} pour débloquer l'expression « {name} » !",
    selectedStart: "Ajouter {count} et commencer",
    deleteSupplement: "Supprimer {name}",
    notificationBody: "C'est l'heure de prendre {name} ! ({time})",
    sourceLink: "Ouvrir le lien {name}",
    safetyExcluded: "Exclu en raison de : {reasons}",
    safetyWarning: "Si vous êtes concerné(e) par « {reason} », consultez un professionnel de santé avant toute prise.",
    profileBalanced: "Profil équilibré",
    profileBalancedBlurb: "Aucun signal ne ressort. Vous maintenez bien votre forme actuelle !",
    profileLabel: "Profil axé sur {domains}",
    profileBlurb: "Vos réponses montrent surtout des signaux liés à {domains}. Commençons par là !",
    overlap: "🧩 Ses effets recoupent ceux de {names}. Seul, ce complément obtenait {match}%.",
    approxTotal: " / environ {count}",
  },
};

function renderMessage(language: Language, key: MessageKey, params: Record<string, string | number>): string {
  return MESSAGES[language][key].replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ""));
}

let activeLanguage: Language = deviceLanguage();
setRuntimeLanguage(activeLanguage);

/** Translation for non-React code paths such as notifications and the engine. */
export function tx(source: string): string {
  return lookup(activeLanguage, source);
}

export function msg(key: MessageKey, params: Record<string, string | number> = {}): string {
  return renderMessage(activeLanguage, key, params);
}

export function currentLanguage(): Language {
  return activeLanguage;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(activeLanguage).format(value);
}

export function formatDate(date: Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(activeLanguage, options).format(date);
}

export function formatList(values: string[]): string {
  if (values.length <= 1) return values[0] ?? "";
  try {
    return new Intl.ListFormat(activeLanguage, { style: "short", type: "conjunction" }).format(values);
  } catch {
    return values.join(" · ");
  }
}

type I18nValue = {
  language: Language;
  setLanguage: (language: Language) => Promise<void>;
  t: (source: string) => string;
  m: (key: MessageKey, params?: Record<string, string | number>) => string;
  ready: boolean;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, updateLanguage] = useState<Language>(activeLanguage);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        const next = stored && SUPPORTED.has(stored as Language) ? (stored as Language) : deviceLanguage();
        activeLanguage = next;
        setRuntimeLanguage(next);
        if (!cancelled) updateLanguage(next);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = useCallback(async (next: Language) => {
    activeLanguage = next;
    setRuntimeLanguage(next);
    updateLanguage(next);
    await AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      language,
      setLanguage,
      t: (source) => lookup(language, source),
      m: (key, params = {}) => renderMessage(language, key, params),
      ready,
    }),
    [language, setLanguage, ready]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside <I18nProvider>");
  return value;
}
