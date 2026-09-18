import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { payrollMonth, payrollPeriod } from "./attendance";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function getPayrollPeriod(dateStr: string) {
  return payrollPeriod(payrollMonth(dateStr.slice(0, 10)));
}
export function getSalaryPeriodForMonth(dateStr: string) {
  return payrollPeriod(dateStr.slice(0, 7));
}
