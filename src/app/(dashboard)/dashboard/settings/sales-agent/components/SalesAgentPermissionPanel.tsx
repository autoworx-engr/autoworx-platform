"use client";

import {
  useCompanyClients,
  useCompanySalesAgent,
  useToggleClientSalesAgent,
  useToggleCompanySalesAgent,
} from "@/hooks/sales-agent/useSalesAgentPermission";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Loader2, Shield, Users } from "lucide-react";
import { useMemo, useState } from "react";

interface Props {
  companyId: number;
}

export default function SalesAgentPermissionPanel({ companyId }: Props) {
  const [search, setSearch] = useState("");

  const { data: company, isLoading: companyLoading } =
    useCompanySalesAgent(companyId);

  const { data: clients = [], isLoading: clientsLoading } =
    useCompanyClients(companyId);

  const toggleCompany = useToggleCompanySalesAgent();
  const toggleClient = useToggleClientSalesAgent();

  const filteredClients = useMemo(() => {
    if (!search) return clients;
    return clients.filter((c: any) =>
      `${c.firstName} ${c.lastName || ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
  }, [clients, search]);

  return (
    <Card className="">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          Sales Agent Permission
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Company Toggle */}
        <div className="flex items-center justify-between gap-3 rounded-lg border p-3 bg-white">
          <div className="min-w-0">
            <p className="text-sm font-medium">Company Access</p>
            <p className="text-xs text-muted-foreground">
              Master control for all clients
            </p>
          </div>

          {companyLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Switch
              checked={company?.isSalesAgent ?? false}
              onCheckedChange={(checked) =>
                toggleCompany.mutate({
                  companyId,
                  isSalesAgent: checked,
                })
              }
              disabled={toggleCompany.isPending}
            />
          )}
        </div>

        {/* Client Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">Client Permissions</p>
          </div>

          {/* Search */}
          <Input
            placeholder="Search Clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* Client List */}
          <div className="max-h-96 overflow-y-auto overflow-x-hidden space-y-2 pr-1">
            {clientsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading clients...
              </div>
            ) : filteredClients.length === 0 ? (
              <p className="text-xs text-muted-foreground">No clients found</p>
            ) : (
              filteredClients.map((client: any) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between gap-3 rounded-md border p-2 bg-white"
                >
                  <div className="min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      title={`${client.firstName} ${client.lastName || ""}`.trim()}
                    >
                      {client.firstName} {client.lastName || ""}
                    </p>
                    {/* <p className="text-xs text-muted-foreground">
                      {client.email || client.mobile || "No contact info"}
                    </p> */}
                  </div>

                  <Switch
                    checked={client.isSalesAgent}
                    disabled={toggleClient.isPending || !company?.isSalesAgent}
                    onCheckedChange={(checked) =>
                      toggleClient.mutate({
                        clientId: client.id,
                        isSalesAgent: checked,
                      })
                    }
                  />
                </div>
              ))
            )}
          </div>

          {!company?.isSalesAgent && (
            <p className="text-xs text-red-500">
              Company permission is OFF. Enable company access to allow client
              overrides.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
