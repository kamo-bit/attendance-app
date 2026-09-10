import { NextResponse } from 'next/server';
import { db } from '@/db';
import { attendanceRecords, users } from '@/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { getPayrollPeriod } from '@/lib/utils';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import SalarySummaryEmail from '@/components/emails/salary-summary-email';

export async function GET(request: Request) {
  // Initialize Resend with the API key from environment variables
  const resend = new Resend(process.env.RESEND_API_KEY);

  // Check for the cron secret to secure the route
  const authHeader = request.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // Determine the payroll period. If today is the 21st, 
    // the period we are reporting on ended on the 20th.
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString();
    
    const { start, end } = getPayrollPeriod(dateStr);
    
    // Fetch all users
    const allUsers = await db.select().from(users);
    let sentCount = 0;
    
    for (const user of allUsers) {
      if (!user.email) continue;
      
      // Fetch user's attendance for the calculated period
      const records = await db.select().from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.userId, user.id),
            gte(attendanceRecords.attendanceDate, start),
            lte(attendanceRecords.attendanceDate, end)
          )
        );
        
      if (records.length === 0) continue; // Skip users with no records this period
      
      let totalWorkMinutes = 0;
      let totalSalaryYen = 0;
      let totalWorkDays = 0;
      
      for (const record of records) {
        if (record.clockIn) {
          totalWorkDays++;
          totalWorkMinutes += record.workMinutes || 0;
          totalSalaryYen += record.estimatedSalaryYen || 0;
        }
      }
      
      const hours = Math.floor(totalWorkMinutes / 60);
      const minutes = totalWorkMinutes % 60;
      const periodLabel = `${start} to ${end}`;
      
      const emailHtml = await render(
        SalarySummaryEmail({
          userName: user.name || 'User',
          period: periodLabel,
          totalWorkHours: `${hours}h ${minutes}m`,
          totalWorkDays,
          totalSalary: `¥${totalSalaryYen.toLocaleString()}`
        })
      );
      
      // Send the email summary
      await resend.emails.send({
        from: 'Admin Absensi <admin@absenkuy.cc>',
        to: user.email,
        subject: `Your Salary Summary for ${periodLabel}`,
        html: emailHtml
      });
      sentCount++;
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Emails sent successfully for period ${start} to ${end}`,
      sentCount 
    });
  } catch (error) {
    console.error('Error sending salary emails:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal Server Error' 
    }, { status: 500 });
  }
}
