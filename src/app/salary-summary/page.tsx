"use client";
import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import {
  Wallet,
  Clock3,
  CalendarDays,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { useWorkspace, WorkspaceState } from "@/components/workspace";
import { WorkCalendar } from "@/components/work-calendar";
import { SalaryDeductions } from "@/components/salary-deductions";
import { useJstDate } from "@/components/use-jst-date";
import { estimateYen, jstDate, latestClosedPayrollMonth, salaryEstimate } from "@/lib/salary-estimate";
import { EditAttendance, DeleteAttendance } from "@/components/edit-attendance";
import { AttendanceDateDetails } from "@/components/attendance-date-details";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  changePayrollPeriod,
  isInPayrollPeriod,
  payrollCalendarMonths,
  payrollRangeLabel,
  payrollViewForDate,
  type PayrollCalendarView,
} from "@/lib/payroll-calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { saveUserHolidays } from "@/app/actions";
import {
  validDate,
  dateLabel,
  monthLabel,
  payrollMonth,
  payrollPeriod,
  moveMonth,
  duration,
  yen,
  sumRecords,
  type AttendanceRecord,
} from "@/lib/attendance";

const mobileQuery = "(max-width: 767px)";
function subscribeMobile(callback: () => void) {
  const query = window.matchMedia(mobileQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
const getMobileSnapshot = () => window.matchMedia(mobileQuery).matches;
const getServerSnapshot = () => false;

export default function SalarySummaryPage() {
  const workspace = useWorkspace();
  const today = useJstDate();
  const [mode, setMode] = useState<"monthly" | "yearly">("monthly");
  const [view, setView] = useState<PayrollCalendarView>({
    month: "",
    calendarMonth: "",
    selectedDate: "",
  });
  const { month, calendarMonth, selectedDate } = view;
  const [detailOpen, setDetailOpen] = useState(false);
  const mobile = useSyncExternalStore(
    subscribeMobile,
    getMobileSnapshot,
    getServerSnapshot,
  );
  const calendarTrigger = useRef<HTMLButtonElement | null>(null);
  const calendarHeading = useRef<HTMLHeadingElement>(null);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const [year, setYear] = useState("");
  const [editing, setEditing] = useState<AttendanceRecord | null>(null);
  const [deleting, setDeleting] = useState<AttendanceRecord | null>(null);
  const [holidayOpen, setHolidayOpen] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("date");
    const requestedPeriod = params.get("period");
    const date = requested && validDate(requested) ? requested
      : requestedPeriod && validDate(`${requestedPeriod}-20`) ? `${requestedPeriod}-20`
      : jstDate();
    setView(payrollViewForDate(date));
    setYear(payrollMonth(date).slice(0, 4));
    const query = window.matchMedia(mobileQuery);
    setDetailOpen(Boolean(requested && validDate(requested) && query.matches));
    const closeOnDesktop = () => {
      if (!query.matches) setDetailOpen(false);
    };
    query.addEventListener("change", closeOnDesktop);
    return () => query.removeEventListener("change", closeOnDesktop);
  }, []);
  if (workspace.loading || workspace.error || !workspace.data || !month || !today)
    return <WorkspaceState error={workspace.error} retry={workspace.retry} />;
  const { records, holidays } = workspace.data;
  const activeRecords = records.filter((r) => r.status !== "deleted");
  const period = payrollPeriod(month);
  const estimate = salaryEstimate(month, records, today);
  const lastClosedMonth = latestClosedPayrollMonth(today);
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
      estimate: salaryEstimate(key, records, today),
      ...sumRecords(
        yearlyRecords.filter((r) => payrollMonth(r.attendanceDate) === key),
      ),
    };
  });
  const maxSalary = Math.max(1, ...months.map((m) => m.salary));
  function changePeriod(value: string) {
    const next = changePayrollPeriod(view, value, today);
    if (next === view) return;
    setView(next);
    setYear(next.month.slice(0, 4));
    setDetailOpen(false);
  }
  function showMonth(value: string) {
    changePeriod(value);
    setMode("monthly");
  }
  async function saved(date: string) {
    await workspace.reload();
    setView(payrollViewForDate(date));
    setYear(payrollMonth(date).slice(0, 4));
    const url = new URL(window.location.href);
    url.searchParams.set("date", date);
    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }
  function setCalendarMonth(value: string) {
    setView((current) => ({ ...current, calendarMonth: value }));
  }
  const calendarMonths = payrollCalendarMonths(month);
  const calendarOutside = !calendarMonths.some(
    (part) => part.month === calendarMonth,
  );
  const returnToCalendar = () =>
    calendarTrigger.current?.isConnected
      ? calendarTrigger.current
      : calendarHeading.current;
  const detailContent = (
    <AttendanceDateDetails
      selectedDate={selectedDate}
      selectedRecord={selectedRecord}
      holiday={holidays.includes(selectedDate)}
      month={month}
      onShowPeriod={() => {
        setView(payrollViewForDate(selectedDate));
        setYear(payrollMonth(selectedDate).slice(0, 4));
      }}
      onEdit={setEditing}
      onDelete={setDeleting}
    />
  );
  const recordDialogs = (
    <>
      {editing && (
        <EditAttendance
          record={editing}
          onClose={() => setEditing(null)}
          onSaved={saved}
          returnFocus={() => detailHeading.current}
        />
      )}
      {deleting && (
        <DeleteAttendance
          record={deleting}
          onClose={() => setDeleting(null)}
          onSaved={workspace.reload}
          returnFocus={() => detailHeading.current}
        />
      )}
    </>
  );
  const years = [
    ...new Set([
      new Date().getFullYear(),
      Number(year),
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
      {mode === "monthly" ? (
        <section
          className="panel payroll-period"
          aria-label="Periode gaji terpilih"
        >
          <div>
            <p className="field-label">Periode gaji {monthLabel(month)}</p>
            <h2 className="payroll-period-range" aria-live="polite">
              {payrollRangeLabel(month)}
            </h2>
            <p className="field-help">
              Tanggal kerja yang dihitung dalam ringkasan di bawah.
            </p>
            {month !== lastClosedMonth && (
              <button className="text-button mt-3" onClick={() => showMonth(lastClosedMonth)}>
                Lihat periode terakhir selesai <ArrowRight aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="payroll-period-controls">
            <button
              className="icon-button"
              aria-label="Periode gaji sebelumnya"
              onClick={() => changePeriod(moveMonth(month, -1))}
            >
              <ChevronLeft />
            </button>
            <label className="sr-only" htmlFor="payroll-month">
              Ubah periode gaji
            </label>
            <input
              type="month"
              id="payroll-month"
              className="form-input"
              value={month}
              onChange={(event) => changePeriod(event.target.value)}
            />
            <button
              className="icon-button"
              aria-label="Periode gaji berikutnya"
              onClick={() => changePeriod(moveMonth(month, 1))}
            >
              <ChevronRight />
            </button>
          </div>
        </section>
      ) : (
        <>
          <div className="filters">
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
          </div>
          <p className="field-help mb-4">
            12 periode gaji tahun {year} · setiap periode dimulai tanggal 21 dan
            berakhir tanggal 20.
          </p>
        </>
      )}
      <div className="metrics">
        <section className="panel metric metric-highlight">
          <h2 className="metric-label">
            <Wallet />
            {mode === "monthly" && estimate.net !== null
              ? estimate.net < 0 ? "Selisih estimasi" : "Perkiraan gaji bersih"
              : "Estimasi pendapatan kotor"}
          </h2>
          <p className="metric-value">{estimateYen(mode === "monthly" && estimate.net !== null ? estimate.net : totals.salary)}</p>
          <small>{mode === "monthly" && estimate.net !== null
            ? estimate.net < 0 ? "Periksa kelengkapan absensi · bukan tagihan" : "Setelah estimasi potongan otomatis"
            : "Dihitung dari catatan yang selesai"}</small>
        </section>
        <section className="panel metric">
          <h2 className="metric-label">
            <Clock3 />
            Total jam kerja
          </h2>
          <p className="metric-value metric-duration">
            {duration(totals.minutes)
              .split(/ (?=\d)/)
              .map((part) => (
                <span key={part}>{part} </span>
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
      {mode === "monthly" && <SalaryDeductions estimate={estimate} />}
      {mode === "monthly" ? (
        <div className="calendar-layout">
          <section className="panel">
            <div className="payroll-calendar-heading">
              <h2 ref={calendarHeading} tabIndex={-1}>
                Kalender kerja
              </h2>
              <button
                className="text-button"
                onClick={() => setHolidayOpen(true)}
              >
                <CalendarDays /> Atur hari libur
              </button>
            </div>
            <p className="field-help">
              Periode terpilih: <strong>{payrollRangeLabel(month)}</strong>
            </p>
            <div
              className="payroll-calendar-months"
              role="group"
              aria-label="Bulan dalam periode gaji"
            >
              {calendarMonths.map((part) => (
                <button
                  key={part.month}
                  aria-pressed={calendarMonth === part.month}
                  aria-label={`Tampilkan ${monthLabel(part.month)}, tanggal ${Number(part.start.slice(8))} sampai ${Number(part.end.slice(8))}`}
                  onClick={() => setCalendarMonth(part.month)}
                >
                  <strong>{monthLabel(part.month)}</strong>
                  <span>
                    Tanggal {Number(part.start.slice(8))}–
                    {Number(part.end.slice(8))}
                  </span>
                </button>
              ))}
            </div>
            {calendarOutside && (
              <div className="notice mb-4">
                <Info />
                <p>
                  Bulan kalender ini di luar periode terpilih. Ringkasan tetap
                  untuk {payrollRangeLabel(month)}.{" "}
                  <button
                    className="inline-link"
                    onClick={() =>
                      setCalendarMonth(
                        isInPayrollPeriod(selectedDate, month)
                          ? selectedDate.slice(0, 7)
                          : calendarMonths[0].month,
                      )
                    }
                  >
                    Kembali ke periode
                  </button>
                </p>
              </div>
            )}
            <WorkCalendar
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              selected={selectedDate}
              onSelect={(date, trigger) => {
                calendarTrigger.current = trigger;
                setView((current) => ({ ...current, selectedDate: date }));
                if (mobile) setDetailOpen(true);
              }}
              detailsDialog={mobile}
              detailsOpen={detailOpen}
              holidays={holidays}
              recorded={activeRecords
                .filter((r) => r.status === "completed")
                .map((r) => r.attendanceDate)}
              drafts={activeRecords
                .filter((r) => r.status === "draft")
                .map((r) => r.attendanceDate)}
              period={period}
            />
            <p className="field-help mt-4">
              {mobile
                ? "Ketuk tanggal untuk melihat detail. "
                : "Pilih tanggal untuk melihat detail. "}
              Menggeser bulan kalender tidak mengubah periode gaji.
            </p>
          </section>
          {mobile ? (
            <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
              <SheetContent
                side="bottom"
                className="attendance-detail-sheet"
                initialFocus={detailHeading}
                finalFocus={returnToCalendar}
              >
                <SheetHeader>
                  <SheetDescription>Detail tanggal terpilih</SheetDescription>
                  <SheetTitle ref={detailHeading} tabIndex={-1}>
                    {dateLabel(selectedDate, true)}
                  </SheetTitle>
                </SheetHeader>
                {detailContent}
                {recordDialogs}
              </SheetContent>
            </Sheet>
          ) : (
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
                  <h2 ref={detailHeading} tabIndex={-1}>
                    {dateLabel(selectedDate)}
                  </h2>
                </div>
              </div>
              {detailContent}
              {recordDialogs}
            </section>
          )}
        </div>
      ) : (
        <section className="panel">
          <div className="panel-title">
            <span className="icon-tile">
              <Wallet />
            </span>
            <h2>Pendapatan kotor per periode gaji</h2>
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
                {m.estimate.net !== null && <p className="year-net">{m.estimate.net < 0 ? "Selisih estimasi" : "Estimasi bersih"}: {estimateYen(m.estimate.net)}</p>}
                <p>
                  {m.days
                    ? `${duration(m.minutes)} · ${m.days} hari kerja`
                    : "Belum ada catatan selesai"}
                </p>
                <button
                  className="text-button"
                  onClick={() => showMonth(m.key)}
                >
                  Lihat periode
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
