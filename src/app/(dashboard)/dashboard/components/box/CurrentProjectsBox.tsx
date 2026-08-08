import { getCurrentProjects } from "@/actions/dashboard/data/getTechnicianInfo";
import WorkOrderModal from "@/components/workorder-modal/WorkOrderModal";
import { cn } from "@/lib/cn"; // Ensure cn is imported
import { hasRouteAccess } from "@/lib/serverRouteGuard";
import { ExternalLink } from "lucide-react";
import moment from "moment-timezone";
import Link from "next/link";
import BoxRestricted from "./BoxRestricted";

type TCurrentProjectsBoxProps = {
  className?: string; // Accept className from parent (DashboardTechnician)
};

export default async function CurrentProjectsBox({
  className,
}: TCurrentProjectsBoxProps) {
  if (!(await hasRouteAccess("/dashboard/pipeline/shop/pipeline"))) {
    return (
      <BoxRestricted
        title="Current Projects"
        what="shop pipeline"
        className={className}
      />
    );
  }

  Intl.DateTimeFormat().resolvedOptions().timeZone;
  const projects = await getCurrentProjects();

  return (
    // Outer Container: Apply full Glassmorphism style and ensure flex-1 stretching
    <div
      className={cn(
        `
          flex flex-1 flex-col p-4 md:p-6 rounded-2xl transition-all duration-300 h-full

          // Glassmorphism aesthetic (Replacing old rounded-md p-6 shadow-lg)
          bg-white/50 dark:bg-slate-900/50
          backdrop-blur-md

          // Subtle border and lift
          ring-1 ring-slate-900/5 dark:ring-white/10
          shadow-lg dark:shadow-2xl dark:shadow-blue-900/20

          // Hover effect for interactivity
          hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-indigo-500/10

          overflow-hidden // Important for internal scrolling
        `,
        className,
      )}
    >
      {/* Box Title and Link */}
      <div className="mb-4 md:mb-6 flex items-center justify-between flex-shrink-0">
        <span className="text-xl font-bold text-slate-800 dark:text-slate-100">
          Current Projects
        </span>{" "}
        <Link
          href="/dashboard/pipeline/shop/pipeline"
          className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors"
        >
          <ExternalLink className="h-5 w-5" />
        </Link>
      </div>

      {/* List Container: Scrollable content */}
      <div className="custom-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto pr-2">
        {projects && projects.length > 0 ? (
          projects.map((project, idx) => (
            // Individual Project Item Redesign
            <div
              key={idx}
              className="flex flex-row items-start justify-between rounded-xl p-4 transition-all duration-200
                bg-slate-100/70 dark:bg-slate-800/70
                hover:bg-slate-200/70 dark:hover:bg-slate-700/70 shadow-sm border border-slate-200/50 dark:border-slate-800"
            >
              {/* Left Side: Vehicle Info & Services */}
              <div className="flex flex-col gap-1 w-1/2">
                <p className="font-extrabold text-base text-slate-900 dark:text-white">
                  {project.yearMakeModel || "N/A"}
                </p>
                <div className="flex flex-col text-sm text-slate-700 dark:text-slate-300">
                  {project.services.map((service, index) => (
                    <p key={index} className="opacity-85 truncate">
                      • {service.name}
                    </p>
                  ))}
                </div>
              </div>

              {/* Right Side: Actions & Payout/Dates */}
              <div className="flex flex-col gap-3 text-right text-sm w-1/2 pl-2 md:pl-4">
                {/* View Work Order Button (Top Right) */}
                <div className="w-full self-end">
                  <WorkOrderModal
                    invoiceId={project.id}
                    buttonChild={
                      <button className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3 py-2 md:px-4 md:py-2 font-semibold text-white transition-colors w-full md:w-auto text-xs md:text-sm">
                        View Work Order
                      </button>
                    }
                  />
                </div>

                {/* Financial/Date Details (Bottom Right) */}
                <div className="flex flex-col gap-0.5 text-slate-700 dark:text-slate-300">
                  {project.totalPayout ? (
                    <p className="font-bold text-base text-emerald-600 dark:text-emerald-400">
                      Payout: ${project.totalPayout}
                    </p>
                  ) : null}
                  <p className="text-xs font-medium">
                    Start:{" "}
                    {project.startDate
                      ? moment.utc(project.startDate).format("MM/DD/YYYY")
                      : "N/A"}
                  </p>
                  <p className="text-xs font-medium">
                    Due:{" "}
                    {project.dueDate
                      ? moment.utc(project.dueDate).format("MM/DD/YYYY")
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          // Empty State Redesign
          <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
            <span className="text-4xl mb-2" role="img" aria-label="toolbox">
              🛠️
            </span>
            <span className="text-lg font-semibold text-slate-700 dark:text-slate-200">
              No Active Projects
            </span>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Time to check in with management!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
