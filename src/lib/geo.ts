import "server-only";
import { Country, State, City } from "country-state-city";

export type GeoOption = { code: string; name: string };
export type CountryOption = GeoOption & { phonecode: string };

const collator = new Intl.Collator("es");

/** Países ordenados alfabéticamente (Colombia primero por ser el mercado principal). */
export function listCountries(): CountryOption[] {
  const all = Country.getAllCountries()
    .map((c) => ({
      code: c.isoCode,
      name: c.name,
      phonecode: c.phonecode.startsWith("+") ? c.phonecode : `+${c.phonecode}`,
    }))
    .sort((a, b) => collator.compare(a.name, b.name));
  const co = all.find((c) => c.code === "CO");
  return co ? [co, ...all.filter((c) => c.code !== "CO")] : all;
}

/** Departamentos/estados de un país. */
export function listStates(countryCode: string): GeoOption[] {
  return State.getStatesOfCountry(countryCode)
    .map((s) => ({ code: s.isoCode, name: s.name }))
    .sort((a, b) => collator.compare(a.name, b.name));
}

/** Ciudades de un departamento/estado. */
export function listCities(countryCode: string, stateCode: string): GeoOption[] {
  return City.getCitiesOfState(countryCode, stateCode)
    .map((c) => ({ code: c.name, name: c.name }))
    .sort((a, b) => collator.compare(a.name, b.name));
}

export function countryName(code: string): string | null {
  return Country.getCountryByCode(code)?.name ?? null;
}

export function stateName(countryCode: string, stateCode: string): string | null {
  return State.getStateByCodeAndCountry(stateCode, countryCode)?.name ?? null;
}

/** Valida que la ciudad exista en el departamento indicado. */
export function cityExists(countryCode: string, stateCode: string, city: string): boolean {
  return City.getCitiesOfState(countryCode, stateCode).some((c) => c.name === city);
}

export type ResolvedGeo = {
  countryCode: string | null;
  countryName: string | null;
  stateCode: string | null;
  stateName: string | null;
  city: string | null;
};

/**
 * Valida país/departamento/ciudad en cascada contra la librería (cada nivel
 * exige el anterior) y devuelve los códigos junto con los nombres
 * denormalizados que se guardan en Profile. Usado por el registro y por la
 * edición de perfil para no duplicar la validación.
 */
export function resolveGeo(
  countryCode: string,
  stateCode: string,
  city: string
): { error: string } | ResolvedGeo {
  const geo: ResolvedGeo = {
    countryCode: null,
    countryName: null,
    stateCode: null,
    stateName: null,
    city: null,
  };
  if (!countryCode) return geo;

  const cName = countryName(countryCode);
  if (!cName) return { error: "País inválido" };
  geo.countryCode = countryCode;
  geo.countryName = cName;

  if (!stateCode) return geo;
  const sName = stateName(countryCode, stateCode);
  if (!sName) return { error: "Departamento inválido" };
  geo.stateCode = stateCode;
  geo.stateName = sName;

  if (!city) return geo;
  if (!cityExists(countryCode, stateCode, city)) return { error: "Ciudad inválida" };
  geo.city = city;
  return geo;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export type CityCandidate = { countryCode: string; stateCode: string; city: string };

/**
 * De entre las ciudades candidatas (normalmente las que ya tienen perfiles
 * visibles), devuelve la más cercana a unas coordenadas usando la latitud/
 * longitud de country-state-city — sin llamar a ningún servicio externo de
 * geocodificación.
 */
export function findNearestCity(
  lat: number,
  lon: number,
  candidates: CityCandidate[]
): CityCandidate | null {
  let best: CityCandidate | null = null;
  let bestDist = Infinity;
  for (const candidate of candidates) {
    const match = City.getCitiesOfState(candidate.countryCode, candidate.stateCode).find(
      (c) => c.name === candidate.city
    );
    if (!match) continue;
    const dist = haversineKm(lat, lon, Number(match.latitude), Number(match.longitude));
    if (dist < bestDist) {
      bestDist = dist;
      best = candidate;
    }
  }
  return best;
}
