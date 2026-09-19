import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

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
  summaryUrl?: string;
}

// Literal colors and inline layout styles mirror globals.css for email clients.
// Media queries progressively enhance mobile layout and supported dark modes.
const colors = {
  background: "#eff8f7",
  card: "#ffffff",
  text: "#182827",
  muted: "#596e6b",
  teal: "#146e69",
  soft: "#e8f6f5",
  gold: "#ffd23f",
  cream: "#fff8e7",
  border: "#d7e5e2",
};
const fontFamily =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
const paragraph: React.CSSProperties = {
  margin: 0,
  fontSize: "14px",
  lineHeight: "22px",
};
const label: React.CSSProperties = {
  ...paragraph,
  color: colors.muted,
  fontSize: "12px",
};
const recordDate = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export const SalarySummaryEmail = ({
  userName = "Pengguna",
  period = "bulan ini",
  totalWorkHours = "0 jam",
  totalWorkDays = 0,
  totalSalary = "¥0",
  records = [],
  summaryUrl = "https://www.absenkuy.cc/salary-summary",
}: SalarySummaryEmailProps) => (
  <Html lang="id">
    <Head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="color-scheme" content="light dark" />
      <meta name="supported-color-schemes" content="light dark" />
      <title>{`Ringkasan pendapatan — ${period}`}</title>
      <style>{`
        body { margin: 0; padding: 0; }
        table { border-spacing: 0; }
        a { color: #146e69; }
        @media only screen and (max-width: 480px) {
          .email-shell { padding: 20px 12px !important; }
          .email-content { padding: 24px 18px !important; }
          .email-title { font-size: 26px !important; line-height: 32px !important; }
          .email-amount { font-size: 34px !important; line-height: 42px !important; }
          .email-metric { display: block !important; width: 100% !important; padding: 12px 0 0 !important; border: 0 !important; }
          .email-cta { box-sizing: border-box !important; width: 100% !important; text-align: center !important; }
          .email-record-details, .email-record-total { display: block !important; width: auto !important; text-align: left !important; }
          .email-record-details { padding: 16px 0 6px !important; border-bottom: 0 !important; }
          .email-record-total { padding: 0 0 16px !important; }
          .email-record-total p { display: inline !important; margin-right: 8px !important; }
        }
        @media (prefers-color-scheme: dark) {
          .email-body, .email-shell { background-color: #102321 !important; }
          .email-card { background-color: #1a302e !important; }
          .email-text { color: #f6f4e9 !important; }
          .email-muted { color: #b0c3bd !important; }
          .email-teal { color: #78ddd6 !important; }
          .email-soft { background-color: #23413d !important; }
          .email-cream { background-color: #3c3925 !important; }
          .email-border { border-color: #36504b !important; }
        }
        [data-ogsc] .email-body, [data-ogsc] .email-shell { background-color: #102321 !important; }
        [data-ogsc] .email-card { background-color: #1a302e !important; }
        [data-ogsc] .email-text { color: #f6f4e9 !important; }
        [data-ogsc] .email-muted { color: #b0c3bd !important; }
        [data-ogsc] .email-teal { color: #78ddd6 !important; }
        [data-ogsc] .email-soft { background-color: #23413d !important; }
        [data-ogsc] .email-cream { background-color: #3c3925 !important; }
        [data-ogsc] .email-border { border-color: #36504b !important; }
        @media print {
          .email-shell { background: #fff !important; padding: 0 !important; }
          .email-card { box-shadow: none !important; }
          .email-no-print { display: none !important; }
          .email-record { break-inside: avoid; }
        }
      `}</style>
    </Head>
    <Preview>
      {`${totalSalary} estimasi pendapatan · ${totalWorkDays} hari kerja · ${period}. Catatan kerjamu sudah dirangkum.`}
    </Preview>
    <Body
      className="email-body"
      style={{
        backgroundColor: colors.background,
        color: colors.text,
        fontFamily,
        margin: 0,
      }}
    >
      <Section
        className="email-shell"
        style={{ backgroundColor: colors.background, padding: "32px 16px" }}
      >
        <Container style={{ maxWidth: "640px", margin: "0 auto" }}>
          <Text
            className="email-text"
            style={{
              margin: "0 0 24px",
              color: colors.text,
              fontSize: "26px",
              lineHeight: "32px",
              fontWeight: 800,
              letterSpacing: "-1px",
            }}
          >
            Absen
            <span className="email-teal" style={{ color: colors.teal }}>
              Kuy
            </span>
            <span aria-hidden="true" style={{ color: "#ef6c4a" }}>
              .
            </span>
          </Text>
          <Section
            className="email-card email-border"
            style={{
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: "16px",
              boxShadow: "0 4px 20px #2ba8a210",
            }}
          >
            <table
              role="presentation"
              width="100%"
              cellPadding="0"
              cellSpacing="0"
            >
              <tbody>
                <tr>
                  <td
                    className="email-content"
                    style={{ padding: "32px", overflowWrap: "anywhere" }}
                  >
                    <Text
                      className="email-teal"
                      style={{
                        ...label,
                        color: colors.teal,
                        fontWeight: 700,
                        letterSpacing: "1.4px",
                      }}
                    >
                      RINGKASAN PENDAPATAN
                    </Text>
                    <Heading
                      as="h1"
                      className="email-title email-text"
                      style={{
                        color: colors.text,
                        fontSize: "32px",
                        lineHeight: "39px",
                        fontWeight: 800,
                        letterSpacing: "-0.8px",
                        margin: "12px 0 16px",
                      }}
                    >
                      Hasil kerja,
                      <br />
                      lebih jelas.
                    </Heading>
                    <Text
                      className="email-muted"
                      style={{ ...paragraph, color: colors.muted }}
                    >
                      Halo{" "}
                      <strong
                        className="email-text"
                        style={{ color: colors.text }}
                      >
                        {userName}
                      </strong>
                      , berikut rangkuman jam kerja dan estimasi pendapatanmu.
                      Semua catatan penting, dalam satu email.
                    </Text>
                    <Section
                      className="email-soft"
                      style={{
                        marginTop: "24px",
                        backgroundColor: colors.soft,
                        borderRadius: "8px",
                        padding: "12px 16px",
                      }}
                    >
                      <Text className="email-muted" style={label}>
                        Periode gaji
                      </Text>
                      <Text
                        className="email-teal"
                        style={{
                          ...paragraph,
                          color: colors.teal,
                          fontWeight: 700,
                        }}
                      >
                        {period}
                      </Text>
                    </Section>
                    <Section
                      className="email-cream"
                      style={{
                        marginTop: "16px",
                        padding: "24px",
                        backgroundColor: colors.cream,
                        borderRadius: "12px",
                        borderLeft: `4px solid ${colors.gold}`,
                      }}
                    >
                      <Text
                        className="email-muted"
                        style={{ ...label, fontWeight: 700 }}
                      >
                        ESTIMASI PENDAPATAN
                      </Text>
                      <Text
                        className="email-amount email-text"
                        style={{
                          margin: "8px 0 20px",
                          color: colors.text,
                          fontSize: "42px",
                          lineHeight: "50px",
                          fontWeight: 800,
                          letterSpacing: "-1.5px",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {totalSalary}
                      </Text>
                      <table
                        role="presentation"
                        width="100%"
                        cellPadding="0"
                        cellSpacing="0"
                        style={{ tableLayout: "fixed" }}
                      >
                        <tbody>
                          <tr>
                            <td
                              className="email-metric"
                              style={{
                                width: "35%",
                                verticalAlign: "top",
                                paddingRight: "16px",
                              }}
                            >
                              <Text className="email-muted" style={label}>
                                Hari kerja
                              </Text>
                              <Text
                                className="email-text"
                                style={{
                                  ...paragraph,
                                  marginTop: "4px",
                                  color: colors.text,
                                  fontWeight: 700,
                                  fontSize: "17px",
                                }}
                              >
                                {totalWorkDays} hari
                              </Text>
                            </td>
                            <td
                              className="email-metric email-border"
                              style={{
                                width: "65%",
                                verticalAlign: "top",
                                borderLeft: `1px solid ${colors.border}`,
                                paddingLeft: "20px",
                              }}
                            >
                              <Text className="email-muted" style={label}>
                                Total jam kerja
                              </Text>
                              <Text
                                className="email-text"
                                style={{
                                  ...paragraph,
                                  marginTop: "4px",
                                  color: colors.text,
                                  fontWeight: 700,
                                  fontSize: "17px",
                                }}
                              >
                                {totalWorkHours}
                              </Text>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </Section>
                    <Section
                      className="email-no-print"
                      style={{ padding: "24px 0" }}
                    >
                      <Button
                        className="email-cta"
                        href={summaryUrl}
                        style={{
                          backgroundColor: colors.gold,
                          color: colors.text,
                          padding: "14px 24px",
                          borderRadius: "8px",
                          fontSize: "14px",
                          fontWeight: 700,
                          textDecoration: "none",
                          lineHeight: "20px",
                        }}
                      >
                        Lihat rincian di AbsenKuy
                      </Button>
                      <Text
                        className="email-muted"
                        style={{ ...label, marginTop: "12px" }}
                      >
                        Pendapatan ini merupakan estimasi berdasarkan catatan
                        absensimu.
                      </Text>
                    </Section>
                    <Heading
                      as="h2"
                      className="email-text email-border"
                      style={{
                        margin: "8px 0 0",
                        paddingBottom: "16px",
                        color: colors.text,
                        fontSize: "19px",
                        lineHeight: "26px",
                        fontWeight: 700,
                        borderBottom: `1px dashed ${colors.border}`,
                      }}
                    >
                      Rincian absensi harian
                    </Heading>
                    {records.length > 0 ? (
                      <table
                        role="presentation"
                        width="100%"
                        cellPadding="0"
                        cellSpacing="0"
                        style={{ tableLayout: "fixed" }}
                      >
                        <tbody>
                          {records.map((row, index) => (
                            <tr
                              key={`${row.date}-${index}`}
                              className="email-record"
                            >
                              <td
                                className="email-record-details email-border"
                                style={{
                                  width: "62%",
                                  padding: "18px 12px 18px 0",
                                  verticalAlign: "top",
                                  borderBottom: `1px solid ${colors.border}`,
                                }}
                              >
                                <p
                                  className="email-text"
                                  style={{
                                    ...paragraph,
                                    color: colors.text,
                                    fontWeight: 700,
                                  }}
                                >
                                  {row.dayName},{" "}
                                  {recordDate.format(
                                    new Date(`${row.date}T00:00:00Z`),
                                  )}
                                </p>
                                <p
                                  className="email-muted"
                                  style={{ ...label, marginTop: "4px" }}
                                >
                                  Masuk {row.clockIn || "—"} · Pulang{" "}
                                  {row.clockOut || "—"}
                                </p>
                                <p className="email-muted" style={label}>
                                  Istirahat:{" "}
                                  {row.breakTime && row.breakTime !== "—"
                                    ? row.breakTime
                                    : "Tanpa istirahat"}
                                </p>
                              </td>
                              <td
                                className="email-record-total email-border"
                                style={{
                                  width: "38%",
                                  padding: "18px 0",
                                  textAlign: "right",
                                  verticalAlign: "top",
                                  borderBottom: `1px solid ${colors.border}`,
                                }}
                              >
                                <p
                                  className="email-teal"
                                  style={{
                                    ...paragraph,
                                    color: colors.teal,
                                    fontWeight: 700,
                                  }}
                                >
                                  {row.salary}
                                </p>
                                <p
                                  className="email-muted"
                                  style={{ ...label, marginTop: "4px" }}
                                >
                                  {row.workHours}
                                </p>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <Text
                        className="email-muted"
                        style={{
                          ...paragraph,
                          color: colors.muted,
                          margin: "20px 0",
                        }}
                      >
                        Belum ada rincian absensi untuk periode ini.
                      </Text>
                    )}
                    <Section
                      className="email-soft"
                      style={{
                        backgroundColor: colors.soft,
                        borderRadius: "8px",
                        padding: "16px",
                        marginTop: "24px",
                      }}
                    >
                      <Text
                        className="email-teal"
                        style={{
                          ...paragraph,
                          color: colors.teal,
                          fontWeight: 700,
                        }}
                      >
                        Simpan untuk catatanmu
                      </Text>
                      <Text
                        className="email-muted"
                        style={{ ...label, marginTop: "4px" }}
                      >
                        Untuk menyimpan ringkasan ini sebagai PDF, buka menu
                        cetak di aplikasi email, lalu pilih “Simpan sebagai
                        PDF”.
                      </Text>
                    </Section>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>
          <Text
            className="email-teal"
            style={{
              ...paragraph,
              margin: "24px 0 8px",
              textAlign: "center",
              color: colors.teal,
              fontWeight: 700,
            }}
          >
            Jam kerja jelas. Pendapatan terpantau.
          </Text>
          <Text
            className="email-muted"
            style={{ ...label, textAlign: "center", color: colors.muted }}
          >
            Dikirim otomatis oleh AbsenKuy.
            <br />
            Mohon tidak membalas email ini.
          </Text>
        </Container>
      </Section>
    </Body>
  </Html>
);

export default SalarySummaryEmail;
