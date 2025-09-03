import {
  CurrentProject,
  getCurrentProjects,
} from "@/actions/dashboard/data/getTechnicianInfo";
import WorkOrderModal from "@/components/workorder-modal/WorkOrderModal";
import moment from "moment-timezone";
import Link from "next/link";
import React from "react";
import { FaExternalLinkAlt } from "react-icons/fa";
import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";

export default async function CurrentProjectsBox() {
  const companyTimezone = await getCompanyTimezone();
  const timezone =
    companyTimezone?.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;
  const projects = await getCurrentProjects();

  return (
    <div className="flex flex-1 flex-col rounded-md p-6 shadow-lg">
      <div className="mb-8 flex items-center justify-between">
        <span className="text-xl font-bold">Current Projects</span>{" "}
        <Link href="/dashboard/pipeline/shop/pipeline">
          <FaExternalLinkAlt />
        </Link>
      </div>
      <div className="custom-scrollbar flex flex-1 flex-col space-y-4">
        {projects &&
          projects.length > 0 &&
          projects.map((project, idx) => (
            <div
              key={idx}
              className="flex items-stretch justify-between rounded border border-gray-400 px-4 py-6 text-sm"
            >
              <div>
                <p className="font-semibold">
                  {project.yearMakeModel || "N/A"}
                </p>
                <div>
                  {project.services.map((service, index) => (
                    <p key={index}>{service.name}</p>
                  ))}
                </div>
              </div>
              <div className="flex flex-col justify-between">
                <div className="#mb-auto">
                  <WorkOrderModal
                    invoiceId={project.id}
                    buttonChild={
                      <button className="rounded bg-[#6571FF] px-4 py-1 text-white">
                        View Work Order
                      </button>
                    }
                  />
                </div>
                <div className="#mt-auto">
                  {project.totalPayout ? (
                    <p className="font-semibold">
                      Total Payout : ${project.totalPayout}
                    </p>
                  ) : null}
                  <p className="font-semibold">
                    Start Date :{" "}
                    {project.startDate
                      ? moment
                          .utc(project.startDate)
                          .tz(timezone)
                          .format("MM/DD/YYYY")
                      : "N/A"}
                  </p>
                  <p className="font-semibold">
                    Due Date :{" "}
                    {project.dueDate
                      ? moment
                          .utc(project.dueDate)
                          .tz(timezone)
                          .format("MM/DD/YYYY")
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        {projects?.length === 0 && (
          <div className="my-auto text-center">No current projects</div>
        )}
      </div>
    </div>
  );
}
