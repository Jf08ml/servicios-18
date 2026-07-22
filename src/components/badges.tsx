const STATUS_STYLES: Record<string, string> = {
  // genéricos
  PENDING: "border-amber-800 bg-amber-950/50 text-amber-300",
  CONFIRMED: "border-emerald-800 bg-emerald-950/50 text-emerald-300",
  CANCELLED: "border-zinc-700 bg-zinc-900 text-zinc-400",
  COMPLETED: "border-sky-800 bg-sky-950/50 text-sky-300",
  NO_SHOW: "border-red-900 bg-red-950/50 text-red-300",
  APPROVED: "border-emerald-800 bg-emerald-950/50 text-emerald-300",
  REJECTED: "border-red-900 bg-red-950/50 text-red-300",
  OPEN: "border-amber-800 bg-amber-950/50 text-amber-300",
  REVIEWING: "border-sky-800 bg-sky-950/50 text-sky-300",
  RESOLVED: "border-emerald-800 bg-emerald-950/50 text-emerald-300",
  DISMISSED: "border-zinc-700 bg-zinc-900 text-zinc-400",
  ACTIVE: "border-red-900 bg-red-950/50 text-red-300",
  SUSPENDED: "border-amber-800 bg-amber-950/50 text-amber-300",
  BANNED: "border-red-900 bg-red-950/50 text-red-300",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
  COMPLETED: "Completada",
  NO_SHOW: "No asistió",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  OPEN: "Abierto",
  REVIEWING: "En revisión",
  RESOLVED: "Resuelto",
  DISMISSED: "Descartado",
  ACTIVE: "Activa",
  SUSPENDED: "Suspendida",
  BANNED: "Bloqueada",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        STATUS_STYLES[status] ?? "border-zinc-700 bg-zinc-900 text-zinc-300"
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function VerifiedBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-emerald-800 bg-emerald-950/50 px-2.5 py-0.5 text-xs font-medium text-emerald-300"
      title="Identidad verificada por el equipo de la plataforma"
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
        <path d="M12 2 4 5v6c0 5.25 3.4 9.74 8 11 4.6-1.26 8-5.75 8-11V5l-8-3Zm-1.2 13.6-3.2-3.2 1.4-1.4 1.8 1.8 4.2-4.2 1.4 1.4-5.6 5.6Z" />
      </svg>
      Verificado
    </span>
  );
}

export function UnverifiedBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-amber-800 bg-amber-950/50 px-2.5 py-0.5 text-xs font-medium text-amber-300"
      title="Esta cuenta aún no ha verificado su identidad. Tómalo en cuenta antes de aceptar."
    >
      ⚠ Sin verificar
    </span>
  );
}

export function AgencyBadge({ name }: { name: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-sky-800 bg-sky-950/50 px-2.5 py-0.5 text-xs font-medium text-sky-300"
      title={`Perfil gestionado junto con la agencia ${name}`}
    >
      🏢 {name}
    </span>
  );
}

export function PremiumBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-amber-700 bg-amber-950/50 px-2.5 py-0.5 text-xs font-medium text-amber-300"
      title="Miembro premium"
    >
      ★ Premium
    </span>
  );
}
