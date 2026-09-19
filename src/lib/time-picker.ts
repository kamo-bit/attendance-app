export type ClockPart = "hours" | "minutes";

export function normalizeTime(value: string): string {
  const trimmed = value.trim();
  const separated = /^(\d{1,2})[.:](\d{2})$/.exec(trimmed);
  if (separated) return `${separated[1].padStart(2, "0")}:${separated[2]}`;
  if (!/^\d{3,4}$/.test(trimmed)) return trimmed;
  const padded = trimmed.padStart(4, "0");
  return `${padded.slice(0, 2)}:${padded.slice(2)}`;
}

export function parseTime(value: string) {
  const normalized = normalizeTime(value);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(normalized)) return null;
  return {
    hours: Number(normalized.slice(0, 2)),
    minutes: Number(normalized.slice(3, 5)),
  };
}

export function formatTime(hours: number, minutes: number) {
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

// Coordinates are relative to the dial center, with its radius equal to 1.
export function clockValueAtPoint(
  x: number,
  y: number,
  part: ClockPart,
  afternoon: boolean,
): number | null {
  if (!Number.isFinite(x) || !Number.isFinite(y) || Math.hypot(x, y) < 0.2)
    return null;
  const turn = (Math.atan2(x, -y) + Math.PI * 2) % (Math.PI * 2);
  const steps = part === "hours" ? 12 : 60;
  const value = Math.round((turn / (Math.PI * 2)) * steps) % steps;
  return value + (part === "hours" && afternoon ? 12 : 0);
}
