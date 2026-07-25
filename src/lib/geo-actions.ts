"use server";

import { db } from "./db";
import { listStates, listCities, findNearestCity, type GeoOption } from "./geo";
import { VISIBLE_WORKER_PROFILE } from "@/components/worker-catalog";

/** Opciones en cascada para los selects de ubicación (perfil y registro). */
export async function getStatesAction(countryCode: string): Promise<GeoOption[]> {
  return listStates(countryCode);
}

export async function getCitiesAction(
  countryCode: string,
  stateCode: string
): Promise<GeoOption[]> {
  return listCities(countryCode, stateCode);
}

export type NearestCity = { countryCode: string; stateCode: string; city: string };

/**
 * Dado unas coordenadas del navegador (botón "cerca de mí" del catálogo),
 * busca la ciudad con perfiles visibles más cercana. No llama a ningún
 * servicio externo: compara contra la latitud/longitud de country-state-city.
 */
export async function findNearestCityAction(lat: number, lon: number): Promise<NearestCity | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const rows = await db.profile.findMany({
    where: VISIBLE_WORKER_PROFILE,
    select: { countryCode: true, stateCode: true, city: true },
    distinct: ["countryCode", "stateCode", "city"],
  });
  const candidates = rows.filter(
    (r): r is NearestCity => !!r.countryCode && !!r.stateCode && !!r.city
  );

  return findNearestCity(lat, lon, candidates);
}
