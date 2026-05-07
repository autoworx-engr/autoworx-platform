import { createDeal } from "@/actions/crm/deals";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DealStage, EmployeeType } from "@prisma/client";

export type NewDealAccountOption = { id: number; name: string };
export type NewDealContactOption = {
  id: number;
  firstName: string;
  lastName: string | null;
};
export type NewDealEmployeeOption = {
  id: number;
  firstName: string;
  lastName: string | null;
  employeeType: EmployeeType;
};

const FULL_STAGE_ORDER: DealStage[] = [
  DealStage.LEAD,
  DealStage.QUALIFIED,
  DealStage.PROPOSAL,
  DealStage.NEGOTIATION,
  DealStage.WON,
  DealStage.LOST,
];

const STAGE_LABEL: Record<DealStage, string> = {
  [DealStage.LEAD]: "Lead",
  [DealStage.QUALIFIED]: "Qualified",
  [DealStage.PROPOSAL]: "Proposal",
  [DealStage.NEGOTIATION]: "Negotiation",
  [DealStage.WON]: "Won",
  [DealStage.LOST]: "Lost",
};

const TYPE_ICON: Record<EmployeeType, string> = {
  Admin:      "🛡",
  Manager:    "👔",
  Sales:      "💼",
  Technician: "🔧",
  Other:      "👤",
};

type Props = {
  accounts: NewDealAccountOption[];
  contacts: NewDealContactOption[];
  employees?: NewDealEmployeeOption[];
  /** Stages shown in the stage dropdown */
  stages?: DealStage[];
  defaultStage?: DealStage;
  title?: string;
  description?: string;
};

export function NewDealCard({
  accounts,
  contacts,
  employees = [],
  stages = FULL_STAGE_ORDER,
  defaultStage = DealStage.LEAD,
  title = "New deal",
  description = "Select a client, optional contact, and assign an owner.",
}: Props) {
  return (
    <Card className="mb-8 shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={createDeal} className="grid max-w-2xl gap-3 sm:grid-cols-2">
          <input
            name="title"
            required
            placeholder="Deal name"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 placeholder:text-muted-foreground sm:col-span-2"
          />
          <select
            name="accountId"
            required
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 sm:col-span-2"
          >
            <option value="">Client — required</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select
            name="contactId"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 sm:col-span-2"
            defaultValue=""
          >
            <option value="">No contact</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName ?? ""}
              </option>
            ))}
          </select>
          {/* Employee / owner picker grouped by type */}
          {employees.length > 0 ? (
            <select
              name="ownerId"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 sm:col-span-2"
              defaultValue=""
            >
              <option value="">Assign owner (optional)</option>
              {(["Manager", "Sales", "Admin", "Technician", "Other"] as EmployeeType[]).map(
                (type) => {
                  const group = employees.filter((e) => e.employeeType === type);
                  if (group.length === 0) return null;
                  return (
                    <optgroup key={type} label={`${TYPE_ICON[type]} ${type}`}>
                      {group.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.firstName} {e.lastName ?? ""}
                        </option>
                      ))}
                    </optgroup>
                  );
                },
              )}
            </select>
          ) : null}
          <input
            name="value"
            type="number"
            step="0.01"
            min="0"
            placeholder="Value"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 placeholder:text-muted-foreground"
          />
          <input
            name="probability"
            type="number"
            step="1"
            min="0"
            max="100"
            placeholder="Win % (optional)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 placeholder:text-muted-foreground"
          />
          <select
            name="stage"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 sm:col-span-2"
            defaultValue={defaultStage}
          >
            {stages.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABEL[s]}
              </option>
            ))}
          </select>
          <input
            name="source"
            placeholder="Lead source (optional)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 placeholder:text-muted-foreground sm:col-span-2"
          />
          <textarea
            name="description"
            placeholder="Summary (optional)"
            rows={2}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 placeholder:text-muted-foreground sm:col-span-2"
          />
          <div className="sm:col-span-2">
            <Button type="submit">Add deal</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
