import { activity, validDate, type AttendanceRecord } from "./attendance";

export type HistoryFilters = {
  status: "all" | AttendanceRecord["status"];
  activity: "all" | "Dibuat" | "Diubah";
  month: string;
  from: string;
  to: string;
  sort: "date-desc" | "date-asc" | "updated-desc";
};

export const defaultHistoryFilters: HistoryFilters = {
  status: "all",
  activity: "all",
  month: "",
  from: "",
  to: "",
  sort: "date-desc",
};

export function historyRangeError({ from, to }: HistoryFilters) {
  if ((from && !validDate(from)) || (to && !validDate(to)))
    return "Isi rentang tanggal yang valid.";
  if (from && to && from > to)
    return "Tanggal akhir harus sama dengan atau setelah tanggal awal.";
  return "";
}

export function filterAttendanceHistory(
  records: AttendanceRecord[],
  filters: HistoryFilters,
) {
  if (historyRangeError(filters)) return [];
  return records
    .filter(
      (record) =>
        (filters.status === "all" || record.status === filters.status) &&
        (filters.activity === "all" ||
          activity(record).label === filters.activity) &&
        (!filters.month || record.attendanceDate.startsWith(filters.month)) &&
        (!filters.from || record.attendanceDate >= filters.from) &&
        (!filters.to || record.attendanceDate <= filters.to),
    )
    .sort((a, b) => {
      const dates = a.attendanceDate.localeCompare(b.attendanceDate);
      const updates =
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      const primary =
        filters.sort === "updated-desc"
          ? updates
          : filters.sort === "date-asc"
            ? dates
            : -dates;
      return primary || updates || -dates || a.id.localeCompare(b.id);
    });
}
