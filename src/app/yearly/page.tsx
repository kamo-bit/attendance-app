"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { BarChart3 } from "lucide-react"
import { useRouter } from "next/navigation"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { authClient } from "@/lib/auth-client"
import { getYearlySummary } from "@/app/actions"

export default function YearlyPage() {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()
  
  const currentYear = new Date().getFullYear().toString()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [summary, setSummary] = useState({ totalWorkMinutes: 0, totalWorkDays: 0, totalSalaryYen: 0 })

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login")
    }
  }, [session, isPending, router])

  const years = Array.from({ length: 5 }).map((_, i) => (Number(currentYear) - i).toString())

  useEffect(() => {
    async function load() {
      if (!session) return
      const data = await getYearlySummary(selectedYear)
      setSummary(data)
    }
    load()
  }, [session, selectedYear])

  if (isPending || !session) return null

  const hours = Math.floor(summary.totalWorkMinutes / 60)
  const minutes = summary.totalWorkMinutes % 60

  return (
    <div className="container max-w-4xl mx-auto py-10 px-4">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Yearly Accumulation</h1>
          <p className="text-muted-foreground mt-2">
            Track your total work hours and earnings over the year.
          </p>
        </div>
        <div className="w-32">
          <Select value={selectedYear} onValueChange={(val) => val && setSelectedYear(val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="rounded-2xl border-none bg-gradient-to-br from-primary/10 via-primary/5 to-background shadow-md overflow-hidden">
        <CardHeader className="pb-8 pt-8 px-8">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <BarChart3 className="w-6 h-6 text-primary" />
            {selectedYear} Summary
          </CardTitle>
          <CardDescription className="text-base">
            Total accumulation from January 1st to December 31st, {selectedYear}.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-10 space-y-10">
          
          <div className="grid sm:grid-cols-2 gap-8">
            <div className="space-y-3">
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Work Time</div>
              <div className="text-5xl font-bold flex items-baseline gap-1">
                {hours}<span className="text-xl font-semibold text-muted-foreground">h</span> {minutes}<span className="text-xl font-semibold text-muted-foreground">m</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Days Worked</div>
              <div className="text-5xl font-bold flex items-baseline gap-1">
                {summary.totalWorkDays} <span className="text-xl font-semibold text-muted-foreground">days</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3 pt-6 border-t border-primary/20">
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Salary Earned</div>
            <div className="text-6xl font-black text-primary drop-shadow-sm">
              ¥{summary.totalSalaryYen.toLocaleString()}
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  )
}
