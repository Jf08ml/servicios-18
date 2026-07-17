const dateTimeFmt = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
});

const dateFmt = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" });

const timeFmt = new Intl.DateTimeFormat("es-CO", { timeStyle: "short" });

const moneyFmt = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

// Fechas sin hora (nacimiento) se guardan como medianoche UTC; formatearlas
// en hora local (UTC-5) las corre un día hacia atrás. Se fija timeZone UTC.
const birthDateFmt = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDateTime(d: Date) {
  return dateTimeFmt.format(d);
}

export function formatDate(d: Date) {
  return dateFmt.format(d);
}

export function formatTime(d: Date) {
  return timeFmt.format(d);
}

export function formatMoney(value: number) {
  return moneyFmt.format(value);
}

export function formatBirthDate(d: Date) {
  return birthDateFmt.format(d);
}

export const WEEKDAYS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export function minutesToHHMM(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** 15 → "15 min", 60 → "1 hora", 90 → "1 h 30 min", 720 → "12 horas". */
export function formatDurationMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m > 0) return `${h} h ${m} min`;
  return h === 1 ? "1 hora" : `${h} horas`;
}

/** 750 → "12:30 p. m.". 0 y 1440 (fin del día) → "12:00 a. m.". */
export function minutesTo12h(minutes: number) {
  const total = ((minutes % 1440) + 1440) % 1440;
  const h24 = Math.floor(total / 60);
  const m = total % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h24 < 12 ? "a. m." : "p. m."}`;
}

/** "Ciudad, Departamento" sin repetir (Bogotá D.C. es ciudad y depto a la vez). */
export function formatLocation(profile?: {
  city?: string | null;
  stateName?: string | null;
  countryName?: string | null;
} | null): string {
  if (!profile) return "Sin ubicación";
  const parts = [profile.city, profile.stateName, profile.countryName].filter(
    (p): p is string => !!p
  );
  const unique = parts.filter((p, i) => parts.indexOf(p) === i);
  return unique.slice(0, 2).join(", ") || "Sin ubicación";
}

export function hhmmToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}
