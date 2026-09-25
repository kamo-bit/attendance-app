"use client";
import Link from "next/link";
import { ArrowRight, Clock3, Info, Pencil, Sun, Trash2 } from "lucide-react";
import {
  duration,
  monthLabel,
  payrollMonth,
  yen,
  type AttendanceRecord,
} from "@/lib/attendance";
import { isInPayrollPeriod, payrollRangeLabel } from "@/lib/payroll-calendar";

export function AttendanceDateDetails({
  selectedDate,
  selectedRecord,
  holiday,
  month,
  onShowPeriod,
  onEdit,
  onDelete,
}: {
  selectedDate: string;
  selectedRecord?: AttendanceRecord;
  holiday: boolean;
  month: string;
  onShowPeriod: () => void;
  onEdit: (record: AttendanceRecord) => void;
  onDelete: (record: AttendanceRecord) => void;
}) {
  return (
    <>
      {!isInPayrollPeriod(selectedDate, month) && (
        <div className="notice mb-5">
          <Info />
          <p>
            Tanggal ini termasuk periode gaji{" "}
            {monthLabel(payrollMonth(selectedDate))},{" "}
            {payrollRangeLabel(payrollMonth(selectedDate))}.{" "}
            <button className="inline-link" onClick={onShowPeriod}>
              Tampilkan periode ini
            </button>
          </p>
        </div>
      )}
      {holiday && (
        <p className="status deleted mb-4">
          <Sun size={12} />
          Hari libur
        </p>
      )}
      {selectedRecord ? (
        <>
          {selectedRecord.status === "draft" && (
            <p className="status draft mb-4">
              <Clock3 />
              Draf — belum selesai
            </p>
          )}
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
                    {selectedRecord.break1From} – {selectedRecord.break1To}
                    {selectedRecord.breakCount === 2 && (
                      <>
                        <br />
                        {selectedRecord.break2From} – {selectedRecord.break2To}
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
              <p className="mt-2">Draf belum masuk perhitungan pendapatan.</p>
            )}
          </div>
          <div className="detail-actions">
            <button
              className="btn btn-secondary"
              onClick={() => onEdit(selectedRecord)}
            >
              <Pencil />
              Ubah absensi
            </button>
            <button
              className="text-button text-coral"
              onClick={() => onDelete(selectedRecord)}
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
            Catat jam kerja untuk tanggal ini agar pendapatanmu ikut terhitung.
          </p>
          <Link href={`/?date=${selectedDate}`} className="btn btn-primary">
            Catat absensi
            <ArrowRight />
          </Link>
        </div>
      )}
    </>
  );
}
