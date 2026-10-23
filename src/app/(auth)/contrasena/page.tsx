import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { PasswordForm } from "./password-form";

export const metadata = { title: "Contraseña", robots: { index: false, follow: false } };

export default async function ContrasenaPage() {
  const user = await requireUser(undefined, { allowPendingPassword: true });
  const pending = user.mustChangePassword;

  return (
    <div>
      <h1 className="text-xl font-bold text-white">
        {pending ? "Crea tu contraseña" : "Cambiar contraseña"}
      </h1>
      <p className="mt-1 text-sm text-zinc-400">
        {pending
          ? `Hola ${user.displayName}, elige una contraseña para volver a entrar con tu correo (${user.email}).`
          : "Elige una contraseña nueva de al menos 8 caracteres."}
      </p>
      <div className="mt-6">
        <PasswordForm requireCurrent={!pending} />
      </div>
      {!pending && (
        <p className="mt-6 text-center text-sm text-zinc-400">
          <Link href="/perfil" className="font-medium text-fuchsia-400 hover:text-fuchsia-300">
            Volver a mi perfil
          </Link>
        </p>
      )}
    </div>
  );
}
