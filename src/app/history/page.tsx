"use client"

import { useState, useEffect } from "react"
import { format, parseISO } from "date-fns"
import { History, Edit, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

export default function HistoryPage() {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()
  const [records, setRecords] = useState<any[]>([])
  
  // Edit Dialog State
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<any | null>(null)
  const [editClockIn, setEditClockIn] = useState("")
  const [editClockOut, setEditClockOut] = useState("")
  const [editSalary, setEditSalary] = useState<number>(0)

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
    setEditSalary(record.estimatedSalaryYen || 0)
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingRecord) return
    try {
      await updateAttendance(editingRecord.id, editClockIn, editClockOut, editSalary)
      setIsEditDialogOpen(false)
      await loadRecords()
      toast.success("Record updated successfully")
    } catch (error) {
      toast.error("Failed to update record")
    }
  }

  if (isPending || !session) return null

  return (
    <div className="container max-w-5xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Attendance History</h1>
        <p className="text-muted-foreground mt-2">
          View your past attendance records and daily earnings.
        </p>
      </div>

      <Card className="rounded-2xl border shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Recent Records
          </CardTitle>
          <CardDescription>A list of your recent clock-in and clock-out times.</CardDescription>
        </CardHeader>
        <CardContent>
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
                {records.map((record) => {
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
                {records.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Record</DialogTitle>
            <DialogDescription>
              Make changes to your attendance record here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="clock-in" className="text-right">
                Clock In
              </Label>
              <Input
                id="clock-in"
                type="time"
                value={editClockIn}
                onChange={(e) => setEditClockIn(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="clock-out" className="text-right">
                Clock Out
              </Label>
              <Input
                id="clock-out"
                type="time"
                value={editClockOut}
                onChange={(e) => setEditClockOut(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="salary" className="text-right">
                Salary (¥)
              </Label>
              <Input
                id="salary"
                type="number"
                value={editSalary}
                onChange={(e) => setEditSalary(Number(e.target.value))}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveEdit}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
