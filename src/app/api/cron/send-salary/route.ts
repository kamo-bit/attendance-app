import { NextResponse } from 'next/server';
import { db } from '@/db';
import { attendanceRecords, userPreferences, users } from '@/db/schema';
import { eq, and, gte, lte, or, isNull } from 'drizzle-orm';
import { getPayrollPeriod } from '@/lib/utils';
import { Resend } from 'resend';
import { render, toPlainText } from '@react-email/render';
import SalarySummaryEmail from '@/components/emails/salary-summary-email';

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} jam ${m} menit`;
}

export async function GET(request: Request) {
  // Check for the cron secret to secure the route
  const authHeader = request.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // Check if today is the 1st of the month in JST (UTC+9)
    const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000); // shift UTC to JST
    const dayOfMonthJST = nowJST.getUTCDate();

    if (dayOfMonthJST !== 1) {
      return NextResponse.json({
        success: true,
        message: `Skipped — today is the ${dayOfMonthJST}th in JST, not the 1st.`,
        sentCount: 0,
      });
    }

    // Determine the payroll period. If today is the 21st,
    // the period we are reporting on ended on the 20th.
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString();

    const { start, end } = getPayrollPeriod(dateStr);

    const resend = new Resend(process.env.RESEND_API_KEY);

    // Existing accounts without a preference keep receiving their summaries.
    const allUsers = await db.select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .leftJoin(userPreferences, eq(users.id, userPreferences.userId))
      .where(or(isNull(userPreferences.userId), eq(userPreferences.salaryEmailEnabled, true)));
    let sentCount = 0;
    let failedCount = 0;

    for (const user of allUsers) {
      if (!user.email) continue;

      // Fetch user's attendance for the calculated period, sorted by date
      const records = await db.select().from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.userId, user.id),
            gte(attendanceRecords.attendanceDate, start),
            lte(attendanceRecords.attendanceDate, end),
            eq(attendanceRecords.status, 'completed')
          )
        );

      if (records.length === 0) continue; // Skip users with no records this period

      let totalWorkMinutes = 0;
      let totalSalaryYen = 0;
      let totalWorkDays = 0;

      // Sort records by date ascending
      const sortedRecords = [...records].sort((a, b) =>
        a.attendanceDate.localeCompare(b.attendanceDate)
      );

      // Build per-day rows for the table
      const dailyRows = sortedRecords
        .filter(r => r.clockIn) // only days with clock-in
        .map(r => {
          const date = new Date(r.attendanceDate);
          const dayName = DAY_NAMES[date.getDay()];

          // Build break time string
          let breakTime = '—';
          if (r.hasBreak && r.break1From && r.break1To) {
            breakTime = `${r.break1From}–${r.break1To}`;
            if (r.breakCount === 2 && r.break2From && r.break2To) {
              breakTime += `, ${r.break2From}–${r.break2To}`;
            }
          }

          totalWorkDays++;
          totalWorkMinutes += r.workMinutes || 0;
          totalSalaryYen += r.estimatedSalaryYen || 0;

          return {
            date: r.attendanceDate,
            dayName,
            clockIn: r.clockIn || '',
            clockOut: r.clockOut || '',
            breakTime,
            workHours: formatMinutes(r.workMinutes || 0),
            salary: `¥${(r.estimatedSalaryYen || 0).toLocaleString('id-ID')}`,
          };
        });

      const hours = Math.floor(totalWorkMinutes / 60);
      const minutes = totalWorkMinutes % 60;
      const periodLabel = new Intl.DateTimeFormat('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
      }).formatRange(new Date(start + 'T00:00:00Z'), new Date(end + 'T00:00:00Z'));
      const summaryUrl = new URL('/salary-summary', process.env.NEXT_PUBLIC_APP_URL || 'https://www.absenkuy.cc');
      summaryUrl.searchParams.set('date', end);

      const emailHtml = await render(
        SalarySummaryEmail({
          userName: user.name || 'Pengguna',
          period: periodLabel,
          totalWorkHours: `${hours} jam ${minutes} menit`,
          totalWorkDays,
          totalSalary: `¥${totalSalaryYen.toLocaleString('id-ID')}`,
          records: dailyRows,
          summaryUrl: summaryUrl.toString(),
        })
      );

      // Honor an opt-out made while this cron run was preparing the summary.
      const [latestPreference] = await db.select({ enabled: userPreferences.salaryEmailEnabled })
        .from(userPreferences).where(eq(userPreferences.userId, user.id)).limit(1);
      if (latestPreference?.enabled === false) continue;

      try {
        const result = await resend.emails.send({
          from: 'Admin Absensi <admin@absenkuy.cc>',
          to: user.email,
          subject: `Ringkasan Pendapatan — ${periodLabel}`,
          html: emailHtml,
          text: toPlainText(emailHtml),
        });
        // Resend can return a delivery error without throwing.
        if (result.error || !result.data?.id) {
          failedCount++;
          console.error('Salary summary email was not accepted by the email provider.');
        } else {
          sentCount++;
        }
      } catch {
        failedCount++;
        console.error('Salary summary email could not be sent.');
      }
    }

    return NextResponse.json({
      success: failedCount === 0,
      message: `Salary email run finished for period ${start} to ${end}`,
      sentCount,
      failedCount,
    }, { status: failedCount === 0 ? 200 : 500 });
  } catch (error) {
    console.error('Error sending salary emails:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal Server Error',
    }, { status: 500 });
  }
}
