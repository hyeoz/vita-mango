import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import mobileAds, {
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  MaxAdContentRating,
} from "react-native-google-mobile-ads";

type AdsState = {
  ready: boolean;
  privacyOptionsRequired: boolean;
  showPrivacyOptions: () => Promise<void>;
};

const Ctx = createContext<AdsState | null>(null);

async function configureAndStartAds(): Promise<boolean> {
  await mobileAds().setRequestConfiguration({
    maxAdContentRating: MaxAdContentRating.PG,
    tagForChildDirectedTreatment: false,
    tagForUnderAgeOfConsent: false,
  });
  await mobileAds().initialize();
  return true;
}

export function AdsProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [privacyOptionsRequired, setPrivacyOptionsRequired] = useState(false);

  const refreshConsentState = useCallback(async () => {
    const info = await AdsConsent.getConsentInfo();
    setPrivacyOptionsRequired(
      info.privacyOptionsRequirementStatus ===
        AdsConsentPrivacyOptionsRequirementStatus.REQUIRED
    );
    return info;
  }, []);

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      try {
        // UMP determines whether a regional consent form is needed and presents
        // the Google-certified form before any new ad request is made.
        await AdsConsent.gatherConsent({ tagForUnderAgeOfConsent: false });
      } catch (e) {
        // A network error may still leave valid consent from a previous launch.
        console.warn("[ads] consent update failed", e);
      }

      try {
        const info = await refreshConsentState();
        if (info.canRequestAds) {
          await configureAndStartAds();
          if (active) setReady(true);
        }
      } catch (e) {
        // Fail closed: the app remains fully usable, but no ad request is made.
        console.warn("[ads] initialization skipped", e);
      }
    };

    initialize();
    return () => {
      active = false;
    };
  }, [refreshConsentState]);

  const showPrivacyOptions = useCallback(async () => {
    const info = await AdsConsent.showPrivacyOptionsForm();
    setPrivacyOptionsRequired(
      info.privacyOptionsRequirementStatus ===
        AdsConsentPrivacyOptionsRequirementStatus.REQUIRED
    );
    if (info.canRequestAds && !ready) {
      await configureAndStartAds();
      setReady(true);
    } else if (!info.canRequestAds) {
      setReady(false);
    }
  }, [ready]);

  return (
    <Ctx.Provider value={{ ready, privacyOptionsRequired, showPrivacyOptions }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAds(): AdsState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAds must be used inside <AdsProvider>");
  return ctx;
}
