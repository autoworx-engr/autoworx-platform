"use client";

import React, { useMemo, useState } from "react";
import moment from "moment";
import { AppointmentCreateOrEdit } from "@/components/appointment/AppointmentCreateOrEdit";
import { Appointment } from "@prisma/client";
import AppointMentCard from "./AppointMentCard";

export default function AppointmentListClient({
  appointments,
}: {
  appointments: Appointment[];
}) {
  const [appointmentModalId, setAppointmentModalId] = useState<number | null>(
    null,
  );
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);

  const now = moment();
  const startOfToday = moment().startOf("day");

  const current = useMemo(() => {
    return (appointments || []).filter((a) => {
      try {
        const dateStr = moment.utc(a.date).format("YYYY-MM-DD");
        const start = moment(`${dateStr} ${a.startTime}`, "YYYY-MM-DD HH:mm");
        const end = moment(`${dateStr} ${a.endTime}`, "YYYY-MM-DD HH:mm");
        return now.isBetween(start, end, null, "[]");
      } catch (err) {
        return false;
      }
    });
  }, [appointments]);
  const upcoming = useMemo(() => {
    const currentIds = new Set(current.map((a) => a.id));
    return (appointments || [])
      .filter(
        (a) =>
          moment.utc(a.date).startOf("day").valueOf() >=
            startOfToday.valueOf() && !currentIds.has(a.id),
      )
      .sort(
        (x, y) => moment.utc(x.date).valueOf() - moment.utc(y.date).valueOf(),
      );
  }, [appointments]);

  const openEditor = (id: number) => {
    setAppointmentModalId(id);
    setIsAppointmentModalOpen(true);
  };

  return (
    <section className="rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-sm transition-colors dark:border-white/10 dark:bg-zinc-900/60">
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">
          Appointments
        </h3>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
          {Number(current?.length) + Number(upcoming?.length) || 0}
        </span>
      </header>

      <div className="space-y-3">
        {current && current.length > 0 && (
          <AppointMentCard
            appointment={current}
            openEditor={openEditor}
            title="Current"
          />
        )}

        {upcoming && upcoming.length > 0 ? (
          <AppointMentCard
            appointment={upcoming}
            openEditor={openEditor}
            title="Upcoming"
          />
        ) : (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            No upcoming appointments.
          </p>
        )}
      </div>

      <AppointmentCreateOrEdit
        fromEdit
        appointmentId={appointmentModalId ?? undefined}
        isModalOpen={isAppointmentModalOpen}
        setIsModalOpen={setIsAppointmentModalOpen}
      />
    </section>
  );
}
