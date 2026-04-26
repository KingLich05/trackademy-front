'use client';

import { useState, useRef, useEffect, useId } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

/** Parse yyyy-mm-dd → Date (local, midnight) */
function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Format Date → yyyy-mm-dd */
function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Format Date → "1 апр 2026" */
function formatDisplay(d: Date): string {
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Returns array of Date cells for a calendar grid (Mon-first, padded) */
function buildGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // Monday-first: Sunday (0) → 6, Monday (1) → 0
  const startPad = (firstDay.getDay() + 6) % 7;
  const cells: (Date | null)[] = Array(startPad).fill(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push(new Date(year, month, d));
  }
  // pad to full rows
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

interface DatePickerProps {
  label?: string;
  value: string;           // yyyy-mm-dd
  onChange: (val: string) => void;
  minDate?: string;        // yyyy-mm-dd
  maxDate?: string;        // yyyy-mm-dd
  align?: 'left' | 'right';
}

export function DatePicker({ label, value, onChange, minDate, maxDate, align = 'left' }: DatePickerProps) {
  const id = useId();
  const selected = value ? parseISO(value) : null;
  const todayISO = toISO(new Date());

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? new Date().getMonth());

  const containerRef = useRef<HTMLDivElement>(null);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // sync view when value changes externally
  useEffect(() => {
    if (selected) {
      setViewYear(selected.getFullYear());
      setViewMonth(selected.getMonth());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const cells = buildGrid(viewYear, viewMonth);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function selectDay(day: Date) {
    const iso = toISO(day);
    if (minDate && iso < minDate) return;
    if (maxDate && iso > maxDate) return;
    onChange(iso);
    setOpen(false);
  }

  function isDisabled(day: Date): boolean {
    const iso = toISO(day);
    if (minDate && iso < minDate) return true;
    if (maxDate && iso > maxDate) return true;
    return false;
  }

  const displayText = selected ? formatDisplay(selected) : 'Выберите дату';

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        id={id}
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`
          flex items-center gap-2 h-10 pl-3 pr-4 rounded-xl border transition-all text-sm font-medium
          bg-white dark:bg-gray-800
          border-gray-200 dark:border-gray-600
          hover:border-purple-400 dark:hover:border-purple-500
          focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500
          text-gray-800 dark:text-gray-100
          shadow-sm hover:shadow
          ${open ? 'border-purple-500 dark:border-purple-400 ring-2 ring-purple-500/20' : ''}
        `}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <CalendarDaysIcon className={`w-4 h-4 flex-shrink-0 ${open ? 'text-purple-500' : 'text-gray-400 dark:text-gray-500'}`} />
        <span className="flex flex-col items-start leading-tight">
          {label && <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide -mb-0.5">{label}</span>}
          <span className={selected ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}>
            {displayText}
          </span>
        </span>
        <svg className={`w-3.5 h-3.5 ml-1 text-gray-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown calendar */}
      {open && (
        <div
          className={`
            absolute z-50 mt-2 w-72 rounded-2xl shadow-xl border
            bg-white dark:bg-gray-800
            border-gray-200 dark:border-gray-700
            animate-in fade-in slide-in-from-top-2 duration-150
            ${align === 'right' ? 'right-0' : 'left-0'}
          `}
          style={{ animation: 'datepicker-pop 0.15s ease-out' }}
        >
          {/* Month/Year header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  // cycle through months when clicking month name
                }}
                className="text-sm font-semibold text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              >
                {MONTHS[viewMonth]}
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setViewYear(y => y - 1)}
                  className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <ChevronLeftIcon className="w-3 h-3" />
                </button>
                <span className="text-sm font-semibold text-gray-900 dark:text-white min-w-[2.5rem] text-center">{viewYear}</span>
                <button
                  type="button"
                  onClick={() => setViewYear(y => y + 1)}
                  className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <ChevronRightIcon className="w-3 h-3" />
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 px-3 pt-3 pb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider pb-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 px-3 pb-4 gap-y-0.5">
            {cells.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} />;
              const iso = toISO(day);
              const isSelected = iso === value;
              const isToday = iso === todayISO;
              const disabled = isDisabled(day);
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectDay(day)}
                  className={`
                    relative h-9 w-full flex items-center justify-center rounded-lg text-sm font-medium transition-all
                    ${disabled ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'cursor-pointer'}
                    ${isSelected
                      ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-md shadow-purple-200 dark:shadow-purple-900/40 scale-105 font-bold'
                      : isToday && !disabled
                        ? 'text-purple-600 dark:text-purple-400 font-bold ring-2 ring-purple-400 ring-inset hover:bg-purple-50 dark:hover:bg-purple-900/20'
                        : !disabled
                          ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          : ''
                    }
                  `}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2 px-4 pb-3 border-t border-gray-100 dark:border-gray-700 pt-2.5">
            <button
              type="button"
              onClick={() => { onChange(todayISO); setOpen(false); }}
              className="flex-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-lg py-1.5 transition-colors"
            >
              Сегодня
            </button>
            <button
              type="button"
              onClick={() => {
                const d = new Date();
                const firstDay = toISO(new Date(d.getFullYear(), d.getMonth(), 1));
                onChange(firstDay);
                setViewYear(d.getFullYear());
                setViewMonth(d.getMonth());
                setOpen(false);
              }}
              className="flex-1 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg py-1.5 transition-colors"
            >
              Нач. месяца
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
