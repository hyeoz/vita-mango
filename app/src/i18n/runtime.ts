// Pure translation runtime for the recommendation engine. This file deliberately
// has no React Native imports so the deterministic Node regression test can load it.
import { GENERATED_CATALOG } from "./catalog.generated";
import { OVERRIDES } from "./overrides";

export type RuntimeLanguage = "ko" | "en" | "ja" | "fr" | "es";

type RuntimeMessage =
  | "safetyExcluded"
  | "safetyWarning"
  | "profileBalanced"
  | "profileBalancedBlurb"
  | "profileLabel"
  | "profileBlurb";

const MESSAGES: Record<RuntimeLanguage, Record<RuntimeMessage, string>> = {
  ko: {
    safetyExcluded: "{reasons} 때문에 제외했어요",
    safetyWarning: "{reason} 중이라면 복용 전 전문가와 상의하세요.",
    profileBalanced: "균형 잡힌 타입",
    profileBalancedBlurb: "특별히 튀는 신호가 없어요. 지금 컨디션을 잘 유지하고 있는 편이에요!",
    profileLabel: "{domains} 집중형",
    profileBlurb: "답변을 보니 {domains} 쪽 신호가 제일 뚜렷해. 거기부터 챙겨보자!",
  },
  en: {
    safetyExcluded: "Excluded because of: {reasons}",
    safetyWarning: "If {reason} applies to you, consult a healthcare professional before taking this.",
    profileBalanced: "Balanced type",
    profileBalancedBlurb: "No signal stands out. You're doing a good job maintaining your current condition!",
    profileLabel: "{domains} focus",
    profileBlurb: "Your answers show the clearest signals around {domains}. Let's start there!",
  },
  ja: {
    safetyExcluded: "{reasons}のため除外しました",
    safetyWarning: "{reason}に該当する場合は、摂取前に医療専門家へ相談してください。",
    profileBalanced: "バランスタイプ",
    profileBalancedBlurb: "目立ったサインはありません。今のコンディションを上手に維持できています！",
    profileLabel: "{domains}ケアタイプ",
    profileBlurb: "回答では{domains}のサインが最もはっきりしています。まずそこから整えましょう！",
  },
  fr: {
    safetyExcluded: "Exclu en raison de : {reasons}",
    safetyWarning: "Si vous êtes concerné(e) par « {reason} », consultez un professionnel de santé avant toute prise.",
    profileBalanced: "Profil équilibré",
    profileBalancedBlurb: "Aucun signal ne ressort. Vous maintenez bien votre forme actuelle !",
    profileLabel: "Profil axé sur {domains}",
    profileBlurb: "Vos réponses montrent surtout des signaux liés à {domains}. Commençons par là !",
  },
  es: {
    safetyExcluded: "Excluido por: {reasons}",
    safetyWarning: "Si {reason} se aplica a tu caso, consulta a un profesional sanitario antes de tomarlo.",
    profileBalanced: "Perfil equilibrado",
    profileBalancedBlurb: "No destaca ninguna señal. ¡Estás manteniendo bien tu estado actual!",
    profileLabel: "Enfoque en {domains}",
    profileBlurb: "Tus respuestas muestran señales más claras en {domains}. ¡Empecemos por ahí!",
  },
};

let language: RuntimeLanguage = "ko";

export function setRuntimeLanguage(next: RuntimeLanguage): void {
  language = next;
}

export function currentLanguage(): RuntimeLanguage {
  return language;
}

export function tx(source: string): string {
  if (language === "ko" || !/[가-힣]/.test(source)) return source;
  const key = source.replace(/\s+/g, " ").trim();
  return OVERRIDES[language]?.[key]
    ?? (GENERATED_CATALOG[language] as Record<string, string>)[key]
    ?? source;
}

export function msg(key: RuntimeMessage, params: Record<string, string | number> = {}): string {
  return MESSAGES[language][key].replace(
    /\{(\w+)\}/g,
    (_, name: string) => String(params[name] ?? "")
  );
}

export function formatList(values: string[]): string {
  if (values.length <= 1) return values[0] ?? "";
  try {
    return new Intl.ListFormat(language, { style: "short", type: "conjunction" }).format(values);
  } catch {
    return values.join(" · ");
  }
}
