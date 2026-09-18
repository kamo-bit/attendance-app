"use client";
import { ChevronLeft, ChevronRight, Sun, Check, Circle } from "lucide-react";
import {
  calendarDays,
  dateLabel,
  localDate,
  monthLabel,
  moveMonth,
} from "@/lib/attendance";

export function WorkCalendar({
  month,
  onMonthChange,
  selected,
  onSelect,
  holidays,
  recorded = [],
  period,
  holidayMode = false,
}: {
  month: string;
  onMonthChange: (month: string) => void;
  selected?: string;
  onSelect: (date: string) => void;
  holidays: string[];
  recorded?: string[];
  period?: { start: string; end: string };
  holidayMode?: boolean;
}) {
  return (
    <>
      <div className="calendar-toolbar">
        <h2>{monthLabel(month)}</h2>
        <div className="actions">
          <button
            type="button"
            className="icon-button"
            aria-label="Bulan kalender sebelumnya"
            onClick={() => onMonthChange(moveMonth(month, -1))}
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Bulan kalender berikutnya"
            onClick={() => onMonthChange(moveMonth(month, 1))}
          >
            <ChevronRight />
          </button>
        </div>
      </div>
      <div
        className="calendar-grid"
        aria-label={`Kalender ${monthLabel(month)}`}
      >
        {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((day) => (
          <span className="weekday" key={day}>
            {day}
          </span>
        ))}
        {calendarDays(month).map((date) => {
          const holiday = holidays.includes(date),
            record = recorded.includes(date),
            today = date === localDate(),
            otherMonth = date.slice(0, 7) !== month;
          const outside = period && (date < period.start || date > period.end);
          const chosen = holidayMode ? holiday : selected === date;
          return (
            <button
              key={date}
              type="button"
              className={`calendar-day ${outside ? "outside" : ""} ${otherMonth ? "other-month" : ""} ${record ? "recorded" : ""} ${holiday ? "holiday" : ""} ${today ? "today" : ""}`}
              aria-label={`${dateLabel(date, true)}${today ? ", hari ini" : ""}${record ? ", tercatat" : ""}${holiday ? ", hari libur" : ""}${outside ? ", di luar periode" : ""}`}
              aria-current={today ? "date" : undefined}
              aria-pressed={chosen}
              onClick={() => onSelect(date)}
            >
              <span>{Number(date.slice(8))}</span>
              <span className="day-markers" aria-hidden="true">
                {record && <i />}
                {holiday && <Sun />}
                {chosen && !holidayMode && <Check />}
              </span>
            </button>
          );
        })}
      </div>
      <div className="calendar-legend">
        <span>
          <i className="legend-swatch today" />
          Hari ini
        </span>
        {!holidayMode && (
          <>
            <span>
              <i className="legend-swatch selected" />
              Dipilih
            </span>
            <span>
              <Circle size={7} fill="currentColor" />
              Tercatat
            </span>
          </>
        )}
        <span>
          <Sun size={12} />
          Hari libur
        </span>
        {period && (
          <span>
            <i className="legend-swatch outside" />
            Di luar periode
          </span>
        )}
      </div>
    </>
  );
}
