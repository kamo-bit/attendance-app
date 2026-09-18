"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Wallet,
  Clock3,
  CalendarDays,
  CalendarCheck,
  Pencil,
  Trash2,
  ArrowRight,
  Info,
  Sun,
} from "lucide-react";
import { toast } from "sonner";
import { useWorkspace, WorkspaceState } from "@/components/workspace";
import { WorkCalendar } from "@/components/work-calendar";
import { EditAttendance, DeleteAttendance } from "@/components/edit-attendance";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { saveUserHolidays } from "@/app/actions";
import {
  localDate,
  validDate,
  dateLabel,
  monthLabel,
  payrollMonth,
  payrollPeriod,
  duration,
  yen,
  sumRecords,
  type AttendanceRecord,
} from "@/lib/attendance";

export default function SalarySummaryPage() {
  const workspace = useWorkspace();
  const [mode, setMode] = useState<"monthly" | "yearly">("monthly");
  const [month, setMonth] = useState("");
  const [calendarMonth, setCalendarMonth] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [year, setYear] = useState("");
  const [editing, setEditing] = useState<AttendanceRecord | null>(null);
  const [deleting, setDeleting] = useState<AttendanceRecord | null>(null);
  const [holidayOpen, setHolidayOpen] = useState(false);
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("date");
    const date = requested && validDate(requested) ? requested : localDate();
    setSelectedDate(date);
    setMonth(payrollMonth(date));
    setCalendarMonth(date.slice(0, 7));
    setYear(payrollMonth(date).slice(0, 4));
  }, []);
  if (workspace.loading || workspace.error || !workspace.data || !month)
    return <WorkspaceState error={workspace.error} retry={workspace.retry} />;
  const { records, holidays } = workspace.data;
  const activeRecords = records.filter((r) => r.status !== "deleted");
  const period = payrollPeriod(month);
  const monthlyRecords = activeRecords.filter(
    (r) => r.attendanceDate >= period.start && r.attendanceDate <= period.end,
  );
  const yearlyRecords = activeRecords.filter((r) =>
    payrollMonth(r.attendanceDate).startsWith(year),
  );
  const totals = sumRecords(
    mode === "monthly" ? monthlyRecords : yearlyRecords,
  );
  const selectedRecord = activeRecords.find(
    (r) => r.attendanceDate === selectedDate,
  );
  const months = Array.from({ length: 12 }, (_, index) => {
    const key = `${year}-${String(index + 1).padStart(2, "0")}`;
    return {
      key,
      ...sumRecords(
        yearlyRecords.filter((r) => payrollMonth(r.attendanceDate) === key),
      ),
    };
  });
  const maxSalary = Math.max(1, ...months.map((m) => m.salary));
  function changePeriod(value: string) {
    if (!/^\d{4}-\d{2}$/.test(value)) return;
    setMonth(value);
    setCalendarMonth(value);
    setSelectedDate(`${value}-20`);
  }
  function showMonth(value: string) {
    changePeriod(value);
    setMode("monthly");
  }
  async function saved(date: string) {
    await workspace.reload();
    setMonth(payrollMonth(date));
    setCalendarMonth(date.slice(0, 7));
    setSelectedDate(date);
  }
  const years = [
    ...new Set([
      new Date().getFullYear(),
      ...records.map((r) => Number(payrollMonth(r.attendanceDate).slice(0, 4))),
    ]),
  ].sort((a, b) => b - a);
  return (
    <div className="page">
      <header className="page-heading">
        <div>
          <div className="eyebrow">AbsenKuy / Pendapatan</div>
          <h1>Pendapatan {mode === "monthly" ? "bulanan" : "tahunan"}</h1>
          <p>Pantau jam kerja dan estimasi pendapatanmu dalam satu tempat.</p>
        </div>
        <div className="segment" aria-label="Tampilan pendapatan">
          <button
            aria-pressed={mode === "monthly"}
            onClick={() => setMode("monthly")}
          >
            Bulanan
          </button>
          <button
            aria-pressed={mode === "yearly"}
            onClick={() => setMode("yearly")}
          >
            Tahunan
          </button>
        </div>
      </header>
      <div className="filters">
        {mode === "monthly" ? (
          <div className="actions">
            <label htmlFor="payroll-month" className="field-label">
              Periode gaji
            </label>
            <input
              type="month"
              id="payroll-month"
              className="form-input"
              value={month}
              onChange={(event) => changePeriod(event.target.value)}
            />
          </div>
        ) : (
          <div className="actions">
            <label htmlFor="salary-year" className="field-label">
              Tahun
            </label>
            <select
              id="salary-year"
              className="form-input"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              {years.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        )}
        {mode === "monthly" && (
          <button
            className="btn btn-outline"
            onClick={() => setHolidayOpen(true)}
          >
            <CalendarDays />
            Atur hari libur
          </button>
        )}
      </div>
      <p className="field-help mb-4">
        {mode === "monthly"
          ? `Periode gaji ${monthLabel(month)} · ${dateLabel(period.start)} – ${dateLabel(period.end)}`
          : `12 periode gaji tahun ${year} · setiap periode dimulai tanggal 21 dan berakhir tanggal 20.`}
      </p>
      <div className="metrics">
        <section className="panel metric metric-highlight">
          <h2 className="metric-label">
            <Wallet />
            Estimasi pendapatan
          </h2>
          <p className="metric-value">{yen(totals.salary)}</p>
          <small>Dihitung dari catatan yang selesai</small>
        </section>
        <section className="panel metric">
          <h2 className="metric-label">
            <Clock3 />
            Total jam kerja
          </h2>
          <p className="metric-value metric-duration">
            {duration(totals.minutes).split(/ (?=\d)/).map((part) => (
              <span key={part}>{part}{" "}</span>
            ))}
          </p>
          <small>Setelah dikurangi istirahat</small>
        </section>
        <section className="panel metric panel-coral">
          <h2 className="metric-label">
            <CalendarCheck />
            Hari kerja
          </h2>
          <p className="metric-value">
            {totals.days.toLocaleString("id-ID")} hari
          </p>
          <small>Absensi selesai tercatat</small>
        </section>
      </div>
      {mode === "monthly" ? (
        <div className="calendar-layout">
          <section className="panel">
            <WorkCalendar
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              selected={selectedDate}
              onSelect={setSelectedDate}
              holidays={holidays}
              recorded={activeRecords.map((r) => r.attendanceDate)}
              period={period}
            />
            <p className="field-help mt-4">
              Kalender bisa digeser tanpa mengubah periode gaji di atas.
            </p>
          </section>
          <section
            className="panel panel-gold"
            aria-label="Detail tanggal terpilih"
          >
            <div className="panel-title">
              <span className="icon-tile gold">
                <CalendarDays />
              </span>
              <div>
                <p className="field-help">Tanggal dipilih</p>
                <h2>{dateLabel(selectedDate)}</h2>
              </div>
            </div>
            {(selectedDate < period.start || selectedDate > period.end) && (
              <div className="notice mb-5">
                <Info />
                <p>
                  Tanggal ini berada di luar periode gaji yang dipilih.{" "}
                  <button
                    className="inline-link"
                    onClick={() => setMonth(payrollMonth(selectedDate))}
                  >
                    Lihat periodenya
                  </button>
                </p>
              </div>
            )}
            {holidays.includes(selectedDate) && (
              <p className="status deleted mb-4">
                <Sun size={12} />
                Hari libur
              </p>
            )}
            {selectedRecord ? (
              <>
                <dl className="detail-list">
                  <div>
                    <dt>Jam kerja</dt>
                    <dd>
                      {selectedRecord.clockIn || "—"} –{" "}
                      {selectedRecord.clockOut || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>Istirahat</dt>
                    <dd>
                      {selectedRecord.hasBreak ? (
                        <>
                          {selectedRecord.break1From} –{" "}
                          {selectedRecord.break1To}
                          {selectedRecord.breakCount === 2 && (
                            <>
                              <br />
                              {selectedRecord.break2From} –{" "}
                              {selectedRecord.break2To}
                            </>
                          )}
                        </>
                      ) : (
                        "Tanpa istirahat"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Tarif saat dicatat</dt>
                    <dd>{yen(selectedRecord.hourlyWageYen)}/jam</dd>
                  </div>
                  <div>
                    <dt>Jam kerja bersih</dt>
                    <dd>
                      {selectedRecord.status === "draft"
                        ? "Belum selesai"
                        : duration(selectedRecord.workMinutes)}
                    </dd>
                  </div>
                </dl>
                <div className="earnings-total mt-6">
                  <p>Estimasi pendapatan tanggal ini</p>
                  <strong>
                    {selectedRecord.status === "draft"
                      ? "—"
                      : yen(selectedRecord.estimatedSalaryYen)}
                  </strong>
                  {selectedRecord.status === "draft" && (
                    <p className="mt-2">
                      Draf belum masuk perhitungan pendapatan.
                    </p>
                  )}
                </div>
                <div className="detail-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setEditing(selectedRecord)}
                  >
                    <Pencil />
                    Ubah absensi
                  </button>
                  <button
                    className="text-button text-coral"
                    onClick={() => setDeleting(selectedRecord)}
                  >
                    <Trash2 />
                    Hapus catatan
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-state !px-0 !py-6">
                <Clock3 />
                <h3>Belum ada catatan</h3>
                <p>
                  Catat jam kerja untuk tanggal ini agar pendapatanmu ikut
                  terhitung.
                </p>
                <Link
                  href={`/?date=${selectedDate}`}
                  className="btn btn-primary"
                >
                  Catat absensi
                  <ArrowRight />
                </Link>
              </div>
            )}
          </section>
        </div>
      ) : (
        <section className="panel">
          <div className="panel-title">
            <span className="icon-tile">
              <Wallet />
            </span>
            <h2>Pendapatan per periode gaji</h2>
          </div>
          <div className="year-chart" aria-hidden="true">
            {months.map((m) => (
              <div key={m.key} className="chart-column">
                <div className="chart-track">
                  <div
                    className="chart-bar"
                    style={{
                      height: `${(m.salary / maxSalary) * 100}%`,
                      opacity: m.salary ? 1 : 0.25,
                    }}
                  />
                </div>
                <span>{monthLabel(m.key).split(" ")[0].slice(0, 3)}</span>
              </div>
            ))}
          </div>
          <div className="year-list">
            {months.map((m) => (
              <article className="year-item" key={m.key}>
                <h3>{monthLabel(m.key).split(" ")[0]}</h3>
                <strong>{yen(m.salary)}</strong>
                <p>
                  {m.days
                    ? `${duration(m.minutes)} · ${m.days} hari kerja`
                    : "Belum ada catatan selesai"}
                </p>
                <button
                  className="text-button"
                  onClick={() => showMonth(m.key)}
                >
                  Lihat bulan
                  <ArrowRight />
                </button>
              </article>
            ))}
          </div>
        </section>
      )}
      <div className="notice mt-6">
        <Info />
        <p>
          Estimasi memakai tarif yang tersimpan pada masing-masing catatan. Draf
          dan catatan yang dihapus tidak dihitung.
        </p>
      </div>
      {editing && (
        <EditAttendance
          record={editing}
          onClose={() => setEditing(null)}
          onSaved={saved}
        />
      )}
      {deleting && (
        <DeleteAttendance
          record={deleting}
          onClose={() => setDeleting(null)}
          onSaved={workspace.reload}
        />
      )}
      {holidayOpen && (
        <HolidayEditor
          initial={holidays}
          month={calendarMonth}
          onClose={() => setHolidayOpen(false)}
          onSaved={workspace.reload}
        />
      )}
    </div>
  );
}
function HolidayEditor({
  initial,
  month,
  onClose,
  onSaved,
}: {
  initial: string[];
  month: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [dates, setDates] = useState(initial);
  const [displayMonth, setDisplayMonth] = useState(month);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    setBusy(true);
    setError("");
    try {
      const result = await saveUserHolidays(dates);
      if (result.error) {
        setError(result.error);
        return;
      }
      await onSaved();
      toast.success("Hari libur berhasil disimpan.");
      onClose();
    } catch {
      setError("Hari libur belum tersimpan. Silakan coba lagi.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="dialog-panel">
        <DialogHeader>
          <DialogTitle>Atur hari libur</DialogTitle>
          <DialogDescription>
            Pilih tanggal untuk menandai atau membatalkan hari libur. Catatan
            kerja yang ada tetap tersimpan.
          </DialogDescription>
        </DialogHeader>
        <fieldset disabled={busy} className="min-w-0">
          <WorkCalendar
            holidayMode
            month={displayMonth}
            onMonthChange={setDisplayMonth}
            holidays={dates}
            onSelect={(date) =>
              setDates((current) =>
                current.includes(date)
                  ? current.filter((d) => d !== date)
                  : [...current, date],
              )
            }
          />
        </fieldset>
        <p className="field-help">
          {dates.filter((date) => date.startsWith(displayMonth)).length} hari
          libur dipilih pada bulan ini.
        </p>
        {error && (
          <p role="alert" className="error-text">
            {error}
          </p>
        )}
        <div className="actions actions-end">
          <button className="btn btn-outline" disabled={busy} onClick={onClose}>
            Batal
          </button>
          <button className="btn btn-primary" disabled={busy} onClick={save}>
            {busy ? "Menyimpan…" : "Simpan hari libur"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
