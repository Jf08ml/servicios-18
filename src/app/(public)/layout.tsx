import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { Logo } from "@/components/logo";
import { SITE_NAME } from "@/lib/site";
import { btnPrimary, btnSecondary } from "@/lib/ui";

export default async function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();

  // Con sesión activa se muestra la navegación completa de la app.
  if (user) {
    return <AppShell user={user}>{children}</AppShell>;
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Logo />
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/como-funciona"
              className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white sm:block"
            >
              ¿Cómo funciona?
            </Link>
            <Link href="/login" className={btnSecondary}>
              Iniciar sesión
            </Link>
            <Link href="/registro" className={btnPrimary}>
              Crear cuenta
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>

      <footer className="mx-auto max-w-6xl border-t border-zinc-800 px-4 py-8 text-center text-xs text-zinc-500">
        <p>
          Plataforma de herramientas de confianza y gestión. No comercializamos
          ni intermediamos el servicio principal. Exclusiva para mayores de 18
          años.
        </p>
        <p className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
          <Link href="/como-funciona" className="text-zinc-400 hover:text-white">
            ¿Cómo funciona la plataforma?
          </Link>
          <Link href="/instalar" className="text-zinc-400 hover:text-white">
            📲 Instalar como app
          </Link>
        </p>
        <p className="mt-2">© {new Date().getFullYear()} {SITE_NAME}</p>
      </footer>
    </div>
  );
}
