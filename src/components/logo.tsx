import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2">
      {/* Corazón con check: sensualidad + perfiles verificados */}
      <svg viewBox="0 0 24 24" className="h-7 w-7 text-fuchsia-500" aria-hidden>
        <path
          fill="currentColor"
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        />
        <path
          d="m8.6 10.6 2.4 2.4 4.4-4.4"
          fill="none"
          stroke="#fff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-lg font-bold tracking-tight text-white">
        Mis<span className="text-fuchsia-400">Escorts</span>
      </span>
    </Link>
  );
}
