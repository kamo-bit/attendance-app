"use client"

import { useState, useEffect } from "react"
import { format, parseISO, subMonths, addMonths, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth } from "date-fns"
import { FileText, CalendarRange, BarChart3, CalendarDays, MousePointerClick, Banknote, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { authClient } from "@/lib/auth-client"
import { getSalarySummary, getYearlySummary } from "@/app/actions"
import { getPayrollPeriod, getSalaryPeriodForMonth } from "@/lib/utils"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts"

export default function SalarySummaryPage() {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()
  
  const [periodDate, setPeriodDate] = useState(() => format(new Date(), "yyyy-MM-dd"))
  const [summary, setSummary] = useState<{
    totalWorkMinutes: number;
    totalWorkDays: number;
    totalSalaryYen: number;
    records: any[];
  }>({ totalWorkMinutes: 0, totalWorkDays: 0, totalSalaryYen: 0, records: [] })

  const currentYear = new Date().getFullYear().toString()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [yearlySummary, setYearlySummary] = useState<{
    totalWorkMinutes: number;
    totalWorkDays: number;
    totalSalaryYen: number;
    records: any[];
  }>({ totalWorkMinutes: 0, totalWorkDays: 0, totalSalaryYen: 0, records: [] })

  const [isMobile, setIsMobile] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState<Date | null>(null)

  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login")
    }
  }, [session, isPending, router])

  // Generate 200 years (100 years past and future) to simulate infinite scroll
  const years = Array.from({ length: 201 }).map((_, i) => (Number(currentYear) + 100 - i).toString())

  useEffect(() => {
    async function loadMonthly() {
      if (!session) return
      const period = getSalaryPeriodForMonth(periodDate)
      const data = await getSalarySummary(period.start, period.end)
      setSummary(data as any)
      // Set the calendar month to the periodDate to show the current selected month
      setCalendarMonth(parseISO(periodDate))
    }
    loadMonthly()
  }, [session, periodDate])

  useEffect(() => {
    async function loadYearly() {
      if (!session) return
      const data = await getYearlySummary(selectedYear)
      setYearlySummary(data as any)
    }
    loadYearly()
  }, [session, selectedYear])

  if (isPending || !session) return null

  // --- Monthly Calculation ---
  const currentPeriod = getSalaryPeriodForMonth(periodDate)
  const pStart = parseISO(currentPeriod.start)
  const pEnd = parseISO(currentPeriod.end)
  
  const hours = Math.floor(summary.totalWorkMinutes / 60)
  const minutes = summary.totalWorkMinutes % 60

  // Calendar Data (We need this first to determine displayMonth for the chart)
  const displayMonth = calendarMonth || pEnd
  const monthStart = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 1)
  const monthEnd = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 0)

  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }) // Monday start
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  // Chart data for monthly (Daily Salary) - Full month based on calendar selector
  const allDaysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const monthlyChartData = allDaysInMonth.map(day => {
    const dateStr = format(day, "yyyy-MM-dd")
    // Find record in the active period first, then fallback to yearly summary records
    const record = summary.records?.find(r => r.attendanceDate === dateStr) ||
                   yearlySummary.records?.find(r => r.attendanceDate === dateStr)
    return {
      date: format(day, "d"), // Just the day number (1, 2, 3...)
      fullDate: format(day, "MMMM d, yyyy"),
      salary: record ? record.estimatedSalaryYen : 0,
      day: dateStr
    }
  })

  // --- Yearly Calculation ---
  const yHours = Math.floor(yearlySummary.totalWorkMinutes / 60)
  const yMinutes = yearlySummary.totalWorkMinutes % 60

  // Group yearly records by month for chart
  const monthlyTotals = Array.from({ length: 12 }).map((_, i) => ({
    month: format(new Date(2000, i, 1), "MMM"),
    salary: 0,
    days: 0
  }))
  
  yearlySummary.records?.forEach(r => {
    const date = parseISO(r.attendanceDate)
    const monthIndex = date.getMonth()
    monthlyTotals[monthIndex].salary += r.estimatedSalaryYen
    if (r.clockIn) monthlyTotals[monthIndex].days += 1
  })

  // --- Reusable Content Renderer for Hover/Pop-up ---
  const renderDetailsContent = (day: Date, record: any) => {
    const rHours = Math.floor(record.workMinutes / 60)
    const rMins = record.workMinutes % 60
    return (
      <div className="space-y-3">
        <h4 className="font-medium flex items-center gap-2 border-b pb-2">
          <CalendarDays className="w-4 h-4 text-primary" />
          {format(day, "MMMM d, yyyy")}
        </h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-muted-foreground">Work Time:</div>
          <div className="font-medium text-right">{rHours}h {rMins}m</div>
          
          <div className="text-muted-foreground">Salary:</div>
          <div className="font-medium text-right text-primary">¥{record.estimatedSalaryYen.toLocaleString()}</div>
          
          <div className="text-muted-foreground">Clock In:</div>
          <div className="font-medium text-right">{record.clockIn}</div>
          
          <div className="text-muted-foreground">Clock Out:</div>
          <div className="font-medium text-right">{record.clockOut || "-"}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-6xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Earnings Summary</h1>
        <p className="text-muted-foreground mt-2">
          Track your work hours and salary, organized by payroll period or yearly view.
        </p>
      </div>

      <Tabs defaultValue="monthly" className="w-full">
        <TabsList className="mb-8 flex w-full sm:w-[440px] bg-muted/50 p-2 gap-1 rounded-2xl border h-14 items-center">
          <TabsTrigger 
            value="monthly" 
            className="text-xs sm:text-sm font-medium rounded-xl data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-active:bg-transparent dark:data-active:bg-transparent data-active:shadow-none transition-all flex items-center justify-center gap-1.5 sm:gap-2 flex-1 h-full"
          >
            <CalendarRange className="w-4 h-4 shrink-0" />
            <span className="truncate">Monthly Cycle</span>
          </TabsTrigger>
          <TabsTrigger 
            value="yearly" 
            className="text-xs sm:text-sm font-medium rounded-xl data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-active:bg-transparent dark:data-active:bg-transparent data-active:shadow-none transition-all flex items-center justify-center gap-1.5 sm:gap-2 flex-1 h-full"
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span className="truncate">Yearly Overview</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Calendar on the Left */}
            <div className="lg:col-span-2">
              <Card className="rounded-2xl shadow-sm border h-full">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5 text-primary" />
                      Work Calendar
                    </CardTitle>
                  </div>
                  <Input 
                    type="month" 
                    value={periodDate.substring(0, 7)}
                    onChange={(e: any) => setPeriodDate(e.target.value)}
                    className="w-full sm:w-[200px] rounded-xl font-semibold cursor-pointer"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center mb-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div key={day} className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider py-1">{day}</div>
                  ))}
                  
                  {calendarDays.map((day, i) => {
                    const isCurrentPeriod = day >= pStart && day <= pEnd
                    const isCurrentMonth = isSameMonth(day, displayMonth)
                    const dateStr = format(day, "yyyy-MM-dd")
                    const record = summary.records?.find(r => r.attendanceDate === dateStr) || 
                                   yearlySummary.records?.find(r => r.attendanceDate === dateStr)
                    const isWorkDay = !!record?.clockIn
                    
                    const cellContent = (
                      <div 
                        className={`h-12 sm:h-20 w-full border rounded-lg p-1 sm:p-2 flex flex-col justify-start items-center sm:items-start transition-all relative overflow-hidden
                          ${!isCurrentMonth ? "opacity-20 bg-transparent border-transparent" : ""}
                          ${isCurrentMonth && !isCurrentPeriod ? "opacity-40 bg-muted/20 border-dashed" : ""}
                          ${isWorkDay 
                            ? "bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300 hover:shadow-sm dark:bg-blue-900/30 dark:border-blue-800 dark:hover:bg-blue-900/50 cursor-pointer opacity-100" 
                            : "bg-card hover:bg-muted/50 cursor-default"
                          }
                        `}
                      >
                        <span className={`text-xs sm:text-sm font-semibold z-10 ${isWorkDay ? "text-blue-700 dark:text-blue-300" : "text-muted-foreground"}`}>
                          {format(day, "d")}
                        </span>
                        
                        {isWorkDay && (
                          <div className="hidden sm:flex mt-auto w-full flex-col items-start text-[10px] text-blue-600 dark:text-blue-400 font-medium z-10">
                            <span className="truncate w-full text-left">¥{record.estimatedSalaryYen.toLocaleString()}</span>
                            <span>{Math.floor(record.workMinutes/60)}h {record.workMinutes%60}m</span>
                          </div>
                        )}
                        
                        {/* Mobile indicator dot */}
                        {isWorkDay && (
                          <div className="sm:hidden absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
                        )}
                      </div>
                    )

                    if (!isWorkDay) {
                      return <div key={dateStr}>{cellContent}</div>
                    }

                    if (isMobile) {
                      return (
                        <Popover key={dateStr}>
                          <PopoverTrigger>
                            {cellContent}
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-4 rounded-xl shadow-lg border-blue-100 dark:border-blue-900">
                            {renderDetailsContent(day, record)}
                          </PopoverContent>
                        </Popover>
                      )
                    }

                    return (
                      <Tooltip key={dateStr}>
                        <TooltipTrigger>
                          {cellContent}
                        </TooltipTrigger>
                        <TooltipContent className="w-64 p-4 rounded-xl shadow-lg border bg-popover text-popover-foreground" side="top" sideOffset={8}>
                          {renderDetailsContent(day, record)}
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
            </div>

            {/* Salary Summary on the Right */}
            <div className="lg:col-span-1">
              <Card className="rounded-2xl border-none bg-gradient-to-br from-primary/10 via-primary/5 to-background shadow-md h-full p-6">
                <div className="flex flex-col justify-between items-start gap-4">
                  <div>
                    <CardTitle className="text-2xl">Salary Summary</CardTitle>
                    <CardDescription>
                      Payroll Period: {format(pStart, "MMM d")} - {format(pEnd, "MMM d, yyyy")}
                    </CardDescription>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-6 mt-8">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Work Time</div>
                    <div className="text-4xl font-bold flex items-baseline gap-1">
                      {hours}<span className="text-xl font-semibold text-muted-foreground">h</span> {minutes}<span className="text-xl font-semibold text-muted-foreground">m</span>
                    </div>
                  </div>
                  <div className="space-y-2 pt-4 border-t border-primary/10">
                    <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total 1-Month Salary</div>
                    <div className="text-5xl font-black text-primary drop-shadow-sm">
                      ¥{summary.totalSalaryYen.toLocaleString()}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Daily Chart */}
            <Card className="rounded-2xl shadow-sm border w-full flex flex-col bg-slate-900 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Daily Earnings Chart
                </CardTitle>
                <CardDescription className="text-slate-300">Salary breakdown per day</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px] w-full overflow-hidden p-2 sm:p-6">
                {monthlyChartData.length > 0 ? (
                  <div className="w-full h-full overflow-x-auto pb-2 custom-scrollbar">
                    <div className="min-w-[750px] h-full pr-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlyChartData} margin={{ top: 20, right: 20, left: 0, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fill: '#ffffff', fontSize: 12 }} 
                        tickLine={{ stroke: '#ffffff' }}
                        axisLine={{ stroke: '#ffffff', strokeWidth: 1 }}
                        interval={0}
                        minTickGap={0}
                        dy={10}
                        label={{ value: 'Date', position: 'insideBottom', offset: -15, fill: '#ffffff', fontSize: 13 }}
                      />
                      <YAxis 
                        tick={{ fill: '#ffffff', fontSize: 12 }} 
                        tickLine={{ stroke: '#ffffff' }}
                        axisLine={{ stroke: '#ffffff', strokeWidth: 1 }}
                        tickFormatter={(value) => `${value}`}
                        label={{ value: 'Salary (¥)', angle: -90, position: 'insideLeft', offset: 0, fill: '#ffffff', fontSize: 13 }}
                      />
                      <RechartsTooltip 
                        cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1, strokeDasharray: '4 4' }}
                        contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#1e293b', color: '#ffffff' }}
                        labelStyle={{ color: '#ffffff', fontWeight: 600, marginBottom: '4px' }}
                        formatter={(value: any) => [`¥${value.toLocaleString()}`, 'Salary']}
                        labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                      />
                      <Legend verticalAlign="top" align="left" iconType="circle" wrapperStyle={{ paddingBottom: '20px', color: '#ffffff' }} />
                      <Line 
                        name="Daily Salary"
                        type="linear" 
                        dataKey="salary" 
                        stroke="#f59e0b" 
                        strokeWidth={2}
                        activeDot={{ r: 6, fill: "#f59e0b", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                        dot={{ r: 4, fill: "#f59e0b", strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground">
                    <Banknote className="w-12 h-12 mb-3 opacity-20" />
                    <p>No earnings data for this period</p>
                  </div>
                )}
              </CardContent>
            </Card>
        </TabsContent>

        {/* --- YEARLY TAB --- */}
        <TabsContent value="yearly" className="space-y-6 animate-in fade-in duration-500">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Yearly Controls */}
            <Card className="md:col-span-1 rounded-2xl border shadow-sm h-fit">
              <CardHeader>
                <CardTitle className="text-lg">Select Year</CardTitle>
                <CardDescription>Choose a year to view accumulation</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedYear} onValueChange={(val) => val && setSelectedYear(val)}>
                  <SelectTrigger className="h-12 rounded-xl text-lg font-bold">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]" alignItemWithTrigger={false}>
                    {years.map((y) => (
                      <SelectItem key={y} value={y} className="cursor-pointer">{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="mt-6 p-4 bg-muted/50 rounded-xl border flex items-center justify-center">
                  <span className="text-4xl font-black text-muted-foreground/30 tracking-tighter">{selectedYear}</span>
                </div>
              </CardContent>
            </Card>

            {/* Yearly Highlights */}
            <div className="md:col-span-2 space-y-6">
              <Card className="rounded-2xl border-none bg-gradient-to-br from-primary/10 via-primary/5 to-background shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Annual Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Work Time</div>
                      <div className="text-4xl font-bold flex items-baseline gap-1">
                        {yHours}<span className="text-xl font-semibold text-muted-foreground">h</span> {yMinutes}<span className="text-xl font-semibold text-muted-foreground">m</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Days Worked</div>
                      <div className="text-4xl font-bold flex items-baseline gap-1">
                        {yearlySummary.totalWorkDays} <span className="text-xl font-semibold text-muted-foreground">days</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 pt-4 border-t">
                    <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Accumulated Salary</div>
                    <div className="text-5xl font-black text-primary drop-shadow-sm">
                      ¥{yearlySummary.totalSalaryYen.toLocaleString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* Yearly Chart */}
          <Card className="rounded-2xl shadow-sm border bg-slate-900 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <BarChart3 className="w-5 h-5 text-primary" />
                Monthly Earnings Distribution
              </CardTitle>
              <CardDescription className="text-slate-300">Salary breakdown per month for {selectedYear}</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTotals} margin={{ top: 20, right: 30, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: '#ffffff', fontSize: 13 }} 
                    tickLine={{ stroke: '#ffffff' }}
                    axisLine={{ stroke: '#ffffff', strokeWidth: 1 }}
                    dy={10}
                    label={{ value: 'Month', position: 'insideBottom', offset: -15, fill: '#ffffff', fontSize: 13 }}
                  />
                  <YAxis 
                    tick={{ fill: '#ffffff', fontSize: 13 }} 
                    tickLine={{ stroke: '#ffffff' }}
                    axisLine={{ stroke: '#ffffff', strokeWidth: 1 }}
                    tickFormatter={(value) => `${value}`}
                    label={{ value: 'Salary (¥)', angle: -90, position: 'insideLeft', offset: 0, fill: '#ffffff', fontSize: 13 }}
                  />
                  <RechartsTooltip 
                    cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1, strokeDasharray: '4 4' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#1e293b', color: '#ffffff' }}
                    labelStyle={{ color: '#ffffff', fontWeight: 600, marginBottom: '8px' }}
                    formatter={(value: any, name: any) => [
                      name === 'Monthly Salary' ? `¥${value.toLocaleString()}` : value, 
                      name === 'Monthly Salary' ? 'Salary' : 'Days Worked'
                    ]}
                  />
                  <Legend verticalAlign="top" align="left" iconType="circle" wrapperStyle={{ paddingBottom: '20px', color: '#ffffff' }} />
                  <Line 
                    name="Monthly Salary"
                    type="linear" 
                    dataKey="salary" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    activeDot={{ r: 6, fill: "#f59e0b", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                    dot={{ r: 4, fill: "#f59e0b", strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
