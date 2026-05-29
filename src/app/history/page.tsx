"use client"

import { useState, useEffect } from "react"
import { format, parseISO } from "date-fns"
import { History, Edit, Trash2, Coffee, Clock } from "lucide-react"
import { useRouter } from "next/navigation"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { authClient } from "@/lib/auth-client"
import { getAttendanceHistory, deleteAttendance, updateAttendance } from "@/app/actions"
import { toast } from "sonner"
import { validateAttendanceInput } from "@/lib/utils"

export default function HistoryPage() {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()
  const [records, setRecords] = useState<any[]>([])
  
  // Edit Dialog State
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<any | null>(null)
  const [editClockIn, setEditClockIn] = useState("")
  const [editClockOut, setEditClockOut] = useState("")
  
  const [editHasBreak, setEditHasBreak] = useState(false)
  const [editBreakCount, setEditBreakCount] = useState<"1" | "2">("1")
  const [editBreak1From, setEditBreak1From] = useState("")
  const [editBreak1To, setEditBreak1To] = useState("")
  const [editBreak2From, setEditBreak2From] = useState("")
  const [editBreak2To, setEditBreak2To] = useState("")

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login")
    }
  }, [session, isPending, router])

  const loadRecords = async () => {
    if (!session) return
    const data = await getAttendanceHistory()
    setRecords(data)
  }

  useEffect(() => {
    loadRecords()
  }, [session])

  const handleDelete = async (id: string) => {
    try {
      await deleteAttendance(id)
      await loadRecords()
      toast.success("Record deleted successfully")
    } catch (error) {
      toast.error("Failed to delete record")
    }
  }

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
      await loadRecords()
      toast.success("Record updated successfully")
    } catch (error) {
      toast.error("Failed to update record")
    }
  }

  if (isPending || !session) return null

  // Group records by month
  const groupedRecords = records.reduce((acc, record) => {
    const dateObj = parseISO(record.attendanceDate)
    const monthYear = format(dateObj, "MMMM yyyy")
    if (!acc[monthYear]) {
      acc[monthYear] = []
    }
    acc[monthYear].push(record)
    return acc
  }, {} as Record<string, any[]>)

  return (
    <div className="container max-w-5xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Attendance History</h1>
        <p className="text-muted-foreground mt-2">
          View your past attendance records grouped by month.
        </p>
      </div>

      <div className="space-y-8">
        {Object.entries(groupedRecords).map(([monthYear, monthRecords]: [string, any]) => (
          <div key={monthYear} className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">{monthYear}</h2>
            <Card className="rounded-2xl border shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Clock In</TableHead>
                        <TableHead>Clock Out</TableHead>
                        <TableHead>Breaks</TableHead>
                        <TableHead className="text-right">Work Hours</TableHead>
                        <TableHead className="text-right">Salary</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthRecords.map((record: any) => {
                        const hours = Math.floor(record.workMinutes / 60)
                        const mins = record.workMinutes % 60
                        
                        const breaksList = []
                        if (record.hasBreak) {
                          if (record.break1From && record.break1To) breaksList.push(`${record.break1From} - ${record.break1To}`)
                          if (record.breakCount === 2 && record.break2From && record.break2To) breaksList.push(`${record.break2From} - ${record.break2To}`)
                        }

                        return (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium whitespace-nowrap">
                              {format(parseISO(record.attendanceDate), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell>{record.clockIn || "-"}</TableCell>
                            <TableCell>{record.clockOut || "-"}</TableCell>
                            <TableCell>
                              {!record.hasBreak || record.breakCount === 0 ? (
                                <span className="text-muted-foreground">-</span>
                              ) : (
                                <div className="flex flex-col gap-1 text-xs">
                                  {breaksList.map((b, i) => (
                                    <span key={i} className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md w-max border">
                                      {b}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              {hours}h {mins}m
                            </TableCell>
                            <TableCell className="text-right text-primary font-medium">
                              ¥{(record.estimatedSalaryYen || 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEditClick(record)}>
                                  <Edit className="h-4 w-4" />
                                  <span className="sr-only">Edit</span>
                                </Button>
                                <Button variant="outline" size="icon" className="h-8 w-8 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(record.id)}>
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Delete</span>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
        {records.length === 0 && (
          <Card className="rounded-2xl border shadow-sm">
            <CardContent className="h-32 flex items-center justify-center text-muted-foreground">
              No records found.
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Record</DialogTitle>
            <DialogDescription>
              {editingRecord && format(parseISO(editingRecord.attendanceDate), "EEEE, MMM d, yyyy")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clock-in" className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-500" /> Clock In
                </Label>
                <Input
                  id="clock-in"
                  type="time"
                  value={editClockIn}
                  onChange={(e) => setEditClockIn(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clock-out" className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-rose-500" /> Clock Out
                </Label>
                <Input
                  id="clock-out"
                  type="time"
                  value={editClockOut}
                  onChange={(e) => setEditClockOut(e.target.value)}
                />
              </div>
            </div>
            
            <div className="rounded-xl border bg-card p-4 shadow-sm mt-2">
              <div className="flex items-center justify-between mb-4">
                <div className="space-y-1">
                  <Label htmlFor="break-switch" className="flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-amber-500" /> Take a break?
                  </Label>
                </div>
                <Switch 
                  id="break-switch" 
                  checked={editHasBreak}
                  onCheckedChange={setEditHasBreak}
                />
              </div>

              {editHasBreak && (
                <div className="space-y-4 pt-4 border-t">
                  <RadioGroup 
                    value={editBreakCount} 
                    onValueChange={(val) => setEditBreakCount(val as "1" | "2")}
                    className="flex space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="1" id="e-r1" />
                      <Label htmlFor="e-r1">1 Break</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="2" id="e-r2" />
                      <Label htmlFor="e-r2">2 Breaks</Label>
                    </div>
                  </RadioGroup>

                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between bg-muted/50 p-3 rounded-lg">
                      <div className="text-sm font-medium shrink-0">Break 1</div>
                      <div className="flex items-center space-x-2 w-full sm:w-auto flex-1 max-w-[240px]">
                        <Input type="time" value={editBreak1From} onChange={(e) => setEditBreak1From(e.target.value)} className="h-9 w-full min-w-[90px]" />
                        <span className="text-muted-foreground shrink-0 text-sm">to</span>
                        <Input type="time" value={editBreak1To} onChange={(e) => setEditBreak1To(e.target.value)} className="h-9 w-full min-w-[90px]" />
                      </div>
                    </div>
                    
                    {editBreakCount === "2" && (
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between bg-muted/50 p-3 rounded-lg">
                        <div className="text-sm font-medium shrink-0">Break 2</div>
                        <div className="flex items-center space-x-2 w-full sm:w-auto flex-1 max-w-[240px]">
                          <Input type="time" value={editBreak2From} onChange={(e) => setEditBreak2From(e.target.value)} className="h-9 w-full min-w-[90px]" />
                          <span className="text-muted-foreground shrink-0 text-sm">to</span>
                          <Input type="time" value={editBreak2To} onChange={(e) => setEditBreak2To(e.target.value)} className="h-9 w-full min-w-[90px]" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveEdit} className="w-full">Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
