import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { listCountries, listStates, listCities } from "@/lib/geo";
import { GALLERY_LIMIT } from "@/lib/gallery";
import { SERVICE_DURATIONS } from "@/lib/services";
import { card, pageTitle, input, label, btnSecondary } from "@/lib/ui";
import { Avatar } from "@/components/avatar";
import { VerifiedBadge, UnverifiedBadge } from "@/components/badges";
import { formatDurationMinutes, minutesTo12h, WEEKDAYS } from "@/lib/format";
import { ProfileForm } from "../../perfil/profile-form";
import { GalleryManager } from "../../perfil/gallery-manager";
import { AvailabilityForm } from "../../agenda/availability-form";
import {
  updateAgencyWorkerProfileAction,
  addAgencyWorkerGalleryMediaAction,
  deleteAgencyWorkerGalleryMediaAction,
  addAgencyWorkerAvailabilityAction,
  deleteAgencyWorkerAvailabilityAction,
  addAgencyWorkerServiceTypeAction,
  deleteAgencyWorkerServiceTypeAction,
} from "../actions";

export const metadata = { title: "Gestionar profesional" };

export default async function AgencyWorkerPage({
  params,
}: {
  params: Promise<{ workerId: string }>;
}) {
  const user = await requireUser(["AGENCY"]);
  const { workerId } = await params;

  const agency = await db.agency.findUnique({ where: { ownerId: user.id } });
  if (!agency) notFound();

  const worker = await db.user.findFirst({
    where: { id: workerId, agencyId: agency.id },
    include: {
      profile: true,
      mediaItems: { orderBy: { createdAt: "asc" } },
      availability: { orderBy: [{ weekday: "asc" }, { startMinute: "asc" }] },
      serviceTypes: { orderBy: { durationMinutes: "asc" } },
    },
  });
  if (!worker) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/agencia" className="text-sm font-medium text-fuchsia-400 hover:text-fuchsia-300">
          ← Volver a mi agencia
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <Avatar photoPath={worker.profile?.photoPath} name={worker.displayName} className="h-16 w-16 text-xl" />
        <div>
          <h1 className={pageTitle}>{worker.displayName}</h1>
          <p className="text-sm text-zinc-400">{worker.email}</p>
          <div className="mt-1">{worker.verifiedAt ? <VerifiedBadge /> : <UnverifiedBadge />}</div>
        </div>
      </div>

      <div className={card}>
        <h2 className="mb-4 font-semibold text-white">Perfil profesional</h2>
        <ProfileForm
          isWorker
          action={updateAgencyWorkerProfileAction}
          workerId={worker.id}
          defaults={{
            bio: worker.profile?.bio ?? "",
            languages: worker.profile?.languages ?? "",
            visible: worker.profile?.visible ?? true,
            country: worker.profile?.countryCode ?? "",
            state: worker.profile?.stateCode ?? "",
            city: worker.profile?.city ?? "",
          }}
          countries={listCountries()}
          initialStates={worker.profile?.countryCode ? listStates(worker.profile.countryCode) : []}
          initialCities={
            worker.profile?.countryCode && worker.profile?.stateCode
              ? listCities(worker.profile.countryCode, worker.profile.stateCode)
              : []
          }
        />
      </div>

      <div className={card}>
        <h2 className="font-semibold text-white">Galería de fotos y videos</h2>
        <p className="mb-4 mt-1 text-sm text-zinc-400">
          Se muestra en su perfil público y en el catálogo de la portada.
        </p>
        <GalleryManager
          items={worker.mediaItems.map((m) => ({ id: m.id, kind: m.kind, filePath: m.filePath }))}
          limit={GALLERY_LIMIT}
          addAction={addAgencyWorkerGalleryMediaAction}
          deleteAction={deleteAgencyWorkerGalleryMediaAction}
          workerId={worker.id}
        />
      </div>

      <div className={card}>
        <h2 className="font-semibold text-white">Disponibilidad semanal</h2>
        <p className="mt-1 text-sm text-zinc-400">Los clientes verán estos horarios en su perfil.</p>

        {worker.availability.length > 0 && (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {worker.availability.map((slot) => (
              <li
                key={slot.id}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              >
                <span className="text-zinc-200">
                  {WEEKDAYS[slot.weekday]} · {minutesTo12h(slot.startMinute)} – {minutesTo12h(slot.endMinute)}
                </span>
                <form action={deleteAgencyWorkerAvailabilityAction}>
                  <input type="hidden" name="id" value={slot.id} />
                  <input type="hidden" name="workerId" value={worker.id} />
                  <button type="submit" className="text-xs font-medium text-red-400 hover:text-red-300">
                    Quitar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <AvailabilityForm action={addAgencyWorkerAvailabilityAction} workerId={worker.id} />
      </div>

      <div className={card}>
        <h2 className="font-semibold text-white">Tipos de servicio</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Los clientes elegirán uno al agendar. Si no defines ninguno, verán duraciones estándar.
        </p>

        {worker.serviceTypes.length > 0 && (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {worker.serviceTypes.map((svc) => (
              <li
                key={svc.id}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              >
                <span className="text-zinc-200">
                  {svc.name}{" "}
                  <span className="text-zinc-500">· {formatDurationMinutes(svc.durationMinutes)}</span>
                </span>
                <form action={deleteAgencyWorkerServiceTypeAction}>
                  <input type="hidden" name="id" value={svc.id} />
                  <input type="hidden" name="workerId" value={worker.id} />
                  <button type="submit" className="text-xs font-medium text-red-400 hover:text-red-300">
                    Quitar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form
          action={addAgencyWorkerServiceTypeAction}
          className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]"
        >
          <input type="hidden" name="workerId" value={worker.id} />
          <div>
            <label htmlFor="service-name" className={label}>
              Nombre del servicio
            </label>
            <input
              id="service-name"
              name="name"
              type="text"
              required
              maxLength={40}
              placeholder="Ej. El rato, Salida, Amanecida…"
              className={input}
            />
          </div>
          <div>
            <label htmlFor="service-duration" className={label}>
              Duración
            </label>
            <select id="service-duration" name="duration" defaultValue="60" className={input}>
              {SERVICE_DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {formatDurationMinutes(d)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" className={btnSecondary}>
              Agregar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
