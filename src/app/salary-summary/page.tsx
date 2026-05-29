"use client"

import { useState, useEffect } from "react"
import { format, parseISO, subMonths } from "date-fns"
import { FileText, CalendarRange } from "lucide-react"
import { useRouter } from "next/navigation"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { authClient } from "@/lib/auth-client"
import { getSalarySummary } from "@/app/actions"
import { getPayrollPeriod } from "@/lib/utils"

export default function SalarySummaryPage() {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()
  
  const [periodDate, setPeriodDate] = useState(() => format(new Date(), "yyyy-MM-dd"))
  const [summary, setSummary] = useState({ totalWorkMinutes: 0, totalWorkDays: 0, totalSalaryYen: 0 })

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login")
    }
  }, [session, isPending, router])

  // Generate last 6 months options
  const periodOptions = Array.from({ length: 6 }).map((_, i) => {
    const d = subMonths(new Date(), i)
    return format(d, "yyyy-MM-dd")
  })

  useEffect(() => {
    async function load() {
      if (!session) return
      const period = getPayrollPeriod(periodDate)
      const data = await getSalarySummary(period.start, period.end)
      setSummary(data)
    }
    load()
  }, [session, periodDate])

  if (isPending || !session) return null

  const currentPeriod = getPayrollPeriod(periodDate)
  const pStart = parseISO(currentPeriod.start)
  const pEnd = parseISO(currentPeriod.end)
  
  const hours = Math.floor(summary.totalWorkMinutes / 60)
  const minutes = summary.totalWorkMinutes % 60

  return (
    <div className="container max-w-4xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Salary Summary</h1>
        <p className="text-muted-foreground mt-2">
          View your total earnings and work hours based on the 21-20 payroll period.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1 rounded-2xl border shadow-sm h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Select Period</CardTitle>
            <CardDescription>Choose a payroll cycle</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={periodDate} onValueChange={(val) => val && setPeriodDate(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((dateStr, i) => {
                  const p = getPayrollPeriod(dateStr)
                  const startFmt = format(parseISO(p.start), "MMM d")
                  const endFmt = format(parseISO(p.end), "MMM d, yyyy")
                  return (
                    <SelectItem key={i} value={dateStr}>
                      {startFmt} - {endFmt}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            <div className="mt-6 flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <CalendarRange className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Active Period:</p>
                <p className="text-muted-foreground">{format(pStart, "MMMM d, yyyy")} to {format(pEnd, "MMMM d, yyyy")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-6">
          <Card className="rounded-2xl border-none bg-gradient-to-br from-primary/10 via-primary/5 to-background shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Period Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Work Time</div>
                  <div className="text-4xl font-bold flex items-baseline gap-1">
                    {hours}<span className="text-xl font-semibold text-muted-foreground">h</span> {minutes}<span className="text-xl font-semibold text-muted-foreground">m</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Days Worked</div>
                  <div className="text-4xl font-bold flex items-baseline gap-1">
                    {summary.totalWorkDays} <span className="text-xl font-semibold text-muted-foreground">days</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 pt-4 border-t">
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Salary</div>
                <div className="text-5xl font-bold text-primary">
                  ¥{summary.totalSalaryYen.toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
