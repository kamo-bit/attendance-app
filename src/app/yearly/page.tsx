"use client"

import { useState } from "react"
import { Calendar, BarChart3, JapaneseYen } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const MOCK_YEARS = ["2024", "2023"]

const MOCK_MONTHLY_DATA = [
  { month: "January", totalMins: 9600, salary: 178400 },
  { month: "February", totalMins: 10080, salary: 187320 },
  { month: "March", totalMins: 10560, salary: 196240 },
  { month: "April", totalMins: 8400, salary: 156100 },
]

export default function YearlyAccumulationPage() {
  const [year, setYear] = useState(MOCK_YEARS[0])

  const yearlyTotalMins = MOCK_MONTHLY_DATA.reduce((acc, curr) => acc + curr.totalMins, 0)
  const yearlyTotalSalary = MOCK_MONTHLY_DATA.reduce((acc, curr) => acc + curr.salary, 0)
  
  const totalHours = Math.floor(yearlyTotalMins / 60)
  const totalMins = yearlyTotalMins % 60

  const handleYearChange = (val: string | null) => {
    if (val) setYear(val)
  }

  return (
    <div className="container max-w-4xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Yearly Accumulation</h1>
        <p className="text-muted-foreground mt-2">
          View your total earnings and work hours accumulated over the year.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card className="md:col-span-1 rounded-2xl border shadow-sm">
          <CardHeader>
            <CardTitle>Select Year</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={year} onValueChange={handleYearChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_YEARS.map((y) => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 bg-primary/5 border-primary/20 rounded-2xl border shadow-sm">
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 md:divide-x divide-y md:divide-y-0 gap-y-6 md:gap-y-0 h-full items-center">
            <div className="flex flex-col items-center justify-center text-center space-y-2 px-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <JapaneseYen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Salary ({year})</p>
                <p className="text-3xl font-bold text-primary">
                  ¥{yearlyTotalSalary.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center text-center space-y-2 px-4">
              <div className="p-3 bg-muted rounded-full">
                <BarChart3 className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Hours</p>
                <p className="text-3xl font-bold">
                  {totalHours}h {totalMins}m
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Monthly Breakdown
          </CardTitle>
          <CardDescription>A summary of your earnings per month for {year}.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Work Hours</TableHead>
                <TableHead className="text-right">Salary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_MONTHLY_DATA.map((data, index) => {
                const hours = Math.floor(data.totalMins / 60)
                const mins = data.totalMins % 60
                
                return (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{data.month}</TableCell>
                    <TableCell className="text-right">
                      {hours}h {mins}m
                    </TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      ¥{data.salary.toLocaleString()}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
