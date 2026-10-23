import Link from "next/link";
import { isLoginTokenValid } from "@/lib/login-tokens";
import { SubmitButton } from "@/components/submit-button";
import { enterWithTokenAction } from "./actions";

export const metadata = {
  title: "Acceso a tu cuenta",
  robots: { index: false, follow: false },
};

export default async function AccesoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const valid = await isLoginTokenValid(token);

  if (!valid) {
    return (
      <div>
        <h1 className="text-xl font-bold text-white">Enlace no válido</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Este enlace de acceso ya se usó o venció. Responde al mensaje de
          WhatsApp para recibir uno nuevo, o ingresa con tu correo y contraseña.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block font-medium text-fuchsia-400 hover:text-fuchsia-300"
        >
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-white">Accede a tu perfil</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Entrarás a tu cuenta sin contraseña y luego te pediremos crear una nueva.
        Este enlace es personal y funciona una sola vez.
      </p>
      <form action={enterWithTokenAction} className="mt-6">
        <input type="hidden" name="token" value={token} />
        <SubmitButton className="w-full inline-flex items-center justify-center rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-500 disabled:opacity-50">
          Entrar a mi cuenta
        </SubmitButton>
      </form>
    </div>
  );
}
