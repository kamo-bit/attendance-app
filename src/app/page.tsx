"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Clock3,
  ReceiptText,
  CheckCircle2,
  Save,
  CalendarDays,
  ArrowRight,
  History as HistoryIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useWorkspace, WorkspaceState } from "@/components/workspace";
import { AttendanceFields } from "@/components/attendance-fields";
import { AttendanceSaveBar } from "@/components/attendance-save-bar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { saveAttendance } from "@/app/actions";
import {
  type AttendanceRecord,
  type AttendanceInput,
  attendanceFormDefaults,
  localDate,
  validDate,
  dateLabel,
  calculateAttendance,
  duration,
  yen,
  validateAttendance,
} from "@/lib/attendance";

export default function Home() {
  const workspace = useWorkspace();
  const [date, setDate] = useState("");
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("date");
    setDate(requested && validDate(requested) ? requested : localDate());
  }, []);
  if (workspace.loading || workspace.error || !workspace.data || !date)
    return <WorkspaceState error={workspace.error} retry={workspace.retry} />;
  const record = workspace.data.records.find(
    (r) => r.attendanceDate === date && r.status !== "deleted",
  );
  const defaults = attendanceFormDefaults(date, workspace.data.records);
  return (
    <div className="page attendance-page">
      <div className="eyebrow">AbsenKuy / Catatan harian</div>
      <header className="page-heading">
        <div>
          <h1>{date === localDate() ? "Absensi hari ini" : "Catat absensi"}</h1>
          <p>
            Catat jam kerja dan lihat estimasi pendapatan.
          </p>
        </div>
        <span className="ribbon">
          <CalendarDays size={15} />
          {dateLabel(date)}
        </span>
      </header>
      <AttendanceEditor
        key={`${date}-${record?.updatedAt || "new"}`}
        date={date}
        onDateChange={setDate}
        record={record}
        defaults={defaults}
        wage={workspace.data.wage}
        holidays={workspace.data.holidays}
        reload={workspace.reload}
      />
    </div>
  );
}

function AttendanceEditor({
  date,
  onDateChange,
  record,
  defaults,
  wage,
  holidays,
  reload,
}: {
  date: string;
  onDateChange: (date: string) => void;
  record?: AttendanceRecord;
  defaults: ReturnType<typeof attendanceFormDefaults>;
  wage: number;
  holidays: string[];
  reload: () => Promise<void>;
}) {
  const [value, setValue] = useState<AttendanceInput>(defaults.value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [holidayStatus, setHolidayStatus] = useState<
    "draft" | "completed" | null
  >(null);
  const complete = record?.status === "completed";
  const rate = record?.hourlyWageYen ?? wage;
  const { gross, rest, net } = calculateAttendance(value);
  function change(next: AttendanceInput) {
    setError("");
    if (next.attendanceDate && next.attendanceDate !== date)
      onDateChange(next.attendanceDate);
    else setValue(next);
  }
  async function save(status: "draft" | "completed", confirmed = false) {
    if (saving) return;
    const next = { ...value, status };
    const validation = validateAttendance(next);
    if (validation) {
      setError(validation);
      return;
    }
    if (holidays.includes(date) && !confirmed) {
      setHolidayStatus(status);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await saveAttendance(next);
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success(
        status === "completed"
          ? "Absensi berhasil disimpan."
          : "Draf berhasil disimpan. Lengkapi jam pulang saat selesai bekerja.",
      );
      await reload();
    } catch {
      setError("Absensi belum tersimpan. Periksa koneksi dan coba lagi.");
    } finally {
      setSaving(false);
      setHolidayStatus(null);
    }
  }
  return (
    <>
      <div className="attendance-grid">
        <section className="panel attendance-form-panel">
          <div className="panel-title">
            <span className="icon-tile">
              <Clock3 />
            </span>
            <h2>Jam kerja</h2>
          </div>
          {defaults.sourceDate && (
            <div className="notice attendance-source">
              <HistoryIcon />
              <p>
                Jam awal dari {dateLabel(defaults.sourceDate)}. Sesuaikan jika berbeda.
              </p>
            </div>
          )}
          <AttendanceFields
            value={value}
            onChange={change}
            disabled={saving}
            readOnly={complete}
          />
          {complete && (
            <div className="notice mt-5">
              <CheckCircle2 />
              <div>
                Absensi tanggal ini sudah selesai.{" "}
                <Link
                  className="inline-link"
                  href={`/salary-summary?date=${date}`}
                >
                  Ubah melalui Pendapatan
                </Link>
                .
              </div>
            </div>
          )}
          {record?.status === "draft" && (
            <div className="notice mt-5">
              <Save />
              <span>Draf tersimpan. Lengkapi saat selesai bekerja.</span>
            </div>
          )}
        </section>
        <section
          className="panel panel-gold stack"
          aria-label="Ringkasan harian"
        >
          <div className="panel-title mb-0">
            <span className="icon-tile gold">
              <ReceiptText />
            </span>
            <h2>Ringkasan harian</h2>
          </div>
          <div className="summary-math">
            <div className="summary-line">
              <span>Rentang jam kerja</span>
              <strong>{duration(gross)}</strong>
            </div>
            <div className="summary-line">
              <span>Total istirahat</span>
              <strong className="text-coral">− {duration(rest)}</strong>
            </div>
            <div className="summary-line summary-total">
              <span>Jam kerja bersih</span>
              <strong>{duration(net)}</strong>
            </div>
          </div>
          <div className="attendance-rate">
            <div className="summary-line">
              <span>{record ? "Tarif catatan ini" : "Tarif per jam"}</span>
              <strong>{yen(rate)}/jam</strong>
            </div>
            <Link className="text-button" href="/settings#settings-work">
              Ubah tarif default di Pengaturan <ArrowRight aria-hidden="true" />
            </Link>
            {record && <p className="field-help">Tarif catatan tersimpan tetap sama.</p>}
          </div>
          <div className="earnings-total" aria-live="polite">
            <p>ESTIMASI PENDAPATAN</p>
            <strong>{yen(Math.floor((net * rate) / 60))}</strong>
            <p className="mt-2">
              {duration(net)} × {yen(rate)}/jam
            </p>
          </div>
          {complete ? (
            <Link
              className="btn btn-secondary"
              href={`/salary-summary?date=${date}`}
            >
              Lihat catatan di Pendapatan
              <ArrowRight />
            </Link>
          ) : (
            <AttendanceSaveBar saving={saving} error={error} onSave={save} />
          )}
        </section>
      </div>
      <Dialog
        open={Boolean(holidayStatus)}
        onOpenChange={(open) => !open && !saving && setHolidayStatus(null)}
      >
        <DialogContent className="dialog-panel">
          <DialogHeader>
            <DialogTitle>Tanggal ini ditandai hari libur</DialogTitle>
            <DialogDescription>
              {dateLabel(date, true)} ada di daftar hari liburmu. Kamu tetap
              bisa mencatat jam kerja pada tanggal ini.
            </DialogDescription>
          </DialogHeader>
          <div className="actions actions-end">
            <button
              className="btn btn-outline"
              disabled={saving}
              onClick={() => setHolidayStatus(null)}
            >
              Batal
            </button>
            <button
              className="btn btn-primary"
              disabled={saving}
              onClick={() => holidayStatus && save(holidayStatus, true)}
            >
              {saving ? "Menyimpan…" : "Tetap simpan"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
