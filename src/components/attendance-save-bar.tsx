"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2, Info, Save } from "lucide-react";

export function AttendanceSaveBar({ saving, disabled = false, error, onSave }: {
  saving: boolean;
  disabled?: boolean;
  error: string;
  onSave: (status: "draft" | "completed") => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const bar = barRef.current;
    const page = bar?.closest<HTMLElement>(".attendance-page");
    const nav = document.querySelector<HTMLElement>(".bottom-nav");
    if (!bar || !page) return;

    // Reserve the actual occupied space, including wrapped errors, larger text,
    // and the navigation's safe-area inset, so the last field stays reachable.
    const measure = () => {
      page.style.setProperty("--attendance-actions-height", `${bar.getBoundingClientRect().height}px`);
      page.style.setProperty("--attendance-nav-height", `${nav?.getBoundingClientRect().height ?? 0}px`);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    if (nav) observer.observe(nav);
    measure();
    return () => {
      observer.disconnect();
      page.style.removeProperty("--attendance-actions-height");
      page.style.removeProperty("--attendance-nav-height");
    };
  }, []);

  return (
    <div className="attendance-savebar" ref={barRef} role="region" aria-label="Simpan catatan absensi" aria-busy={saving}>
      {error && <div className="notice error" role="alert"><Info aria-hidden="true" /><span>{error}</span></div>}
      <div className="attendance-save-buttons">
        <button className="btn btn-primary" type="button" disabled={saving || disabled} onClick={() => onSave("completed")}>
          <CheckCircle2 aria-hidden="true" /><span>{saving ? "Menyimpan…" : "Simpan absensi"}</span>
        </button>
        <button className="btn btn-secondary" type="button" disabled={saving || disabled} onClick={() => onSave("draft")}>
          <Save aria-hidden="true" /><span>Simpan draf</span>
        </button>
      </div>
      <p className="field-help text-center">Draf belum masuk total pendapatan.</p>
    </div>
  );
}
