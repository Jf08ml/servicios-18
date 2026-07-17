export function Avatar({
  photoPath,
  name,
  className = "h-12 w-12",
}: {
  photoPath?: string | null;
  name: string;
  className?: string;
}) {
  if (photoPath) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/files/${photoPath}`}
        alt={name}
        className={`${className} rounded-full border border-zinc-700 object-cover`}
      />
    );
  }
  return (
    <div
      className={`${className} flex items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 font-bold text-zinc-300`}
      aria-hidden
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}
