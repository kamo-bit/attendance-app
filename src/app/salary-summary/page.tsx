"use client"

import { useState } from "react"
import { WalletCards, CalendarDays, Clock, JapaneseYen } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

const MOCK_PERIODS = [
  { id: "apr-2024", label: "21 Mar - 20 Apr 2024", totalDays: 22, totalMins: 10560, totalSalary: 196240 },
  { id: "mar-2024", label: "21 Feb - 20 Mar 2024", totalDays: 21, totalMins: 10080, totalSalary: 187320 },
  { id: "feb-2024", label: "21 Jan - 20 Feb 2024", totalDays: 20, totalMins: 9600, totalSalary: 178400 },
]

export default function SalarySummaryPage() {
  const [period, setPeriod] = useState(MOCK_PERIODS[0].id)

  const selectedPeriod = MOCK_PERIODS.find(p => p.id === period) || MOCK_PERIODS[0]
  
  const hours = Math.floor(selectedPeriod.totalMins / 60)
  const mins = selectedPeriod.totalMins % 60

  const handlePeriodChange = (val: string | null) => {
    if (val) setPeriod(val);
  }

  return (
    <div className="container max-w-3xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Salary Summary</h1>
        <p className="text-muted-foreground mt-2">
          View your total earnings and work hours based on the payroll period (21st to 20th).
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Select Payroll Period</CardTitle>
            <CardDescription>Choose a period to see the summary</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Period</Label>
              <Select value={period} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-full sm:w-[300px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_PERIODS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid sm:grid-cols-3 gap-6">
          <Card className="bg-primary/5 border-primary/20 rounded-2xl border shadow-sm">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center text-center space-y-2">
                <div className="p-3 bg-primary/10 rounded-full">
                  <JapaneseYen className="w-6 h-6 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Total Salary</p>
                  <p className="text-2xl font-bold text-primary">
                    ¥{selectedPeriod.totalSalary.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center text-center space-y-2">
                <div className="p-3 bg-muted rounded-full">
                  <Clock className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Total Hours</p>
                  <p className="text-2xl font-bold">
                    {hours}h {mins}m
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center text-center space-y-2">
                <div className="p-3 bg-muted rounded-full">
                  <CalendarDays className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Days Worked</p>
                  <p className="text-2xl font-bold">
                    {selectedPeriod.totalDays} days
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
