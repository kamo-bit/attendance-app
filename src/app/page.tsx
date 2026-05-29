"use client"

import { useState, useEffect } from "react"
import { format, parseISO, isValid } from "date-fns"
import { Clock, Calculator, JapaneseYen, LogIn, LogOut, Coffee } from "lucide-react"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export default function Home() {
  const [attendanceDate, setAttendanceDate] = useState<string>("")
  const [clockIn, setClockIn] = useState("")
  const [clockOut, setClockOut] = useState("")
  const [hasBreak, setHasBreak] = useState(false)
  const [breakCount, setBreakCount] = useState<"1" | "2">("1")
  
  const [break1From, setBreak1From] = useState("")
  const [break1To, setBreak1To] = useState("")
  const [break2From, setBreak2From] = useState("")
  const [break2To, setBreak2To] = useState("")

  const [workMinutes, setWorkMinutes] = useState(0)
  
  const HOURLY_WAGE = 1115
  
  const calculateMinutes = (start: string, end: string) => {
    if (!start || !end) return 0
    const [h1, m1] = start.split(':').map(Number)
    const [h2, m2] = end.split(':').map(Number)
    let diff = (h2 * 60 + m2) - (h1 * 60 + m1)
    if (diff < 0) diff += 24 * 60
    return Math.max(0, diff)
  }

  useEffect(() => {
    setAttendanceDate(format(new Date(), "yyyy-MM-dd"))
  }, [])

  useEffect(() => {
    let total = 0
    if (clockIn && clockOut) {
      total = calculateMinutes(clockIn, clockOut)
      
      if (hasBreak) {
        if (breakCount === "1" || breakCount === "2") {
          total -= calculateMinutes(break1From, break1To)
        }
        if (breakCount === "2") {
          total -= calculateMinutes(break2From, break2To)
        }
      }
    }
    setWorkMinutes(Math.max(0, total))
  }, [clockIn, clockOut, hasBreak, breakCount, break1From, break1To, break2From, break2To])

  const hours = Math.floor(workMinutes / 60)
  const minutes = workMinutes % 60
  const estimatedSalary = Math.floor((workMinutes / 60) * HOURLY_WAGE)
  
  const parsedDate = attendanceDate ? parseISO(attendanceDate) : new Date()
  const displayDate = isValid(parsedDate) ? parsedDate : new Date()

  return (
    <div className="container max-w-2xl mx-auto py-10 px-4">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Attendance</h1>
          <p className="text-muted-foreground mt-2">
            {format(displayDate, "EEEE, MMMM do, yyyy")}
          </p>
        </div>
        <div className="w-full md:w-auto space-y-1">
          <Label htmlFor="attendance-date" className="text-xs text-muted-foreground">Record Date</Label>
          <Input 
            id="attendance-date" 
            type="date" 
            value={attendanceDate} 
            onChange={(e) => setAttendanceDate(e.target.value)}
            className="w-full md:w-auto"
          />
        </div>
      </div>

      <Card className="border shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-muted/30 border-b">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Time Record
          </CardTitle>
          <CardDescription>Enter your working hours and break times for today.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="clock-in" className="flex items-center gap-2 font-medium">
                <LogIn className="w-4 h-4" />
                Clock In
              </Label>
              <Input 
                id="clock-in" 
                type="time" 
                value={clockIn} 
                onChange={(e) => setClockIn(e.target.value)}
                className="w-full text-lg p-4 h-12"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="clock-out" className="flex items-center gap-2 font-medium">
                <LogOut className="w-4 h-4" />
                Clock Out
              </Label>
              <Input 
                id="clock-out" 
                type="time" 
                value={clockOut} 
                onChange={(e) => setClockOut(e.target.value)}
                className="w-full text-lg p-4 h-12"
              />
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted/40 border space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base flex items-center gap-2">
                  <Coffee className="w-4 h-4" />
                  Take a break?
                </Label>
                <p className="text-sm text-muted-foreground">Toggle if you had any breaks today.</p>
              </div>
              <Switch checked={hasBreak} onCheckedChange={setHasBreak} />
            </div>

            {hasBreak && (
              <div className="pt-4 border-t space-y-6 animate-in fade-in slide-in-from-top-4">
                <div className="space-y-3">
                  <Label>How many breaks?</Label>
                  <RadioGroup 
                    value={breakCount} 
                    onValueChange={(v) => setBreakCount(v as "1" | "2")}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="1" id="break-1" />
                      <Label htmlFor="break-1">1 Break</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="2" id="break-2" />
                      <Label htmlFor="break-2">2 Breaks</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Break 1 Start</Label>
                    <Input type="time" value={break1From} onChange={(e) => setBreak1From(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Break 1 End</Label>
                    <Input type="time" value={break1To} onChange={(e) => setBreak1To(e.target.value)} />
                  </div>
                </div>

                {breakCount === "2" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end animate-in fade-in">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Break 2 Start</Label>
                      <Input type="time" value={break2From} onChange={(e) => setBreak2From(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Break 2 End</Label>
                      <Input type="time" value={break2To} onChange={(e) => setBreak2To(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6 border-none shadow-lg rounded-2xl bg-gradient-to-br from-card to-primary/5">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:divide-x divide-y md:divide-y-0">
            <div className="space-y-2 pb-6 md:pb-0">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calculator className="w-4 h-4" />
                <span className="font-medium">Total Work Time</span>
              </div>
              <div className="text-3xl font-bold">
                {hours}<span className="text-lg text-muted-foreground font-normal mx-1">h</span>
                {minutes}<span className="text-lg text-muted-foreground font-normal ml-1">m</span>
              </div>
            </div>
            
            <div className="space-y-2 pt-6 md:pt-0 md:pl-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                <JapaneseYen className="w-4 h-4" />
                <span className="font-medium">Estimated Salary</span>
              </div>
              <div className="text-3xl font-bold text-primary">
                ¥{estimatedSalary.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Based on ¥{HOURLY_WAGE}/hr</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/30 border-t p-4 px-6 flex justify-end">
          <Button size="lg" className="w-full sm:w-auto font-semibold">
            Save Record
          </Button>
        </CardFooter>
      </Card>

    </div>
  )
}
