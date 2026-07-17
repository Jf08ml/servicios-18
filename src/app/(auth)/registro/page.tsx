import Link from "next/link";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Crear cuenta" };

export default function RegistroPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-white">Crear cuenta</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Únete a la plataforma de confianza y gestión. Solo para mayores de 18
        años. Sin correos ni notificaciones: tu privacidad es primero.
      </p>
      <div className="mt-6">
        <RegisterForm />
      </div>
      <p className="mt-6 text-center text-sm text-zinc-400">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-fuchsia-400 hover:text-fuchsia-300">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
