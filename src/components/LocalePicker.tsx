"use client";

import { useMemo, useState } from "react";
import {
  COUNTRIES,
  flagFromCode,
  listTimeZones,
} from "@/lib/locales";

function PickerList({
  labelledBy,
  children,
}: {
  labelledBy: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="listbox"
      aria-labelledby={labelledBy}
      className="locale-picker-list mt-2 max-h-64 overflow-y-auto rounded-2xl border border-ink/[0.08] bg-transparent p-1.5"
    >
      {children}
    </div>
  );
}

function PickerRow({
  selected,
  onSelect,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left font-display text-[17px] font-semibold leading-snug text-ink ${
        selected ? "locale-picker-row-on" : "hover:bg-ink/[0.04]"
      }`}
    >
      {children}
    </button>
  );
}

export function LocalePicker({
  country,
  timeZone,
  onCountry,
  onTimeZone,
}: {
  country: string;
  timeZone: string;
  onCountry: (code: string) => void;
  onTimeZone: (zone: string) => void;
}) {
  const [countryQuery, setCountryQuery] = useState("");
  const [zoneQuery, setZoneQuery] = useState("");
  const countries = useMemo(() => {
    const query = countryQuery.trim().toLowerCase();
    if (!query) return COUNTRIES;
    return COUNTRIES.filter(
      (row) =>
        row.name.toLowerCase().includes(query) ||
        row.code.toLowerCase().includes(query),
    );
  }, [countryQuery]);
  const zones = useMemo(() => {
    const all = listTimeZones();
    const query = zoneQuery.trim().toLowerCase().replace(/\s+/g, "_");
    if (!query) return all;
    return all.filter((zone) => zone.toLowerCase().includes(query));
  }, [zoneQuery]);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <p id="locale-country-label" className="font-semibold text-ink">
          Country
        </p>
        <input
          value={countryQuery}
          onChange={(event) => setCountryQuery(event.target.value)}
          placeholder="Search countries"
          className="field mt-2 w-full rounded-2xl bg-transparent px-4 py-3 text-sm text-ink"
        />
        <PickerList labelledBy="locale-country-label">
          {countries.map((row) => (
            <PickerRow
              key={row.code}
              selected={row.code === country}
              onSelect={() => {
                onCountry(row.code);
                onTimeZone(row.timeZone);
              }}
            >
              <span className="text-[1.35rem] leading-none" aria-hidden>
                {flagFromCode(row.code)}
              </span>
              <span>{row.name}</span>
            </PickerRow>
          ))}
        </PickerList>
      </div>
      <div>
        <p id="locale-zone-label" className="font-semibold text-ink">
          Time zone
        </p>
        <input
          value={zoneQuery}
          onChange={(event) => setZoneQuery(event.target.value)}
          placeholder="Search every IANA zone"
          className="field mt-2 w-full rounded-2xl bg-transparent px-4 py-3 text-sm text-ink"
        />
        <PickerList labelledBy="locale-zone-label">
          {timeZone && !zones.includes(timeZone) ? (
            <PickerRow selected onSelect={() => onTimeZone(timeZone)}>
              {timeZone.replaceAll("_", " ")}
            </PickerRow>
          ) : null}
          {zones.map((zone) => (
            <PickerRow
              key={zone}
              selected={zone === timeZone}
              onSelect={() => onTimeZone(zone)}
            >
              {zone.replaceAll("_", " ")}
            </PickerRow>
          ))}
        </PickerList>
      </div>
    </div>
  );
}
