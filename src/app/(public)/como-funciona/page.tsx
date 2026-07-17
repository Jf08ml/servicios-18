import Link from "next/link";
import { btnPrimary, btnSecondary } from "@/lib/ui";

export const metadata = { title: "¿Cómo funciona?" };

const FEATURES = [
  {
    title: "Perfiles verificados",
    desc: "Verificación de identidad revisada por nuestro equipo: rápida (foto de validación) o completa (documento + selfie). Menos perfiles falsos, menos estafas.",
    icon: "🛡️",
  },
  {
    title: "Chat interno seguro",
    desc: "Comunícate sin compartir tu número personal. Toda la conversación queda dentro de la plataforma.",
    icon: "💬",
  },
  {
    title: "Agenda organizada",
    desc: "Define tu disponibilidad, recibe solicitudes de cita y confirma o rechaza con un clic. Adiós al caos de WhatsApp.",
    icon: "📅",
  },
  {
    title: "Hoteles aliados",
    desc: "Reserva habitaciones en hoteles verificados directamente desde la app, con código de confirmación.",
    icon: "🏨",
  },
  {
    title: "Reputación real",
    desc: "Calificaciones mutuas después de cada cita completada. La confianza se construye con historial.",
    icon: "⭐",
  },
  {
    title: "Botón SOS y reportes",
    desc: "Alerta de emergencia con tu ubicación y contactos de confianza, más un sistema de reportes atendido por el equipo.",
    icon: "🚨",
  },
];

const AUDIENCES = [
  {
    title: "Para profesionales",
    items: [
      "Más confianza y menos estafas",
      "Agenda organizada",
      "Reserva de hoteles",
      "Privacidad: tu número nunca es público",
    ],
  },
  {
    title: "Para clientes",
    items: [
      "Perfiles verificados",
      "Chat seguro",
      "Menor riesgo de fraude",
      "Mejor experiencia",
    ],
  },
  {
    title: "Para hoteles",
    items: [
      "Más reservas",
      "Clientes identificados",
      "Gestión digital de habitaciones",
      "Panel de reservas en línea",
    ],
  },
];

export default function ComoFuncionaPage() {
  return (
    <div className="space-y-12 pb-8">
      <section className="pt-6 text-center sm:pt-12">
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          La plataforma de confianza para trabajadores independientes y sus
          clientes
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-zinc-400">
          No vendemos servicios. Te damos las herramientas: verificación de
          identidad, chat seguro, agenda, hoteles aliados, reputación y botón
          SOS — todo en una sola aplicación.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className={btnSecondary + " px-6 py-3 text-base"}>
            Explorar perfiles
          </Link>
          <Link href="/registro" className={btnPrimary + " px-6 py-3 text-base"}>
            Crear cuenta gratis
          </Link>
        </div>
        <p className="mt-4 text-sm text-zinc-500">
          Sin correos ni notificaciones: tu correo solo sirve para iniciar
          sesión.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <div className="text-3xl">{f.icon}</div>
            <h2 className="mt-3 text-lg font-semibold text-white">{f.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-zinc-400">{f.desc}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {AUDIENCES.map((a) => (
          <div
            key={a.title}
            className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6"
          >
            <h2 className="text-lg font-semibold text-fuchsia-300">{a.title}</h2>
            <ul className="mt-3 space-y-2">
              {a.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-zinc-300">
                  <span className="mt-0.5 text-fuchsia-500">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
