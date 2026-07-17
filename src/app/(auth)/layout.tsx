import { Logo } from "@/components/logo";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="mb-6">
        <Logo />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-xl">
        {children}
      </div>
      <p className="mt-6 max-w-md text-center text-xs text-zinc-500">
        Plataforma exclusiva para mayores de 18 años. No comercializamos
        servicios: ofrecemos herramientas de confianza, seguridad y gestión.
      </p>
    </div>
  );
}
