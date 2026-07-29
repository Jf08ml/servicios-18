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
          la vetó por fuera de la plataforma. Si el teléfono de la fila ya pertenece a un
          profesional existente, no se crea una cuenta duplicada: se actualizan sus datos (nombre,
          bio, ubicación, visibilidad) y las fotos solo se reemplazan si la fila trae{" "}
          <code>foto_url</code>/<code>foto_archivo</code> o <code>galeria_urls</code>; la
          contraseña de la cuenta existente nunca se toca.
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
            Para la foto de perfil hay dos opciones: comprime las imágenes (JPG, PNG o WebP) en un
            .zip y escribe el nombre exacto de cada archivo en la columna{" "}
            <code>foto_archivo</code>, o pega una URL directa a la imagen en la columna{" "}
            <code>foto_url</code> (el servidor la descarga y la guarda como propia, no queda
            enlazada al sitio de origen). Si llenas ambas, se usa <code>foto_archivo</code>.
          </li>
          <li>
            Para fotos de galería (hasta 12 por perfil) usa la columna{" "}
            <code>galeria_urls</code> con las URLs separadas por <code>|</code> (ej.{" "}
            <code>https://.../1.jpg|https://.../2.jpg</code>) o como array JSON (ej.{" "}
            <code>[&quot;https://.../1.jpg&quot;,&quot;https://.../2.jpg&quot;]</code>, el formato
            que exportan algunos scrapers de listados). Igual que <code>foto_url</code>, cada
            imagen se descarga y se guarda como propia; si hay más de 12 solo se toman las
            primeras 12.
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
