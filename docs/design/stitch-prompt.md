# Stitch generation brief

Create a complete responsive UI/UX redesign for “AbsenKuy”, an existing personal attendance and Japanese-yen earnings web application. This is a work-hours tracker, not a trading platform. Preserve the features described below. Use fictional example data only.

Use this CoinPulse visual system faithfully: dark canvas #09090B, surface #18181B, elevated surface #27272A, borders #27272A/#3F3F46, primary electric blue #2563EB with hover #3B82F6, lime #84CC16 for earnings, green #22C55E for saved/confirmed, amber #F59E0B for pending/holiday, red #EF4444 for errors/destructive actions. Primary text #FAFAFA, readable secondary text #A1A1AA. Use DM Sans body and Space Mono headings/numeric figures. 4px spacing scale, 24px section gaps, 8px controls/cards, 12px panels, 16px feature cards. Subtle blue focus glow, no glossy gradients or excessive nesting. Dark mode only. Keep text legible and accessible, and don't rely solely on color for statuses.

Create consistent mobile 390px, tablet 834px, and desktop 1440px variants. All layouts must scale to 320px without clipped controls or page-level horizontal scrolling. Mobile has Attendance / History / Earnings bottom navigation and account access in the header. Tablet has compact navigation. Desktop has a restrained sidebar with account access at the bottom. Authentication screens have their own minimal shell. Touch targets are at least 44px. Use English copy, JPY, and 24-hour times.

Screens:
1. Attendance: “Record your work”, manual date entry including past dates, paired Clock in / Clock out, optional one or two removable break rows with Start/End labels, net hours and estimated earnings before Save attendance, and explicit hourly-wage editing with its own save feedback. Support draft without clock-out and already-completed states. Show the calculation clearly. Avoid tall stacks of cards around every input.
2. History: activity log ordered by last update, with created/edited/deleted labels and timestamps. Desktop table converts to mobile record cards with date, time range, net hours, earnings, status, expandable break details. Filters, pagination, empty/loading/error states. Record-management navigation should clearly lead to Earnings where existing edit/delete actions live.
3. Earnings monthly: payroll period selector; payroll cycle is the previous month's 21st through selected month's 20th. Put total estimated earnings, net work hours, and work days above the calendar. Label both calendar month and payroll period. Calendar includes accessible legend, today/selected states, recorded work, holiday, no record, and outside-cycle distinction. Day details include edit/delete. Holiday editing has Save and Cancel.
4. Earnings yearly: year selector, annual totals, legible 12-month earnings chart and accessible values, consistent with monthly view.
5. Sign in: email/password, show-password action, forgot-password link, blue primary Sign in, secondary Google, create-account link, loading/error states.
6. Create account: full name, email, password guidance, show-password, Google, sign-in link, success/error states.
7. Forgot password: email request and confirmation state.
8. Reset password: new password, confirmation as appropriate, expired-link and success states.

Include supporting record-detail/edit dialogs, delete confirmation, holiday-work confirmation, and saved/validation/error states. Keep forms short, labels explicit, numeric values monospaced, primary actions unambiguous, and calendar cells readable. Use plausible fictional sample figures, not real account data. Group and name frames by screen and device. Start with Attendance in the three device sizes to establish the system, then extend the same components to all remaining screens.
