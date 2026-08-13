"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  archiveWindow,
  etDateString,
  isSelectableArchiveDate,
  shiftYmd,
} from "@/lib/archive-window";
import { FREE_ARCHIVE_LOOKBACK_DAYS } from "@/lib/plans";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function monthLabel(cursor: string) {
  const [year, month] = cursor.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function daysInMonth(cursor: string) {
  const [year, month] = cursor.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const startPad = first.getDay();
  const lastDate = new Date(year, month, 0).getDate();
  const cells: Array<string | null> = Array.from({ length: startPad }, () => null);
  for (let day = 1; day <= lastDate; day += 1) {
    cells.push(
      `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    );
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function weeksOf(cells: Array<string | null>) {
  const weeks: Array<Array<string | null>> = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }
  return weeks;
}

export function ArchiveCalendar({ onSelect }: { onSelect?: () => void }) {
  const { entitlement, profile, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selected = searchParams.get("archive");
  const today = etDateString();
  const [cursor, setCursor] = useState(() => `${today.slice(0, 7)}-01`);
  const [available, setAvailable] = useState<string[]>([]);
  const [lookback, setLookback] = useState(FREE_ARCHIVE_LOOKBACK_DAYS);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/snapshot/dates")
      .then((response) => response.json())
      .then((payload: { dates?: string[]; rules?: { freeLookbackDays?: number } }) => {
        if (cancelled) return;
        setAvailable(
          (Array.isArray(payload.dates) ? payload.dates : [])
            .slice()
            .sort()
            .reverse(),
        );
        if (payload.rules?.freeLookbackDays) {
          setLookback(payload.rules.freeLookbackDays);
        }
      })
      .catch(() => {
        if (!cancelled) setAvailable([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const joinedOn =
    profile?.createdAt ??
    (user?.metadata.creationTime ? new Date(user.metadata.creationTime) : null);
  const window = useMemo(() => {
    const range = archiveWindow(entitlement.plan, joinedOn, entitlement.role);
    if (entitlement.role !== "admin" && entitlement.plan === "free") {
      return { from: shiftYmd(etDateString(), -lookback), to: range.to };
    }
    return range;
  }, [entitlement.plan, entitlement.role, joinedOn, lookback]);

  const availableSet = useMemo(() => new Set(available), [available]);
  const weeks = useMemo(() => weeksOf(daysInMonth(cursor)), [cursor]);

  function goMonth(delta: number) {
    const [year, month] = cursor.split("-").map(Number);
    const next = new Date(year, month - 1 + delta, 1);
    setCursor(
      `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`,
    );
  }

  function pick(date: string) {
    if (!isSelectableArchiveDate(date, window, availableSet)) return;
    const latest = available[0];
    const stayOnArchive = pathname.startsWith("/dashboard/archive");
    if (!latest || date === latest) {
      router.push(stayOnArchive ? "/dashboard/archive" : pathname);
    } else if (stayOnArchive) {
      router.push(`/dashboard?archive=${date}`);
    } else {
      router.push(`${pathname}?archive=${date}`);
    }
    onSelect?.();
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => goMonth(-1)}
          className="grid h-10 w-10 place-items-center rounded-full text-ink-soft hover:bg-violet/10 hover:text-violet"
          aria-label="Previous month"
        >
          ‹
        </button>
        <p className="font-display text-lg font-semibold text-ink">
          {monthLabel(cursor)}
        </p>
        <button
          type="button"
          onClick={() => goMonth(1)}
          className="grid h-10 w-10 place-items-center rounded-full text-ink-soft hover:bg-violet/10 hover:text-violet"
          aria-label="Next month"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
        {WEEKDAYS.map((day) => (
          <span key={day} className="py-2">
            {day}
          </span>
        ))}
      </div>
      <div key={cursor} className="archive-month space-y-1">
        {weeks.map((week, weekIndex) => (
          <div key={`${cursor}-${weekIndex}`} className="grid grid-cols-7">
            {week.map((date, dayIndex) => {
              if (!date) return <span key={`empty-${weekIndex}-${dayIndex}`} />;
              const hasData = availableSet.has(date);
              const selectable = isSelectableArchiveDate(date, window, availableSet);
              const isSelected = selected === date;
              const isToday = date === today;
              const prevHasData = Boolean(
                dayIndex > 0 && week[dayIndex - 1] && availableSet.has(week[dayIndex - 1]!),
              );
              const nextHasData = Boolean(
                dayIndex < 6 && week[dayIndex + 1] && availableSet.has(week[dayIndex + 1]!),
              );

              return (
                <button
                  key={date}
                  type="button"
                  disabled={!selectable}
                  onClick={() => pick(date)}
                  className={`flex h-[58px] w-full flex-col items-center justify-center disabled:cursor-default ${
                    selectable ? "cursor-pointer" : ""
                  } ${isSelected ? "archive-day-selected" : ""}`}
                  aria-current={isToday ? "date" : undefined}
                  aria-pressed={isSelected}
                >
                  <span className="relative grid h-10 w-full place-items-center">
                    {hasData && prevHasData && (
                      <span className="archive-flow-seg archive-flow-seg-left" />
                    )}
                    {hasData && nextHasData && (
                      <span className="archive-flow-seg archive-flow-seg-right" />
                    )}
                    {hasData && <span className="archive-flow-node" />}
                    <span
                      className={`relative z-10 text-[13px] font-medium ${
                        isSelected
                          ? "text-white"
                          : selectable
                            ? "text-ink"
                            : "text-ink-soft/70"
                      }`}
                    >
                      {Number(date.slice(8))}
                    </span>
                  </span>
                  <span className="grid h-2.5 place-items-center">
                    {isToday ? <span className="archive-today-dot" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-ink-soft">
        <span className="inline-flex items-center gap-2">
          <span className="h-[10px] w-8 rounded-full bg-sky-200" />
          Stored research
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="archive-today-dot" />
          Today
        </span>
      </div>
    </div>
  );
}
