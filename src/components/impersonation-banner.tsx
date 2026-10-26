import { getCurrentUser, getImpersonator } from "@/lib/auth";
import { stopImpersonationAction } from "@/app/(auth)/actions";

/**
 * Aviso fijo mientras un admin usa otra cuenta con "Entrar como". No renderiza
 * nada en una sesión normal.
 */
export async function ImpersonationBanner() {
  const [impersonator, user] = await Promise.all([getImpersonator(), getCurrentUser()]);
  if (!impersonator || !user) return null;

  return (
    <div className="border-b border-amber-700 bg-amber-950 text-amber-100">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
        <p>
          Estás dentro de la cuenta de <strong>{user.displayName}</strong>{" "}
          <span className="text-amber-300/80">({user.email})</span> como{" "}
          {impersonator.displayName}. Todo lo que hagas queda a su nombre.
        </p>
        <form action={stopImpersonationAction}>
          <button className="rounded border border-amber-600 px-3 py-1 text-xs font-semibold text-amber-100 hover:bg-amber-900">
            Volver a mi cuenta
          </button>
        </form>
      </div>
    </div>
  );
}
