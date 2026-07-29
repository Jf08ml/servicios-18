import { listStates } from "@/lib/geo";
import { pageTitle, card } from "@/lib/ui";
import { BulkImportForm } from "./bulk-import-form";

export const metadata = { title: "Carga masiva" };

export default function AdminCargaMasivaPage() {
  const coStates = listStates("CO");

  return (
    <div className="space-y-6">
      <h1 className={pageTitle}>Carga masiva de profesionales</h1>

      <div className={card + " space-y-3 text-sm text-zinc-300"}>
        <p>
          Crea varias cuentas de profesionales ya verificadas a partir de una plantilla CSV. Cada
          fila crea una cuenta con rol Profesional, visible en el catálogo público de inmediato —
          sin pasar por el flujo normal de verificación (documento + selfie), porque el equipo ya
          la vetó por fuera de la plataforma.
        </p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Descarga la{" "}
            <a
              href="/plantillas/profesionales-carga-masiva.csv"
              download
              className="font-medium text-fuchsia-400 underline"
            >
              plantilla CSV
            </a>{" "}
            y complétala (una fila por profesional; borra las filas de ejemplo antes de subirla).
          </li>
          <li>
            Si vas a cargar fotos de perfil, comprime las imágenes (JPG, PNG o WebP) en un .zip y
            escribe el nombre exacto de cada archivo en la columna <code>foto_archivo</code>.
          </li>
          <li>Sube el CSV (y el ZIP si aplica) abajo.</li>
        </ol>
        <details className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          <summary className="cursor-pointer font-medium text-zinc-200">
            Códigos de departamento (Colombia)
          </summary>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-400 sm:grid-cols-3">
            {coStates.map((s) => (
              <span key={s.code}>
                <span className="text-zinc-500">{s.code}</span> — {s.name}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Para otros países usa el código ISO de 2 letras como país (MX, AR, PE, EC, VE, ES…) y
            confirma el código de departamento/estado y el nombre exacto de la ciudad en el
            selector de <a href="/registro" className="underline">/registro</a>.
          </p>
        </details>
      </div>

      <div className={card}>
        <h2 className="mb-4 font-semibold text-white">Subir archivos</h2>
        <BulkImportForm />
      </div>
    </div>
  );
}
