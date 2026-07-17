export function Stars({
  value,
  count,
}: {
  value: number | null;
  count?: number;
}) {
  if (!value) {
    return <span className="text-xs text-zinc-500">Sin calificaciones aún</span>;
  }
  const rounded = Math.round(value);
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span className="text-amber-400" aria-hidden>
        {"★".repeat(rounded)}
        <span className="text-zinc-700">{"★".repeat(5 - rounded)}</span>
      </span>
      <span className="text-zinc-300">{value.toFixed(1)}</span>
      {typeof count === "number" && (
        <span className="text-xs text-zinc-500">({count})</span>
      )}
    </span>
  );
}
