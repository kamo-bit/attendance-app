import {
  localDate,
  moveMonth,
  parseDate,
  payrollMonth,
  payrollPeriod,
  validDate,
} from "./attendance";

export type PayrollCalendarView = {
  month: string;
  calendarMonth: string;
  selectedDate: string;
};

export function payrollViewForDate(date: string): PayrollCalendarView {
  return {
    month: payrollMonth(date),
    calendarMonth: date.slice(0, 7),
    selectedDate: date,
  };
}

export function isInPayrollPeriod(date: string, month: string) {
  const period = payrollPeriod(month);
  return date >= period.start && date <= period.end;
}

export function changePayrollPeriod(
  view: PayrollCalendarView,
  month: string,
  today: string,
): PayrollCalendarView {
  if (!/^\d{4}-\d{2}$/.test(month) || !validDate(`${month}-20`)) return view;
  const selectedDate = isInPayrollPeriod(view.selectedDate, month)
    ? view.selectedDate
    : isInPayrollPeriod(today, month)
      ? today
      : payrollPeriod(month).end;
  return { month, calendarMonth: selectedDate.slice(0, 7), selectedDate };
}

export function payrollRangeLabel(month: string) {
  const { start, end } = payrollPeriod(month);
  const label = (date: string, year: boolean) =>
    new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      ...(year ? { year: "numeric" as const } : {}),
    }).format(parseDate(date));
  return `${label(start, start.slice(0, 4) !== end.slice(0, 4))} – ${label(end, true)}`;
}

export function payrollCalendarMonths(month: string) {
  const period = payrollPeriod(month);
  const previousMonthEnd = parseDate(`${month}-01`);
  previousMonthEnd.setDate(0);
  return [
    {
      month: moveMonth(month, -1),
      start: period.start,
      end: localDate(previousMonthEnd),
    },
    { month, start: `${month}-01`, end: period.end },
  ];
}
