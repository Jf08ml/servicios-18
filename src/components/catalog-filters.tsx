"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SearchableSelect } from "@/components/searchable-select";
import { findNearestCityAction } from "@/lib/geo-actions";

type GeoOption = { code: string; name: string };

const AUTO_FLAG = "geo-autofilter-done";

function normalize(s: string): string {
  // NFD separa las tildes en marcas combinantes, que el filtro a-z descarta.
  return s.normalize("NFD").toLowerCase().replace(/[^a-z]/g, "");
}

/**
 * Filtros en cascada del catálogo (país → departamento → ciudad) con
 * autodetección por zona horaria del navegador: sin permisos ni servicios
 * externos, solo se aplica una vez por sesión y si hay perfiles en ese país.
 */
export function CatalogFilters({
  countries,
  states,
  cities,
  selected,
  geoPairs,
  highlightLocate = false,
}: {
  countries: GeoOption[];
  states: GeoOption[];
  cities: GeoOption[];
  selected: { pais: string; depto: string; ciudad: string };
  geoPairs: { country: string; city: string | null }[];
  /** Resalta el botón "cerca de mí" para clientes con sesión iniciada. */
  highlightLocate?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState(false);

  function apply(pais: string, depto: string, ciudad: string) {
    const params = new URLSearchParams();
    if (pais) params.set("pais", pais);
    if (depto) params.set("depto", depto);
    if (ciudad) params.set("ciudad", ciudad);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function onChange(pais: string, depto: string, ciudad: string) {
    try {
      sessionStorage.setItem(AUTO_FLAG, "1");
    } catch {}
    apply(pais, depto, ciudad);
  }

  function locateMe() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocateError(true);
      return;
    }
    setLocating(true);
    setLocateError(false);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const nearest = await findNearestCityAction(
          pos.coords.latitude,
          pos.coords.longitude
        );
        setLocating(false);
        if (nearest) {
          onChange(nearest.countryCode, nearest.stateCode, nearest.city);
        } else {
          setLocateError(true);
        }
      },
      () => {
        setLocating(false);
        setLocateError(true);
      },
      { timeout: 8000 }
    );
  }

  // Autodetección: zona horaria → país (y ciudad si coincide con la de la TZ).
  useEffect(() => {
    const hasFilters = selected.pais || selected.depto || selected.ciudad;
    let done = false;
    try {
      done = sessionStorage.getItem(AUTO_FLAG) === "1";
    } catch {
      done = true;
    }
    if (hasFilters || done) return;

    try {
      sessionStorage.setItem(AUTO_FLAG, "1");
    } catch {}

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return;

    import("countries-and-timezones").then((ct) => {
      const detected = ct.getCountryForTimezone(tz);
      if (!detected) return;
      const available = geoPairs.some((p) => p.country === detected.id);
      if (!available) return;

      // Si la ciudad de la TZ (p. ej. "Bogota") coincide con una ciudad
      // disponible del país, filtra también por ella.
      const tzCity = normalize(tz.split("/").pop() ?? "");
      const cityMatch = tzCity
        ? geoPairs.find(
            (p) =>
              p.country === detected.id &&
              p.city &&
              (normalize(p.city).startsWith(tzCity) || tzCity.startsWith(normalize(p.city)))
          )?.city
        : null;

      apply(detected.id, "", cityMatch ?? "");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-2">
      {highlightLocate && !selected.ciudad && (
        <div>
          <button
            type="button"
            onClick={locateMe}
            disabled={locating}
            className="inline-flex items-center gap-2 rounded-xl border border-fuchsia-700 bg-fuchsia-950/40 px-4 py-2.5 text-sm font-medium text-fuchsia-200 transition hover:bg-fuchsia-950/70 disabled:opacity-60"
          >
            📍 {locating ? "Buscando tu ciudad…" : "Ver profesionales cerca de mí"}
          </button>
          {locateError && (
            <p className="mt-1 text-xs text-zinc-500">
              No pudimos detectar tu ciudad. Prueba con los filtros de abajo.
            </p>
          )}
        </div>
      )}
      <div className="grid max-w-3xl gap-2 sm:grid-cols-3">
        <SearchableSelect
          options={countries}
          value={selected.pais}
          onChange={(pais) => onChange(pais, "", "")}
          placeholder="🌎 Todos los países"
          emptyLabel="🌎 Todos los países"
        />
        <SearchableSelect
          options={states}
          value={selected.depto}
          onChange={(depto) => onChange(selected.pais, depto, "")}
          placeholder="Todos los departamentos"
          emptyLabel="Todos los departamentos"
          disabled={!selected.pais}
        />
        <SearchableSelect
          options={cities}
          value={selected.ciudad}
          onChange={(ciudad) => onChange(selected.pais, selected.depto, ciudad)}
          placeholder="Todas las ciudades"
          emptyLabel="Todas las ciudades"
          disabled={!selected.pais}
        />
      </div>
    </div>
  );
}
