"use client";
import moment from "moment";
import { LuCalendarX2 } from "react-icons/lu";

export default function AppointmentDetails({
  appointments,
}: {
  appointments: any;
}) {
  const inputDate = new Date();
  inputDate.setHours(0, 0, 0, 0);

  const filteredAppointments = appointments.filter((a: any) => {
    return new Date(a.date) >= inputDate;
  });

  return (
    <div className="p-1">
      {/* Today's Real Date */}
      {/* <h1 className="mb-2 text-[16px] font-bold">
        {moment().format("dddd, MMMM Do, YYYY")}
      </h1> */}
      <h2 className="my-4 text-base font-semibold text-gray-900">
        Appointments for
      </h2>

      {filteredAppointments?.length > 0 ? (
        filteredAppointments.map((appointment: any) => {
          const start = moment(appointment.startTime, "HH:mm");
          const end = moment(appointment.endTime, "HH:mm");
          const date = moment.utc(appointment?.date)?.format("Do MMMM YYYY");

          return (
            <div
              key={appointment?.id}
              className="mb-4 flex justify-between rounded-md border-r-4 border-[#6571FF] bg-background p-3 shadow-md"
            >
              {/* Left: Client Info */}
              <div className="w-1/2 text-wrap">
                <p className="text-lg font-semibold text-gray-900">
                  {appointment?.title}
                </p>
                <p className="text-sm leading-tight text-gray-500">
                  Client:{" "}
                  {appointment?.client?.firstName &&
                  appointment?.client?.lastName
                    ? `${appointment.client.firstName} ${appointment.client.lastName}`
                    : "N/A"}
                </p>

                <p className="text-sm text-gray-500">
                  Email:{" "}
                  <a
                    href={`mailto:${appointment.client?.email}`}
                    className="w-full break-all text-sm text-blue-500"
                  >
                    {appointment.client?.email || "N/A"}
                  </a>
                </p>
                <p className="text-sm text-gray-500">
                  Phone:{" "}
                  <a
                    href={`tel:${appointment.client?.mobile}`}
                    className="cursor-pointer text-sm text-blue-500"
                  >
                    {appointment.client?.mobile || "N/A"}
                  </a>
                </p>
              </div>

              {/* Right: Assigned By & Time */}
              <div className="w-1/2 text-wrap text-right">
                <h2 className="w-full break-all text-sm font-medium text-gray-800">
                  Assigned To:{" "}
                  {appointment.assignedUsers &&
                  appointment.assignedUsers.length > 0
                    ? appointment.assignedUsers
                        .map(
                          (user: any) =>
                            `${user?.firstName ?? ""} ${user?.lastName ?? ""}`,
                        )
                        .join(", ")
                    : "N/A"}
                </h2>
                <p className="mt-[6px] text-sm text-gray-600">
                  {`${start.format("h:mm A")} - ${end.format("h:mm A")}`}
                </p>
                {appointment?.date && (
                  <p className="mt-2 text-sm font-semibold text-gray-600">
                    {date}
                  </p>
                )}
              </div>
            </div>
          );
        })
      ) : (
        <div className="mt-10 flex flex-col items-center justify-center text-center">
          <LuCalendarX2 className="mb-4 h-12 w-12 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-700">
            No appointments found
          </h3>
          <p className="text-sm text-gray-500">
            You're all caught up for today!
          </p>
        </div>
      )}
    </div>
  );
}
