"use client";

import { useState } from "react";
import { CloudOff, HardDrive, LoaderCircle } from "lucide-react";
import type { useAttendanceDraft } from "@/components/use-attendance-draft";

export function AttendanceDraftStatus({ draft, saving = false }: {
  draft: ReturnType<typeof useAttendanceDraft>;
  saving?: boolean;
}) {
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  if (!draft.ready) return null;
  const error = !draft.durable;
  const title = saving ? "Menyimpan ke akun…" : error ? "Belum disimpan di perangkat"
    : draft.recovery ? "Periksa draf sebelumnya"
    : draft.dirty ? "Draf tersimpan di perangkat ini" : "Autosave draf aktif";
  const Icon = saving ? LoaderCircle : error ? CloudOff : HardDrive;

  return (
    <div className={`attendance-draft-status ${error ? "draft-storage-error" : ""}`}>
      <div className="draft-status-heading" role="status" aria-live="polite">
        <Icon aria-hidden="true" size={16} /><strong>{title}</strong>
      </div>
      <p className="field-help">
        {error ? "Penyimpanan browser tidak tersedia. Input hanya aman selama tab ini terbuka. Simpan ke akun sebelum menutupnya."
          : draft.restored ? "Input sebelumnya dipulihkan. Periksa lalu simpan ke akun."
          : draft.recovery ? "Draf sebelumnya belum diterapkan."
          : draft.dirty ? "Belum mengubah catatan akun atau total pendapatan. Bisa dilanjutkan di browser ini."
          : "Perubahan berikutnya akan dicadangkan otomatis di browser ini."}
      </p>
      {draft.recovery && (
        <div className="draft-recovery" role="alert">
          <p>Catatan akun telah berubah sejak draf ini dibuat. Pulihkan draf untuk meninjaunya, atau buang dan gunakan catatan terbaru.</p>
          <button className="text-button" disabled={saving} onClick={draft.recover}>Pulihkan draf</button>
        </div>
      )}
      {confirmDiscard ? (
        <div className="draft-recovery">
          <p>Buang perubahan di perangkat ini? Catatan akun tetap sama.</p>
          <div className="actions">
            <button className="text-button" disabled={saving} onClick={() => setConfirmDiscard(false)}>Pertahankan draf</button>
            <button className="text-button text-coral" disabled={saving} onClick={() => {
              if (draft.discard()) setConfirmDiscard(false);
            }}>Ya, buang draf</button>
          </div>
        </div>
      ) : (
        <div className="actions">
          {(draft.dirty || draft.recovery) && <button className="text-button" disabled={saving} onClick={() => setConfirmDiscard(true)}>Buang draf lokal</button>}
          {error && !draft.recovery && <button className="text-button" disabled={saving} onClick={draft.retry}>Coba simpan di perangkat</button>}
        </div>
      )}
    </div>
  );
}
