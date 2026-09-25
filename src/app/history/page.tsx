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
} from "lucide-react";
import {
  useWorkspace,
  WorkspaceState,
  StatusBadge,
} from "@/components/workspace";
import { EditAttendance } from "@/components/edit-attendance";
import {
  activity,
  dateLabel,
  duration,
  monthLabel,
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
  const [filter, setFilter] = useState("Semua");
  const [month, setMonth] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AttendanceRecord | null>(null);
  const editTrigger = useRef<HTMLButtonElement | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  if (workspace.loading || workspace.error || !workspace.data)
    return <WorkspaceState error={workspace.error} retry={workspace.retry} />;
  const records = workspace.data.records
    .filter(
      (r) =>
        (!month || r.attendanceDate.startsWith(month)) &&
        (filter === "Semua" || activity(r).label === filter),
    )
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
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
      <span className="field-help">—</span>
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
            Diurutkan dari pembaruan terbaru. Lihat aktivitas terakhir setiap
            catatan.
          </p>
        </div>
      </header>
      <div className="filters">
        <div className="actions">
          <label htmlFor="history-month" className="sr-only">
            Filter bulan kerja
          </label>
          <select
            id="history-month"
            className="form-input"
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Semua bulan</option>
            {[
              ...new Set(
                workspace.data.records.map((r) => r.attendanceDate.slice(0, 7)),
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
        </div>
        <div className="filter-status" aria-label="Filter aktivitas">
          {["Semua", "Dibuat", "Diubah", "Dihapus"].map((label) => (
            <button
              key={label}
              aria-pressed={filter === label}
              onClick={() => {
                setFilter(label);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {!visible.length ? (
        <section className="panel empty-state">
          {workspace.data.records.length ? <SearchX /> : <History />}
          <h2>
            {workspace.data.records.length
              ? "Tidak ada catatan yang cocok"
              : "Belum ada catatan absensi"}
          </h2>
          <p>
            {workspace.data.records.length
              ? "Coba bulan atau filter aktivitas yang lain."
              : "Mulai dengan mencatat jam kerja pertamamu. Catatan akan muncul di sini."}
          </p>
          <Link href="/" className="btn btn-primary">
            Catat absensi
          </Link>
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
          Catatan yang dihapus tetap ada di riwayat dan tidak dihitung dalam
          pendapatan.
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
          returnFocus={() =>
            editTrigger.current?.isConnected &&
            editTrigger.current.getClientRects().length
              ? editTrigger.current
              : heading.current
          }
        />
      )}
    </div>
  );
}
