"use client";
import { acceptCompanyJoin } from "@/actions/communication/collaboration/acceptCompanyJoin";
import { rejectCompanyJoin } from "@/actions/communication/collaboration/rejectCompanyJoin";
import { CompanyCard } from "@/components/ui/companyCard";
import { Company } from "@prisma/client";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

type Props = {
  active: { company: Company; joinedAt: Date; joinId: number }[];
  pendingSent: { company: Company; createdAt: Date; joinId: number }[];
  pendingReceived: { company: Company; createdAt: Date; joinId: number }[];
  rejectSent: { company: Company; createdAt: Date; joinId: number }[];
  rejectReceived: { company: Company; createdAt: Date; joinId: number }[];
  currentCompanyId: number;
};

export function CollaborationsSection({
  active,
  pendingSent,
  pendingReceived,
  rejectSent,
  rejectReceived,
  currentCompanyId,
}: Props) {
  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-gray-600">Collaborations</h2>
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Active */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-gray-600">Active</h3>
            {active.length > 0 && (
              <span className="ml-auto text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                {active.length}
              </span>
            )}
          </div>
          {active.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-1">
              No active collaborations
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {active.map(({ company, joinId, joinedAt }) => (
                <CompanyCard
                  key={joinId}
                  company={company}
                  rightSlot={
                    <div className="text-right text-xs text-gray-500 shrink-0">
                      <p className="font-medium text-gray-600">Since</p>
                      <p>{formatDate(joinedAt)}</p>
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* Pending */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-gray-600">Pending</h3>
            {pendingSent.length + pendingReceived.length > 0 && (
              <span className="ml-auto text-xs font-medium px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                {pendingSent.length + pendingReceived.length}
              </span>
            )}
          </div>
          {pendingSent.length === 0 && pendingReceived.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-1">
              No pending requests
            </p>
          ) : (
            <div className="space-y-3">
              {pendingSent.length > 0 && (
                <>
                  <p className="text-xs font-medium text-gray-500 tracking-wide">
                    Sent by you
                  </p>
                  <div className="space-y-2">
                    {pendingSent.map((join) => (
                      <CompanyCard
                        key={join.joinId}
                        company={join.company}
                        rightSlot={
                          <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-600 rounded-full border border-amber-200 shrink-0 whitespace-nowrap">
                            Awaiting
                          </span>
                        }
                      />
                    ))}
                  </div>
                </>
              )}
              {pendingReceived.length > 0 && (
                <>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Received
                  </p>
                  <div className="space-y-2">
                    {pendingReceived.map(({ company, joinId }) => (
                      <CompanyCard
                        key={joinId}
                        company={company}
                        rightSlot={
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() =>
                                acceptCompanyJoin(joinId, currentCompanyId)
                              }
                              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() =>
                                rejectCompanyJoin(joinId, currentCompanyId)
                              }
                              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white transition"
                            >
                              Reject
                            </button>
                          </div>
                        }
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Rejected */}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-gray-600">Rejected</h3>
            {rejectSent.length + rejectReceived.length > 0 && (
              <span className="ml-auto text-xs font-medium px-2.5 py-0.5 rounded-full bg-red-100 text-red-600">
                {rejectSent.length + rejectReceived.length}
              </span>
            )}
          </div>
          {rejectSent.length === 0 && rejectReceived.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-1">
              No rejected collaborations
            </p>
          ) : (
            <div className="space-y-2">
              {rejectSent.map((join) => (
                <CompanyCard
                  key={join.joinId}
                  company={join.company}
                  rightSlot={
                    <span className="text-xs px-2.5 py-1 bg-red-50 text-red-500 rounded-full border border-red-200 shrink-0 whitespace-nowrap">
                      Rejected
                    </span>
                  }
                />
              ))}
              {rejectReceived.map(({ company, joinId }) => (
                <CompanyCard
                  key={joinId}
                  company={company}
                  rightSlot={
                    <button
                      onClick={() =>
                        acceptCompanyJoin(joinId, currentCompanyId)
                      }
                      className="text-xs font-medium px-3 py-1.5 rounded-lg bg-primary hover:bg-[#5864e5] text-white transition shrink-0"
                    >
                      Re-accept
                    </button>
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
