import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata = { title: "Iniciar sesión" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div>
      <h1 className="text-xl font-bold text-white">Iniciar sesión</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Bienvenido de nuevo. Ingresa tus credenciales.
      </p>
      <div className="mt-6">
        <LoginForm next={next ?? ""} />
      </div>
      <p className="mt-6 text-center text-sm text-zinc-400">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-medium text-fuchsia-400 hover:text-fuchsia-300">
          Regístrate
        </Link>
      </p>
    </div>
  );
}
