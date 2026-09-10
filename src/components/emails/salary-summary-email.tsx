import * as React from "react";

interface DailyRecord {
  date: string;
  dayName: string;
  clockIn: string;
  clockOut: string;
  breakTime: string;
  workHours: string;
  salary: string;
}

interface SalarySummaryEmailProps {
  userName: string;
  period: string;
  totalWorkHours: string;
  totalWorkDays: number;
  totalSalary: string;
  records?: DailyRecord[];
}

export const SalarySummaryEmail = ({
  userName = "User",
  period = "this month",
  totalWorkHours = "0h 0m",
  totalWorkDays = 0,
  totalSalary = "¥0",
  records = [],
}: SalarySummaryEmailProps) => {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Salary Summary — {period}</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f1f5f9;
            color: #0f172a;
            padding: 32px 16px;
          }
          .wrapper {
            max-width: 700px;
            margin: 0 auto;
          }
          /* Header */
          .header {
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            border-radius: 16px 16px 0 0;
            padding: 36px 40px;
            text-align: center;
            color: #fff;
          }
          .header h1 {
            font-size: 26px;
            font-weight: 800;
            letter-spacing: -0.5px;
            margin-bottom: 6px;
          }
          .header p { font-size: 14px; opacity: 0.85; }
          /* Body card */
          .card {
            background: #ffffff;
            padding: 36px 40px;
            border-radius: 0 0 16px 16px;
            box-shadow: 0 4px 24px rgba(0,0,0,0.08);
          }
          .greeting { font-size: 16px; color: #334155; margin-bottom: 24px; line-height: 1.6; }
          /* Summary boxes */
          .summary-grid {
            display: flex;
            gap: 12px;
            margin-bottom: 28px;
            flex-wrap: wrap;
          }
          .summary-box {
            flex: 1;
            min-width: 140px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 16px 20px;
          }
          .summary-box .label {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: #64748b;
            margin-bottom: 6px;
          }
          .summary-box .value {
            font-size: 22px;
            font-weight: 800;
            color: #0f172a;
          }
          .summary-box.highlight {
            background: linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%);
            border-color: #c7d2fe;
          }
          .summary-box.highlight .value { color: #4338ca; }
          /* Table */
          .table-title {
            font-size: 16px;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            margin-bottom: 28px;
          }
          thead tr {
            background: #4f46e5;
            color: #ffffff;
          }
          thead th {
            padding: 11px 12px;
            text-align: left;
            font-weight: 600;
            font-size: 12px;
            letter-spacing: 0.4px;
          }
          thead th:first-child { border-radius: 8px 0 0 0; }
          thead th:last-child { border-radius: 0 8px 0 0; }
          tbody tr:nth-child(even) { background: #f8fafc; }
          tbody tr:hover { background: #f1f5f9; }
          tbody td {
            padding: 10px 12px;
            color: #334155;
            border-bottom: 1px solid #e2e8f0;
          }
          .td-right { text-align: right; }
          .td-center { text-align: center; }
          .badge-in {
            display: inline-block;
            background: #dcfce7;
            color: #166534;
            padding: 2px 8px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
          }
          .badge-out {
            display: inline-block;
            background: #fee2e2;
            color: #991b1b;
            padding: 2px 8px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
          }
          tfoot tr { background: #1e293b; color: #fff; }
          tfoot td {
            padding: 12px 12px;
            font-weight: 700;
            font-size: 13px;
          }
          tfoot td:first-child { border-radius: 0 0 0 8px; }
          tfoot td:last-child { border-radius: 0 0 8px 0; }
          /* Print button */
          .print-section {
            text-align: center;
            margin: 8px 0 24px;
          }
          .print-btn {
            display: inline-block;
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 13px 32px;
            border-radius: 10px;
            font-size: 15px;
            font-weight: 700;
            letter-spacing: 0.3px;
            cursor: pointer;
            border: none;
          }
          .print-hint { font-size: 12px; color: #94a3b8; margin-top: 8px; }
          /* Footer */
          .footer {
            text-align: center;
            color: #94a3b8;
            font-size: 12px;
            margin-top: 32px;
            line-height: 1.6;
          }
          /* Print styles */
          @media print {
            body { background: #fff; padding: 0; }
            .no-print { display: none !important; }
            .card { box-shadow: none; padding: 0; }
            .header { border-radius: 0; }
          }
        `}</style>
      </head>
      <body>
        <div className="wrapper">
          {/* Header */}
          <div className="header">
            <h1>📋 Gajimu sasi iki cokkk!!!</h1>
            <p>Payroll Period: {period}</p>
          </div>

          {/* Card */}
          <div className="card">
            <p className="greeting">
              Hi <strong>{userName}</strong>,<br />
              Total gajimu sasi iki cokkk!!! <strong>{period}</strong>.
              Save aja kalo butuh.
            </p>

            {/* Summary Boxes */}
            <div className="summary-grid">
              <div className="summary-box">
                <div className="label">Days Worked</div>
                <div className="value">{totalWorkDays} days</div>
              </div>
              <div className="summary-box">
                <div className="label">Total Work Hours</div>
                <div className="value">{totalWorkHours}</div>
              </div>
              <div className="summary-box highlight">
                <div className="label">Total Salary</div>
                <div className="value">{totalSalary}</div>
              </div>
            </div>

            {/* Print Button */}
            <div className="print-section no-print">
              <button className="print-btn" onClick={() => window.print()}>
                🖨️ Save as PDF / Print
              </button>
              <p className="print-hint">Click → In the print dialog, select "Save as PDF" as the destination</p>
            </div>

            {/* Detail Table */}
            {records.length > 0 && (
              <>
                <div className="table-title">📅 Daily Attendance Detail</div>
                <table>
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Date</th>
                      <th>Day</th>
                      <th>Clock In</th>
                      <th>Clock Out</th>
                      <th>Break</th>
                      <th className="td-right">Work Hours</th>
                      <th className="td-right">Salary (¥)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((row, idx) => (
                      <tr key={idx}>
                        <td className="td-center">{idx + 1}</td>
                        <td>{row.date}</td>
                        <td>{row.dayName}</td>
                        <td><span className="badge-in">{row.clockIn || "—"}</span></td>
                        <td><span className="badge-out">{row.clockOut || "—"}</span></td>
                        <td className="td-center">{row.breakTime || "—"}</td>
                        <td className="td-right">{row.workHours}</td>
                        <td className="td-right">{row.salary}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={6}>TOTAL ({totalWorkDays} working days)</td>
                      <td className="td-right">{totalWorkHours}</td>
                      <td className="td-right">{totalSalary}</td>
                    </tr>
                  </tfoot>
                </table>
              </>
            )}

            <p className="footer">
              This is an automated email from <strong>AbsenKuy</strong>.<br />
              Please do not reply to this email.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
};

export default SalarySummaryEmail;
