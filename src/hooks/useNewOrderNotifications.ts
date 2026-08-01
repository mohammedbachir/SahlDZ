import { useCallback, useState } from "react";

const KEY = "sahlz-sound-enabled";

function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // audio not available
  }
}

export function useNewOrderNotifications() {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(KEY) === "1";
  });

  const enable = useCallback(() => {
    localStorage.setItem(KEY, "1");
    setEnabled(true);
    beep();
  }, []);

  const disable = useCallback(() => {
    localStorage.setItem(KEY, "0");
    setEnabled(false);
  }, []);

  const notify = useCallback(
    (title: string, body?: string) => {
      if (!enabled) return;
      beep();
      if ("Notification" in window && Notification.permission === "granted") {
        try {
          new Notification(title, { body });
        } catch {
          // notifications unavailable
        }
      }
    },
    [enabled],
  );

  return { enabled, enable, disable, notify };
}
