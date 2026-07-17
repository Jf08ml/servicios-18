import Link from "next/link";
import { pageTitle } from "@/lib/ui";
import { InstallButton } from "@/components/install-button";

export const metadata = { title: "Instalar la app" };

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 3v12M8.5 6.5 12 3l3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10H5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-1" strokeLinecap="round" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M12 12V8m0 4-2.5-2.5M12 12l2.5-2.5M8 21h8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusSquareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M12 8.5v7M8.5 12h7" strokeLinecap="round" />
    </svg>
  );
}

function Step({
  n,
  icon,
  children,
}: {
  n: number;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fuchsia-600 text-sm font-bold text-white">
        {n}
      </span>
      {icon && (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-200">
          {icon}
        </span>
      )}
      <div className="text-sm leading-relaxed text-zinc-300">{children}</div>
    </li>
  );
}

function FakeButton({ children }: { children: React.ReactNode }) {
  return (
    <span className="mx-0.5 inline-flex items-center gap-1 rounded-lg border border-zinc-600 bg-zinc-800 px-2 py-0.5 text-xs font-medium text-white">
      {children}
    </span>
  );
}

export default function InstalarPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="text-center">
        <h1 className={pageTitle}>Instala Prepagoniacas como app</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-zinc-400">
          Sin tiendas de aplicaciones ni descargas pesadas: la web se instala
          directo en tu teléfono, con su propio ícono y notificaciones. Ideal
          para responder solicitudes de cita al instante.
        </p>
        <div className="mt-4">
          <InstallButton />
        </div>
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          🤖 En Android (Chrome)
        </h2>
        <ol className="mt-4 space-y-3">
          <Step n={1} icon={<DotsIcon />}>
            Abre esta página en <strong className="text-white">Chrome</strong> y
            toca el menú <FakeButton>⋮</FakeButton> en la esquina superior
            derecha.
          </Step>
          <Step n={2} icon={<PlusSquareIcon />}>
            Toca <FakeButton>Instalar aplicación</FakeButton> (o{" "}
            <FakeButton>Añadir a pantalla de inicio</FakeButton>).
          </Step>
          <Step n={3}>
            Confirma con <FakeButton>Instalar</FakeButton>. Verás el ícono del
            corazón 💜 en tu pantalla de inicio, como cualquier app.
          </Step>
        </ol>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          🍎 En iPhone (Safari)
        </h2>
        <ol className="mt-4 space-y-3">
          <Step n={1} icon={<ShareIcon />}>
            Abre esta página en <strong className="text-white">Safari</strong>{" "}
            (en otros navegadores no funciona) y toca el botón{" "}
            <strong className="text-white">Compartir</strong> — el cuadrito con
            la flecha hacia arriba, abajo en el centro.
          </Step>
          <Step n={2} icon={<PlusSquareIcon />}>
            Desliza hacia abajo en el menú y toca{" "}
            <FakeButton>Añadir a pantalla de inicio</FakeButton>.
          </Step>
          <Step n={3}>
            Toca <FakeButton>Añadir</FakeButton> arriba a la derecha. Listo: la
            app queda en tu pantalla de inicio.
          </Step>
        </ol>
        <p className="mt-3 rounded-lg border border-amber-800 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
          En iPhone, las notificaciones solo funcionan si abres la app desde el
          ícono instalado (no desde Safari). Requiere iOS 16.4 o superior.
        </p>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          💻 En el computador (Chrome o Edge)
        </h2>
        <ol className="mt-4 space-y-3">
          <Step n={1} icon={<MonitorIcon />}>
            Busca el ícono de instalar (un monitor con una flecha) al final de
            la barra de direcciones y haz clic.
          </Step>
          <Step n={2}>
            Confirma con <FakeButton>Instalar</FakeButton>. La app se abre en
            su propia ventana y queda en tu escritorio o menú de inicio.
          </Step>
        </ol>
      </section>

      <section className="rounded-2xl border border-fuchsia-800 bg-fuchsia-950/20 p-5">
        <h2 className="text-lg font-semibold text-white">
          🔔 Después de instalar: activa las notificaciones
        </h2>
        <p className="mt-2 text-sm text-zinc-300">
          Abre la app, entra con tu cuenta y ve a{" "}
          <Link href="/notificaciones" className="font-medium text-fuchsia-400 hover:text-fuchsia-300">
            Notificaciones
          </Link>{" "}
          → <FakeButton>Activar</FakeButton>. Así te enteras al instante de
          cada solicitud de cita, mensaje o novedad de tu verificación, aunque
          tengas la app cerrada. Nunca enviamos correos ni publicidad.
        </p>
      </section>
    </div>
  );
}
