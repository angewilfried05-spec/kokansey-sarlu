import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  format,
  addMonths,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";

interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  color: string;
}

interface CalendarProps {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  events: CalendarEvent[];
  onEventClick?: (id: string) => void;
}

const weekDays = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];

export default function Calendar({ currentMonth, onMonthChange, events, onEventClick }: CalendarProps) {
  const days = useMemo(() => {
    return eachDayOfInterval({
      start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }),
      end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 }),
    });
  }, [currentMonth]);

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [days]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      const date = new Date(event.date);
      days.forEach((day) => {
        if (isSameDay(date, day)) {
          const key = day.toISOString();
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(event);
        }
      });
    });
    return map;
  }, [events, days]);

  const getDayEvents = (day: Date) => eventsByDay.get(day.toISOString()) || [];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-black text-gray-800 dark:text-white uppercase tracking-tight">
          {format(currentMonth, "MMMM yyyy", { locale: fr })}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => onMonthChange(subMonths(currentMonth, 1))}
            className="p-2 rounded-xl bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-primary/10 hover:text-primary transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => onMonthChange(addMonths(currentMonth, 1))}
            className="p-2 rounded-xl bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-primary/10 hover:text-primary transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekDays.map((d) => (
          <div key={d} className="text-center text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500">
            {d}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-2">
            {week.map((day) => {
              const dayEvents = getDayEvents(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[80px] sm:min-h-[100px] p-2 rounded-2xl border transition-all ${
                    isCurrentMonth
                      ? "bg-gray-50/50 dark:bg-slate-700/30 border-gray-100 dark:border-slate-700"
                      : "bg-transparent border-transparent text-gray-300 dark:text-slate-600"
                  }`}
                >
                  <div className={`text-xs font-bold mb-1 ${isCurrentMonth ? "text-gray-700 dark:text-slate-300" : "text-gray-300 dark:text-slate-600"}`}>
                    {format(day, "d")}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {dayEvents.map((event) => (
                      <button
                        key={event.id}
                        title={event.title}
                        onClick={() => onEventClick?.(event.id)}
                        className={`w-full text-left px-2 py-1 rounded-lg text-[10px] font-bold truncate hover:opacity-80 transition-opacity ${event.color}`}
                      >
                        {event.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
