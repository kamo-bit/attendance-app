import { recordToInput, type AttendanceInput, type AttendanceRecord } from "./attendance";

export type LocalAttendanceDraft = {
  version: 1;
  owner: string;
  target: string;
  base: string;
  savedAt: number;
  value: AttendanceInput;
};

const fields = [
  "attendanceDate", "clockIn", "clockOut", "break1From", "break1To",
  "break2From", "break2To",
] as const;

// Compare editable fields only: a local backup must never finalize attendance.
export function inputSignature(value: AttendanceInput) {
  return JSON.stringify([
    ...fields.map((field) => value[field]), value.hasBreak, value.breakCount,
  ]);
}

export function draftTarget(date: string, record?: AttendanceRecord) {
  return record ? `record:${record.id}` : `date:${date}`;
}

export function draftBase(date: string, record?: AttendanceRecord) {
  return record
    ? JSON.stringify([record.id, new Date(record.updatedAt).toISOString(), record.status, inputSignature(recordToInput(record))])
    : `new:${date}`;
}

export function draftKey(owner: string, target: string) {
  return `absenkuy:attendance-draft:v1:${encodeURIComponent(owner)}:${encodeURIComponent(target)}`;
}

export function parseDraft(raw: string | null, owner: string, target: string): LocalAttendanceDraft | null {
  if (!raw || raw.length > 16_384) return null;
  try {
    const draft = JSON.parse(raw);
    const value = draft?.value;
    if (draft?.version !== 1 || draft.owner !== owner || draft.target !== target ||
      typeof draft.base !== "string" || draft.base.length > 1024 ||
      !Number.isFinite(draft.savedAt) || !value ||
      !fields.every((field) => typeof value[field] === "string" && value[field].length <= 10) ||
      typeof value.hasBreak !== "boolean" || ![0, 1, 2].includes(value.breakCount)) return null;
    // Keep partial/invalid input recoverable; normal form validation runs on submit.
    return {
      version: 1, owner, target, base: draft.base, savedAt: draft.savedAt,
      value: {
        attendanceDate: value.attendanceDate, clockIn: value.clockIn, clockOut: value.clockOut,
        hasBreak: value.hasBreak, breakCount: value.breakCount,
        break1From: value.break1From, break1To: value.break1To,
        break2From: value.break2From, break2To: value.break2To, status: "draft",
      },
    };
  } catch {
    return null;
  }
}

export function draftRecovery(draft: LocalAttendanceDraft, base: string, initial: AttendanceInput) {
  if (inputSignature(draft.value) === inputSignature(initial)) return "redundant";
  return draft.base === base ? "restore" : "review";
}

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export class AttendanceDraftStore {
  // If storage is unavailable, retain input across client navigation and warn
  // before closing the browser. This is not presented as a durable save.
  private volatile = new Map<string, LocalAttendanceDraft>();

  constructor(private storage: () => DraftStorage) {}

  read(owner: string, target: string) {
    const key = draftKey(owner, target);
    const memory = this.volatile.get(key);
    if (memory) return { draft: memory, durable: false };
    try {
      return { draft: parseDraft(this.storage().getItem(key), owner, target), durable: true };
    } catch {
      return { draft: null, durable: false };
    }
  }

  write(draft: LocalAttendanceDraft) {
    const key = draftKey(draft.owner, draft.target);
    const safe = parseDraft(JSON.stringify(draft), draft.owner, draft.target);
    if (!safe) return false;
    try {
      this.storage().setItem(key, JSON.stringify(safe));
      this.volatile.delete(key);
      return true;
    } catch {
      this.volatile.set(key, safe);
      return false;
    }
  }

  remove(owner: string, target: string) {
    const key = draftKey(owner, target);
    try {
      this.storage().removeItem(key);
      this.volatile.delete(key);
      return true;
    } catch {
      return false;
    }
  }

  committed(owner: string, target: string) {
    this.remove(owner, target);
    // A successful account save is durable even if local cleanup fails.
    this.volatile.delete(draftKey(owner, target));
  }

  hasVolatileDrafts() {
    return this.volatile.size > 0;
  }
}

export const attendanceDrafts = new AttendanceDraftStore(() => window.localStorage);
