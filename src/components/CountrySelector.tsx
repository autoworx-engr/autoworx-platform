"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import CustomSelector from "./CustomSelector";

type CountryOption = { id: string; title: string; flagUrl?: string | null; code?: string | null };

type CountrySelectorProps = {
  name?: string;
  value?: string | number;
  onChange?: (value: string) => void;
  label?: React.ReactNode;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  isClear?: boolean;
  isSearch?: boolean;
  rootClassName?: string;
  labelClassName?: string;
  error?: string;
};

async function fetchCountries(): Promise<CountryOption[]> {
  const res = await fetch(
    "https://restcountries.com/v3.1/all?fields=name,cca2,cca3,flags,idd",
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error("Failed to load countries");
  const data = await res.json();

  const opts: CountryOption[] = (data || [])
    .map((c: any) => {
      const id = c.cca2 || c.cca3 || (c.name && c.name.common) || "";
      const title = c.name?.common || id;
      const flagUrl = c.flags?.svg || c.flags?.png || null;
      const root = c.idd?.root || "";
      const suffix = Array.isArray(c.idd?.suffixes) && c.idd.suffixes.length > 0 ? c.idd.suffixes[0] : "";
      const code = root ? `${root}${suffix}` : undefined;
      return { id: id?.toString(), title, flagUrl, code };
    })
    .filter((o: CountryOption) => !!o.id && !!o.title)
    .sort((a: CountryOption, b: CountryOption) =>
      a.title.localeCompare(b.title)
    );

  return opts;
}

export default function CountrySelector({
  name = "country",
  value,
  onChange,
  label,
  placeholder = "Select a country",
  required,
  disabled = false,
  isClear = true,
  isSearch = true,
  rootClassName,
  labelClassName,
  error,
}: CountrySelectorProps) {
  const queryResult = useQuery({
    queryKey: ["countries"],
    queryFn: fetchCountries,
    staleTime: 1000 * 60 * 60 * 24, // keep for 24h
  });

  const data = queryResult.data as CountryOption[] | undefined;
  const isLoading = queryResult.isLoading;
  const isError = queryResult.isError;

  const options = (data ?? []) as CountryOption[];

  return (
    <CustomSelector
      name={name}
      label={label}
      options={options}
      value={value}
      onChange={onChange}
      placeholder={isLoading ? "Loading countries..." : isError ? "Failed to load countries" : placeholder}
      required={required}
      disabled={disabled || isLoading || isError}
      isClear={isClear}
      isSearch={isSearch}
      rootClassName={rootClassName}
      labelClassName={labelClassName}
      error={error}
    />
  );
}
