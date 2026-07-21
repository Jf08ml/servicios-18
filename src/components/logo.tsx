import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-mark.png" alt="" className="h-8 w-8 rounded-md" />
      <span className="text-lg font-bold tracking-tight text-white">
        Mis<span className="text-fuchsia-400">Escorts</span>
      </span>
    </Link>
  );
}
