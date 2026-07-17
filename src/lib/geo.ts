import "server-only";
import { Country, State, City } from "country-state-city";

export type GeoOption = { code: string; name: string };

const collator = new Intl.Collator("es");

/** Países ordenados alfabéticamente (Colombia primero por ser el mercado principal). */
export function listCountries(): GeoOption[] {
  const all = Country.getAllCountries()
    .map((c) => ({ code: c.isoCode, name: c.name }))
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
