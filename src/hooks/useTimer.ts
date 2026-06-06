"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";

export function useTimer() {
  const isRunning = useAppStore((s) => s.isRunning);
  const tick = useAppStore((s) => s.tick);
  const setRunning = useAppStore((s) => s.setRunning);

  useEffect(() => {
    if (!isRunning) return;

    const id = setInterval(() => {
      const { remainingSeconds } = useAppStore.getState();
      if (remainingSeconds <= 1) {
        tick();
        setRunning(false);
        return;
      }
      tick();
    }, 1000);

    return () => clearInterval(id);
  }, [isRunning, tick, setRunning]);
}
