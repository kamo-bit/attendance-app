"use client";
import { useEffect, useState } from "react";
import { jstDate } from "@/lib/salary-estimate";

// Refresh at midnight in Japan, also when a sleeping/background tab is resumed.
export function useJstDate() {
  const [today, setToday] = useState("");
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      clearTimeout(timer);
      const now = new Date();
      const date = jstDate(now);
      setToday(date);
      const midnight = Date.parse(`${date}T00:00:00+09:00`) + 86_400_000;
      timer = setTimeout(update, Math.max(1, midnight - now.getTime()));
    };
    update();
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return today;
}
