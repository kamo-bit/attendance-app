"use client"

import { useState, useEffect, useRef } from "react"
import { format, parseISO, subMonths, addMonths, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth } from "date-fns"
import { FileText, CalendarRange, BarChart3, CalendarDays, MousePointerClick, Banknote, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Download, Edit, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth-client"
import { getSalarySummary, getYearlySummary, getUserHolidays, saveUserHolidays, deleteAttendance, updateAttendance } from "@/app/actions"
import { getPayrollPeriod, getSalaryPeriodForMonth, cn, validateAttendanceInput } from "@/lib/utils"
import { toast } from "sonner"

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
  const [isExporting, setIsExporting] = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)

  const [isSelectingHolidays, setIsSelectingHolidays] = useState(false)
  const [selectedHolidays, setSelectedHolidays] = useState<string[]>([])
  const [tempHolidays, setTempHolidays] = useState<string[]>([])
  const [showHolidayDialog, setShowHolidayDialog] = useState(false)

  // Edit & Delete states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<any>(null)
  const [editClockIn, setEditClockIn] = useState("")
  const [editClockOut, setEditClockOut] = useState("")
  const [editHasBreak, setEditHasBreak] = useState(false)
  const [editBreakCount, setEditBreakCount] = useState("1")
  const [editBreak1From, setEditBreak1From] = useState("")
  const [editBreak1To, setEditBreak1To] = useState("")
  const [editBreak2From, setEditBreak2From] = useState("")
  const [editBreak2To, setEditBreak2To] = useState("")

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null)
  
  const [isSaving, setIsSaving] = useState(false)

  // Load holidays from DB on mount
  useEffect(() => {
    async function loadHolidays() {
      try {
        const saved = await getUserHolidays()
        setSelectedHolidays(saved)
      } catch (e) {
        console.error("Failed to load holidays", e)
      }
    }
    loadHolidays()
  }, [])

  const toggleHoliday = (dateStr: string) => {
    if (!isSelectingHolidays) return
    setTempHolidays(prev => 
      prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]
    )
  }

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

  const loadMonthly = async () => {
    if (!session) return
    const period = getSalaryPeriodForMonth(periodDate)
    const data = await getSalarySummary(period.start, period.end)
    setSummary(data as any)
    setCalendarMonth(parseISO(periodDate))
  }

  useEffect(() => {
    loadMonthly()
  }, [session, periodDate])

  const loadYearly = async () => {
    if (!session) return
    const data = await getYearlySummary(selectedYear)
    setYearlySummary(data as any)
  }

  useEffect(() => {
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

  // Chart data for monthly (Daily Salary) - Based on the precise payroll period
  const allDaysInPeriod = eachDayOfInterval({ start: pStart, end: pEnd })
  const monthlyChartData = allDaysInPeriod.map(day => {
    const dateStr = format(day, "yyyy-MM-dd")
    // Find record in the active period first, then fallback to yearly summary records
    const record = summary.records?.find(r => r.attendanceDate === dateStr) ||
                   yearlySummary.records?.find(r => r.attendanceDate === dateStr)
    return {
      date: format(day, "d/M"), // e.g. '21/3', '1/4' to prevent overlapping text
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

  // --- Edit & Delete Handlers ---
  const handleEditClick = (record: any) => {
    setEditingRecord(record)
    setEditClockIn(record.clockIn || "")
    setEditClockOut(record.clockOut || "")
    
    setEditHasBreak(record.hasBreak || false)
    setEditBreakCount(record.breakCount === 2 ? "2" : "1")
    setEditBreak1From(record.break1From || "")
    setEditBreak1To(record.break1To || "")
    setEditBreak2From(record.break2From || "")
    setEditBreak2To(record.break2To || "")
    
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingRecord) return
    
    const validationError = validateAttendanceInput({
      clockIn: editClockIn, 
      clockOut: editClockOut, 
      hasBreak: editHasBreak, 
      breakCount: editHasBreak ? (editBreakCount as any) : 0, 
      break1From: editBreak1From, 
      break1To: editBreak1To, 
      break2From: editBreak2From, 
      break2To: editBreak2To
    })

    if (validationError) {
      toast.error(validationError)
      return
    }

    const calculateMinutes = (start: string, end: string) => {
      if (!start || !end) return 0
      const [h1, m1] = start.split(":").map(Number)
      const [h2, m2] = end.split(":").map(Number)
      return (h2 * 60 + m2) - (h1 * 60 + m1)
    }

    let workMinutes = 0
    if (editClockIn && editClockOut) {
      workMinutes = calculateMinutes(editClockIn, editClockOut)
      if (editHasBreak) {
        if (editBreak1From && editBreak1To) {
          workMinutes -= calculateMinutes(editBreak1From, editBreak1To)
        }
        if (editBreakCount === "2" && editBreak2From && editBreak2To) {
          workMinutes -= calculateMinutes(editBreak2From, editBreak2To)
        }
      }
    }
    workMinutes = Math.max(0, workMinutes)
    
    const hourlyWageYen = editingRecord.hourlyWageYen || 1115
    const estimatedSalaryYen = Math.floor((workMinutes / 60) * hourlyWageYen)

    setIsSaving(true)
    try {
      await updateAttendance(editingRecord.id, {
        clockIn: editClockIn,
        clockOut: editClockOut,
        hasBreak: editHasBreak,
        breakCount: editHasBreak ? Number(editBreakCount) : 0,
        break1From: editHasBreak ? editBreak1From : null,
        break1To: editHasBreak ? editBreak1To : null,
        break2From: editHasBreak && editBreakCount === "2" ? editBreak2From : null,
        break2To: editHasBreak && editBreakCount === "2" ? editBreak2To : null,
        workMinutes,
        estimatedSalaryYen,
        status: editClockOut ? "completed" : "draft"
      })
      setIsEditDialogOpen(false)
      await Promise.all([loadMonthly(), loadYearly()])
      toast.success("Record updated successfully")
    } catch (error) {
      toast.error("Failed to update record")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingRecordId) return
    try {
      await deleteAttendance(deletingRecordId)
      setIsDeleteDialogOpen(false)
      await Promise.all([loadMonthly(), loadYearly()])
      toast.success("Record deleted successfully")
    } catch (error) {
      toast.error("Failed to delete record")
    }
  }

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
          
          {record.hasBreak && record.breakCount > 0 && (
            <>
              <div className="text-muted-foreground mt-1">Breaks:</div>
              <div className="font-medium text-right flex flex-col items-end text-xs mt-1 text-muted-foreground">
                {record.break1From && record.break1To && <span>{record.break1From} - {record.break1To}</span>}
                {record.breakCount === 2 && record.break2From && record.break2To && <span>{record.break2From} - {record.break2To}</span>}
              </div>
            </>
          )}
        </div>
        
        {record && record.id && (
          <div className="flex items-center gap-2 pt-2 border-t mt-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 h-8 text-xs" 
              onClick={() => handleEditClick(record)}
            >
              <Edit className="w-3 h-3 mr-1.5" />
              Edit
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive" 
              onClick={() => {
                setDeletingRecordId(record.id)
                setIsDeleteDialogOpen(true)
              }}
            >
              <Trash2 className="w-3 h-3 mr-1.5" />
              Delete
            </Button>
          </div>
        )}
      </div>
    )
  }

  const handleExportPDF = async () => {
    setIsExporting(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: html2canvas } = await import('html2canvas-pro')
      
      const doc = new jsPDF('p', 'mm', 'a4')
      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 15
      const contentWidth = pageWidth - margin * 2
      let y = margin

      // Salary month label (e.g. "May 2026 Salary Report")
      const selectedDate = parseISO(periodDate)
      const salaryMonthLabel = format(selectedDate, "MMMM yyyy")

      // Title
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text(`${salaryMonthLabel} - Salary Report`, margin, y)
      y += 10

      // Period info
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100)
      doc.text(`Payroll Period: ${format(pStart, "MMM d, yyyy")} — ${format(pEnd, "MMM d, yyyy")}`, margin, y)
      y += 6
      doc.text(`Generated: ${format(new Date(), "MMM d, yyyy HH:mm")}`, margin, y)
      y += 10

      // Divider
      doc.setDrawColor(200)
      doc.line(margin, y, pageWidth - margin, y)
      y += 8

      // Summary box
      doc.setFillColor(245, 247, 250)
      doc.roundedRect(margin, y, contentWidth, 28, 3, 3, 'F')
      
      doc.setTextColor(60)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text('Total Work Time', margin + 8, y + 8)
      doc.text('Days Worked', margin + 8 + contentWidth / 3, y + 8)
      doc.text('Total Salary', margin + 8 + (contentWidth / 3) * 2, y + 8)
      
      doc.setTextColor(30)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(`${hours}h ${minutes}m`, margin + 8, y + 20)
      doc.text(`${summary.totalWorkDays} days`, margin + 8 + contentWidth / 3, y + 20)
      doc.text(`\u00a5${summary.totalSalaryYen.toLocaleString()}`, margin + 8 + (contentWidth / 3) * 2, y + 20)
      y += 36

      // Section: Work Day Details
      doc.setTextColor(30)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text('Work Day Details', margin, y)
      y += 2

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(120)
      doc.text(`Period: ${format(pStart, "MMM d")} — ${format(pEnd, "MMM d, yyyy")}`, margin, y + 5)
      y += 10

      // Table header
      doc.setFillColor(30, 41, 59)
      doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'F')
      doc.setTextColor(255)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      const colWidths = [contentWidth * 0.06, contentWidth * 0.21, contentWidth * 0.15, contentWidth * 0.15, contentWidth * 0.18, contentWidth * 0.25]
      const headers = ['#', 'Date', 'Clock In', 'Clock Out', 'Work Time', 'Salary']
      let xPos = margin
      headers.forEach((h, i) => {
        doc.text(h, xPos + 3, y + 7)
        xPos += colWidths[i]
      })
      y += 12

      // Table rows — all days from the payroll period
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      
      const tableRecords = allDaysInPeriod.map(day => {
        const dateStr = format(day, "yyyy-MM-dd")
        const record = summary.records?.find(r => r.attendanceDate === dateStr) ||
                       yearlySummary.records?.find(r => r.attendanceDate === dateStr)
        return {
          attendanceDate: dateStr,
          clockIn: record?.clockIn || '-',
          clockOut: record?.clockOut || '-',
          workMinutes: record?.workMinutes || 0,
          estimatedSalaryYen: record?.estimatedSalaryYen || 0
        }
      })
      
      tableRecords.forEach((record: any, idx: number) => {
        if (y > 270) {
          doc.addPage()
          y = margin
          // Re-draw table header on new page
          doc.setFillColor(30, 41, 59)
          doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'F')
          doc.setTextColor(255)
          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          xPos = margin
          headers.forEach((h, i) => {
            doc.text(h, xPos + 3, y + 7)
            xPos += colWidths[i]
          })
          y += 12
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9)
        }
        
        const bgColor = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252]
        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2])
        doc.rect(margin, y - 4, contentWidth, 9, 'F')
        
        doc.setTextColor(50)
        const rHours = Math.floor(record.workMinutes / 60)
        const rMins = record.workMinutes % 60
        const rowData = [
          `${idx + 1}`,
          format(parseISO(record.attendanceDate), "MMM d, yyyy"),
          record.clockIn,
          record.clockOut,
          record.workMinutes > 0 ? `${rHours}h ${rMins}m` : '-',
          record.estimatedSalaryYen > 0 ? `\u00a5${record.estimatedSalaryYen.toLocaleString()}` : '-'
        ]
        xPos = margin
        rowData.forEach((cell, i) => {
          doc.text(cell, xPos + 3, y + 2)
          xPos += colWidths[i]
        })
        y += 9
      })

      // Total row at bottom of table
      const workedDaysCount = tableRecords.filter(r => r.clockIn !== '-').length
      if (workedDaysCount > 0) {
        doc.setFillColor(30, 41, 59)
        doc.rect(margin, y - 4, contentWidth, 10, 'F')
        doc.setTextColor(255)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text('TOTAL', margin + 3, y + 3)
        doc.text(`${workedDaysCount} days`, margin + 3 + colWidths[0] + colWidths[1], y + 3)
        doc.text(`${hours}h ${minutes}m`, margin + 3 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y + 3)
        doc.text(`\u00a5${summary.totalSalaryYen.toLocaleString()}`, margin + 3 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], y + 3)
        y += 14
      }

      // Chart capture
      if (chartRef.current) {
        if (y > 180) {
          doc.addPage()
          y = margin
        }
        
        doc.setTextColor(30)
        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.text('Daily Earnings Chart', margin, y)
        y += 6
        
        const canvas = await html2canvas(chartRef.current, {
          backgroundColor: '#1e293b',
          scale: 2,
          useCORS: true,
        })
        const imgData = canvas.toDataURL('image/png')
        const imgWidth = contentWidth
        const imgHeight = (canvas.height / canvas.width) * imgWidth
        doc.addImage(imgData, 'PNG', margin, y, imgWidth, Math.min(imgHeight, 90))
      }

      doc.save(`salary-report-${format(pStart, "yyyy-MM-dd")}-to-${format(pEnd, "yyyy-MM-dd")}.pdf`)
    } catch (err) {
      console.error('PDF export failed:', err)
    } finally {
      setIsExporting(false)
    }
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
        <TabsList className="mb-8 flex w-full sm:w-[440px] bg-muted/50 p-2 gap-1 rounded-2xl h-14 items-center">
          <TabsTrigger 
            value="monthly" 
            className="!border-none text-xs sm:text-sm font-medium rounded-xl data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-active:bg-transparent dark:data-active:bg-transparent data-active:shadow-none transition-all flex items-center justify-center gap-1.5 sm:gap-2 flex-1 h-full"
          >
            <CalendarRange className="w-4 h-4 shrink-0" />
            <span className="truncate">Monthly Cycle</span>
          </TabsTrigger>
          <TabsTrigger 
            value="yearly" 
            className="!border-none text-xs sm:text-sm font-medium rounded-xl data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-active:bg-transparent dark:data-active:bg-transparent data-active:shadow-none transition-all flex items-center justify-center gap-1.5 sm:gap-2 flex-1 h-full"
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
                  <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                    {isSelectingHolidays ? (
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button 
                          variant="ghost" 
                          onClick={() => setIsSelectingHolidays(false)}
                          className="rounded-xl flex-1 sm:flex-none"
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={async () => {
                            setSelectedHolidays(tempHolidays)
                            try {
                              await saveUserHolidays(tempHolidays)
                            } catch (e) {
                              console.error(e)
                            }
                            setIsSelectingHolidays(false)
                            setShowHolidayDialog(true)
                          }}
                          className="rounded-xl flex-1 sm:flex-none"
                        >
                          Save
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        variant={selectedHolidays.length > 0 ? "outline" : "default"}
                        onClick={() => {
                          setIsSelectingHolidays(true)
                          setTempHolidays([...selectedHolidays])
                        }}
                        className="rounded-xl w-full sm:w-auto whitespace-nowrap"
                      >
                        {selectedHolidays.length > 0 ? "Edit Holidays" : "Select Holidays"}
                      </Button>
                    )}
                    <Input 
                      type="month" 
                      value={periodDate.substring(0, 7)}
                      onChange={(e: any) => setPeriodDate(e.target.value)}
                      className="w-full sm:w-[200px] rounded-xl font-semibold cursor-pointer"
                    />
                  </div>
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
                    
                    const isHoliday = isSelectingHolidays ? tempHolidays.includes(dateStr) : selectedHolidays.includes(dateStr)
                    const isActiveForSelection = isSelectingHolidays && isCurrentMonth
                    
                    const cellContent = (
                      <div 
                        onClick={() => {
                          if (isActiveForSelection) {
                            toggleHoliday(dateStr)
                          }
                        }}
                        className={cn(
                          "h-12 sm:h-20 w-full border rounded-lg p-1 sm:p-2 flex flex-col justify-start items-center sm:items-start transition-all relative overflow-hidden",
                          !isCurrentMonth && "opacity-20 bg-transparent border-transparent",
                          isCurrentMonth && !isCurrentPeriod && "opacity-40 bg-muted/20 border-dashed",
                          isActiveForSelection && "cursor-pointer hover:ring-2 ring-primary/50",
                          isHoliday && isWorkDay
                            ? "bg-red-100 border-red-300 hover:bg-red-200 hover:border-red-400 hover:shadow-sm dark:bg-red-900/50 dark:border-red-700 dark:hover:bg-red-900/70 cursor-pointer opacity-100"
                            : isHoliday 
                              ? "bg-red-50 border-red-200 hover:bg-red-100 hover:border-red-300 hover:shadow-sm dark:bg-red-900/30 dark:border-red-800 dark:hover:bg-red-900/50 cursor-pointer opacity-100" 
                              : isWorkDay 
                                ? "bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300 hover:shadow-sm dark:bg-blue-900/30 dark:border-blue-800 dark:hover:bg-blue-900/50 cursor-pointer opacity-100" 
                                : "bg-card hover:bg-muted/50",
                          !isActiveForSelection && !isWorkDay && !isHoliday && "cursor-default"
                        )}
                      >
                        <span className={`text-xs sm:text-sm font-semibold z-10 ${
                          isHoliday ? "text-red-700 dark:text-red-300" : 
                          isWorkDay ? "text-blue-700 dark:text-blue-300" : 
                          "text-muted-foreground"
                        }`}>
                          {format(day, "d")}
                        </span>
                        
                        {isHoliday && !isWorkDay && (
                          <div className="hidden sm:flex mt-auto w-full flex-col items-start text-[10px] text-red-600 dark:text-red-400 font-medium z-10">
                            <span className="truncate w-full text-left">Holiday</span>
                          </div>
                        )}
                        {isHoliday && isWorkDay && (
                          <div className="hidden sm:flex mt-auto w-full flex-col items-start text-[10px] text-red-600 dark:text-red-400 font-medium z-10">
                            <span className="truncate w-full text-left font-bold">Holiday (Worked)</span>
                            <span className="truncate w-full text-left">¥{record.estimatedSalaryYen.toLocaleString()}</span>
                            <span>{Math.floor(record.workMinutes/60)}h {record.workMinutes%60}m</span>
                          </div>
                        )}
                        {isWorkDay && !isHoliday && (
                          <div className="hidden sm:flex mt-auto w-full flex-col items-start text-[10px] text-blue-600 dark:text-blue-400 font-medium z-10">
                            <span className="truncate w-full text-left">¥{record.estimatedSalaryYen.toLocaleString()}</span>
                            <span>{Math.floor(record.workMinutes/60)}h {record.workMinutes%60}m</span>
                          </div>
                        )}
                        
                        {/* Mobile indicator dot */}
                        {isHoliday ? (
                          <div className="sm:hidden absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-red-500" />
                        ) : isWorkDay ? (
                          <div className="sm:hidden absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
                        ) : null}
                      </div>
                    )

                    if (isActiveForSelection || (!isWorkDay && !isHoliday)) {
                      return <div key={dateStr}>{cellContent}</div>
                    }

                    if (isHoliday && !isWorkDay) {
                      return <div key={dateStr}>{cellContent}</div>
                    }

                    return (
                      <Popover key={dateStr}>
                        <PopoverTrigger>
                          {cellContent}
                        </PopoverTrigger>
                        <PopoverContent 
                          className={`w-64 p-4 rounded-xl shadow-lg ${isHoliday ? "border-red-100 dark:border-red-900" : "border-blue-100 dark:border-blue-900"}`}
                          side="top" 
                          sideOffset={8}
                        >
                          {renderDetailsContent(day, record)}
                        </PopoverContent>
                      </Popover>
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
                <div className="mt-6 pt-4 border-t border-primary/10">
                  <Button 
                    onClick={handleExportPDF} 
                    disabled={isExporting}
                    className="w-full rounded-xl gap-2"
                    variant="outline"
                  >
                    <Download className="w-4 h-4" />
                    {isExporting ? 'Generating PDF...' : 'Export PDF'}
                  </Button>
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
                  <div ref={chartRef} className="w-full h-full overflow-x-auto pb-2 custom-scrollbar">
                    <div className="min-w-[750px] h-full pr-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlyChartData} margin={{ top: 20, right: 20, left: 0, bottom: 45 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fill: '#ffffff', fontSize: 12, angle: -45, textAnchor: 'end', dx: -2, dy: 5 }} 
                        tickLine={{ stroke: '#ffffff' }}
                        axisLine={{ stroke: '#ffffff', strokeWidth: 1 }}
                        interval={0}
                        minTickGap={0}
                        label={{ value: 'Date', position: 'insideBottom', offset: -30, fill: '#ffffff', fontSize: 13 }}
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
            <CardContent className="h-[400px] w-full overflow-x-auto relative">
              <div style={{ minWidth: '600px', width: '100%', height: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTotals} margin={{ top: 20, right: 30, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    interval={0}
                    tick={{ fill: '#ffffff', fontSize: 11 }} 
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showHolidayDialog} onOpenChange={setShowHolidayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Saved Holidays</DialogTitle>
            <DialogDescription>
              You have saved the following holidays:
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedHolidays.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1 max-h-[300px] overflow-y-auto">
                {selectedHolidays.sort().map(date => (
                  <li key={date} className="text-sm font-medium">
                    {format(parseISO(date), "EEEE, d MMMM yyyy")}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No holidays selected.</p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowHolidayDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Record</DialogTitle>
            <DialogDescription>
              {editingRecord && format(parseISO(editingRecord.attendanceDate), "EEEE, MMM d, yyyy")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-clockIn" className="text-right">Clock In</Label>
              <Input
                id="edit-clockIn"
                type="time"
                value={editClockIn}
                onChange={(e) => setEditClockIn(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-clockOut" className="text-right">Clock Out</Label>
              <Input
                id="edit-clockOut"
                type="time"
                value={editClockOut}
                onChange={(e) => setEditClockOut(e.target.value)}
                className="col-span-3"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-has-break"
                checked={editHasBreak}
                onCheckedChange={setEditHasBreak}
              />
              <Label htmlFor="edit-has-break">Has Break Time?</Label>
            </div>

            {editHasBreak && (
              <div className="space-y-4 pl-6 border-l-2 border-muted mt-2">
                <RadioGroup 
                  value={editBreakCount} 
                  onValueChange={setEditBreakCount}
                  className="flex flex-row space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="1" id="edit-r1" />
                    <Label htmlFor="edit-r1">1 Break</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="2" id="edit-r2" />
                    <Label htmlFor="edit-r2">2 Breaks</Label>
                  </div>
                </RadioGroup>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Break 1 Start</Label>
                    <Input type="time" value={editBreak1From} onChange={(e) => setEditBreak1From(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Break 1 End</Label>
                    <Input type="time" value={editBreak1To} onChange={(e) => setEditBreak1To(e.target.value)} />
                  </div>
                </div>

                {editBreakCount === "2" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Break 2 Start</Label>
                      <Input type="time" value={editBreak2From} onChange={(e) => setEditBreak2From(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Break 2 End</Label>
                      <Input type="time" value={editBreak2To} onChange={(e) => setEditBreak2To(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              onClick={handleSaveEdit} 
              disabled={isSaving || (Boolean(editClockOut) && !editClockIn)}
            >
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
