"use client";

import { useEffect, useRef, useState } from "react";
import { input as inputCls } from "@/lib/ui";

export type SelectOption = { code: string; name: string };

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Select con buscador: se escribe para filtrar las opciones y se elige con
 * clic o teclado (↑ ↓ Enter Esc). Si recibe `name`, expone el valor elegido
 * en un input oculto para formularios.
 */
export function SearchableSelect({
  id,
  name,
  options,
  value,
  onChange,
  placeholder,
  emptyLabel,
  disabled = false,
}: {
  id?: string;
  name?: string;
  options: SelectOption[];
  value: string;
  onChange: (code: string) => void;
  placeholder: string;
  /** Texto de la opción que limpia la selección (p. ej. "Todos los países"). */
  emptyLabel?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.code === value);
  const filtered = query
    ? options.filter((o) => norm(o.name).includes(norm(query)))
    : options;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function pick(code: string) {
    onChange(code);
    setQuery("");
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[active]) pick(filtered[active].code);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <div ref={rootRef} className="relative">
      {name !== undefined && <input type="hidden" name={name} value={value} />}
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        autoComplete="off"
        disabled={disabled}
        placeholder={selected ? selected.name : placeholder}
        value={open ? query : (selected?.name ?? "")}
        onFocus={() => {
          setOpen(true);
          setQuery("");
          setActive(0);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          if (!open) setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className={inputCls + " pr-8 disabled:opacity-50"}
      />
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
        {open ? "▲" : "▼"}
      </span>

      {open && !disabled && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl shadow-black/40"
        >
          {emptyLabel && !query && (
            <li
              role="option"
              aria-selected={!value}
              onMouseDown={(e) => {
                e.preventDefault();
                pick("");
              }}
              className="cursor-pointer px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800"
            >
              {emptyLabel}
            </li>
          )}
          {filtered.map((o, i) => (
            <li
              key={o.code}
              role="option"
              aria-selected={o.code === value}
              data-active={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(o.code);
              }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-1.5 text-sm ${
                i === active
                  ? "bg-fuchsia-600/20 text-fuchsia-200"
                  : o.code === value
                    ? "text-fuchsia-300"
                    : "text-zinc-200"
              }`}
            >
              {o.name}
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-sm text-zinc-500">Sin resultados para “{query}”</li>
          )}
        </ul>
      )}
    </div>
  );
}
