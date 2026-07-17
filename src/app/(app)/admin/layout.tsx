import Link from "next/link";
import { requireUser } from "@/lib/auth";

const SECTIONS = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/verificaciones", label: "Verificaciones" },
  { href: "/admin/reportes", label: "Reportes" },
  { href: "/admin/sos", label: "Alertas SOS" },
  { href: "/admin/usuarios", label: "Usuarios" },
  { href: "/admin/hoteles", label: "Hoteles" },
];

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireUser(["ADMIN"]);

  return (
    <div className="space-y-6">
      <nav className="overflow-x-auto">
        <ul className="flex gap-1 rounded-xl border border-zinc-800 bg-zinc-900/60 p-1">
          {SECTIONS.map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                className="block whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
              >
                {s.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {children}
    </div>
  );
}
