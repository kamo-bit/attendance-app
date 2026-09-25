"use client";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AttendanceFields } from "@/components/attendance-fields";
import { useAttendanceDraft } from "@/components/use-attendance-draft";
import { AttendanceDraftStatus } from "@/components/attendance-draft-status";
import { draftBase, draftTarget } from "@/lib/attendance-draft";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { updateAttendance, deleteAttendance } from "@/app/actions";
import {
  recordToInput,
  validateAttendance,
  calculateAttendance,
  duration,
  yen,
  dateLabel,
  type AttendanceRecord,
} from "@/lib/attendance";

export function EditAttendance({
  record,
  onClose,
  onSaved,
  returnFocus,
}: {
  record: AttendanceRecord;
  onClose: () => void;
  onSaved: (date: string) => Promise<void>;
  returnFocus?: () => HTMLElement | null;
}) {
  const draft = useAttendanceDraft({
    owner: record.userId, target: draftTarget(record.attendanceDate, record),
    fallbackTarget: draftTarget(record.attendanceDate),
    base: draftBase(record.attendanceDate, record), initial: recordToInput(record),
  });
  const { value } = draft;
  const heading = useRef<HTMLHeadingElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { gross, rest, net } = calculateAttendance(value);
  async function save() {
    if (busy || !draft.ready || draft.recovery) return;
    const next = {
      ...value,
      status: value.clockOut ? ("completed" as const) : ("draft" as const),
    };
    const validation = validateAttendance(next);
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    setError("");
    let savedToAccount = false;
    try {
      const result = await updateAttendance(record.id, next);
      if (result.error) {
        setError(result.error);
        return;
      }
      savedToAccount = true;
      draft.committed();
      await onSaved(next.attendanceDate);
      toast.success("Perubahan absensi berhasil disimpan.");
      onClose();
    } catch {
      setError(savedToAccount
        ? "Perubahan tersimpan, tetapi tampilan belum diperbarui. Muat ulang halaman."
        : "Perubahan belum tersimpan ke akun. Silakan coba lagi.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="dialog-panel" initialFocus={heading} finalFocus={returnFocus}>
        <DialogHeader>
          <DialogTitle ref={heading} tabIndex={-1}>Ubah absensi</DialogTitle>
          <DialogDescription>
            Perbarui catatan kerja. Tarif saat dicatat tetap{" "}
            {yen(record.hourlyWageYen)}/jam.
          </DialogDescription>
        </DialogHeader>
        <AttendanceDraftStatus draft={draft} saving={busy} />
        <AttendanceFields
          prefix="edit"
          value={value}
          onChange={(next) => {
            draft.change(next);
            setError("");
          }}
          disabled={busy || !draft.ready || Boolean(draft.recovery)}
        />
        <div className="summary-math">
          <p>
            {duration(gross)} − {duration(rest)} istirahat ={" "}
            <strong>{duration(net)}</strong>
          </p>
          <div className="summary-line">
            <span>Estimasi pendapatan</span>
            <strong>{yen((net * record.hourlyWageYen) / 60)}</strong>
          </div>
        </div>
        {error && (
          <p role="alert" className="notice error">
            {error}
          </p>
        )}
        <div className="actions actions-end">
          <button className="btn btn-outline" disabled={busy} onClick={onClose}>
            Tutup
          </button>
          <button className="btn btn-primary" disabled={busy || !draft.ready || Boolean(draft.recovery)} onClick={save}>
            {busy ? "Menyimpan…" : "Simpan perubahan"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
export function DeleteAttendance({
  record,
  onClose,
  onSaved,
  returnFocus,
}: {
  record: AttendanceRecord;
  onClose: () => void;
  onSaved: () => Promise<void>;
  returnFocus?: () => HTMLElement | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    setBusy(true);
    setError("");
    try {
      await deleteAttendance(record.id);
      await onSaved();
      toast.success("Catatan dihapus dari perhitungan pendapatan.");
      onClose();
    } catch {
      setError("Catatan belum berhasil dihapus. Silakan coba lagi.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="dialog-panel" finalFocus={returnFocus}>
        <DialogHeader>
          <DialogTitle>Hapus catatan absensi ini?</DialogTitle>
          <DialogDescription>
            Catatan ini tidak akan dihitung dalam pendapatan. Aktivitas
            penghapusan tetap tersimpan di Riwayat.
          </DialogDescription>
        </DialogHeader>
        <div className="summary-math">
          <strong>{dateLabel(record.attendanceDate, true)}</strong>
          <p>
            {duration(record.workMinutes)} · {yen(record.estimatedSalaryYen)}
          </p>
        </div>
        {error && (
          <p role="alert" className="error-text">
            {error}
          </p>
        )}
        <div className="actions actions-end">
          <button className="btn btn-outline" disabled={busy} onClick={onClose}>
            Batal
          </button>
          <button className="btn btn-danger" disabled={busy} onClick={remove}>
            {busy ? "Menghapus…" : "Hapus catatan"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
