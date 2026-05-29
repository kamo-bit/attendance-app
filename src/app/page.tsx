"use client"

import { useState, useEffect } from "react"
import { format, parseISO, isValid } from "date-fns"
import { Calendar as CalendarIcon, Clock, Coffee, CheckCircle2 } from "lucide-react"
import { useRouter } from "next/navigation"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { getSalarySettings, updateSalarySettings, saveAttendance, getTodayAttendance } from "@/app/actions"
import { getPayrollPeriod, validateAttendanceInput } from "@/lib/utils"
import { toast } from "sonner"

export default function Home() {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()
  
  const [attendanceDate, setAttendanceDate] = useState("")
  const [clockIn, setClockIn] = useState("")
  const [hasBreak, setHasBreak] = useState(false)
  const [breakCount, setBreakCount] = useState<"1" | "2">("1")
  const [break1From, setBreak1From] = useState("")
  const [break1To, setBreak1To] = useState("")
  const [break2From, setBreak2From] = useState("")
  const [break2To, setBreak2To] = useState("")
  const [clockOut, setClockOut] = useState("")
  
  const [workMinutes, setWorkMinutes] = useState(0)
  const [hourlyWage, setHourlyWage] = useState(1115)
  const [isSaving, setIsSaving] = useState(false)
  
  // Track if the record for this date is already completed
  const [isCompletedRecord, setIsCompletedRecord] = useState(false)

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login")
    }
  }, [session, isPending, router])

  useEffect(() => {
    const today = format(new Date(), "yyyy-MM-dd")
    setAttendanceDate(today)
  }, [])

  useEffect(() => {
    async function loadInitialData() {
      if (!session || !attendanceDate) return
      
      try {
        const settings = await getSalarySettings()
        if (settings) {
          setHourlyWage(settings.hourlyWageYen)
        }

        const todayRecord = await getTodayAttendance(attendanceDate)
        if (todayRecord) {
          setClockIn(todayRecord.clockIn || "")
          setHasBreak(todayRecord.hasBreak)
          setBreakCount(todayRecord.breakCount === 2 ? "2" : "1")
          setBreak1From(todayRecord.break1From || "")
          setBreak1To(todayRecord.break1To || "")
          setBreak2From(todayRecord.break2From || "")
          setBreak2To(todayRecord.break2To || "")
          setClockOut(todayRecord.clockOut || "")
          setWorkMinutes(todayRecord.workMinutes)
          setIsCompletedRecord(todayRecord.status === "completed")
        } else {
          // Reset fields for new date
          setClockIn("")
          setHasBreak(false)
          setBreak1From("")
          setBreak1To("")
          setBreak2From("")
          setBreak2To("")
          setClockOut("")
          setWorkMinutes(0)
          setIsCompletedRecord(false)
        }
      } catch (e) {
        console.error(e)
      }
    }
    
    loadInitialData()
  }, [session, attendanceDate])
  
  const calculateMinutes = (start: string, end: string) => {
    if (!start || !end) return 0
    const [h1, m1] = start.split(":").map(Number)
    const [h2, m2] = end.split(":").map(Number)
    return (h2 * 60 + m2) - (h1 * 60 + m1)
  }

  useEffect(() => {
    let total = 0
    if (clockIn && clockOut) {
      total = calculateMinutes(clockIn, clockOut)
      
      if (hasBreak) {
        if (break1From && break1To) {
          total -= calculateMinutes(break1From, break1To)
        }
        if (breakCount === "2" && break2From && break2To) {
          total -= calculateMinutes(break2From, break2To)
        }
      }
    }
    setWorkMinutes(Math.max(0, total))
  }, [clockIn, clockOut, hasBreak, breakCount, break1From, break1To, break2From, break2To])

  const handleSaveWage = async (wage: number) => {
    setHourlyWage(wage)
    await updateSalarySettings(wage)
    toast.success("Salary updated successfully")
  }

  const handleSaveAttendance = async () => {
    if (!attendanceDate || !clockIn) return
    
    if (isCompletedRecord) {
      toast.error("Attendance for this date is already completed. Please edit it from the History page.")
      return
    }

    const validationError = validateAttendanceInput({
      clockIn, clockOut, hasBreak, breakCount: hasBreak ? (breakCount as any) : 0, 
      break1From, break1To, break2From, break2To
    })

    if (validationError) {
      toast.error(validationError)
      return
    }

    setIsSaving(true)
    
    try {
      const estimatedSalaryYen = Math.floor((workMinutes / 60) * hourlyWage)
      const period = getPayrollPeriod(attendanceDate)
      
      await saveAttendance({
        attendanceDate,
        clockIn,
        hasBreak,
        breakCount: hasBreak ? Number(breakCount) : 0,
        break1From: hasBreak ? break1From : null,
        break1To: hasBreak ? break1To : null,
        break2From: hasBreak && breakCount === "2" ? break2From : null,
        break2To: hasBreak && breakCount === "2" ? break2To : null,
        clockOut,
        workMinutes,
        hourlyWageYen: hourlyWage,
        estimatedSalaryYen,
        payrollPeriodStart: period.start,
        payrollPeriodEnd: period.end,
        status: clockOut ? "completed" : "draft"
      })
      toast.success("Attendance saved successfully")
    } catch (e) {
      console.error(e)
      toast.error("Failed to save attendance")
    } finally {
      setIsSaving(false)
    }
  }

  const hours = Math.floor(workMinutes / 60)
  const minutes = workMinutes % 60
  const estimatedSalary = Math.floor((workMinutes / 60) * hourlyWage)
  
  const parsedDate = attendanceDate ? parseISO(attendanceDate) : new Date()
  const displayDate = isValid(parsedDate) ? parsedDate : new Date()

  if (isPending) return null
  if (!session) return null

  return (
    <div className="container max-w-4xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Today&apos;s Attendance</h1>
        <p className="text-muted-foreground mt-2">
          Log your work hours and track your estimated earnings.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Input Form Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-2xl shadow-sm border overflow-hidden transition-all duration-300 hover:shadow-md">
            <CardHeader className="bg-primary/5 pb-8 pt-8">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                  Clock In / Out
                </CardTitle>
                <div className="text-sm font-medium bg-background px-3 py-1 rounded-full border shadow-sm">
                  {format(displayDate, "EEEE, MMM d, yyyy")}
                </div>
              </div>
              <CardDescription className="pt-2">
                Record your daily attendance time.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 pt-6">
              
              {/* Date Input */}
              <div className="space-y-3">
                <Label htmlFor="date-input" className="text-base font-semibold">Log Date</Label>
                <div className="flex items-center space-x-2">
                  <Input 
                    id="date-input"
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="max-w-[200px]"
                  />
                  <span className="text-sm text-muted-foreground ml-2">You can log past dates here.</span>
                </div>
              </div>

              {/* Time Inputs */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="in" className="text-base font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-500" /> Time In
                  </Label>
                  <Input 
                    id="in" 
                    type="time" 
                    value={clockIn}
                    onChange={(e) => setClockIn(e.target.value)}
                    className="h-12 text-lg"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="out" className="text-base font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-rose-500" /> Time Out
                  </Label>
                  <Input 
                    id="out" 
                    type="time" 
                    value={clockOut}
                    onChange={(e) => setClockOut(e.target.value)}
                    className="h-12 text-lg"
                  />
                </div>
              </div>

              {/* Breaks Section */}
              <div className="rounded-xl border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="space-y-1">
                    <Label htmlFor="break-switch" className="text-base font-semibold flex items-center gap-2">
                      <Coffee className="w-4 h-4 text-amber-500" /> Take a break?
                    </Label>
                    <p className="text-sm text-muted-foreground">Toggle if you had resting periods.</p>
                  </div>
                  <Switch 
                    id="break-switch" 
                    checked={hasBreak}
                    onCheckedChange={setHasBreak}
                  />
                </div>

                {hasBreak && (
                  <div className="space-y-6 pt-4 border-t animate-in fade-in slide-in-from-top-4 duration-300">
                    <RadioGroup 
                      value={breakCount} 
                      onValueChange={(val) => setBreakCount(val as "1" | "2")}
                      className="flex space-x-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="1" id="r1" />
                        <Label htmlFor="r1">1 Break</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="2" id="r2" />
                        <Label htmlFor="r2">2 Breaks</Label>
                      </div>
                    </RadioGroup>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 items-center bg-muted/50 p-4 rounded-lg">
                        <div className="text-sm font-medium">Break 1</div>
                        <div className="flex items-center space-x-2">
                          <Input type="time" value={break1From} onChange={(e) => setBreak1From(e.target.value)} className="h-9" />
                          <span className="text-muted-foreground">to</span>
                          <Input type="time" value={break1To} onChange={(e) => setBreak1To(e.target.value)} className="h-9" />
                        </div>
                      </div>
                      
                      {breakCount === "2" && (
                        <div className="grid grid-cols-2 gap-4 items-center bg-muted/50 p-4 rounded-lg animate-in fade-in zoom-in duration-300">
                          <div className="text-sm font-medium">Break 2</div>
                          <div className="flex items-center space-x-2">
                            <Input type="time" value={break2From} onChange={(e) => setBreak2From(e.target.value)} className="h-9" />
                            <span className="text-muted-foreground">to</span>
                            <Input type="time" value={break2To} onChange={(e) => setBreak2To(e.target.value)} className="h-9" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {isCompletedRecord && (
                <div className="bg-amber-500/10 text-amber-600 border border-amber-500/20 p-4 rounded-xl text-sm flex items-start gap-2">
                  <div className="mt-0.5">⚠️</div>
                  <div>
                    <strong>Record Completed</strong>
                    <p>Attendance for this date has already been completed. To make changes, please use the Edit function on the History page.</p>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="bg-muted/30 pt-6">
              <Button 
                onClick={handleSaveAttendance} 
                className="w-full h-12 text-lg rounded-xl"
                disabled={!clockIn || isSaving || isCompletedRecord}
              >
                {isSaving ? "Saving..." : "Save Record"}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Summary Column */}
        <div className="space-y-6">
          <Card className="rounded-2xl border-none bg-gradient-to-br from-primary/10 via-primary/5 to-background shadow-md">
            <CardHeader>
              <CardTitle>Daily Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Work Time</div>
                <div className="text-4xl font-bold flex items-baseline gap-1">
                  {hours}<span className="text-xl font-semibold text-muted-foreground">h</span> {minutes}<span className="text-xl font-semibold text-muted-foreground">m</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Estimated Salary</div>
                <div className="text-3xl font-bold text-primary">
                  ¥{estimatedSalary.toLocaleString()}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Label htmlFor="wage-input" className="text-xs text-muted-foreground whitespace-nowrap">Wage (¥/hr):</Label>
                  <Input 
                    id="wage-input"
                    type="number"
                    value={hourlyWage || ""}
                    onChange={(e) => handleSaveWage(Number(e.target.value))}
                    className="h-7 w-24 px-2 py-1 text-xs bg-background/50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
