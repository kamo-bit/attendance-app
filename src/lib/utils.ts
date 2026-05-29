import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getPayrollPeriod(dateStr: string) {
  const date = new Date(dateStr)
  const day = date.getDate()
  const month = date.getMonth()
  const year = date.getFullYear()

  let startYear = year
  let startMonth = month
  let endYear = year
  let endMonth = month

  if (day >= 21) {
    endMonth = month + 1
    if (endMonth > 11) {
      endMonth = 0
      endYear++
    }
  } else {
    startMonth = month - 1
    if (startMonth < 0) {
      startMonth = 11
      startYear--
    }
  }

  const start = new Date(startYear, startMonth, 21)
  const end = new Date(endYear, endMonth, 20)
  
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  }
}
