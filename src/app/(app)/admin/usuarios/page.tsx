import { db } from "@/lib/db";
import { isPremium } from "@/lib/auth";
import { pageTitle } from "@/lib/ui";
import { StatusBadge, VerifiedBadge, PremiumBadge } from "@/components/badges";
import { ROLE_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import {
  setUserStatusAction,
  setPremiumAction,
  requireFullVerificationAction,
  impersonateUserAction,
} from "../actions";
import { DeleteUserButton } from "./delete-user-button";

export const metadata = { title: "Usuarios" };

export default async function AdminUsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = (await searchParams).q?.trim().slice(0, 100) ?? "";
  const users = await db.user.findMany({
    where: q
      ? {
          OR: [
            { displayName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
            { id: q },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <h1 className={pageTitle}>Usuarios ({users.length})</h1>

      <form className="flex max-w-xl gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre, correo, teléfono o ID"
          className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-fuchsia-700 focus:outline-none"
        />
        <button className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800">
          Buscar
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-zinc-800">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900 text-left text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Registro</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-zinc-800/60">
                <td className="px-4 py-3">
                  <p className="font-medium text-white">{u.displayName}</p>
                  <p className="text-xs text-zinc-500">{u.email}</p>
                  <div className="mt-1 flex gap-1">
                    {u.verifiedAt && <VerifiedBadge />}
                    {isPremium(u) && <PremiumBadge />}
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-300">{ROLE_LABELS[u.role]}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={u.status} />
                </td>
                <td className="px-4 py-3 text-zinc-400">{formatDate(u.createdAt)}</td>
                <td className="px-4 py-3">
                  {u.role !== "ADMIN" && (
                    <div className="flex flex-wrap gap-1.5">
                      {u.status !== "BANNED" && (
                        <form action={impersonateUserAction}>
                          <input type="hidden" name="id" value={u.id} />
                          <button
                            className="rounded border border-zinc-600 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
                            title="Abre su cuenta por 2 horas para dar soporte; vuelves con el aviso superior"
                          >
                            Entrar como
                          </button>
                        </form>
                      )}
                      {u.status !== "ACTIVE" && (
                        <form action={setUserStatusAction}>
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="status" value="ACTIVE" />
                          <button className="rounded border border-emerald-800 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-950">
                            Activar
                          </button>
                        </form>
                      )}
                      {u.status === "ACTIVE" && (
                        <form action={setUserStatusAction}>
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="status" value="SUSPENDED" />
                          <button className="rounded border border-amber-800 px-2 py-1 text-xs text-amber-300 hover:bg-amber-950">
                            Suspender
                          </button>
                        </form>
                      )}
                      {u.status !== "BANNED" && (
                        <form action={setUserStatusAction}>
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="status" value="BANNED" />
                          <button className="rounded border border-red-900 px-2 py-1 text-xs text-red-300 hover:bg-red-950">
                            Bloquear
                          </button>
                        </form>
                      )}
                      {u.role === "WORKER" && (
                        <form action={setPremiumAction}>
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="grant" value={isPremium(u) ? "false" : "true"} />
                          <button className="rounded border border-fuchsia-800 px-2 py-1 text-xs text-fuchsia-300 hover:bg-fuchsia-950">
                            {isPremium(u) ? "Quitar premium" : "Dar premium 30d"}
                          </button>
                        </form>
                      )}
                      {(u.role === "WORKER" || u.role === "CLIENT") && (
                        <form action={requireFullVerificationAction}>
                          <input type="hidden" name="id" value={u.id} />
                          <input
                            type="hidden"
                            name="required"
                            value={u.fullVerificationRequired ? "false" : "true"}
                          />
                          <button
                            className={`rounded border px-2 py-1 text-xs ${
                              u.fullVerificationRequired
                                ? "border-zinc-700 text-zinc-400 hover:bg-zinc-900"
                                : "border-sky-800 text-sky-300 hover:bg-sky-950"
                            }`}
                            title="Ante reportes de estafa o perfil falso, exige documento + selfie"
                          >
                            {u.fullVerificationRequired
                              ? "Anular verif. completa"
                              : "Exigir verif. completa"}
                          </button>
                        </form>
                      )}
                      <DeleteUserButton id={u.id} email={u.email} />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
