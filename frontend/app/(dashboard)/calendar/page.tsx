"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";

interface DayData {
  pnl: number;
  trades: number;
}

interface Trade {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: string;
  entryPrice: string;
  exitPrice: string | null;
  realizedPnl: string | null;
  rMultiple: string | null;
  entryTime: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth() + 1); // 1-12
  const [data, setData] = useState<Record<string, DayData>>({});
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dayTrades, setDayTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  // Load calendar data when month/year changes
  useEffect(() => {
    setLoading(true);
    setSelectedDay(null);
    api
      .get(`/analytics/calendar?year=${year}&month=${month}`)
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [year, month]);

  // Load trades when a day is selected
  useEffect(() => {
    if (!selectedDay) {
      setDayTrades([]);
      return;
    }
    const from = `${selectedDay}T00:00:00.000Z`;
    const to = `${selectedDay}T23:59:59.999Z`;
    api
      .get(`/trades?from=${from}&to=${to}&limit=100`)
      .then((r) => setDayTrades(r.data.items));
  }, [selectedDay]);

  function prevMonth() {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  function goToday() {
    const t = new Date();
    setYear(t.getUTCFullYear());
    setMonth(t.getUTCMonth() + 1);
  }

  // Build the grid
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const lastDay = new Date(Date.UTC(year, month, 0));
  const daysInMonth = lastDay.getUTCDate();
  const startWeekday = firstDay.getUTCDay(); // 0=Sun

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  // Monthly totals
  const monthPnl = Object.values(data).reduce((a, d) => a + d.pnl, 0);
  const monthTrades = Object.values(data).reduce((a, d) => a + d.trades, 0);
  const greenDays = Object.values(data).filter((d) => d.pnl > 0).length;
  const redDays = Object.values(data).filter((d) => d.pnl < 0).length;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Calendar</h1>
          <p className="text-slate-400 mt-1">
            Daily P&L at a glance — click a day to see its trades
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToday}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium text-white">
          {MONTHS[month - 1]} {year}
        </h2>
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-slate-500">Month P&L: </span>
            <span
              className={`font-medium ${
                monthPnl >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {monthPnl >= 0 ? "+" : ""}${monthPnl.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Trades: </span>
            <span className="text-slate-300">{monthTrades}</span>
          </div>
          <div>
            <span className="text-emerald-400">{greenDays}W</span>
            <span className="text-slate-500"> / </span>
            <span className="text-rose-400">{redDays}L</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {/* Weekday header */}
        <div className="grid grid-cols-7 border-b border-slate-800">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="py-3 text-center text-xs uppercase text-slate-500 font-medium"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (day === null) {
              return (
                <div
                  key={`empty-${i}`}
                  className="aspect-square border-r border-b border-slate-800/50 bg-slate-950/30"
                />
              );
            }

            const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(
              day
            ).padStart(2, "0")}`;
            const dayData = data[dateKey];
            const pnl = dayData?.pnl ?? 0;
            const trades = dayData?.trades ?? 0;

            let bg = "bg-slate-900 hover:bg-slate-800";
            let text = "text-slate-300";
            if (trades > 0) {
              if (pnl > 0) {
                bg = "bg-emerald-500/10 hover:bg-emerald-500/20";
                text = "text-emerald-300";
              } else if (pnl < 0) {
                bg = "bg-rose-500/10 hover:bg-rose-500/20";
                text = "text-rose-300";
              } else {
                bg = "bg-slate-800/50 hover:bg-slate-800";
                text = "text-slate-300";
              }
            }

            const isSelected = selectedDay === dateKey;
            const isToday =
              year === now.getUTCFullYear() &&
              month === now.getUTCMonth() + 1 &&
              day === now.getUTCDate();

            return (
              <button
                key={dateKey}
                onClick={() => setSelectedDay(isSelected ? null : dateKey)}
                className={`aspect-square border-r border-b border-slate-800/50 p-2 text-left flex flex-col justify-between transition ${bg} ${
                  isSelected ? "ring-2 ring-emerald-500 ring-inset" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm ${
                      isToday
                        ? "bg-emerald-500 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium"
                        : "text-slate-400"
                    }`}
                  >
                    {day}
                  </span>
                  {trades > 0 && (
                    <span className="text-[10px] text-slate-500">{trades}t</span>
                  )}
                </div>
                {trades > 0 && (
                  <div className={`text-sm font-medium ${text}`}>
                    {pnl >= 0 ? "+" : ""}${pnl.toFixed(0)}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day trades */}
      {selectedDay && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">
              Trades on{" "}
              {new Date(selectedDay + "T12:00:00Z").toLocaleDateString(
                undefined,
                { weekday: "long", month: "long", day: "numeric", year: "numeric" }
              )}
            </h3>
            <button
              onClick={() => setSelectedDay(null)}
              className="text-slate-400 hover:text-white text-sm"
            >
              Close
            </button>
          </div>
          {dayTrades.length === 0 ? (
            <p className="p-8 text-center text-slate-500">
              No trades on this day
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-800/50 text-slate-400">
                <tr>
                  <th className="text-left px-4 py-3">Symbol</th>
                  <th className="text-left px-4 py-3">Side</th>
                  <th className="text-right px-4 py-3">Qty</th>
                  <th className="text-right px-4 py-3">Entry</th>
                  <th className="text-right px-4 py-3">Exit</th>
                  <th className="text-right px-4 py-3">P&L</th>
                  <th className="text-right px-4 py-3">R</th>
                </tr>
              </thead>
              <tbody>
                {dayTrades.map((t) => {
                  const pnl = t.realizedPnl ? Number(t.realizedPnl) : null;
                  return (
                    <tr key={t.id} className="border-t border-slate-800">
                      <td className="px-4 py-3 font-medium text-white">
                        {t.symbol}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            t.side === "BUY"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-rose-500/10 text-rose-400"
                          }`}
                        >
                          {t.side}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {Number(t.quantity)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        ${Number(t.entryPrice).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {t.exitPrice ? `$${Number(t.exitPrice).toFixed(2)}` : "—"}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-medium ${
                          pnl == null
                            ? "text-slate-400"
                            : pnl >= 0
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }`}
                      >
                        {pnl == null
                          ? "—"
                          : `${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-400">
                        {t.rMultiple ? `${Number(t.rMultiple)}R` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}