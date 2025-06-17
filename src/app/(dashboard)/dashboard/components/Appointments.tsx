import { Vehicle } from "@prisma/client";
import moment from "moment";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaExternalLinkAlt } from "react-icons/fa";

const Appointments = ({ appointments, fullHeight }: any) => {
  return (
    <div className="flex-1 overflow-y-hidden p-6 shadow-md">
      <div className="h-full">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xl font-bold">Appointments</span>{" "}
          <Link href="/dashboard/task/day">
            <FaExternalLinkAlt />
          </Link>
        </div>
        <div className="custom-scrollbar flex h-full flex-1 flex-col space-y-4 overflow-x-hidden pb-4">
          {appointments.map((appointment: any, idx: any) => (
            <AppointmentDetails appointment={appointment} key={idx} />
          ))}
          {appointments.length === 0 && (
            <span className="my-auto self-center text-center">
              You have no upcoming appointments
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const AppointmentDetails = ({ appointment }: any) => {
  const start = moment(appointment.startTime, "HH:mm");
  const end = moment(appointment.endTime, "HH:mm");
  const date = moment.utc(appointment?.date)?.format("Do MMMM YYYY");
  const router = useRouter();

  return (
    <div
      onClick={() => {
        router.push(
          `/dashboard/task/day?date=${moment.utc(appointment?.date).format("YYYY-MM-DD")}`,
        );
      }}
      className="flex cursor-pointer rounded-md border border-gray-400 py-4 pl-4 pr-2 text-sm"
    >
      <div className="w-[98%]">
        <h1 className="font-semibold">
          {appointment.title.length > 20
            ? appointment.title.slice(0, 20) + "..."
            : appointment.title}
        </h1>
        {appointment.client && (
          <div>
            <p className="">
              Client : {appointment.client.firstName}{" "}
              {appointment.client.lastName}
            </p>
          </div>
        )}
        {appointment.vehicle && (
          <div>
            <p>
              {appointment.vehicle?.year} {appointment.vehicle?.make}{" "}
              {appointment.vehicle?.model}{" "}
            </p>
          </div>
        )}
        {appointment.assignedUsers.length > 0 && (
          <p>
            Assigned to :{" "}
            {appointment.assignedUsers.map((assigned: any, idx: any) => (
              <span key={idx}>
                {assigned.firstName} {assigned.lastName}{" "}
                {idx !== appointment.assignedUsers.length - 1 && ", "}
              </span>
            ))}
          </p>
        )}
        {appointment.startTime && (
          <p className="mt-4">
            {`${start.format("h:mm A")} - ${end.format("h:mm A")}`}
          </p>
        )}
        {appointment?.date && <p className="font-semibold">{date}</p>}
        {appointment?.notes && (
          <p className="font-semibold">
            Note:{" "}
            {appointment.notes.length > 40
              ? appointment.notes.slice(0, 40) + "..."
              : appointment.notes}
          </p>
        )}
      </div>
      <div className="w-[1%] rounded-full bg-[#6571FF]"></div>
    </div>
  );
};

export default Appointments;
