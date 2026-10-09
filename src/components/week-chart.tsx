"use client";

import { useId, useState } from "react";
import { useDates } from "@/i18n/client";

type Day = { date: string; minutes: number };

/**
 * Seven bars of focus minutes. One series, so no legend: the section title names it.
 * Every bar has a hover/focus tooltip, and a table carries the same data for screen readers.
 */
export function WeekChart({
  days,
  label,
  formatValue,
  today,
}: {
  days: Day[];
  label: string;
  formatValue: (minutes: number) => string;
  today: string;
}) {
  const dates = useDates();
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(30, ...days.map((d) => d.minutes));
  // Round the top of the scale to a friendly number of minutes.
  const top = Math.ceil(max / 30) * 30;
  const W = 336;
  const H = 150;
  const pad = { top: 22, bottom: 26, left: 4, right: 4 };
  const plotH = H - pad.top - pad.bottom;
  const slot = (W - pad.left - pad.right) / days.length;
  const barW = Math.min(30, slot - 8);

  return (
    <figure className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-md"
        role="img"
        aria-labelledby={`${id}-label`}
        onMouseLeave={() => setHover(null)}
      >
        <title id={`${id}-label`}>{label}</title>
        <line x1={pad.left} x2={W - pad.right} y1={H - pad.bottom} y2={H - pad.bottom} stroke="var(--line)" strokeWidth={1} />
        {days.map((d, i) => {
          const h = d.minutes === 0 ? 0 : Math.max(4, (d.minutes / top) * plotH);
          const x = pad.left + slot * i + (slot - barW) / 2;
          const y = H - pad.bottom - h;
          const isToday = d.date === today;
          const r = Math.min(4, h / 2);
          return (
            <g key={d.date}>
              {h > 0 && (
                // Rounded top corners only; the bar sits flat on the baseline.
                <path
                  d={`M${x},${H - pad.bottom} V${y + r} Q${x},${y} ${x + r},${y} H${x + barW - r} Q${x + barW},${y} ${x + barW},${y + r} V${H - pad.bottom} Z`}
                  fill="var(--chart)"
                  opacity={hover === null || hover === i ? 1 : 0.55}
                />
              )}
              <text
                x={x + barW / 2}
                y={H - 8}
                textAnchor="middle"
                fontSize="12"
                fontWeight={isToday ? 700 : 400}
                fill={isToday ? "var(--ink)" : "var(--ink-soft)"}
              >
                {dates.weekday(d.date)}
              </text>
              {/* Hit area larger than the bar */}
              <rect
                x={pad.left + slot * i}
                y={pad.top - 10}
                width={slot}
                height={plotH + 10}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onTouchStart={() => setHover(i)}
              />
            </g>
          );
        })}
        {hover !== null && (
          <text
            x={Math.min(W - 40, Math.max(40, pad.left + slot * hover + slot / 2))}
            y={14}
            textAnchor="middle"
            fontSize="13"
            fontWeight={700}
            fill="var(--ink)"
          >
            {formatValue(days[hover].minutes)}
          </text>
        )}
      </svg>
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>
          {days.map((d) => (
            <tr key={d.date}>
              <th scope="row">{dates.long(d.date)}</th>
              <td>{formatValue(d.minutes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
