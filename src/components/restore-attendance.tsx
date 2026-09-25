"use client";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { restoreAttendance } from "@/app/actions";
import { dateLabel, yen, type AttendanceRecord } from "@/lib/attendance";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function RestoreAttendance({
  record,
  onClose,
  onSaved,
  returnFocus,
}: {
  record: AttendanceRecord;
  onClose: () => void;
  onSaved: () => Promise<void>;
  returnFocus: () => HTMLElement | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  async function restore() {
    if (busy) return;
    setBusy(true);
    setError("");
    let restored = false;
    try {
      const result = await restoreAttendance(record.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      restored = true;
      await onSaved();
      toast.success(
        "Catatan dipulihkan sebagai draf. Periksa melalui Ubah catatan.",
      );
      onClose();
    } catch {
      setError(
        restored
          ? "Catatan sudah dipulihkan, tetapi tampilan belum diperbarui. Muat ulang halaman."
          : "Catatan belum berhasil dipulihkan. Silakan coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent
        className="dialog-panel"
        initialFocus={heading}
        finalFocus={returnFocus}
      >
        <DialogHeader>
          <DialogTitle ref={heading} tabIndex={-1}>
            Pulihkan catatan absensi?
          </DialogTitle>
          <DialogDescription>
            Catatan akan kembali sebagai draf. Periksa dan selesaikan absensi
            untuk memasukkannya kembali ke perhitungan pendapatan.
          </DialogDescription>
        </DialogHeader>
        <div className="summary-math">
          <strong>{dateLabel(record.attendanceDate, true)}</strong>
          <p>
            Jam kerja {record.clockIn || "—"}–{record.clockOut || "—"}
          </p>
          <p>Tarif saat dicatat tetap {yen(record.hourlyWageYen)}/jam.</p>
        </div>
        <p className="field-help">
          Pemulihan hanya tersedia jika tanggal ini belum memiliki catatan
          aktif.
        </p>
        {error && (
          <p role="alert" className="notice error">
            {error}
          </p>
        )}
        <div className="actions actions-end">
          <button className="btn btn-outline" disabled={busy} onClick={onClose}>
            Batal
          </button>
          <button className="btn btn-primary" disabled={busy} onClick={restore}>
            {busy ? "Memulihkan…" : "Pulihkan sebagai draf"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
