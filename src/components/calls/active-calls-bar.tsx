"use client";

import { useEffect, useState } from "react";
import { getActiveCalls } from "@/services/voice-service";
import { useVoiceStore } from "@/stores/voice-store";

export default function ActiveCallsBar() {
  const [count, setCount] = useState(0);
  const lastCallFailed = useVoiceStore((s) => s.lastCallFailed);

  useEffect(() => {
    // If the last outbound attempt failed, don't poll at all.
    if (lastCallFailed) {
      setCount(0);
      return;
    }

    let mounted = true;
    let interval: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      try {
        const data = await getActiveCalls();
        if (mounted) setCount(data.active_calls.length);
      } catch {
        if (mounted) setCount(0);
        // Stop polling on any error to avoid zombie loops.
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
      }
    };

    poll();
    interval = setInterval(poll, 5000);
    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, [lastCallFailed]);

  if (count === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 bg-green-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 z-50 text-sm font-medium">
      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
      {count} Active {count === 1 ? "Call" : "Calls"} Live
    </div>
  );
}
