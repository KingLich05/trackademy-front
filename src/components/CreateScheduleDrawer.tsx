'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { AuthenticatedApiService } from '../services/AuthenticatedApiService';
import { DaysOfWeekSelector } from './ui/DaysOfWeekSelector';
import { TimeInput } from './ui/TimeInput';
import { Group } from '../types/Group';
import { User } from '../types/User';
import { Room } from '../types/Room';

// ─── Availability types ────────────────────────────────────────────────────────

interface AvailabilitySlot {
  startTime: string; // "HH:MM:SS"
  endTime: string;
}

interface BusySlot {
  startTime: string;
  endTime: string;
  scheduleId: string;
  groupName: string | null;
  teacherName: string | null;
  roomName: string | null;
}

interface DayAvailability {
  dayOfWeek: number; // 1=Mon … 7=Sun
  freeSlots: AvailabilitySlot[];
  busySlots: BusySlot[];
}

interface RoomMinimal { id: string; name: string; }
interface TeacherMinimal { id: string; name: string; hasPhoto: boolean; }
interface GroupMinimal { id: string; name: string; }

interface ScheduleAvailabilityResult {
  days: DayAvailability[];
  availableRooms: RoomMinimal[];
  availableTeachers: TeacherMinimal[];
  availableGroups: GroupMinimal[];
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface CreateScheduleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: Record<string, unknown>) => Promise<void>;
  groups: Group[];
  teachers: User[];
  rooms: Room[];
  organizationId: string;
}

// ─── Calendar constants ────────────────────────────────────────────────────────

const CALENDAR_START_H = 7;   // 07:00
const CALENDAR_END_H   = 23;  // 23:00
const PX_PER_MIN       = 1.5; // pixels per minute
const CALENDAR_HEIGHT  = (CALENDAR_END_H - CALENDAR_START_H) * 60 * PX_PER_MIN;
const DAYS_SHORT       = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const DAYS_NUMBERS     = [1, 2, 3, 4, 5, 6, 7];
const SNAP_MIN         = 5;   // snap to 5-minute intervals
const MIN_DURATION_MIN = 15;  // minimum drag duration

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  return mon;
}

function toDateString(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getCurrentMonday(): string {
  return toDateString(getMonday(new Date()));
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToHHMM(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function timeToY(t: string): number {
  return (timeToMinutes(t) - CALENDAR_START_H * 60) * PX_PER_MIN;
}

function slotHeight(start: string, end: string): number {
  return (timeToMinutes(end) - timeToMinutes(start)) * PX_PER_MIN;
}

function snapToGrid(rawMin: number): number {
  return Math.round(rawMin / SNAP_MIN) * SNAP_MIN;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function clientYToMinutes(el: HTMLDivElement, clientY: number): number {
  const rect = el.getBoundingClientRect();
  const relY  = clientY - rect.top;
  const raw   = CALENDAR_START_H * 60 + relY / PX_PER_MIN;
  return clamp(snapToGrid(raw), CALENDAR_START_H * 60, CALENDAR_END_H * 60);
}

// ─── Drag state ────────────────────────────────────────────────────────────────

interface DragState {
  day: number;
  anchorMin: number;
  curMin: number;
}

// ─── Busy slot tooltip ────────────────────────────────────────────────────────

interface TooltipState { slot: BusySlot; x: number; y: number; }

function BusyTooltip({ state }: { state: TooltipState }) {
  const lines: string[] = [];
  if (state.slot.groupName)   lines.push(`Группа: ${state.slot.groupName}`);
  if (state.slot.teacherName) lines.push(`Преподаватель: ${state.slot.teacherName}`);
  if (state.slot.roomName)    lines.push(`Аудитория: ${state.slot.roomName}`);
  return (
    <div
      className="fixed z-[9999] pointer-events-none bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl max-w-[200px]"
      style={{ left: state.x + 12, top: state.y - 10 }}
    >
      <p className="font-semibold mb-1">
        {state.slot.startTime.slice(0, 5)} – {state.slot.endTime.slice(0, 5)}
      </p>
      {lines.map((l, i) => <p key={i}>{l}</p>)}
    </div>
  );
}

// ─── Drag time label (shows while dragging) ────────────────────────────────────

function DragLabel({
  startMin, endMin, el,
}: {
  startMin: number; endMin: number; el: HTMLDivElement;
}) {
  const rect  = el.getBoundingClientRect();
  const topPx = (startMin - CALENDAR_START_H * 60) * PX_PER_MIN;
  const hPx   = (endMin - startMin) * PX_PER_MIN;
  const midPx = topPx + hPx / 2;
  return (
    <div
      className="fixed z-[9998] pointer-events-none bg-violet-700 text-white text-[11px] font-semibold px-2 py-1 rounded-md shadow-lg whitespace-nowrap"
      style={{ left: rect.left + rect.width / 2 - 38, top: rect.top + midPx - 11 }}
    >
      {minutesToHHMM(startMin)}–{minutesToHHMM(endMin)}
    </div>
  );
}

// ─── Single-day column ────────────────────────────────────────────────────────

interface DayColumnProps {
  dayNumber: number;
  dayAvail: DayAvailability;
  selectedStart: string;
  selectedEnd: string;
  isSelectedDay: boolean;
  drag: DragState | null;
  containerRef: (el: HTMLDivElement | null) => void;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  onBusyHover: (state: TooltipState | null) => void;
  calendarHasLoaded: boolean;
}

function DayColumn({
  dayNumber,
  dayAvail,
  selectedStart,
  selectedEnd,
  isSelectedDay,
  drag,
  containerRef,
  onMouseDown,
  onBusyHover,
  calendarHasLoaded,
}: DayColumnProps) {
  const selStart = selectedStart && selectedEnd ? timeToMinutes(selectedStart) : null;
  const selEnd   = selectedStart && selectedEnd ? timeToMinutes(selectedEnd)   : null;

  const isDragCol    = drag?.day === dayNumber;
  const dragTopMin   = isDragCol ? Math.min(drag.anchorMin, drag.curMin) : null;
  const dragBotMin   = isDragCol ? Math.max(drag.anchorMin, drag.curMin) : null;
  const dragHPx      = (dragTopMin !== null && dragBotMin !== null)
    ? (dragBotMin - dragTopMin) * PX_PER_MIN
    : 0;

  return (
    <div
      ref={containerRef}
      className="relative flex-1 min-w-0 border-l border-gray-200 dark:border-gray-700/50 select-none"
      style={{ height: CALENDAR_HEIGHT, cursor: 'crosshair' }}
      onMouseDown={onMouseDown}
    >
      {/* Hour grid lines */}
      {Array.from({ length: CALENDAR_END_H - CALENDAR_START_H + 1 }, (_, i) => (
        <div
          key={i}
          className="absolute w-full border-t border-gray-100 dark:border-gray-800/50"
          style={{ top: i * 60 * PX_PER_MIN }}
        />
      ))}
      {/* Half-hour dashed lines */}
      {Array.from({ length: CALENDAR_END_H - CALENDAR_START_H }, (_, i) => (
        <div
          key={`h-${i}`}
          className="absolute w-full border-t border-dashed border-gray-50 dark:border-gray-800/30"
          style={{ top: (i + 0.5) * 60 * PX_PER_MIN }}
        />
      ))}

      {calendarHasLoaded && (
        <>
          {/* Free slots */}
          {dayAvail.freeSlots.map((slot, i) => {
            const top = timeToY(slot.startTime);
            const h   = slotHeight(slot.startTime, slot.endTime);
            if (h < 4) return null;
            return (
              <div
                key={`free-${i}`}
                className="absolute inset-x-0.5 rounded pointer-events-none
                           bg-emerald-100 dark:bg-emerald-900/40
                           border border-emerald-300 dark:border-emerald-700/60"
                style={{ top, height: h, zIndex: 1 }}
              >
                {h >= 22 && (
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-medium text-emerald-700 dark:text-emerald-300 select-none">
                    {slot.startTime.slice(0, 5)}–{slot.endTime.slice(0, 5)}
                  </span>
                )}
              </div>
            );
          })}

          {/* Busy slots */}
          {dayAvail.busySlots.map((slot, i) => {
            const top = timeToY(slot.startTime);
            const h   = slotHeight(slot.startTime, slot.endTime);
            if (h < 4) return null;
            return (
              <div
                key={`busy-${i}`}
                className="absolute inset-x-0.5 rounded
                           bg-red-100 dark:bg-red-900/40
                           border border-red-300 dark:border-red-700/60"
                style={{ top, height: h, zIndex: 2 }}
                onMouseEnter={(e) => { e.stopPropagation(); onBusyHover({ slot, x: e.clientX, y: e.clientY }); }}
                onMouseLeave={() => onBusyHover(null)}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {h >= 16 && (
                  <span className="absolute inset-x-1 top-0.5 text-[9px] font-medium text-red-700 dark:text-red-300 truncate select-none">
                    {slot.groupName ?? slot.teacherName ?? '—'}
                  </span>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* Committed selection */}
      {isSelectedDay && selStart !== null && selEnd !== null && !isDragCol && (
        <div
          className="absolute inset-x-0.5 rounded pointer-events-none
                     bg-violet-200/80 dark:bg-violet-700/50
                     border-2 border-violet-500 dark:border-violet-400"
          style={{
            top: (selStart - CALENDAR_START_H * 60) * PX_PER_MIN,
            height: (selEnd - selStart) * PX_PER_MIN,
            zIndex: 3,
          }}
        />
      )}

      {/* Active drag preview */}
      {isDragCol && dragTopMin !== null && dragHPx >= MIN_DURATION_MIN * PX_PER_MIN && (
        <div
          className="absolute inset-x-0.5 rounded pointer-events-none
                     bg-violet-400/60 dark:bg-violet-500/50
                     border-2 border-violet-600 dark:border-violet-400"
          style={{
            top: (dragTopMin - CALENDAR_START_H * 60) * PX_PER_MIN,
            height: dragHPx,
            zIndex: 4,
          }}
        />
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CreateScheduleDrawer({
  isOpen,
  onClose,
  onSave,
  groups,
  teachers,
  rooms,
  organizationId,
}: CreateScheduleDrawerProps) {
  // Form state
  const [daysOfWeek, setDaysOfWeek]       = useState<number[]>([]);
  const [startTime, setStartTime]         = useState('');
  const [endTime, setEndTime]             = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo]     = useState('');
  const [groupId, setGroupId]             = useState('');
  const [teacherId, setTeacherId]         = useState('');
  const [roomId, setRoomId]               = useState('');
  const [errors, setErrors]               = useState<Record<string, string>>({});
  const [isSaving, setIsSaving]           = useState(false);

  // Calendar state
  const [weekStart, setWeekStart]                         = useState(getCurrentMonday);
  const [availability, setAvailability]                   = useState<ScheduleAvailabilityResult | null>(null);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [tooltip, setTooltip]                             = useState<TooltipState | null>(null);
  const debounceRef                                       = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drag state
  const [drag, setDrag]  = useState<DragState | null>(null);
  const colRefs          = useRef<(HTMLDivElement | null)[]>(Array(7).fill(null));

  // Computed option lists (progressive filtering from API)
  const roomOptions    = availability?.availableRooms?.length    ? availability.availableRooms    : rooms.map(r => ({ id: r.id, name: r.name }));
  const teacherOptions = availability?.availableTeachers?.length ? availability.availableTeachers : teachers.map(t => ({ id: t.id, name: t.name || t.login }));
  const groupOptions   = availability?.availableGroups?.length   ? availability.availableGroups   : groups.map(g => ({ id: g.id, name: g.name }));

  // ── Availability loader ───────────────────────────────────────────────────

  const loadAvailability = useCallback(async (
    rId: string, tId: string, gId: string, week: string
  ) => {
    if (!organizationId) return;
    setIsLoadingAvailability(true);
    try {
      const body: Record<string, string> = { organizationId, weekStart: week };
      if (rId) body.roomId    = rId;
      if (tId) body.teacherId = tId;
      if (gId) body.groupId   = gId;
      const result = await AuthenticatedApiService.post<ScheduleAvailabilityResult>(
        '/Schedule/availability', body
      );
      setAvailability(result);
    } catch (e) {
      console.error('Failed to load availability', e);
    } finally {
      setIsLoadingAvailability(false);
    }
  }, [organizationId]);

  useEffect(() => {
    if (!isOpen) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadAvailability(roomId, teacherId, groupId, weekStart);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [roomId, teacherId, groupId, weekStart, isOpen, loadAvailability]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setDaysOfWeek([]);
      setStartTime('');
      setEndTime('');
      setEffectiveFrom('');
      setEffectiveTo('');
      setGroupId('');
      setTeacherId('');
      setRoomId('');
      setErrors({});
      setWeekStart(getCurrentMonday());
      setAvailability(null);
      setDrag(null);
    }
  }, [isOpen]);

  // ── Document-level drag handlers ──────────────────────────────────────────

  useEffect(() => {
    if (!drag) return;

    const dayIdx = DAYS_NUMBERS.indexOf(drag.day);

    const handleMove = (e: MouseEvent) => {
      const el = colRefs.current[dayIdx];
      if (!el) return;
      const curMin = clientYToMinutes(el, e.clientY);
      setDrag(prev => prev ? { ...prev, curMin } : null);
    };

    const handleUp = (e: MouseEvent) => {
      const el = colRefs.current[dayIdx];
      if (!el) return;
      const curMin = clientYToMinutes(el, e.clientY);
      const rawS   = Math.min(drag.anchorMin, curMin);
      const rawE   = Math.max(drag.anchorMin, curMin);
      // Short tap → default 1h slot
      const finalE = rawE - rawS < MIN_DURATION_MIN ? rawS + 60 : rawE;

      setStartTime(minutesToHHMM(rawS));
      setEndTime(minutesToHHMM(Math.min(finalE, CALENDAR_END_H * 60)));
      setDaysOfWeek(prev => prev.includes(drag.day) ? prev : [...prev, drag.day]);
      setDrag(null);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [drag]);

  // ── Column mousedown factory ──────────────────────────────────────────────

  const makeColumnMouseDown = (dayIdx: number, dayNum: number) =>
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const el = colRefs.current[dayIdx];
      if (!el) return;
      const anchorMin = clientYToMinutes(el, e.clientY);
      setDrag({ day: dayNum, anchorMin, curMin: anchorMin });
    };

  // ── Other handlers ────────────────────────────────────────────────────────

  const changeWeek = (delta: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + delta * 7);
    setWeekStart(toDateString(d));
  };

  const formatWeekLabel = (): string => {
    const mon = new Date(weekStart);
    const sun = new Date(weekStart);
    sun.setDate(mon.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    return `${fmt(mon)} — ${fmt(sun)}`;
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (daysOfWeek.length === 0)                              errs.daysOfWeek    = 'Выберите хотя бы один день';
    if (!startTime)                                           errs.startTime     = 'Укажите время начала';
    if (!endTime)                                             errs.endTime       = 'Укажите время окончания';
    if (startTime && endTime && startTime >= endTime)         errs.endTime       = 'Время окончания должно быть позже начала';
    if (!effectiveFrom)                                       errs.effectiveFrom = 'Укажите дату начала';
    if (effectiveFrom && effectiveTo && effectiveTo < effectiveFrom)
                                                              errs.effectiveTo   = 'Дата окончания не может быть раньше даты начала';
    if (!groupId)                                             errs.groupId       = 'Выберите группу';
    if (!teacherId)                                           errs.teacherId     = 'Выберите преподавателя';
    if (!roomId)                                              errs.roomId        = 'Выберите аудиторию';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try {
      await onSave({ daysOfWeek: daysOfWeek.join(','), startTime, endTime, effectiveFrom, effectiveTo, groupId, teacherId, roomId, organizationId });
    } catch {
      // toast handled by parent
    } finally {
      setIsSaving(false);
    }
  };

  // Drag label overlay data
  const activeDragIdx   = drag ? DAYS_NUMBERS.indexOf(drag.day) : -1;
  const activeDragEl    = activeDragIdx >= 0 ? colRefs.current[activeDragIdx] : null;
  const dragLabelS      = drag ? Math.min(drag.anchorMin, drag.curMin) : 0;
  const dragLabelE      = drag ? Math.max(drag.anchorMin, drag.curMin) : 0;
  const showDragLabel   = drag !== null && activeDragEl !== null && (dragLabelE - dragLabelS) >= MIN_DURATION_MIN;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Full-screen drawer */}
      <div
        className="fixed inset-0 z-50 flex overflow-hidden"
        style={{ userSelect: drag ? 'none' : undefined }}
      >

        {/* ── LEFT — weekly calendar ────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 overflow-hidden border-r border-gray-200 dark:border-gray-700">

          {/* Calendar header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                <CalendarDaysIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Доступность</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Перетащите мышью для выбора времени
                </p>
              </div>
            </div>

            {/* Week nav */}
            <div className="flex items-center gap-2">
              {isLoadingAvailability && (
                <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              )}
              <button
                onClick={() => changeWeek(-1)}
                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[160px] text-center">
                {formatWeekLabel()}
              </span>
              <button
                onClick={() => changeWeek(1)}
                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-6 py-2 bg-gray-50 dark:bg-gray-800/40 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <div className="w-3 h-3 rounded bg-emerald-200 dark:bg-emerald-800 border border-emerald-400 dark:border-emerald-600" />
              Свободно
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <div className="w-3 h-3 rounded bg-red-200 dark:bg-red-800 border border-red-400 dark:border-red-600" />
              Занято
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <div className="w-3 h-3 rounded bg-violet-200 dark:bg-violet-700 border-2 border-violet-500 dark:border-violet-400" />
              Выбранное время
            </div>
          </div>

          {/* Calendar grid */}
          <div className="flex-1 overflow-auto">
            <div className="flex min-w-0">

              {/* Time axis */}
              <div className="shrink-0 w-14 flex flex-col">
                {/* Spacer matching sticky day headers */}
                <div className="sticky top-0 z-10 py-2 text-xs bg-white dark:bg-gray-900 shrink-0" aria-hidden="true" />
                <div className="relative shrink-0" style={{ height: CALENDAR_HEIGHT }}>
                  {Array.from({ length: CALENDAR_END_H - CALENDAR_START_H }, (_, i) => (
                    <div
                      key={i}
                      className="absolute right-2 text-[10px] text-gray-400 dark:text-gray-500 leading-none"
                      style={{ top: i * 60 * PX_PER_MIN - 6 }}
                    >
                      {minutesToHHMM((CALENDAR_START_H + i) * 60)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Day columns */}
              <div className="flex flex-1 min-w-0">
                {DAYS_NUMBERS.map((dayNum, idx) => {
                  const dayAvail = availability?.days.find(d => d.dayOfWeek === dayNum)
                    ?? { dayOfWeek: dayNum, freeSlots: [], busySlots: [] };

                  return (
                    <div key={dayNum} className="flex-1 min-w-0 flex flex-col">
                      {/* Day header */}
                      <div
                        className={`sticky top-0 z-10 text-center py-2 text-xs font-semibold
                          border-l border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-900
                          ${daysOfWeek.includes(dayNum)
                            ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20'
                            : 'text-gray-500 dark:text-gray-400'}`}
                      >
                        {DAYS_SHORT[idx]}
                      </div>

                      <DayColumn
                        dayNumber={dayNum}
                        dayAvail={dayAvail}
                        selectedStart={startTime}
                        selectedEnd={endTime}
                        isSelectedDay={daysOfWeek.includes(dayNum)}
                        drag={drag}
                        containerRef={(el) => { colRefs.current[idx] = el; }}
                        onMouseDown={makeColumnMouseDown(idx, dayNum)}
                        onBusyHover={setTooltip}
                        calendarHasLoaded={availability !== null}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT — form panel ────────────────────────────────────────────── */}
        <div className="w-[380px] shrink-0 flex flex-col bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">

          {/* Form header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-violet-600 to-indigo-600 shrink-0">
            <div>
              <h2 className="text-base font-semibold text-white">Новое расписание</h2>
              <p className="text-xs text-violet-200 mt-0.5">Шаблон занятия</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Form body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* Room */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Аудитория <span className="text-red-500">*</span>
              </label>
              <select
                value={roomId}
                onChange={e => setRoomId(e.target.value)}
                className={`w-full px-3 py-2.5 text-sm rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                  focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-colors
                  ${errors.roomId ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
              >
                <option value="">Выберите аудиторию</option>
                {roomOptions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              {errors.roomId && <p className="mt-1 text-xs text-red-500">{errors.roomId}</p>}
            </div>

            {/* Teacher */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Преподаватель <span className="text-red-500">*</span>
              </label>
              <select
                value={teacherId}
                onChange={e => setTeacherId(e.target.value)}
                className={`w-full px-3 py-2.5 text-sm rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                  focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-colors
                  ${errors.teacherId ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
              >
                <option value="">Выберите преподавателя</option>
                {teacherOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {errors.teacherId && <p className="mt-1 text-xs text-red-500">{errors.teacherId}</p>}
            </div>

            {/* Group */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Группа <span className="text-red-500">*</span>
              </label>
              <select
                value={groupId}
                onChange={e => setGroupId(e.target.value)}
                className={`w-full px-3 py-2.5 text-sm rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                  focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-colors
                  ${errors.groupId ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
              >
                <option value="">Выберите группу</option>
                {groupOptions.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              {errors.groupId && <p className="mt-1 text-xs text-red-500">{errors.groupId}</p>}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700" />

            {/* Days of week */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Дни недели <span className="text-red-500">*</span>
              </label>
              <DaysOfWeekSelector value={daysOfWeek} onChange={setDaysOfWeek} error={errors.daysOfWeek} />
            </div>

            {/* Times */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Начало <span className="text-red-500">*</span>
                </label>
                <TimeInput value={startTime} onChange={v => setStartTime(v || '')} placeholder="ЧЧ:ММ" required error={errors.startTime} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Конец <span className="text-red-500">*</span>
                </label>
                <TimeInput value={endTime} onChange={v => setEndTime(v || '')} placeholder="ЧЧ:ММ" required error={errors.endTime} />
              </div>
            </div>

            {/* Effective dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Действует с <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={effectiveFrom}
                  onChange={e => setEffectiveFrom(e.target.value)}
                  className={`w-full px-3 py-2.5 text-sm rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                    focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none
                    ${errors.effectiveFrom ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                />
                {errors.effectiveFrom && <p className="mt-1 text-xs text-red-500">{errors.effectiveFrom}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Действует до
                </label>
                <input
                  type="date"
                  value={effectiveTo}
                  onChange={e => setEffectiveTo(e.target.value)}
                  min={effectiveFrom || undefined}
                  className={`w-full px-3 py-2.5 text-sm rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                    focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none
                    ${errors.effectiveTo ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                />
                {errors.effectiveTo && <p className="mt-1 text-xs text-red-500">{errors.effectiveTo}</p>}
              </div>
            </div>

            {/* Summary chip */}
            {startTime && endTime && daysOfWeek.length > 0 && (
              <div className="rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700/50 p-3">
                <div className="flex items-center gap-2 text-sm text-violet-700 dark:text-violet-300">
                  <CheckCircleIcon className="w-4 h-4 shrink-0" />
                  <span className="font-medium">
                    {startTime} – {endTime}
                    {' · '}
                    {daysOfWeek.sort((a, b) => a - b).map(d => DAYS_SHORT[d - 1]).join(', ')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving}
              className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white transition-colors flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Сохранение…
                </>
              ) : 'Создать расписание'}
            </button>
          </div>
        </div>
      </div>

      {/* Drag time label overlay */}
      {showDragLabel && activeDragEl && (
        <DragLabel startMin={dragLabelS} endMin={dragLabelE} el={activeDragEl} />
      )}

      {/* Busy slot tooltip */}
      {tooltip && <BusyTooltip state={tooltip} />}
    </>
  );
}
