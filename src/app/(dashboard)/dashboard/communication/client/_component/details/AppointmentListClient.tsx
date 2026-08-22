"use client";

import React, { useEffect, useMemo, useState } from "react";
import moment from "moment";
import { AppointmentCreateOrEdit } from "@/components/appointment/AppointmentCreateOrEdit";
import { Appointment } from "@prisma/client";
import AppointMentCard from "./AppointMentCard";
import { pusher } from "@/lib/pusher/client";
import { useClientCommunicationStore } from "@/stores/client-store";

export default function AppointmentListClient({
  appointments: initialAppointments,
  companyId,
  clientId,
}: {
  appointments: Appointment[];
  companyId: number;
  clientId: number;
}) {
  const [appointments, setAppointments] = useState<Appointment[]>(
    initialAppointments || [],
  );
  const [appointmentModalId, setAppointmentModalId] = useState<number | null>(
    null,
  );
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const setUpcomingAppointmentCount = useClientCommunicationStore(
    (state) => state.setUpcomingAppointmentCount,
  );

  useEffect(() => {
    setAppointments(initialAppointments || []);
  }, [initialAppointments]);

  const removeAppointment = (id?: number) => {
    if (!id) return;
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  };

  // realtime: drop the appointment from the list when an admin deletes it
  useEffect(() => {
    const channelName = `appointment-${companyId}-${clientId}`;
    const channel = pusher.subscribe(channelName);
    const handleDeleted = (data: { id: number }) => {
      removeAppointment(data?.id);
    };
    channel.bind("appointment-deleted", handleDeleted);
    return () => {
      channel.unbind("appointment-deleted", handleDeleted);
      pusher.unsubscribe(channelName);
    };
  }, [companyId, clientId]);

  const now = moment();

  const getStartEnd = (a: Appointment) => {
    const dateStr = moment.utc(a.date).format("YYYY-MM-DD");
    return {
      start: moment(`${dateStr} ${a.startTime}`, "YYYY-MM-DD HH:mm"),
      end: moment(`${dateStr} ${a.endTime}`, "YYYY-MM-DD HH:mm"),
    };
  };

  const current = useMemo(() => {
    return (appointments || []).filter((a) => {
      try {
        const { start, end } = getStartEnd(a);
        return now.isBetween(start, end, null, "[]");
      } catch (err) {
        return false;
      }
    });
  }, [appointments]);
  const upcoming = useMemo(() => {
    return (appointments || [])
      .filter((a) => {
        try {
          return getStartEnd(a).start.isAfter(now);
        } catch (err) {
          return false;
        }
      })
      .sort(
        (x, y) =>
          getStartEnd(x).start.valueOf() - getStartEnd(y).start.valueOf(),
      );
  }, [appointments]);

  // Publish the visible (current + upcoming) count so the tab badge matches
  // exactly what is rendered here — no need to recompute it elsewhere.
  useEffect(() => {
    setUpcomingAppointmentCount(current.length + upcoming.length);
  }, [current.length, upcoming.length, setUpcomingAppointmentCount]);

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
        onAppointmentDeleted={removeAppointment}
      />
    </section>
  );
}
