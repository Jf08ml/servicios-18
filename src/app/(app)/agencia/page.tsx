import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { card, pageTitle, btnSecondary } from "@/lib/ui";
import { VerifiedBadge, UnverifiedBadge } from "@/components/badges";
import { EmptyState } from "@/components/empty-state";
import { Avatar } from "@/components/avatar";
import { AgencyForm } from "./agency-form";
import { WorkerForm } from "./worker-form";
import { removeAgencyWorkerAction } from "./actions";

export const metadata = { title: "Mi agencia" };

export default async function AgenciaPage() {
  const user = await requireUser(["AGENCY"]);
  const agency = await db.agency.findUnique({ where: { ownerId: user.id } });

  if (!agency) {
    return (
      <div className="space-y-6">
        <h1 className={pageTitle}>Mi agencia</h1>
        <EmptyState
          title="Tu cuenta aún no tiene una agencia asociada"
          description="Escríbenos si esto tarda más de 24 horas."
        />
      </div>
    );
  }

  const workers = await db.user.findMany({
    where: { agencyId: agency.id },
    orderBy: { createdAt: "desc" },
    include: { profile: { select: { visible: true, city: true, photoPath: true } } },
  });

  return (
    <div className="space-y-8">
      <h1 className={pageTitle}>Mi agencia</h1>

      <div className={card}>
        <div className="mb-4 flex items-center gap-4">
          <Avatar photoPath={agency.photoPath} name={agency.name} className="h-16 w-16 text-xl" />
          <div>
            <h2 className="font-semibold text-white">{agency.name}</h2>
            {agency.city && <p className="text-sm text-zinc-400">{agency.city}</p>}
          </div>
        </div>
        <AgencyForm
          defaults={{
            name: agency.name,
            city: agency.city ?? "",
            description: agency.description ?? "",
          }}
        />
      </div>

      <div className={card}>
        <h2 className="mb-4 font-semibold text-white">
          Catálogo ({workers.length})
        </h2>
        {workers.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Aún no has agregado profesionales a tu catálogo.
          </p>
        ) : (
          <ul className="space-y-2">
            {workers.map((w) => (
              <li
                key={w.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar photoPath={w.profile?.photoPath} name={w.displayName} className="h-10 w-10" />
                  <div>
                    <p className="font-medium text-zinc-200">{w.displayName}</p>
                    <p className="text-xs text-zinc-500">
                      {w.profile?.city ?? "Sin ciudad"} ·{" "}
                      {w.profile?.visible ? "Visible en el catálogo" : "Oculta"}
                    </p>
                  </div>
                  <div className="ml-1">
                    {w.verifiedAt ? <VerifiedBadge /> : <UnverifiedBadge />}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/agencia/${w.id}`} className={btnSecondary}>
                    Gestionar
                  </Link>
                  <form action={removeAgencyWorkerAction}>
                    <input type="hidden" name="workerId" value={w.id} />
                    <button
                      type="submit"
                      className="text-xs font-medium text-red-400 hover:text-red-300"
                    >
                      Quitar de la agencia
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={card}>
        <h2 className="mb-4 font-semibold text-white">Agregar profesional al catálogo</h2>
        <WorkerForm />
      </div>
    </div>
  );
}
