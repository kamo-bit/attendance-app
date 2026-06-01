"use client"

import { useState, useEffect } from "react"
import { format, parseISO } from "date-fns"
import { History, Edit, Trash2, Coffee, Clock, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
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
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  
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

    // States and handlers for editing and deleting have been moved to the Summary page.

  if (isPending || !session) return null

  // Sort records by most recently inputted/updated
  const normalizeTime = (val: any) => {
    if (!val) return 0;
    let time = new Date(val).getTime();
    if (time > 0 && time < 100000000000) {
      // time is in seconds, convert to milliseconds
      time *= 1000;
    }
    return time;
  }

  const sortedRecords = [...records].sort((a, b) => {
    const timeA = Math.max(normalizeTime(a.updatedAt), normalizeTime(a.createdAt), new Date(a.attendanceDate).getTime())
    const timeB = Math.max(normalizeTime(b.updatedAt), normalizeTime(b.createdAt), new Date(b.attendanceDate).getTime())
    return timeB - timeA
  })

  // Pagination logic
  const totalPages = Math.ceil(sortedRecords.length / itemsPerPage)
  const currentRecords = sortedRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <div className="container max-w-5xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Attendance History</h1>
        <p className="text-muted-foreground mt-2">
          View your past attendance records, ordered by the most recently inputted or updated data.
        </p>
      </div>

      <div className="space-y-8">
        {sortedRecords.length > 0 && (
          <div className="space-y-4">
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
                        <TableHead className="text-right">Status / Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentRecords.map((record: any) => {
                        const hours = Math.floor(record.workMinutes / 60)
                        const mins = record.workMinutes % 60
                        
                        const breaksList = []
                        if (record.hasBreak) {
                          if (record.break1From && record.break1To) breaksList.push(`${record.break1From} - ${record.break1To}`)
                          if (record.breakCount === 2 && record.break2From && record.break2To) breaksList.push(`${record.break2From} - ${record.break2To}`)
                        }

                        return (
                          <TableRow key={record.id} className={record.status === "deleted" ? "opacity-60 bg-muted/30" : ""}>
                            <TableCell className={`font-medium whitespace-nowrap ${record.status === "deleted" ? "line-through text-muted-foreground" : ""}`}>
                              {format(parseISO(record.attendanceDate), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className={record.status === "deleted" ? "line-through text-muted-foreground" : ""}>{record.clockIn || "-"}</TableCell>
                            <TableCell className={record.status === "deleted" ? "line-through text-muted-foreground" : ""}>{record.clockOut || "-"}</TableCell>
                            <TableCell className={record.status === "deleted" ? "line-through opacity-50" : ""}>
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
                            <TableCell className={`text-right whitespace-nowrap ${record.status === "deleted" ? "line-through text-muted-foreground" : ""}`}>
                              {hours}h {mins}m
                            </TableCell>
                            <TableCell className={`text-right font-medium ${record.status === "deleted" ? "line-through text-muted-foreground" : "text-primary"}`}>
                              ¥{(record.estimatedSalaryYen || 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              {(() => {
                                const createdTime = normalizeTime(record.createdAt);
                                const updatedTime = normalizeTime(record.updatedAt);
                                const isDeleted = record.status === "deleted";
                                const isEdited = updatedTime > createdTime + 1000;
                                const actionDate = new Date(Math.max(updatedTime, createdTime, new Date(record.attendanceDate).getTime()));
                                
                                return (
                                  <div className="flex flex-col items-end text-xs text-muted-foreground whitespace-nowrap">
                                    <span className={isDeleted ? "text-rose-500 font-bold" : (isEdited ? "text-amber-500 font-medium" : "text-emerald-500 font-medium")}>
                                      {isDeleted ? "Deleted" : (isEdited ? "Edited" : "Created")}
                                    </span>
                                    <span>{format(actionDate, "MMM d, HH:mm")}</span>
                                  </div>
                                )
                              })()}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-4 border-t">
                    <div className="text-sm text-muted-foreground hidden sm:block">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, sortedRecords.length)} of {sortedRecords.length} entries
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        title="Go to first page"
                      >
                        <ChevronsLeft className="w-4 h-4" />
                        <span className="sr-only">Start</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="w-4 h-4 sm:mr-1" />
                        <span className="hidden sm:inline">Previous</span>
                      </Button>
                      <div className="text-sm font-medium">
                        Page {currentPage} of {totalPages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="w-4 h-4 sm:ml-1" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        title="Go to last page"
                      >
                        <span className="sr-only">End</span>
                        <ChevronsRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        {records.length === 0 && (
          <Card className="rounded-2xl border shadow-sm">
            <CardContent className="h-32 flex items-center justify-center text-muted-foreground">
              No records found.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
