# AbsenKuy design handoff

Project: https://stitch.withgoogle.com/projects/9519189570753591892

Scope: Google Stitch designs only, as explicitly confirmed by the user. No application source code changes, database changes, authentication changes, or deployment.

## Main deliverables

24 numbered main frames: each of the following has Desktop, Tablet, and Mobile variants.

| Prefix | Screen | Existing route |
| --- | --- | --- |
| 01 | Attendance | `/` |
| 02 | History | `/history` |
| 03 | Monthly earnings | `/salary-summary` monthly tab |
| 04 | Yearly earnings | `/salary-summary` yearly tab |
| 05 | Sign in | `/login` |
| 06 | Create account | `/register` |
| 07 | Forgot password | `/forgot-password` |
| 08 | Reset password | `/reset-password` |

Eight supporting frames: Edit attendance (desktop/mobile), Confirm delete (desktop/mobile), Edit holidays (desktop/mobile), Recovery states board, and Form states board. These are numbered 09–13. Reference boards show multiple state examples and are not application routes.

The project also contains the original concept labeled `Archive — Initial exploration (superseded)` and the CoinPulse foundation. The numbered frames are the redesign deliverables.

## Design improvements

- Split the initial device-switching demonstration into actual separate screen frames.
- Removed unsupported overtime and holiday multipliers from primary Attendance designs.
- Replaced static break strings with labeled Start/End inputs.
- Positioned work-time/earnings summary before Save attendance.
- Provided explicit Save rate instead of saving on every keystroke.
- Converted mobile History into cards while retaining desktop tables.
- Made calendar-month and payroll-cycle labels explicit, with a legend and complete September 2026 calendar.
- Preserved full monetary values in mobile earnings summaries.
- Simplified authentication copy and removed invented infrastructure/security claims through targeted edits.
- Manually resized tablet frames that Stitch initially generated at desktop width.

## Verification performed

- Verified Google account identity before creating the project.
- Reloaded the project successfully and confirmed all 32 numbered frames were present.
- Read rendered frame widths after reload: mobile 390px, tablet 833–834px, desktop 1280px.
- Inspected document width of all 24 main frames: document scroll width equaled viewport width in every frame. No horizontal overflow was detected at these canvas sizes.
- Verified saved mobile Reset password text contains the simple password form and none of the earlier protocol/security decorations.
- Verified saved monthly Mobile text includes `¥153,600`, the complete September 1–30 grid, the Aug 21–Sep 20 payroll period, and selected-day details.
- Verified the final delete confirmation explains that deleted records remain marked in History, and yearly reporting uses `Year` rather than `Tax year`.
- Verified computed primary Attendance desktop background is `rgb(9, 9, 11)` (#09090B), with DM Sans body typography.
- Visually reviewed Attendance mobile, History mobile, Monthly earnings mobile, password recovery/reset layouts, and multi-device compositions during iteration.

## Limits of this stage

These are UI design artifacts with fictional sample data. They do not establish that the existing Next.js app is responsive or that prototype interactions connect to its backend. Some full-page frames scroll vertically. Actual keyboard behavior, screen-reader semantics, form validation, contrast ratios, and 320–1920px production breakpoints must be checked during implementation.

The existing application is unchanged. No build or application tests were run because only design documents and external Stitch designs were created.
