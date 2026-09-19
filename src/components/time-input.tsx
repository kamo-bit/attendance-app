"use client";

import {
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent,
  type RefObject,
} from "react";
import { Clock3, Keyboard, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  clockValueAtPoint,
  formatTime,
  normalizeTime,
  parseTime,
  type ClockPart,
} from "@/lib/time-picker";

const mobileQuery = "(max-width: 767px), (pointer: coarse)";
function subscribeMobile(callback: () => void) {
  const query = window.matchMedia(mobileQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
const getMobileSnapshot = () => window.matchMedia(mobileQuery).matches;
const getServerSnapshot = () => false;

export function TimeInput({
  id,
  label,
  value,
  onChange,
  large = false,
  readOnly = false,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  large?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
}) {
  const mobile = useSyncExternalStore(
    subscribeMobile,
    getMobileSnapshot,
    getServerSnapshot,
  );
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const locked = readOnly || disabled;
  const inputClass = `form-input ${large ? "time-input" : ""}`;
  return (
    <>
      {mobile ? (
        <button
          ref={trigger}
          id={id}
          type="button"
          className={`${inputClass} time-trigger`}
          disabled={locked}
          aria-label={`Pilih ${label.toLowerCase()}, ${value || "belum diisi"}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <span className={value ? undefined : "time-placeholder"}>
            {value || "JJ:MM"}
          </span>
          <Clock3 aria-hidden="true" />
        </button>
      ) : (
        <div className="time-control">
          <input
            id={id}
            className={inputClass}
            type="text"
            inputMode="numeric"
            maxLength={5}
            placeholder="JJ:MM"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onBlur={() => onChange(normalizeTime(value))}
            autoComplete="off"
            spellCheck={false}
            readOnly={readOnly}
            disabled={disabled}
          />
          <button
            ref={trigger}
            className="time-control-button"
            type="button"
            disabled={locked}
            aria-label={`Buka pemilih ${label.toLowerCase()}`}
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <Clock3 aria-hidden="true" />
          </button>
        </div>
      )}
      {open && !locked && (
        <ClockPicker
          label={label}
          value={value}
          trigger={trigger}
          onClose={() => setOpen(false)}
          onChange={onChange}
        />
      )}
    </>
  );
}

function ClockPicker({
  label,
  value,
  trigger,
  onClose,
  onChange,
}: {
  label: string;
  value: string;
  trigger: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onChange: (value: string) => void;
}) {
  const initial = parseTime(value) || { hours: 0, minutes: 0 };
  const [hours, setHours] = useState(initial.hours);
  const [minutes, setMinutes] = useState(initial.minutes);
  const [part, setPart] = useState<ClockPart>("hours");
  const [manual, setManual] = useState(false);
  const [typed, setTyped] = useState(value);
  const [error, setError] = useState("");
  const dial = useRef<HTMLDivElement>(null);
  const gesture = useRef<{
    id: number;
    part: ClockPart;
    afternoon: boolean;
  } | null>(null);
  const selected = part === "hours" ? hours : minutes;
  const angle = part === "hours" ? (hours % 12) * 30 : minutes * 6;

  function updateFromPointer(event: PointerEvent<HTMLDivElement>) {
    const active = gesture.current;
    if (!active || active.id !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const radius = rect.width / 2;
    const next = clockValueAtPoint(
      (event.clientX - rect.left - radius) / radius,
      (event.clientY - rect.top - radius) / radius,
      active.part,
      active.afternoon,
    );
    if (next !== null) (active.part === "hours" ? setHours : setMinutes)(next);
  }
  function apply() {
    const parsed = manual ? parseTime(typed) : { hours, minutes };
    if (!parsed) {
      setError("Gunakan jam 00:00–23:59, misalnya 09:30 atau 0930.");
      return;
    }
    onChange(formatTime(parsed.hours, parsed.minutes));
    onClose();
  }
  function switchInput() {
    if (manual) {
      const parsed = parseTime(typed);
      if (parsed) {
        setHours(parsed.hours);
        setMinutes(parsed.minutes);
      }
    } else setTyped(formatTime(hours, minutes));
    setError("");
    setManual(!manual);
  }
  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        className="dialog-panel clock-picker"
        initialFocus={dial}
        finalFocus={trigger}
      >
        <DialogHeader>
          <DialogTitle>Pilih {label.toLowerCase()}</DialogTitle>
          <DialogDescription>
            Format 24 jam · 00:00 sampai 23:59.
          </DialogDescription>
        </DialogHeader>
        {manual ? (
          <div className="field">
            <label htmlFor="clock-manual">Waktu {label.toLowerCase()}</label>
            <input
              id="clock-manual"
              className="form-input time-input"
              inputMode="numeric"
              placeholder="JJ:MM"
              maxLength={5}
              value={typed}
              onChange={(event) => {
                setTyped(event.target.value);
                setError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  apply();
                }
              }}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "clock-error" : "clock-manual-help"}
            />
            <p className="field-help" id="clock-manual-help">
              Ketik 09:30 atau 0930 untuk pukul 9 lewat 30 menit.
            </p>
            {error && (
              <p className="error-text" id="clock-error" role="alert">
                {error}
              </p>
            )}
          </div>
        ) : (
          <div className="clock-layout">
            <div className="clock-settings">
              <div className="clock-readout" aria-label="Waktu dipilih">
                <button
                  type="button"
                  aria-label={`Pilih jam, ${hours}`}
                  aria-pressed={part === "hours"}
                  onClick={() => setPart("hours")}
                >
                  {String(hours).padStart(2, "0")}
                  <small>Jam</small>
                </button>
                <span aria-hidden="true">:</span>
                <button
                  type="button"
                  aria-label={`Pilih menit, ${minutes}`}
                  aria-pressed={part === "minutes"}
                  onClick={() => setPart("minutes")}
                >
                  {String(minutes).padStart(2, "0")}
                  <small>Menit</small>
                </button>
              </div>
              <div className="segment clock-period" aria-label="Rentang jam">
                <button
                  type="button"
                  aria-pressed={hours < 12}
                  onClick={() => {
                    setHours(hours % 12);
                    setPart("hours");
                  }}
                >
                  00–11
                </button>
                <button
                  type="button"
                  aria-pressed={hours >= 12}
                  onClick={() => {
                    setHours((hours % 12) + 12);
                    setPart("hours");
                  }}
                >
                  12–23
                </button>
              </div>
              <p className="field-help clock-help" id="clock-help">
                {part === "hours"
                  ? "Geser jarum atau ketuk angka jam, lalu pilih menit."
                  : "Geser jarum untuk memilih menit satu per satu."}
              </p>
            </div>
            <div
              ref={dial}
              className="clock-dial"
              role="slider"
              tabIndex={0}
              aria-label={
                part === "hours"
                  ? "Jam pada jam dinding"
                  : "Menit pada jam dinding"
              }
              aria-describedby="clock-help"
              aria-valuemin={0}
              aria-valuemax={part === "hours" ? 23 : 59}
              aria-valuenow={selected}
              aria-valuetext={`${selected} ${part === "hours" ? "jam" : "menit"}`}
              onPointerDown={(event) => {
                if (!event.isPrimary || event.button !== 0) return;
                event.preventDefault();
                event.currentTarget.focus({ preventScroll: true });
                event.currentTarget.setPointerCapture(event.pointerId);
                gesture.current = {
                  id: event.pointerId,
                  part,
                  afternoon: hours >= 12,
                };
                updateFromPointer(event);
              }}
              onPointerMove={updateFromPointer}
              onPointerUp={(event) => {
                if (gesture.current?.id !== event.pointerId) return;
                const finished = gesture.current.part;
                updateFromPointer(event);
                gesture.current = null;
                event.currentTarget.releasePointerCapture(event.pointerId);
                if (finished === "hours") setPart("minutes");
              }}
              onPointerCancel={() => {
                gesture.current = null;
              }}
              onLostPointerCapture={() => {
                gesture.current = null;
              }}
              onKeyDown={(event) => {
                const maximum = part === "hours" ? 23 : 59;
                const steps: Record<string, number> = {
                  ArrowUp: 1,
                  ArrowRight: 1,
                  ArrowDown: -1,
                  ArrowLeft: -1,
                  PageUp: 5,
                  PageDown: -5,
                };
                let next: number;
                if (event.key === "Home") next = 0;
                else if (event.key === "End") next = maximum;
                else if (event.key in steps)
                  next =
                    (selected + steps[event.key] + maximum + 1) % (maximum + 1);
                else if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setPart(part === "hours" ? "minutes" : "hours");
                  return;
                } else return;
                event.preventDefault();
                (part === "hours" ? setHours : setMinutes)(next);
              }}
            >
              <div
                className="clock-hand"
                aria-hidden="true"
                style={{ transform: `translateX(-50%) rotate(${angle}deg)` }}
              />
              <span className="clock-center" aria-hidden="true" />
              {Array.from({ length: 60 }, (_, index) => (
                <i
                  key={index}
                  className={`clock-tick ${index % 5 === 0 ? "major" : ""}`}
                  aria-hidden="true"
                  style={{
                    left: `${50 + 46 * Math.sin((index * Math.PI) / 30)}%`,
                    top: `${50 - 46 * Math.cos((index * Math.PI) / 30)}%`,
                    transform: `translate(-50%, -50%) rotate(${index * 6}deg)`,
                  }}
                />
              ))}
              {Array.from({ length: 12 }, (_, index) => {
                const number =
                  part === "minutes"
                    ? index * 5
                    : index + (hours >= 12 ? 12 : 0);
                return (
                  <span
                    key={index}
                    className="clock-number"
                    data-selected={selected === number}
                    aria-hidden="true"
                    style={{
                      left: `${50 + 38 * Math.sin((index * Math.PI) / 6)}%`,
                      top: `${50 - 38 * Math.cos((index * Math.PI) / 6)}%`,
                    }}
                  >
                    {String(number).padStart(2, "0")}
                  </span>
                );
              })}
            </div>
          </div>
        )}
        <div className="clock-tools">
          <button type="button" className="text-button" onClick={switchInput}>
            {manual ? <Clock3 /> : <Keyboard />}
            {manual ? "Jam dinding" : "Ketik waktu"}
          </button>
          <button
            type="button"
            className="text-button text-coral"
            onClick={() => {
              onChange("");
              onClose();
            }}
          >
            <RotateCcw />
            Kosongkan
          </button>
        </div>
        <div className="actions actions-end">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="btn btn-primary" onClick={apply}>
            Gunakan waktu
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
