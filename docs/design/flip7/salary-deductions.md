# Automatic rough deductions

The income page and monthly email share `salaryEstimate`. Gross earnings remain the sum of stored wages on completed attendance records, with no new overtime rules or user inputs.

Each populated, closed 21st–20th payroll period receives one estimated deduction of ¥55,400: health ¥10,500, pension ¥18,300, housing ¥22,000, employment insurance ¥1,100, and income tax ¥3,500. These are rounded averages from the March–August 2026 reference period, not statutory rates. The disclaimer is visible in both surfaces; no individual payslip or identifying information is stored in the repository.

The breakdown becomes available at 00:00 JST on the 21st. The page refreshes its date at Japanese midnight and when resumed. Open/future periods show availability information; empty or draft-only periods never receive deductions. Drafts/deleted entries do not contribute to gross; drafts are counted in a completeness note. For gross below deductions, preserve the arithmetic as a signed “Selisih estimasi” with an explicit “bukan tagihan” explanation.

Users can jump to the most recently closed period. Annual cards distinguish gross from net and only show net for populated closed periods. Attendance corrections recalculate estimates; no stored payroll or deduction state is introduced.

The existing email schedule remains the first of each month (JST), for the period closed on the previous month's 20th. Its data and rounding come from the same helper as the page. Email opt-out is retained; provider idempotency keys are stable per user/period for retries within the provider's retention window. A sent email is a snapshot at sending time, while the app can reflect later attendance corrections.

Tests cover cutoff instants, year/leap boundaries, empty/future/draft/deleted states, once-per-period deductions, edits, low earnings, complete HTML/plain-text email rendering, and the existing cron integration with a mocked provider. UI QA covers narrow mobile, tablet/desktop and light/dark themes; no live test email is sent.
