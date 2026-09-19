"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Clock3,
  ReceiptText,
  CheckCircle2,
  Save,
  Info,
  CalendarDays,
  ArrowRight,
  History as HistoryIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useWorkspace, WorkspaceState } from "@/components/workspace";
import { AttendanceFields } from "@/components/attendance-fields";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { saveAttendance, updateSalarySettings } from "@/app/actions";
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
    <div className="page">
      <div className="eyebrow">AbsenKuy / Catatan harian</div>
      <header className="page-heading">
        <div>
          <h1>{date === localDate() ? "Absensi hari ini" : "Catat absensi"}</h1>
          <p>
            Catat jam kerja dan istirahat untuk menghitung estimasi pendapatan.
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
  const [wageInput, setWageInput] = useState(String(wage));
  const [saving, setSaving] = useState(false);
  const [savingWage, setSavingWage] = useState(false);
  const [error, setError] = useState("");
  const [wageError, setWageError] = useState("");
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
  async function saveRate() {
    setWageError("");
    setSavingWage(true);
    try {
      const result = await updateSalarySettings(Number(wageInput));
      if (result.error) {
        setWageError(result.error);
        return;
      }
      await reload();
      toast.success("Tarif baru berhasil disimpan.");
    } catch {
      setWageError("Tarif belum tersimpan. Silakan coba lagi.");
    } finally {
      setSavingWage(false);
    }
  }
  async function save(status: "draft" | "completed", confirmed = false) {
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
        <section className="panel">
          <div className="panel-title">
            <span className="icon-tile">
              <Clock3 />
            </span>
            <h2>Jam kerja</h2>
          </div>
          {defaults.sourceDate && (
            <div className="notice mb-5">
              <HistoryIcon />
              <p>
                Nilai awal dari {dateLabel(defaults.sourceDate)}. Sesuaikan jika
                jam kerja atau istirahat tanggal ini berbeda.
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
              <span>Draf tersimpan. Lengkapi catatan lalu simpan absensi.</span>
            </div>
          )}
          <p className="field-help mt-5">
            Jam masuk dan pulang dicatat pada tanggal yang sama.
          </p>
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
          <div className="field">
            <label htmlFor="hourly-wage">Upah per jam</label>
            <div className="wage-control">
              <div className="money-input">
                <span aria-hidden="true">¥</span>
                <input
                  className="form-input"
                  id="hourly-wage"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="1000000"
                  step="1"
                  value={wageInput}
                  onChange={(e) => setWageInput(e.target.value)}
                  aria-describedby="wage-help"
                  aria-invalid={Boolean(wageError)}
                />
              </div>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={saveRate}
                disabled={savingWage || Number(wageInput) === wage}
              >
                {savingWage ? "Menyimpan…" : "Simpan tarif"}
              </button>
            </div>
            <p id="wage-help" className="field-help">
              Catatan tersimpan tetap memakai tarif saat dicatat.
            </p>
            {record && (
              <p className="field-help">
                Tarif catatan ini: <strong>{yen(rate)}/jam</strong>
              </p>
            )}
            {Number(wageInput) !== wage && (
              <p className="field-help">Perubahan tarif belum disimpan.</p>
            )}
            {wageError && (
              <p className="error-text" role="alert">
                {wageError}
              </p>
            )}
          </div>
          <div className="earnings-total" aria-live="polite">
            <p>ESTIMASI PENDAPATAN</p>
            <strong>{yen(Math.floor((net * rate) / 60))}</strong>
            <p className="mt-2">
              {duration(net)} × {yen(rate)}/jam
            </p>
          </div>
          {error && (
            <div role="alert" className="notice error">
              <Info />
              <span>{error}</span>
            </div>
          )}
          {complete ? (
            <Link
              className="btn btn-secondary"
              href={`/salary-summary?date=${date}`}
            >
              Lihat catatan di Pendapatan
              <ArrowRight />
            </Link>
          ) : (
            <div className="grid gap-3">
              <button
                type="button"
                className="btn btn-primary btn-full"
                onClick={() => save("completed")}
                disabled={saving || savingWage}
              >
                <CheckCircle2 />
                {saving ? "Menyimpan…" : "Simpan absensi"}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-full"
                onClick={() => save("draft")}
                disabled={saving || savingWage}
              >
                <Save />
                Simpan draf
              </button>
              <p className="field-help text-center">
                Draf belum dihitung dalam total pendapatan.
              </p>
            </div>
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
