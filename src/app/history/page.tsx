import { format, parseISO } from "date-fns"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { History } from "lucide-react"

const MOCK_HISTORY = [
  { id: 1, date: "2024-04-18", clockIn: "09:00", clockOut: "18:00", breaks: 1, breakDetails: ["12:00 - 13:00"], workMins: 480, salary: 8920 },
  { id: 2, date: "2024-04-19", clockIn: "08:50", clockOut: "17:30", breaks: 2, breakDetails: ["12:00 - 12:45", "15:00 - 15:15"], workMins: 460, salary: 8548 },
  { id: 3, date: "2024-04-20", clockIn: "09:15", clockOut: "18:15", breaks: 0, breakDetails: [], workMins: 540, salary: 10035 },
  { id: 4, date: "2024-04-21", clockIn: "10:00", clockOut: "15:00", breaks: 0, breakDetails: [], workMins: 300, salary: 5575 },
]

export default function HistoryPage() {
  return (
    <div className="container max-w-4xl mx-auto py-10 px-4">
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead>Breaks</TableHead>
                <TableHead className="text-right">Work Hours</TableHead>
                <TableHead className="text-right">Salary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_HISTORY.map((record) => {
                const hours = Math.floor(record.workMins / 60)
                const mins = record.workMins % 60
                
                return (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {format(parseISO(record.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>{record.clockIn}</TableCell>
                    <TableCell>{record.clockOut}</TableCell>
                    <TableCell>
                      {record.breaks === 0 ? (
                        <span className="text-muted-foreground">-</span>
                      ) : (
                        <div className="flex flex-col gap-1 text-xs">
                          {record.breakDetails.map((b, i) => (
                            <span key={i} className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md w-max border">
                              {b}
                            </span>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {hours}h {mins}m
                    </TableCell>
                    <TableCell className="text-right text-primary font-medium">
                      ¥{record.salary.toLocaleString()}
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
