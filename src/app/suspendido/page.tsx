import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata = { title: "Cuenta suspendida" };

export default function SuspendidoPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <Logo />
      <h1 className="mt-6 text-2xl font-bold text-white">Cuenta suspendida</h1>
      <p className="mt-2 max-w-md text-sm text-zinc-400">
        Tu cuenta se encuentra temporalmente suspendida mientras nuestro equipo
        revisa la situación. Si crees que se trata de un error, escríbenos al
        soporte.
      </p>
      <Link href="/" className="mt-6 text-sm font-medium text-fuchsia-400 hover:text-fuchsia-300">
        Volver al inicio
      </Link>
    </div>
  );
}
