# AbsenKuy UI/UX revamp

Status: 24 main device frames and eight supporting state frames created in Google Stitch. The user explicitly chose design only for this stage; application implementation is deferred. See `design-handoff.md` for verified scope and limitations.

Project: https://stitch.withgoogle.com/projects/9519189570753591892

## Source and purpose

Use the user-supplied `coinpulse-DESIGN.md` as visual reference. Adapt its visual language to attendance and earnings; do not introduce trading, cryptocurrency, profit/loss charts, or fictitious product features.

Keep the AbsenKuy product name and existing authentication, attendance records, payroll rules, holidays, yearly reporting, and edit/delete flows. Use English UI copy consistently with the current application. Display JPY and consistent 24-hour times. Date selection supports historical entry. The current payroll cycle runs from the previous month's 21st to the selected month's 20th.

## Visual foundation

- Canvas #09090B; surface #18181B; elevated surface #27272A.
- Primary actions #2563EB; interactive hover #3B82F6.
- Earnings accent #84CC16; confirmed/saved #22C55E; pending/holiday #F59E0B; errors/destructive actions #EF4444.
- Primary text #FAFAFA; secondary text #A1A1AA. Reserve #71717A for nonessential decoration or uses that pass contrast checks.
- DM Sans for body, labels, navigation; Space Mono for headings and financial/time figures. Use tabular numerals for all monetary figures.
- 4px spacing base; normal section gaps 24px; related controls 12px.
- 8px controls/cards, 12px panels, 16px feature cards. Avoid nested decorative containers and large pills on normal inputs.
- Subtle blue interaction glow. No decorative animation competing with content. Respect reduced motion.
- Dark-only experience per the supplied reference. Remove the theme toggle if implemented.
- Mobile inputs and actions at least 44px high; visible keyboard focus and labeled icon actions.

## Responsive layout

Delivered main frames use 390px mobile, 833–834px tablet, and the standard 1280px Stitch desktop canvas. The original 1440px target was adapted to Stitch's standard canvas. Later implementation must also work at 320px, 375px, 768px, 1024px, 1440px, and 1920px, including landscape and browser zoom. These additional implementation sizes have not been tested in this design-only stage.

- Mobile: single column, 16px outer spacing, bottom navigation for Attendance / History / Earnings; account/sign-out in header. Safe-area padding and no obscured content.
- Tablet: compact top navigation and adaptive one/two-column panels based on available width.
- Desktop: persistent sidebar, restrained maximum content width, aligned page header and two-column work areas. Account control at sidebar bottom.
- No page-level horizontal scrolling. Desktop history table becomes record cards on small screens.
- Break input pairs can wrap at narrow widths. Dialogs scroll within the viewport; labels and footer actions remain reachable.
- Mobile authentication hides app navigation and uses a compact single-column form; desktop can use a two-column brand/form layout without fabricated testimonials or metrics.

## Screens

### 1. Attendance

Use heading “Record your work”. A compact date selector precedes paired Clock in / Clock out inputs. Small current-time information is optional, never the main focus. Clearly label this as manual attendance entry, not a live time clock.

Offer “Add break” and removable labeled break rows (Start / End), supporting the current maximum of two breaks. Preserve draft attendance without clock-out. Show explanatory input errors and saving/loaded/completed states.

Place net work duration and estimated JPY earnings before Save attendance in reading order. Desktop may show a summary beside the form if the save action remains associated with the summary. Completed records provide a direct route to their editing location. Distinguish loaded saved values from unsaved edits.

Make hourly wage an explicit editable setting with save feedback, rather than saving every keystroke. Explain that saved attendance retains its recorded wage; do not imply historical entries are recalculated unless implemented. Display formula breakdown when clock-out and breaks are valid.

### 2. History

Keep the existing activity-log semantics: created, edited, deleted, with the last-update timestamp. State the ordering accurately. Provide an accessible date/month filter and deliberate sort option if implemented.

Desktop table: date, time range, breaks, net duration, earnings, activity status/time. Mobile cards expose date, status, time range, duration, and earnings without sideways scrolling; expand to show break intervals and update details. Preserve pagination. Include loading, empty, and fetch-error/retry states.

Do not imply direct editing exists here until wiring it to the existing edit flow. A clearly labeled link to manage entries in Earnings is acceptable.

### 3. Earnings — monthly cycle

Put the selected payroll period and totals before the calendar: estimated earnings, work duration, work days. Explicitly show both cycle start and end. Offer monthly/yearly switching and clear previous/next controls.

Calendar includes legends for recorded work, holiday, no record, and today. Use symbols/labels as well as color. Explain calendar-month versus payroll-cycle scope. Dates outside the active cycle must not look like contributing earnings. Selected day opens an accessible record detail view with existing edit/delete actions. Future/empty dates remain legible.

Holiday edit mode provides explicit Save holidays / Cancel and distinct temporary selection. Do not replace the existing business logic without reviewing it.

### 4. Earnings — yearly overview

Year selector, totals, and a readable 12-month earnings chart with JPY formatting. Include a text/table equivalent of chart values where practical. Use real loaded data only. Verify whether existing annual totals follow calendar-year or payroll-cycle rules and label accordingly.

### 5. Sign in

Email, password, accessible show/hide control, Forgot password, primary Sign in, secondary Google, and Create account link. Include loading and inline error states. Verify recovery navigation against existing route behavior.

### 6. Create account

Full name, email, password, password guidance matching backend requirements, accessible show/hide control, Google sign-up, sign-in link, success and error states.

### 7–8. Password recovery and reset

Match the authentication visual system. Design request-email, sent-email confirmation, new-password/token reset, expired/missing token, and success states as supported by the actual routes. Do not request passwords or verification codes in chat.

## Supporting interaction designs

- Record details, edit form, delete confirmation, holiday-work confirmation.
- Explicit wage save with pending/success/error feedback.
- Empty, loading, validation, request-error/retry, and saved states.
- Keyboard order, visible focus, meaningful button labels, status labels independent of color.

## Validation after implementation

Run production build, TypeScript and appropriate lint checks. Visually inspect mobile/tablet/desktop and verify narrow-width overflow, keyboard focus, dialog scrolling, navigation, and auth layouts. Exercise attendance and wage edits only with authorized disposable test data; do not mutate real attendance just for screenshots. Record any unavailable authenticated checks honestly.
