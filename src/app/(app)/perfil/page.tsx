import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { listCountries, listStates, listCities } from "@/lib/geo";
import { card, pageTitle } from "@/lib/ui";
import { Avatar } from "@/components/avatar";
import { ProfileForm } from "./profile-form";
import { GalleryManager } from "./gallery-manager";
import { addEmergencyContactAction, deleteEmergencyContactAction } from "./actions";
import { input, label, btnSecondary } from "@/lib/ui";

export const metadata = { title: "Mi perfil" };

export default async function PerfilPage() {
  const user = await requireUser();
  const [profile, contacts, mediaItems] = await Promise.all([
    db.profile.findUnique({ where: { userId: user.id } }),
    db.emergencyContact.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    db.mediaItem.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Avatar photoPath={profile?.photoPath} name={user.displayName} className="h-16 w-16 text-xl" />
        <div>
          <h1 className={pageTitle}>{user.displayName}</h1>
          <p className="text-sm text-zinc-400">{user.email}</p>
        </div>
      </div>

      <div className={card}>
        <h2 className="mb-4 font-semibold text-white">
          {user.role === "WORKER" ? "Perfil profesional" : "Datos de mi cuenta"}
        </h2>
        <ProfileForm
          isWorker={user.role === "WORKER"}
          defaults={{
            bio: profile?.bio ?? "",
            languages: profile?.languages ?? "",
            visible: profile?.visible ?? true,
            country: profile?.countryCode ?? "",
            state: profile?.stateCode ?? "",
            city: profile?.city ?? "",
          }}
          countries={listCountries()}
          initialStates={profile?.countryCode ? listStates(profile.countryCode) : []}
          initialCities={
            profile?.countryCode && profile?.stateCode
              ? listCities(profile.countryCode, profile.stateCode)
              : []
          }
        />
      </div>

      {user.role === "WORKER" && (
        <div className={card}>
          <h2 className="font-semibold text-white">Galería de fotos y videos</h2>
          <p className="mb-4 mt-1 text-sm text-zinc-400">
            Esta galería se muestra en tu perfil público y en el catálogo de la
            portada. Sube solo contenido tuyo y apto para mostrar públicamente.
          </p>
          <GalleryManager
            items={mediaItems.map((m) => ({ id: m.id, kind: m.kind, filePath: m.filePath }))}
            limit={12}
          />
        </div>
      )}

      <div className={card}>
        <h2 className="font-semibold text-white">Contactos de emergencia</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Se muestran cuando activas el botón SOS. Máximo 5 contactos.
        </p>

        {contacts.length > 0 && (
          <ul className="mt-4 space-y-2">
            {contacts.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2"
              >
                <div className="text-sm">
                  <p className="font-medium text-zinc-200">{c.name}</p>
                  <p className="font-mono text-xs text-zinc-400">{c.phone}</p>
                </div>
                <form action={deleteEmergencyContactAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <button
                    type="submit"
                    className="text-xs font-medium text-red-400 hover:text-red-300"
                  >
                    Eliminar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        {contacts.length < 5 && (
          <form action={addEmergencyContactAction} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <div>
              <label htmlFor="ec-name" className={label}>
                Nombre
              </label>
              <input id="ec-name" name="name" required maxLength={60} className={input} />
            </div>
            <div>
              <label htmlFor="ec-phone" className={label}>
                Teléfono
              </label>
              <input id="ec-phone" name="phone" type="tel" required maxLength={20} className={input} />
            </div>
            <div className="flex items-end">
              <button type="submit" className={btnSecondary}>
                Agregar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
