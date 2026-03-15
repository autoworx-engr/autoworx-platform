import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';


import { ArrowLeft, ArrowRight, CalendarDays, Clock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays, isSameDay, isAfter, startOfDay, getDay } from 'date-fns';
import { useBooking } from '../../context/BookingContext';
import { mockExistingBookings } from '../../data/mock-services';
import { TimeSlot } from '../../data/types';
import { Calendar } from '@/components/ui/calendar';

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const DateTimeSelection = () => {
  const { setStep, selectedDate, setSelectedDate, selectedSlot, setSelectedSlot, settings, cartDurationMinutes } = useBooking();
  const [showSlots, setShowSlots] = useState(false);

  const isDateDisabled = (date: Date) => {
    if (date < startOfDay(new Date())) return true;
    const dayName = dayNames[getDay(date)];
    const dayConfig = settings.dayAvailability.find(d => d.day === dayName);
    if (!dayConfig || !dayConfig.enabled) return true;

    // Check if fully booked
    const dateStr = format(date, 'yyyy-MM-dd');
    const existing = mockExistingBookings.find(b => b.date === dateStr);
    if (existing) {
      const totalSlots = generateTimeSlotsForDay(dayConfig.startTime, dayConfig.endTime);
      const available = totalSlots.filter(s => !existing.slots.includes(s.time));
      if (available.length === 0) return true;
    }
    return false;
  };

  const findNextAvailable = () => {
    let check = addDays(new Date(), 1);
    for (let i = 0; i < 60; i++) {
      if (!isDateDisabled(check)) {
        setSelectedDate(check);
        setShowSlots(true);
        return;
      }
      check = addDays(check, 1);
    }
  };

  const generateTimeSlotsForDay = (start: string, end: string): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    const interval = settings.slotIntervalMinutes;

    for (let m = startMin; m + cartDurationMinutes <= endMin; m += interval) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      const time = `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      const period = h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening';
      const label = `${h > 12 ? h - 12 : h}:${min.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
      slots.push({ time, label, period, available: true });
    }
    return slots;
  };

  const timeSlots = useMemo(() => {
    if (!selectedDate) return [];
    const dayName = dayNames[getDay(selectedDate)];
    const dayConfig = settings.dayAvailability.find(d => d.day === dayName);
    if (!dayConfig || !dayConfig.enabled) return [];
    
    const slots = generateTimeSlotsForDay(dayConfig.startTime, dayConfig.endTime);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const existing = mockExistingBookings.find(b => b.date === dateStr);
    
    return slots.map(s => ({
      ...s,
      available: existing ? !existing.slots.includes(s.time) : true,
    }));
  }, [selectedDate, settings, cartDurationMinutes]);

  const grouped = useMemo(() => {
    const groups: Record<string, TimeSlot[]> = { Morning: [], Afternoon: [], Evening: [] };
    timeSlots.forEach(s => groups[s.period].push(s));
    return groups;
  }, [timeSlots]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    setSelectedSlot(null);
    setShowSlots(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => { setStep('services'); setShowSlots(false); }}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pick a Date & Time</h2>
          <p className="text-sm text-muted-foreground">Select when you'd like your appointment</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Calendar */}
        <div className="flex flex-col items-center">
          <Calendar
            mode="single"
            selected={selectedDate ?? undefined}
            onSelect={handleDateSelect}
            disabled={isDateDisabled}
            className="p-3 pointer-events-auto rounded-xl border bg-card"
          />
          <Button variant="outline" size="sm" className="mt-3 gap-1.5 text-xs" onClick={findNextAvailable}>
            <Zap className="w-3.5 h-3.5" /> Next Available Appointment
          </Button>
        </div>

        {/* Time Slots */}
        <div className="space-y-4">
          {showSlots && selectedDate ? (
            <>
              <div className="flex items-center gap-2 text-sm font-medium">
                <CalendarDays className="w-4 h-4 text-primary" />
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </div>
              {Object.entries(grouped).map(([period, slots]) => {
                if (slots.length === 0) return null;
                return (
                  <div key={period} className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> {period}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {slots.map(slot => (
                        <button
                          key={slot.time}
                          disabled={!slot.available}
                          onClick={() => setSelectedSlot(slot)}
                          className={cn(
                            'px-3 py-2 rounded-lg text-xs font-medium transition-all',
                            slot.available && selectedSlot?.time !== slot.time && 'bg-muted hover:bg-secondary text-foreground',
                            selectedSlot?.time === slot.time && 'bg-primary text-primary-foreground shadow-md',
                            !slot.available && 'bg-muted/40 text-muted-foreground/40 cursor-not-allowed line-through',
                          )}
                        >
                          {slot.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {timeSlots.filter(s => s.available).length === 0 && (
                <div className="text-center py-8 space-y-3">
                  <p className="text-sm text-muted-foreground">No available slots on this day.</p>
                  <Button variant="outline" size="sm" onClick={findNextAvailable} className="gap-1.5">
                    <Zap className="w-3.5 h-3.5" /> Find Next Available
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
              Select a date to see available times
            </div>
          )}
        </div>
      </div>

      {selectedSlot && (
        <div className="flex justify-end">
          <Button size="lg" className="gap-2" onClick={() => setStep('checkout')}>
            Continue to Checkout <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
