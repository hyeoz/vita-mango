import { useEffect, useRef, useState, useCallback } from "react";
import {
  AdEventType,
  InterstitialAd,
} from "react-native-google-mobile-ads";
import { adUnitIds } from "./config";

// Loads an interstitial ad and hands back a `show()` you can call at a natural
// break (e.g. after the user triggers a re-analysis). The ad preloads on mount
// and re-preloads itself after each show, so `show()` is instant when ready.
// If no ad is loaded yet, `show()` is a no-op and never blocks the UX.
export function useInterstitial(enabled = true) {
  const adRef = useRef<InterstitialAd | null>(null);
  // Mirror readiness in a ref so `show` stays stable and always reads the
  // current value, even when captured in a memoized callback elsewhere.
  const readyRef = useRef(false);
  const [ready, setReady] = useState(false);

  const setReadyBoth = (v: boolean) => {
    readyRef.current = v;
    setReady(v);
  };

  useEffect(() => {
    if (!enabled) {
      setReadyBoth(false);
      adRef.current = null;
      return;
    }

    const ad = InterstitialAd.createForAdRequest(adUnitIds.interstitial, {
      requestNonPersonalizedAdsOnly: true,
    });
    adRef.current = ad;

    const onLoaded = ad.addAdEventListener(AdEventType.LOADED, () =>
      setReadyBoth(true)
    );
    const onClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      setReadyBoth(false);
      ad.load(); // preload the next one
    });
    const onError = ad.addAdEventListener(AdEventType.ERROR, () =>
      setReadyBoth(false)
    );

    ad.load();

    return () => {
      setReadyBoth(false);
      adRef.current = null;
      onLoaded();
      onClosed();
      onError();
    };
  }, [enabled]);

  const show = useCallback(() => {
    if (readyRef.current && adRef.current) {
      adRef.current.show();
    }
  }, []);

  return { show, ready };
}
