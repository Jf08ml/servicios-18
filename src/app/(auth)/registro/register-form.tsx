"use client";

import { useActionState, useRef, useState } from "react";
import { registerAction, type AuthState } from "../actions";
import { getStatesAction, getCitiesAction } from "@/lib/geo-actions";
import { SubmitButton } from "@/components/submit-button";
import { SearchableSelect } from "@/components/searchable-select";
import { input, label } from "@/lib/ui";

type GeoOption = { code: string; name: string };
type CountryOption = GeoOption & { phonecode: string };

const DEFAULT_COUNTRY = "CO";

export function RegisterForm({
  countries,
  initialStates,
}: {
  countries: CountryOption[];
  initialStates: GeoOption[];
}) {
  const [state, formAction] = useActionState<AuthState, FormData>(registerAction, {});
  const [role, setRole] = useState<"WORKER" | "CLIENT" | "AGENCY">("CLIENT");
  const isAgency = role === "AGENCY";
  const phoneRequired = role !== "CLIENT";

  const defaultCountry = countries.find((c) => c.code === DEFAULT_COUNTRY);
  const defaultPhone = defaultCountry ? `${defaultCountry.phonecode} ` : "";

  // Inputs controlados: React 19 resetea los <form action={...}> sin controlar
  // tras cada submit (incluso si la acción solo devuelve un error), así que
  // sin esto se borraba todo lo escrito cada vez que fallaba la validación.
  const [values, setValues] = useState({
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
    birthDate: "",
    phone: defaultPhone,
  });
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [country, setCountry] = useState(defaultCountry ? DEFAULT_COUNTRY : "");
  const [stateCode, setStateCode] = useState("");
  const [city, setCity] = useState("");
  const [states, setStates] = useState<GeoOption[]>(initialStates);
  const [cities, setCities] = useState<GeoOption[]>([]);
  // Último indicativo autocompletado, para poder reemplazarlo al cambiar de
  // país sin pisar un número que la persona ya haya empezado a escribir.
  const lastAutoPhone = useRef(defaultPhone);

  function set<K extends keyof typeof values>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }));
  }

  async function onCountryChange(code: string) {
    setCountry(code);
    setStateCode("");
    setCity("");
    setCities([]);
    setStates(code ? await getStatesAction(code) : []);

    const selected = countries.find((c) => c.code === code);
    const newPrefix = selected ? `${selected.phonecode} ` : "";
    setValues((v) => {
      if (!v.phone.trim() || v.phone === lastAutoPhone.current) {
        lastAutoPhone.current = newPrefix;
        return { ...v, phone: newPrefix };
      }
      return v;
    });
  }

  async function onStateChange(code: string) {
    setStateCode(code);
    setCity("");
    setCities(code ? await getCitiesAction(country, code) : []);
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <span className={label}>Quiero registrarme como</span>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["CLIENT", "Cliente", "Busco perfiles verificados"],
              ["WORKER", "Profesional", "Ofrezco servicios de forma independiente"],
              ["AGENCY", "Agencia", "Gestiono el catálogo de varias profesionales"],
            ] as const
          ).map(([value, title, desc]) => (
            <label
              key={value}
              className={`cursor-pointer rounded-xl border p-3 transition ${
                role === value
                  ? "border-fuchsia-500 bg-fuchsia-950/40"
                  : "border-zinc-700 bg-zinc-900 hover:border-zinc-500"
              }`}
            >
              <input
                type="radio"
                name="role"
                value={value}
                checked={role === value}
                onChange={() => setRole(value)}
                className="sr-only"
              />
              <span className="block text-sm font-semibold text-white">{title}</span>
              <span className="mt-0.5 block text-xs text-zinc-400">{desc}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="displayName" className={label}>
          {isAgency ? "Nombre de la agencia" : "Nombre o alias público"}
        </label>
        <input
          id="displayName"
          name="displayName"
          required
          maxLength={60}
          value={values.displayName}
          onChange={set("displayName")}
          className={input}
        />
        {!isAgency && (
          <p className="mt-1 text-xs text-zinc-500">
            Puedes usar un alias para proteger tu privacidad.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="email" className={label}>
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={values.email}
          onChange={set("email")}
          className={input}
        />
        <p className="mt-1.5 rounded-lg border border-emerald-900/60 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-200/90">
          🔒 Cero correos: no enviamos promociones, boletines ni notificaciones.
          Tu correo solo sirve para iniciar sesión y nunca se comparte.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="password" className={label}>
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={values.password}
            onChange={set("password")}
            className={input}
          />
        </div>
        <div>
          <label htmlFor="confirmPassword" className={label}>
            Confirmar
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={set("confirmPassword")}
            className={input}
          />
        </div>
      </div>

      <div>
        <label htmlFor="birthDate" className={label}>
          Fecha de nacimiento
        </label>
        <input
          id="birthDate"
          name="birthDate"
          type="date"
          required
          value={values.birthDate}
          onChange={set("birthDate")}
          className={input}
        />
      </div>

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
        <label htmlFor="phone" className={label}>
          Teléfono{" "}
          <span className="text-zinc-500">
            {phoneRequired ? "(nunca es público)" : "(opcional, nunca es público)"}
          </span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required={phoneRequired}
          maxLength={20}
          value={values.phone}
          onChange={set("phone")}
          className={input}
        />
      </div>

      <label className="flex items-start gap-2 text-sm text-zinc-300">
        <input
          type="checkbox"
          name="acceptTerms"
          required
          checked={acceptTerms}
          onChange={(e) => setAcceptTerms(e.target.checked)}
          className="mt-0.5 accent-fuchsia-600"
        />
        <span>
          Declaro que soy mayor de 18 años y acepto los términos de uso y la
          política de privacidad.
        </span>
      </label>

      {state.error && (
        <p className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <SubmitButton className="w-full inline-flex items-center justify-center rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-500 disabled:opacity-50">
        Crear cuenta
      </SubmitButton>
    </form>
  );
}
