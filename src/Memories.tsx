import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronRight, Video, X } from "lucide-react";
import type { Item } from "./types";
import { mediaURL, formatDuration } from "./api";
import { MediaSurface } from "./MediaSurface";
import {
  dayLabel,
  groupMomentsByDay,
  localDayKey,
  memoryMonths,
  monthCells,
  monthLabel,
} from "./calendar";

export function Memories({
  items,
  selectedDay,
  onDaySelect,
  onSelect,
}: {
  items: Item[];
  selectedDay: string | null;
  onDaySelect: (day: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const [month, setMonth] = useState(selectedDay?.slice(0, 7) ?? ""),
    [visibleMonths, setVisibleMonths] = useState(6);
  const groups = useMemo(() => groupMomentsByDay(items), [items]);
  const months = useMemo(() => memoryMonths(items), [items]);
  const shown = month ? [month] : months.slice(0, visibleMonths);
  const today = localDayKey(new Date());
  const selected = selectedDay ? (groups.get(selectedDay) ?? []) : [];
  useEffect(() => {
    if (!selectedDay) return;
    const handler = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        !(event.target as HTMLElement).closest("input,select,textarea")
      )
        onDaySelect(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedDay, onDaySelect]);
  return (
    <section className="page memories-page" aria-label="Kỷ niệm theo ngày">
      <header className="page-header">
        <div>
          <h1>Kỷ niệm</h1>
          <p className="subtitle">
            {items.length} khoảnh khắc · {groups.size} ngày
          </p>
        </div>
        <div className="header-actions memories-filters">
          <label className="month-picker">
            <CalendarDays size={17} />
            <input
              type="month"
              aria-label="Chọn tháng kỷ niệm"
              min="1900-01"
              max="9999-12"
              value={month}
              onChange={(event) => {
                const value = event.target.value;
                if (
                  value &&
                  (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value) ||
                    value < "1900-01" ||
                    value > "9999-12")
                )
                  return;
                setMonth(value);
                onDaySelect(null);
              }}
            />
          </label>
          <button
            className="btn secondary"
            onClick={() => {
              setMonth(today.slice(0, 7));
              onDaySelect(null);
            }}
          >
            Tháng này
          </button>
          {month && (
            <button
              className="btn ghost"
              onClick={() => {
                setMonth("");
                onDaySelect(null);
              }}
            >
              Tất cả
            </button>
          )}
        </div>
      </header>
      <div className={`memories-layout ${selectedDay ? "with-day" : ""}`}>
        <div className="memory-months">
          {shown.map((key) => {
            const count = [...groups.entries()]
              .filter(([day]) => day.startsWith(`${key}-`))
              .reduce((sum, [, group]) => sum + group.length, 0);
            return (
              <section
                key={key}
                className="month-card"
                aria-label={monthLabel(key)}
              >
                <header className="month-heading">
                  <h2>{monthLabel(key)}</h2>
                  <span>{count} khoảnh khắc</span>
                </header>
                <div className="calendar-weekdays" aria-hidden="true">
                  {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>
                <div className="calendar-grid">
                  {monthCells(key).map((cell, index) => {
                    if (!cell)
                      return (
                        <div
                          className="calendar-spacer"
                          key={`blank-${index}`}
                          aria-hidden="true"
                        />
                      );
                    const dayItems = groups.get(cell.key) ?? [],
                      cover = dayItems[0];
                    return (
                      <button
                        key={cell.key}
                        disabled={!cover}
                        className={`calendar-day ${cover ? "has-moments" : "empty-day"} ${cell.key === today ? "today" : ""} ${cell.key === selectedDay ? "selected" : ""}`}
                        aria-label={`${dayLabel(cell.key)}, ${dayItems.length} khoảnh khắc`}
                        aria-pressed={cell.key === selectedDay}
                        onClick={() => onDaySelect(cell.key)}
                      >
                        {cover && (
                          <MediaSurface
                            src={mediaURL(cover.id)}
                            kind={cover.kind}
                            style={cover.style}
                            thumbnail
                          />
                        )}
                        <span className="calendar-number">{cell.day}</span>
                        {!cover && <span className="calendar-dot" />}
                        {cover?.kind === "video" && (
                          <Video
                            className="calendar-video"
                            size={13}
                            aria-hidden="true"
                          />
                        )}
                        {dayItems.length > 1 && (
                          <span className="calendar-count">
                            {dayItems.length}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
          {!month && visibleMonths < months.length && (
            <button
              className="btn secondary load-months"
              onClick={() => setVisibleMonths((count) => count + 6)}
            >
              Xem tháng cũ hơn
              <ChevronRight size={17} />
            </button>
          )}
        </div>
        {selectedDay && (
          <aside
            className="memory-day-panel settings-card"
            aria-label={`Khoảnh khắc ngày ${dayLabel(selectedDay)}`}
          >
            <header className="panel-heading">
              <div>
                <h3>{dayLabel(selectedDay)}</h3>
                <p className="subtitle">{selected.length} khoảnh khắc</p>
              </div>
              <button
                className="icon-btn"
                aria-label="Đóng ngày đang xem"
                onClick={() => onDaySelect(null)}
              >
                <X size={18} />
              </button>
            </header>
            <div className="memory-day-grid">
              {selected.map((item) => (
                <button
                  key={item.id}
                  className="memory-day-photo"
                  aria-label={`Xem ${item.caption || "khoảnh khắc"}`}
                  onClick={() => onSelect(item.id)}
                >
                  <MediaSurface
                    src={mediaURL(item.id)}
                    kind={item.kind}
                    style={item.style}
                    thumbnail
                  />
                  {item.kind === "video" && (
                    <span className="duration-badge">
                      {formatDuration(item.duration)}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {!selected.length && (
              <p className="quiet-note">Ngày này chưa có khoảnh khắc.</p>
            )}
          </aside>
        )}
      </div>
    </section>
  );
}
