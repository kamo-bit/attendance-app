"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  History,
  Info,
  Pencil,
  SearchX,
  RotateCcw,
} from "lucide-react";
import {
  useWorkspace,
  WorkspaceState,
  StatusBadge,
} from "@/components/workspace";
import { EditAttendance } from "@/components/edit-attendance";
import { RestoreAttendance } from "@/components/restore-attendance";
import {
  defaultHistoryFilters,
  filterAttendanceHistory,
  historyRangeError,
  type HistoryFilters,
} from "@/lib/attendance-history";
import {
  dateLabel,
  duration,
  monthLabel,
  validDate,
  yen,
  type AttendanceRecord,
} from "@/lib/attendance";

function breaks(record: AttendanceRecord) {
  if (!record.hasBreak) return "Tanpa istirahat";
  return [
    `${record.break1From || "—"}–${record.break1To || "—"}`,
    ...(record.breakCount === 2
      ? [`${record.break2From || "—"}–${record.break2To || "—"}`]
      : []),
  ].join(" · ");
}
function updated(record: AttendanceRecord) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(record.updatedAt));
}
export default function HistoryPage() {
  const workspace = useWorkspace();
  const [filters, setFilters] = useState<HistoryFilters>(defaultHistoryFilters);
  const [restoring, setRestoring] = useState<AttendanceRecord | null>(null);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AttendanceRecord | null>(null);
  const editTrigger = useRef<HTMLButtonElement | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  if (workspace.loading || workspace.error || !workspace.data)
    return <WorkspaceState error={workspace.error} retry={workspace.retry} />;
  const rangeError = historyRangeError(filters);
  const records = filterAttendanceHistory(workspace.data.records, filters);
  const hasFilters = Object.keys(defaultHistoryFilters).some(
    (key) =>
      filters[key as keyof HistoryFilters] !==
      defaultHistoryFilters[key as keyof HistoryFilters],
  );
  function changeFilters(next: Partial<HistoryFilters>) {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1);
  }
  function resetFilters() {
    setFilters(defaultHistoryFilters);
    setPage(1);
    heading.current?.focus();
  }
  const returnFocus = () =>
    editTrigger.current?.isConnected &&
    editTrigger.current.getClientRects().length
      ? editTrigger.current
      : heading.current;
  const dateFilterDescription = [
    filters.month ? monthLabel(filters.month) : "",
    validDate(filters.from) ? `Dari ${dateLabel(filters.from)}` : "",
    validDate(filters.to) ? `Sampai ${dateLabel(filters.to)}` : "",
    filters.activity !== "all" ? filters.activity : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const pages = Math.max(1, Math.ceil(records.length / 10));
  const currentPage = Math.min(page, pages);
  const visible = records.slice((currentPage - 1) * 10, currentPage * 10);
  const recordActions = (record: AttendanceRecord) =>
    record.status !== "deleted" ? (
      <div className="history-record-actions">
        <button
          className="text-button"
          aria-label={`Ubah catatan ${dateLabel(record.attendanceDate)}`}
          onClick={(event) => {
            editTrigger.current = event.currentTarget;
            setEditing(record);
          }}
        >
          <Pencil aria-hidden="true" /> Ubah catatan
        </button>
        <Link
          href={`/salary-summary?date=${record.attendanceDate}`}
          className="text-button"
          aria-label={`Lihat pendapatan ${dateLabel(record.attendanceDate)}`}
        >
          Lihat <ArrowUpRight aria-hidden="true" />
        </Link>
      </div>
    ) : (
      <button
        className="text-button"
        aria-label={`Pulihkan catatan ${dateLabel(record.attendanceDate)}`}
        onClick={(event) => {
          editTrigger.current = event.currentTarget;
          setRestoring(record);
        }}
      >
        <RotateCcw aria-hidden="true" /> Pulihkan
      </button>
    );
  return (
    <div className="page">
      <header className="page-heading">
        <div>
          <div className="eyebrow">AbsenKuy / Riwayat</div>
          <h1 ref={heading} tabIndex={-1}>
            Riwayat absensi
          </h1>
          <p>
            Telusuri status, tanggal kerja, dan aktivitas catatan absensimu.
          </p>
        </div>
      </header>
      <section className="history-filters" aria-label="Filter riwayat absensi">
        <div className="filters">
          <div
            className="filter-status"
            role="group"
            aria-label="Filter status absensi"
          >
            {(
              [
                ["all", "Semua"],
                ["draft", "Draf"],
                ["completed", "Selesai"],
                ["deleted", "Dihapus"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                aria-pressed={filters.status === value}
                onClick={() =>
                  changeFilters({
                    status: value,
                    ...(value === "deleted" ? { activity: "all" } : {}),
                  })
                }
              >
                {label}
              </button>
            ))}
          </div>
          <label className="history-sort">
            Urutkan
            <select
              className="form-input"
              value={filters.sort}
              onChange={(e) =>
                changeFilters({
                  sort: e.target.value as HistoryFilters["sort"],
                })
              }
            >
              <option value="date-desc">Tanggal kerja terbaru</option>
              <option value="date-asc">Tanggal kerja terlama</option>
              <option value="updated-desc">Pembaruan terbaru</option>
            </select>
          </label>
        </div>
        <details className="history-filter-details">
          <summary>
            Filter tanggal dan aktivitas
            {dateFilterDescription && <small>{dateFilterDescription}</small>}
          </summary>
          <div className="history-filter-fields">
            <label>
              Bulan kerja
              <select
                className="form-input"
                value={filters.month}
                onChange={(e) =>
                  changeFilters({ month: e.target.value, from: "", to: "" })
                }
              >
                <option value="">Semua bulan</option>
                {[
                  ...new Set(
                    workspace.data.records.map((r) =>
                      r.attendanceDate.slice(0, 7),
                    ),
                  ),
                ]
                  .sort()
                  .reverse()
                  .map((value) => (
                    <option key={value} value={value}>
                      {monthLabel(value)}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Dari tanggal
              <input
                className="form-input"
                type="date"
                value={filters.from}
                aria-invalid={!!rangeError}
                aria-describedby={
                  rangeError ? "history-range-error" : undefined
                }
                onChange={(e) =>
                  changeFilters({ from: e.target.value, month: "" })
                }
              />
            </label>
            <label>
              Sampai tanggal
              <input
                className="form-input"
                type="date"
                value={filters.to}
                aria-invalid={!!rangeError}
                aria-describedby={
                  rangeError ? "history-range-error" : undefined
                }
                onChange={(e) =>
                  changeFilters({ to: e.target.value, month: "" })
                }
              />
            </label>
            <label>
              Aktivitas terakhir
              <select
                className="form-input"
                value={filters.activity}
                disabled={filters.status === "deleted"}
                onChange={(e) =>
                  changeFilters({
                    activity: e.target.value as HistoryFilters["activity"],
                  })
                }
              >
                <option value="all">Semua aktivitas</option>
                <option value="Dibuat">Dibuat</option>
                <option value="Diubah">Diubah</option>
              </select>
            </label>
          </div>
          <p className="field-help">
            Pilih bulan atau rentang tanggal kerja. Salah satu batas tanggal
            boleh dikosongkan.
          </p>
        </details>
        {rangeError && (
          <p id="history-range-error" role="alert" className="error-text">
            {rangeError}
          </p>
        )}
        <div className="history-filter-result">
          <p className="field-help" role="status">
            {rangeError
              ? "Perbaiki rentang tanggal untuk melihat hasil."
              : `${records.length} catatan ditemukan`}
          </p>
          {hasFilters && (
            <button className="text-button" onClick={resetFilters}>
              <RotateCcw aria-hidden="true" /> Atur ulang filter
            </button>
          )}
        </div>
      </section>
      {!visible.length ? (
        <section className="panel empty-state">
          {workspace.data.records.length ? <SearchX /> : <History />}
          <h2>
            {rangeError
              ? "Periksa rentang tanggal"
              : workspace.data.records.length
                ? "Tidak ada catatan yang cocok"
                : "Belum ada catatan absensi"}
          </h2>
          <p>
            {rangeError
              ? "Perbaiki tanggal awal dan akhir pada filter di atas."
              : workspace.data.records.length
                ? "Coba status, rentang tanggal, atau aktivitas yang lain."
                : "Mulai dengan mencatat jam kerja pertamamu. Catatan akan muncul di sini."}
          </p>
          {hasFilters ? (
            <button className="btn btn-outline" onClick={resetFilters}>
              Atur ulang filter
            </button>
          ) : (
            <Link href="/" className="btn btn-primary">
              Catat absensi
            </Link>
          )}
        </section>
      ) : (
        <section
          className="panel history-panel"
          aria-label="Daftar riwayat absensi"
        >
          <table className="history-table">
            <thead>
              <tr>
                <th>Tanggal kerja</th>
                <th>Jam kerja</th>
                <th>Istirahat</th>
                <th>Jam bersih</th>
                <th>Estimasi</th>
                <th>Aktivitas</th>
                <th>
                  <span className="sr-only">Tindakan catatan</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{dateLabel(r.attendanceDate)}</strong>
                    <small>Diperbarui {updated(r)}</small>
                  </td>
                  <td>
                    {r.clockIn || "—"}–{r.clockOut || "—"}
                  </td>
                  <td>{breaks(r)}</td>
                  <td>
                    {r.status === "draft"
                      ? "Belum selesai"
                      : duration(r.workMinutes)}
                  </td>
                  <td>
                    <strong>
                      {r.status === "draft" ? "—" : yen(r.estimatedSalaryYen)}
                    </strong>
                  </td>
                  <td>
                    <StatusBadge record={r} />
                  </td>
                  <td>{recordActions(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="history-cards">
            {visible.map((r) => (
              <article
                key={r.id}
                className={`panel history-card ${r.status === "deleted" ? "panel-coral" : ""}`}
              >
                <header>
                  <h2>{dateLabel(r.attendanceDate)}</h2>
                  <StatusBadge record={r} />
                </header>
                <div className="summary-line">
                  <span>Jam kerja</span>
                  <strong>
                    {r.clockIn || "—"}–{r.clockOut || "—"}
                  </strong>
                </div>
                <div className="summary-line">
                  <span>Istirahat</span>
                  <strong>{breaks(r)}</strong>
                </div>
                <div className="summary-line">
                  <span>Jam bersih</span>
                  <strong>
                    {r.status === "draft"
                      ? "Belum selesai"
                      : duration(r.workMinutes)}
                  </strong>
                </div>
                <div className="summary-line">
                  <span>Estimasi pendapatan</span>
                  <strong>
                    {r.status === "draft" ? "—" : yen(r.estimatedSalaryYen)}
                  </strong>
                </div>
                <footer>
                  <small>Diperbarui {updated(r)}</small>
                  {recordActions(r)}
                </footer>
              </article>
            ))}
          </div>
        </section>
      )}
      {visible.length > 0 && (
        <div className="pagination">
          <span>
            {records.length} catatan · Halaman {currentPage} dari {pages}
          </span>
          <div className="actions">
            <button
              className="icon-button"
              aria-label="Halaman sebelumnya"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              <ChevronLeft />
            </button>
            <button
              className="icon-button"
              aria-label="Halaman berikutnya"
              disabled={currentPage === pages}
              onClick={() => setPage(currentPage + 1)}
            >
              <ChevronRight />
            </button>
          </div>
        </div>
      )}
      <div className="notice mt-6">
        <Info />
        <p>
          Catatan yang dihapus tidak dihitung dalam pendapatan. Pulihkan sebagai
          draf, lalu periksa melalui Ubah catatan sebelum menyelesaikannya.
        </p>
      </div>
      {editing && (
        <EditAttendance
          record={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            await workspace.reload();
            // Saving can move the row outside the current filter or page.
            editTrigger.current = null;
          }}
          returnFocus={returnFocus}
        />
      )}
      {restoring && (
        <RestoreAttendance
          record={restoring}
          onClose={() => setRestoring(null)}
          onSaved={async () => {
            await workspace.reload();
            editTrigger.current = null;
            changeFilters({ status: "draft", activity: "all" });
          }}
          returnFocus={returnFocus}
        />
      )}
    </div>
  );
}
