import { pageTitle } from "@/lib/ui";
import { WorkerCatalog } from "@/components/worker-catalog";

// Mismo catálogo que la portada: canonical a "/" para no dividir señales SEO.
export const metadata = {
  title: "Perfiles verificados",
  alternates: { canonical: "/" },
};

export default async function PerfilesPage({
  searchParams,
}: {
  searchParams: Promise<{ pais?: string; depto?: string; ciudad?: string }>;
}) {
  const { pais, depto, ciudad } = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className={pageTitle}>Perfiles verificados</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Todos los perfiles de este directorio pasaron una verificación de
          identidad revisada por nuestro equipo.
        </p>
      </div>
      <WorkerCatalog pais={pais} depto={depto} ciudad={ciudad} />
    </div>
  );
}
