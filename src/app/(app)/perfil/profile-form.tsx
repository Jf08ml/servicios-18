"use client";

import { useState, useActionState } from "react";
import {
  updateProfileAction,
  getStatesAction,
  getCitiesAction,
  type ProfileFormState,
} from "./actions";
import { SubmitButton } from "@/components/submit-button";
import { SearchableSelect } from "@/components/searchable-select";
import { input, label } from "@/lib/ui";

type GeoOption = { code: string; name: string };

export function ProfileForm({
  isWorker,
  defaults,
  countries,
  initialStates,
  initialCities,
  action = updateProfileAction,
  workerId,
}: {
  isWorker: boolean;
  defaults: {
    bio: string;
    languages: string;
    visible: boolean;
    country: string;
    state: string;
    city: string;
  };
  countries: GeoOption[];
  initialStates: GeoOption[];
  initialCities: GeoOption[];
  /** Server Action a enlazar; por defecto edita el perfil de la sesión actual. */
  action?: (prev: ProfileFormState, formData: FormData) => Promise<ProfileFormState>;
  /** Si se usa desde el panel de una agencia, id de la trabajadora gestionada. */
  workerId?: string;
}) {
  const [state, formAction] = useActionState<ProfileFormState, FormData>(action, {});

  const [country, setCountry] = useState(defaults.country);
  const [stateCode, setStateCode] = useState(defaults.state);
  const [city, setCity] = useState(defaults.city);
  const [states, setStates] = useState<GeoOption[]>(initialStates);
  const [cities, setCities] = useState<GeoOption[]>(initialCities);

  async function onCountryChange(code: string) {
    setCountry(code);
    setStateCode("");
    setCity("");
    setCities([]);
    setStates(code ? await getStatesAction(code) : []);
  }

  async function onStateChange(code: string) {
    setStateCode(code);
    setCity("");
    setCities(code ? await getCitiesAction(country, code) : []);
  }

  return (
    <form action={formAction} className="space-y-4">
      {workerId && <input type="hidden" name="workerId" value={workerId} />}
      <div>
        <label htmlFor="photo" className={label}>
          Foto de perfil
        </label>
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className={input + " file:mr-3 file:rounded file:border-0 file:bg-zinc-700 file:px-3 file:py-1 file:text-xs file:text-white"}
        />
      </div>

      {isWorker && (
        <div>
          <label htmlFor="bio" className={label}>
            Presentación
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={4}
            maxLength={1000}
            defaultValue={defaults.bio}
            placeholder="Cuéntale a tus clientes quién eres, tu experiencia y tu estilo de trabajo…"
            className={input}
          />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="country" className={label}>
            País
          </label>
          <SearchableSelect
            id="country"
            name="country"
            options={countries}
            value={country}
            onChange={onCountryChange}
            placeholder="Busca tu país…"
            emptyLabel="Sin especificar"
          />
        </div>
        <div>
          <label htmlFor="state" className={label}>
            Departamento
          </label>
          <SearchableSelect
            id="state"
            name="state"
            options={states}
            value={stateCode}
            onChange={onStateChange}
            placeholder="Busca tu departamento…"
            emptyLabel="Sin especificar"
            disabled={!country}
          />
        </div>
        <div>
          <label htmlFor="city" className={label}>
            Ciudad
          </label>
          <SearchableSelect
            id="city"
            name="city"
            options={cities}
            value={city}
            onChange={setCity}
            placeholder="Busca tu ciudad…"
            emptyLabel="Sin especificar"
            disabled={!stateCode}
          />
        </div>
      </div>

      <div>
        <label htmlFor="languages" className={label}>
          Idiomas
        </label>
        <input
          id="languages"
          name="languages"
          maxLength={120}
          defaultValue={defaults.languages}
          placeholder="Español, Inglés…"
          className={input}
        />
      </div>

      {isWorker && (
        <label className="flex items-start gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            name="visible"
            defaultChecked={defaults.visible}
            className="mt-0.5 accent-fuchsia-600"
          />
          <span>
            Mostrar mi perfil en el directorio público de la plataforma.
            <span className="block text-xs text-zinc-500">
              Si lo desactivas, nadie podrá encontrarte ni agendar contigo (modo privacidad).
            </span>
          </span>
        </label>
      )}

      {state.error && (
        <p className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-lg border border-emerald-800 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          ✓ Perfil actualizado
        </p>
      )}

      <SubmitButton>Guardar cambios</SubmitButton>
    </form>
  );
}
