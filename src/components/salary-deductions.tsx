import { ReceiptText } from "lucide-react";
import { dateLabel, yen } from "@/lib/attendance";
import { ESTIMATE_NOTE, LOW_INCOME_NOTE, estimateYen, type SalaryEstimate } from "@/lib/salary-estimate";

export function SalaryDeductions({ estimate }: { estimate: SalaryEstimate }) {
  const { status, deductions, totalDeductions, net, draftCount } = estimate;
  return (
    <section className="panel panel-gold salary-deductions" aria-labelledby="deductions-heading">
      <div className="panel-title">
        <span className="icon-tile gold"><ReceiptText aria-hidden="true" /></span>
        <div>
          <h2 id="deductions-heading">Rincian estimasi potongan</h2>
          <p className="field-help">Dihitung otomatis sekali per periode gaji.</p>
        </div>
      </div>
      {status === "open" ? (
        <p className="field-help">Rincian potongan dan perkiraan gaji bersih tersedia mulai {dateLabel(estimate.availableFrom)}, pukul 00.00 JST, setelah seluruh tanggal 20 selesai.</p>
      ) : status === "empty" ? (
        <p className="field-help">Belum cukup data. Lengkapi setidaknya satu absensi selesai pada periode ini untuk melihat estimasi.</p>
      ) : (
        <>
          <dl className="deduction-list">
            <div className="deduction-gross"><dt>Estimasi pendapatan kotor</dt><dd>{yen(estimate.salary)}</dd></div>
            {deductions.map((item) => (
              <div key={item.key}><dt>{item.label}</dt><dd>−{yen(item.amount)}</dd></div>
            ))}
            <div className="deduction-total"><dt>Total estimasi potongan</dt><dd>−{yen(totalDeductions)}</dd></div>
            <div className="deduction-net"><dt>{net! < 0 ? "Selisih estimasi" : "Perkiraan gaji bersih"}</dt><dd>{estimateYen(net!)}</dd></div>
          </dl>
          {net! < 0 && <p className="field-help deduction-warning">{LOW_INCOME_NOTE}</p>}
          <p className="field-help deduction-note">{ESTIMATE_NOTE}</p>
        </>
      )}
      {draftCount > 0 && <p className="field-help deduction-warning">{draftCount} absensi draf belum masuk perhitungan. Lengkapi melalui kalender kerja di bawah.</p>}
    </section>
  );
}
