"use client";

import { useEffect, useRef, useState } from "react";
import { attendanceDrafts, draftRecovery, inputSignature, type LocalAttendanceDraft } from "@/lib/attendance-draft";
import type { AttendanceInput } from "@/lib/attendance";

export function useAttendanceDraft({ owner, target, fallbackTarget, base, initial, enabled = true }: {
  owner: string;
  target: string;
  fallbackTarget?: string;
  base: string;
  initial: AttendanceInput;
  enabled?: boolean;
}) {
  const [value, setValue] = useState(initial);
  const [ready, setReady] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [durable, setDurable] = useState(true);
  const [restored, setRestored] = useState(false);
  const [recovery, setRecovery] = useState<LocalAttendanceDraft | null>(null);
  const original = useRef(initial);
  const sourceTarget = useRef(target);

  useEffect(() => {
    if (enabled) {
      let stored = attendanceDrafts.read(owner, target);
      if (!stored.draft && fallbackTarget) {
        stored = attendanceDrafts.read(owner, fallbackTarget);
        if (stored.draft) sourceTarget.current = fallbackTarget;
      }
      if (stored.draft) {
        const action = draftRecovery(stored.draft, base, original.current);
        if (action === "redundant") {
          attendanceDrafts.committed(owner, sourceTarget.current);
        } else if (action === "restore") {
          setValue(stored.draft.value);
          setDirty(true);
          setDurable(stored.durable);
          setRestored(true);
        } else {
          // Never replace a newer account record with an old local backup silently.
          setRecovery(stored.draft);
        }
      }
    }
    setReady(true);
  }, [owner, target, fallbackTarget, base, enabled]);

  function persist(next: AttendanceInput) {
    const same = inputSignature(next) === inputSignature(original.current);
    const saved = same
      ? attendanceDrafts.remove(owner, target)
      : attendanceDrafts.write({ version: 1, owner, target, base, savedAt: Date.now(), value: next });
    if (saved && sourceTarget.current !== target) {
      attendanceDrafts.committed(owner, sourceTarget.current);
    }
    setDirty(!same);
    setDurable(saved);
    return saved;
  }

  function change(next: AttendanceInput) {
    if (!ready || !enabled || recovery || inputSignature(next) === inputSignature(value)) return;
    setValue(next);
    persist(next);
  }

  function discard() {
    if (!attendanceDrafts.remove(owner, target) ||
      (sourceTarget.current !== target && !attendanceDrafts.remove(owner, sourceTarget.current))) {
      setDurable(false);
      return false;
    }
    setValue(original.current);
    setRecovery(null);
    setDirty(false);
    setRestored(false);
    setDurable(true);
    return true;
  }

  function recover() {
    if (!recovery) return;
    setValue(recovery.value);
    persist(recovery.value);
    setRecovery(null);
    setRestored(true);
  }

  function committed() {
    attendanceDrafts.committed(owner, target);
    if (sourceTarget.current !== target) attendanceDrafts.committed(owner, sourceTarget.current);
    original.current = value;
    setDirty(false);
    setRestored(false);
    setDurable(true);
  }

  return {
    value, change, ready, dirty, durable, restored, recovery, discard, recover, committed,
    retry: () => persist(value),
  };
}
