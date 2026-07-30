"use client";
import { ArrowRight, Check, Info, Sparkles, X } from "lucide-react";
import React from "react";

// Helper to format feature keys
const formatFeatureKey = (key: string) => {
  return key
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

interface PricePlansProps {
  setClose: () => void;
  onPlanSelect: (plan: any) => void;
  currentPlanId: string | null;
  plans: any[];
}

export function PricePlans({
  setClose,
  onPlanSelect,
  currentPlanId,
  plans,
}: PricePlansProps) {
  const sortedPlans = React.useMemo(() => {
    return [...plans].sort((a, b) => {
      const aCustom = !!a.companyId;
      const bCustom = !!b.companyId;
      if (aCustom === bCustom)
        return (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
      return aCustom ? 1 : -1;
    });
  }, [plans]);

  return (
    <section className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-7xl max-h-[90vh] overflow-hidden rounded-[2.5rem] bg-white/90 dark:bg-slate-950/80 backdrop-blur-2xl ring-1 ring-slate-900/10 dark:ring-white/10 shadow-2xl flex flex-col">
        {/* Header Section: Professional & Clean */}
        <div className="px-10 py-8 flex justify-between items-center border-b border-slate-200/50 dark:border-slate-800/50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-[#00b8b0] to-[#0098da] text-white">
                <Sparkles size={18} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Upgrade your Workshop
              </h2>
            </div>
            <p className="text-slate-500 text-sm">
              Unlock advanced automation and professional management tools.
            </p>
            <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Free trial included on eligible plans
            </p>
          </div>
          <button
            onClick={setClose}
            className="p-3 bg-slate-100 dark:bg-slate-900 rounded-2xl transition-all duration-300 hover:rotate-90 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Plan Grid */}
        <div className="p-8 lg:p-10 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sortedPlans.map((plan) => {
              const isCurrent = plan.id === currentPlanId;
              const intervalLabel =
                String(plan.interval || "MONTHLY").toUpperCase() === "YEARLY"
                  ? "/yr"
                  : "/mo";
              const trialLabel = plan.trialLengthDays
                ? `${plan.trialLengthDays}-month free trial included`
                : null;

              return (
                <div
                  key={plan.id}
                  className={`group relative flex flex-col rounded-[2rem] p-8 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01] ${
                    isCurrent
                      ? "bg-white dark:bg-slate-900 ring-2 ring-[#00b8b0] shadow-xl shadow-[#00b8b0]/10"
                      : "bg-slate-50/50 dark:bg-slate-900/40 ring-1 ring-slate-200 dark:ring-slate-800 hover:ring-[#00b8b0]/30 hover:shadow-2xl hover:shadow-slate-900/5"
                  }`}
                >
                  {/* Subtle Background Glow on Hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-[2rem] bg-gradient-to-br from-[#00b8b0]/5 to-transparent" />

                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                          {isCurrent ? "Current Plan" : "Subscription"}
                        </span>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                          {plan.name}
                        </h3>
                      </div>
                      {isCurrent && (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Active
                        </span>
                      )}
                    </div>

                    <div className="mb-8">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                          ${plan.price}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400 font-medium">
                          {intervalLabel}
                        </span>
                      </div>
                      {trialLabel && (
                        <p className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          {trialLabel}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => onPlanSelect(plan)}
                      disabled={isCurrent}
                      className={`group/btn relative w-full overflow-hidden py-4 rounded-2xl font-bold text-sm transition-all duration-300 active:scale-95 mb-10 ${
                        isCurrent
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default"
                          : "bg-gradient-to-r from-[#00b8b0] to-[#0098da] text-white shadow-lg shadow-[#00b8b0]/25 hover:shadow-[#00b8b0]/40"
                      }`}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {isCurrent ? "Running Plan" : "Select Plan"}
                        {!isCurrent && (
                          <ArrowRight
                            size={16}
                            className="group-hover/btn:translate-x-1 transition-transform"
                          />
                        )}
                      </span>
                      {/* Shimmer Effect */}
                      {!isCurrent && (
                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000" />
                      )}
                    </button>

                    {/* Feature List Section */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Capabilities
                        </span>
                        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
                      </div>

                      <ul className="space-y-4">
                        {plan.features
                          .filter(
                            (feature: any) =>
                              !String(feature.featureKey || "")
                                .toLowerCase()
                                .startsWith("automation_limit_"),
                          )
                          .map((feature: any) => {
                            const isEnabled =
                              feature.type === "BOOLEAN"
                                ? feature.value === "true"
                                : true;

                            return (
                              <li
                                key={feature.id}
                                className="group/item flex items-start gap-3"
                              >
                                <div
                                  className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-lg flex items-center justify-center transition-all duration-300 ${
                                    isEnabled
                                      ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20"
                                      : "bg-slate-100 dark:bg-slate-800/50 text-slate-400 ring-1 ring-slate-200 dark:ring-slate-700"
                                  }`}
                                >
                                  {isEnabled ? (
                                    <Check size={12} strokeWidth={3} />
                                  ) : (
                                    <Check size={12} className="opacity-20" />
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <p
                                    className={`text-[13px] font-medium leading-tight transition-colors ${
                                      isEnabled
                                        ? "text-slate-700 dark:text-slate-200"
                                        : "text-slate-400"
                                    }`}
                                  >
                                    {formatFeatureKey(feature.featureKey)}
                                  </p>
                                  {feature.type !== "BOOLEAN" && isEnabled && (
                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                      {feature.value.trim() === "-1" ? (
                                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 px-2 py-0.5 rounded-md uppercase">
                                          Unlimited
                                        </span>
                                      ) : (
                                        feature.value
                                          .split(",")
                                          .map((item: string, idx: number) => (
                                            <span
                                              key={idx}
                                              className="text-[10px] font-semibold text-[#00b8b0] bg-[#00b8b0]/10 px-2 py-0.5 rounded-md uppercase"
                                            >
                                              {item.trim()}
                                            </span>
                                          ))
                                      )}
                                    </div>
                                  )}
                                </div>

                                {feature.description && (
                                  <div className="opacity-0 group-hover/item:opacity-100 transition-opacity">
                                    <Info
                                      size={14}
                                      className="text-slate-400 cursor-help"
                                    />
                                  </div>
                                )}
                              </li>
                            );
                          })}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subtle Footer info */}
        <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50 text-center border-t border-slate-200/50 dark:border-slate-800/50">
          <p className="text-xs text-slate-600 font-medium">
            Need a custom enterprise solution?{" "}
            <a
              href="mailto:info@autoworx.tech"
              className="text-primary hover:underline"
            >
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
