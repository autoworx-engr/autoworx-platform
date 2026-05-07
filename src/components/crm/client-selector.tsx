"use client";

import { cn } from "@/lib/utils";
import { Search, X, ChevronDown, Building2, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type ClientOption = { id: number; name: string; industry?: string | null; city?: string | null };
export type ContactOption = { id: number; firstName: string; lastName: string | null; accountId: number | null };

type Props = {
  clients: ClientOption[];
  contacts?: ContactOption[];
  /** Pre-selected IDs (for edit forms) */
  defaultClientId?: number;
  defaultContactId?: number;
  /** HTML name attr for the hidden accountId input */
  clientName?: string;
  /** HTML name attr for the hidden contactId input */
  contactName?: string;
  required?: boolean;
  /** Callback when client changes (e.g. to filter deals) */
  onClientChange?: (clientId: number | null) => void;
};

export function ClientSelector({
  clients,
  contacts,
  defaultClientId,
  defaultContactId,
  clientName = "accountId",
  contactName = "contactId",
  required = false,
  onClientChange,
}: Props) {
  const defaultClient = defaultClientId
    ? clients.find((c) => c.id === defaultClientId) ?? null
    : null;

  const [search, setSearch] = useState(defaultClient?.name ?? "");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ClientOption | null>(defaultClient);
  const [selectedContact, setSelectedContact] = useState<number | "">(defaultContactId ?? "");
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = search.trim()
    ? clients.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          (c.industry ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (c.city ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : clients;

  const filteredContacts = contacts
    ? selected
      ? contacts.filter((c) => c.accountId === selected.id)
      : contacts
    : [];

  function pick(client: ClientOption) {
    setSelected(client);
    setSearch(client.name);
    setOpen(false);
    setSelectedContact("");
    onClientChange?.(client.id);
  }

  function clear() {
    setSelected(null);
    setSearch("");
    setSelectedContact("");
    onClientChange?.(null);
  }

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (!selected) setSearch("");
      }
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, [selected]);

  return (
    <div className="space-y-3 sm:col-span-2">
      {/* Hidden input carries the value to the server action */}
      <input type="hidden" name={clientName} value={selected?.id ?? ""} />

      {/* Searchable account/client input */}
      <div ref={containerRef} className="relative">
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm",
            open
              ? "border-primary ring-2 ring-primary/20"
              : "border-border",
          )}
        >
          <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={required ? "Select client — required" : "Search client…"}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {selected ? (
            <button
              type="button"
              onClick={clear}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Clear client"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
          )}
        </div>

        {open && (
          <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">No clients match.</p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => pick(c)}
                  className={cn(
                    "flex w-full items-start gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted",
                    selected?.id === c.id && "bg-primary/5",
                  )}
                >
                  <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{c.name}</p>
                    {(c.industry || c.city) && (
                      <p className="text-[11px] text-muted-foreground">
                        {[c.industry, c.city].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Contact sub-selector — only shown when contacts prop is provided */}
      {contacts && contacts.length > 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
          <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <select
            name={contactName}
            value={selectedContact}
            onChange={(e) => setSelectedContact(e.target.value === "" ? "" : Number(e.target.value))}
            className="flex-1 bg-transparent text-sm text-foreground outline-none"
          >
            <option value="">Contact (optional)</option>
            {filteredContacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName ?? ""}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}

/* ── Stand-alone employee/user picker ─────────────────────────────────── */

export type EmployeeOption = {
  id: number;
  firstName: string;
  lastName: string | null;
  employeeType: string;
};

export function EmployeeSelector({
  employees,
  defaultId,
  name = "ownerId",
  placeholder = "Assign employee",
  required = false,
}: {
  employees: EmployeeOption[];
  defaultId?: number;
  name?: string;
  placeholder?: string;
  required?: boolean;
}) {
  const defaultEmp = defaultId ? employees.find((e) => e.id === defaultId) ?? null : null;
  const [search, setSearch] = useState(
    defaultEmp ? `${defaultEmp.firstName} ${defaultEmp.lastName ?? ""}`.trim() : "",
  );
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<EmployeeOption | null>(defaultEmp);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = search.trim()
    ? employees.filter(
        (e) =>
          `${e.firstName} ${e.lastName ?? ""}`.toLowerCase().includes(search.toLowerCase()) ||
          e.employeeType.toLowerCase().includes(search.toLowerCase()),
      )
    : employees;

  function pick(emp: EmployeeOption) {
    setSelected(emp);
    setSearch(`${emp.firstName} ${emp.lastName ?? ""}`.trim());
    setOpen(false);
  }

  useEffect(() => {
    function onOutsideClick(ev: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(ev.target as Node)) {
        setOpen(false);
        if (!selected) setSearch("");
      }
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, [selected]);

  return (
    <div ref={containerRef} className="relative sm:col-span-2">
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm",
          open ? "border-primary ring-2 ring-primary/20" : "border-border",
        )}
      >
        <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={required ? `${placeholder} — required` : placeholder}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
        {selected && (
          <button type="button" onClick={() => { setSelected(null); setSearch(""); }} className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">No employees match.</p>
          ) : (
            filtered.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => pick(e)}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted",
                  selected?.id === e.id && "bg-primary/5",
                )}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  {e.firstName[0]}{e.lastName?.[0] ?? ""}
                </div>
                <div>
                  <p className="font-medium">{e.firstName} {e.lastName ?? ""}</p>
                  <p className="text-[11px] text-muted-foreground">{e.employeeType}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
