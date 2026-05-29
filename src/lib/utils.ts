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

export function validateAttendanceInput(data: {
  clockIn: string
  clockOut: string
  hasBreak: boolean
  breakCount: "1" | "2" | 0 | 1 | 2
  break1From: string
  break1To: string
  break2From: string
  break2To: string
}) {
  const { clockIn, clockOut, hasBreak, breakCount, break1From, break1To, break2From, break2To } = data
  
  const toMinutes = (time: string) => {
    if (!time) return 0
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
  }

  const inMins = toMinutes(clockIn)
  const outMins = toMinutes(clockOut)

  if (clockIn && clockOut && outMins <= inMins) {
    return "Clock Out must be later than Clock In."
  }

  if (hasBreak && clockIn && clockOut) {
    const b1FromMins = toMinutes(break1From)
    const b1ToMins = toMinutes(break1To)
    
    if (break1From && break1To) {
      if (b1ToMins <= b1FromMins) return "Break 1 end time must be after start time."
      if (b1FromMins < inMins || b1ToMins > outMins) {
        return "Break 1 must be within Clock In and Clock Out times."
      }
    }

    if (String(breakCount) === "2") {
      const b2FromMins = toMinutes(break2From)
      const b2ToMins = toMinutes(break2To)
      
      if (break2From && break2To) {
        if (b2ToMins <= b2FromMins) return "Break 2 end time must be after start time."
        if (b2FromMins < inMins || b2ToMins > outMins) {
          return "Break 2 must be within Clock In and Clock Out times."
        }
        if (break1From && break1To && b2FromMins < b1ToMins) {
          return "Break 2 must start after Break 1 ends."
        }
      }
    }
  }

  return null // no errors
}
