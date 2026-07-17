"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./logo";
import { logoutAction } from "@/app/(auth)/actions";

export type NavItem = { href: string; label: string };

export function AppNav({
  items,
  displayName,
  roleLabel,
  unreadNotifications = 0,
}: {
  items: NavItem[];
  displayName: string;
  roleLabel: string;
  unreadNotifications?: number;
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Logo href="/panel" />
        <div className="flex items-center gap-3">
          <Link
            href="/notificaciones"
            title="Notificaciones"
            className={`relative rounded-lg px-2 py-1.5 text-lg transition hover:bg-zinc-800 ${
              pathname.startsWith("/notificaciones") ? "bg-fuchsia-600/20" : ""
            }`}
          >
            🔔
            {unreadNotifications > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-fuchsia-600 px-1 text-[10px] font-bold text-white">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            )}
          </Link>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-white">{displayName}</p>
            <p className="text-xs text-zinc-500">{roleLabel}</p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white"
            >
              Salir
            </button>
          </form>
        </div>
      </div>
      <nav className="mx-auto max-w-6xl overflow-x-auto px-4">
        <ul className="flex gap-1 pb-2">
          {items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? "bg-fuchsia-600/20 text-fuchsia-300"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
