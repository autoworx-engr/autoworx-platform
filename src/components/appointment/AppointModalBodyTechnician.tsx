import { DialogClose, DialogContent, DialogFooter } from "@/components/Dialog";
import useAppointmentQueryById from "@/hooks/query-hook/useAppointmentQueryById";
import { Calendar, Car, Clock, User } from "lucide-react";
import moment from "moment-timezone";
import { useEffect, useState } from "react";

export function AppointModalBodyTechnician({
  appointmentId,
}: {
  appointmentId: number;
}) {
  const {
    data: appointment,
    isError,
    isFetched: appointmentIsFetch,
    isLoading,
  } = useAppointmentQueryById(appointmentId!, {
    enabled: !!appointmentId,
  });

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  if (isLoading || !appointmentIsFetch || !isMounted) {
    return (
      <DialogContent className="backdrop-blur-xl bg-white/30 dark:bg-slate-900/30 ring-1 ring-slate-900/5 p-6 rounded-2xl shadow-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
        </div>
      </DialogContent>
    );
  }

  if (isError || !appointment) {
    return (
      <DialogContent className="backdrop-blur-xl bg-white/30 dark:bg-slate-900/30 ring-1 ring-red-500/20 p-6 rounded-2xl shadow-lg">
        <p className="text-red-500 dark:text-red-400 font-medium">
          Failed to load appointment details.
        </p>
      </DialogContent>
    );
  }

  const client = appointment.client;
  const vehicle = appointment.vehicle;

  return (
    <DialogContent
      className={`transition-all duration-300 ease-in-out transform ${
        isMounted ? "opacity-100 scale-100" : "opacity-0 scale-95"
      } backdrop-blur-xl bg-gradient-to-br from-white/40 via-slate-50/50 to-white/40 dark:from-slate-900/40 dark:via-slate-800/50 dark:to-slate-900/40 ring-1 ring-slate-900/5 p-6 rounded-2xl shadow-lg max-h-[90vh] overflow-y-auto`}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            {appointment.title}
          </h2>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="text-blue-500" size={18} />
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {moment.utc(appointment?.date).format("Do MMMM YYYY")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="text-amber-500" size={18} />
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {moment(appointment.startTime, "HH:mm").format("hh:mm A")} To{" "}
              {moment(appointment.endTime, "HH:mm").format("hh:mm A")}
            </span>
          </div>
        </div>

        {/* Client Info */}
        <div className="p-4 rounded-xl bg-white/50 dark:bg-slate-800/50 ring-1 ring-slate-900/5 backdrop-blur-sm transition-all hover:shadow-purple-500/20 hover:shadow-md hover:-translate-y-0.5">
          <div className="flex items-center gap-3">
            <User className="text-teal-500" size={20} />
            <div>
              <p className="font-medium text-slate-900 dark:text-white">
                {client?.firstName} {client?.lastName}
              </p>
            </div>
          </div>
        </div>

        {/* Vehicle Info */}
        {vehicle && (
          <div className="p-4 rounded-xl bg-white/50 dark:bg-slate-800/50 ring-1 ring-slate-900/5 backdrop-blur-sm transition-all hover:shadow-emerald-500/20 hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center gap-3">
              <Car className="text-rose-500" size={20} />
              <div>
                <p className="font-medium text-slate-900 dark:text-white">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {appointment.notes && (
          <div className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            <p className="font-medium">Notes:</p>
            <p>{appointment.notes}</p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <DialogFooter className="mt-6 flex justify-end gap-3">
        <DialogClose asChild>
          <button
            type="button"
            className="px-4 py-2 rounded-lg font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 hover:scale-[1.02] hover:shadow-blue-500/30 hover:shadow-md"
          >
            Done
          </button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
}
