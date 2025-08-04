import { Appointment, Client, User, Vehicle } from "@prisma/client";
import moment from "moment";
import Link from "next/link";

type TAppointmentDetailsProps = {
  appointment: Appointment & {
    client?: Client;
    appointmentUsers: { user: User[] }[];
    vehicle?: Vehicle;
  };
};

export default async function AppointmentDetails({
  appointment,
}: TAppointmentDetailsProps) {
  const start = moment(appointment.startTime, "HH:mm");
  const end = moment(appointment.endTime, "HH:mm");
  const date = moment.utc(appointment?.date)?.format("Do MMMM YYYY");

  const assignedUsers = appointment.appointmentUsers.flatMap(
    (appointmentUser) => appointmentUser.user
  );

  return (
    <Link
      href={`/dashboard/task/day?date=${moment.utc(appointment?.date).format("YYYY-MM-DD")}`}
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
              {appointment.vehicle?.year || ""} {appointment.vehicle?.make}{" "}
              {appointment.vehicle?.model} {appointment.vehicle?.other}
            </p>
          </div>
        )}
        {assignedUsers.length > 0 && (
          <p>
            Assigned to :{" "}
            {assignedUsers.map((assigned: any, idx: any) => (
              <span key={idx}>
                {assigned.firstName} {assigned.lastName}{" "}
                {idx !== assignedUsers.length - 1 && ", "}
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
    </Link>
  );
}
