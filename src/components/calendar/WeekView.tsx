'use client';
import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Lesson, getTimeSlots, getLessonsForDay, getWeekDays, formatTime, generateSubjectColor, getLessonStatusColor } from '@/types/Lesson';
import { ChatBubbleLeftIcon, ArrowsPointingOutIcon, ViewColumnsIcon, Squares2X2Icon } from '@heroicons/react/24/outline';
import OverlappingLessonsModal from './OverlappingLessonsModal';

// ─── Constants ───────────────────────────────────────────────────────────────
const PX_PER_HOUR = 120;
const FIRST_MIN   = 8 * 60;   // 08:00
const BASE_COL_PX = 200;      // px per "span unit"
const MAX_SPAN    = 6;        // hard cap — prevents absurdly wide days

// ─── Helpers ─────────────────────────────────────────────────────────────────
function toMin(t: string) {
  const p = t.split(':').map(Number);
  return p[0] * 60 + (p[1] ?? 0);
}

/** How many lessons overlap at the busiest point in time */
function maxSimultaneous(lessons: Lesson[]): number {
  if (!lessons.length) return 0;
  const events: [number, number][] = [];
  for (const l of lessons) {
    events.push([toMin(l.startTime),  1]);
    events.push([toMin(l.endTime),   -1]);
  }
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let max = 0, cur = 0;
  for (const [, d] of events) { cur += d; if (cur > max) max = cur; }
  return max;
}

interface LayoutItem {
  lesson: Lesson;
  col:    number;   // 0-based column in its overlap cluster
  cols:   number;   // total columns needed in that cluster
  top:    number;   // px from top of day column
  height: number;   // px
}

/**
 * Google Calendar greedy algorithm:
 * Each lesson is placed in the lowest column where it fits.
 * cols = max column in its overlap cluster + 1 (so non-overlapping
 * lessons outside a cluster always get full width).
 */
function assignColumns(lessons: Lesson[]): LayoutItem[] {
  if (!lessons.length) return [];
  const sorted = [...lessons].sort(
    (a, b) => toMin(a.startTime) - toMin(b.startTime) || toMin(b.endTime) - toMin(a.endTime)
  );
  const colEnds: number[] = [];
  const items = sorted.map(l => {
    const s = toMin(l.startTime), e = toMin(l.endTime);
    const free = colEnds.findIndex(end => end <= s);
    const col  = free === -1 ? colEnds.push(e) - 1 : (colEnds[free] = e, free);
    return { lesson: l, s, e, col };
  });
  return items.map((a, i) => {
    let maxCol = a.col;
    for (let j = 0; j < items.length; j++) {
      if (i !== j && a.s < items[j].e && items[j].s < a.e)
        maxCol = Math.max(maxCol, items[j].col);
    }
    return {
      lesson: a.lesson,
      col:    a.col,
      cols:   maxCol + 1,
      top:    Math.max(0,  (a.s - FIRST_MIN) / 60 * PX_PER_HOUR),
      height: Math.max(28, (a.e - a.s)       / 60 * PX_PER_HOUR),
    };
  });
}

type ViewMode = 'expand' | 'fit' | 'group';

// ─── Group overlapping lessons for 'group' mode ──────────────────────────────
interface LessonGroup {
  lessons:   Lesson[];
  startTime: string;
  endTime:   string;
}

function groupOverlappingLessons(lessonsList: Lesson[]): LessonGroup[] {
  if (!lessonsList.length) return [];
  const sorted = [...lessonsList].sort(
    (a, b) => a.startTime.localeCompare(b.startTime) || a.endTime.localeCompare(b.endTime)
  );
  const groups: LessonGroup[] = [];
  const used = new Set<string>();
  for (let i = 0; i < sorted.length; i++) {
    if (used.has(sorted[i].id)) continue;
    const group: Lesson[] = [sorted[i]];
    used.add(sorted[i].id);
    let gStart = sorted[i].startTime;
    let gEnd   = sorted[i].endTime;
    let changed = true;
    while (changed) {
      changed = false;
      for (let j = 0; j < sorted.length; j++) {
        if (used.has(sorted[j].id)) continue;
        if (gStart < sorted[j].endTime && sorted[j].startTime < gEnd) {
          group.push(sorted[j]);
          used.add(sorted[j].id);
          if (sorted[j].startTime < gStart) gStart = sorted[j].startTime;
          if (sorted[j].endTime   > gEnd)   gEnd   = sorted[j].endTime;
          changed = true;
        }
      }
    }
    groups.push({ lessons: group, startTime: gStart, endTime: gEnd });
  }
  return groups;
}

// ─── WeekView ────────────────────────────────────────────────────────────────
interface WeekViewProps {
  date:          Date;
  lessons:       Lesson[];
  onLessonClick: (lesson: Lesson) => void;
}

export default function WeekView({ date, lessons, onLessonClick }: WeekViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('group');
  const [overlappingModal, setOverlappingModal] = useState<{
    isOpen: boolean; lessons: Lesson[]; timeSlot: string;
  }>({ isOpen: false, lessons: [], timeSlot: '' });

  const timeSlots   = getTimeSlots();
  const weekDays    = getWeekDays(date);
  const dayNames    = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const totalHeight = timeSlots.length * PX_PER_HOUR;

  const dayData = weekDays.map((day, i) => {
    const dayLessons = getLessonsForDay(lessons, day);
    const maxOvlp    = maxSimultaneous(dayLessons);
    const colSpan    = Math.min(MAX_SPAN, Math.max(1, Math.ceil(maxOvlp / 2)));
    return {
      day,
      name:        dayNames[i],
      isToday:     day.toDateString() === new Date().toDateString(),
      dayLessons,
      expandWidth: colSpan * BASE_COL_PX,
      layouts:     assignColumns(dayLessons),
      groups:      groupOverlappingLessons(dayLessons),
    };
  });

  const isExpand = viewMode === 'expand';
  const isGroup  = viewMode === 'group';

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── View mode toggle ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-1 px-3 py-1.5 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
        <span className="text-[11px] text-gray-400 dark:text-gray-500 mr-1">Режим:</span>
        {([
          { id: 'expand' as ViewMode, label: 'Расширить',   Icon: ArrowsPointingOutIcon },
          { id: 'fit'    as ViewMode, label: 'Вместить',     Icon: ViewColumnsIcon       },
          { id: 'group'  as ViewMode, label: 'Группировать', Icon: Squares2X2Icon        },
        ]).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setViewMode(id)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-150 ${
              viewMode === id
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Scrollable area ──────────────────────────────────────────────── */}
      <div className={`flex-1 ${isExpand ? 'overflow-auto' : 'overflow-y-auto overflow-x-hidden'}`}>
        <div style={isExpand
          ? { minWidth: `${56 + dayData.reduce((s, d) => s + d.expandWidth, 0)}px` }
          : { width: '100%' }
        }>
          {/* Header */}
          <div className="sticky top-0 z-20 flex bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="sticky left-0 z-30 w-14 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700" />
            {dayData.map(({ day, name, isToday, dayLessons, expandWidth }, i) => (
              <div
                key={day.toISOString()}
                className={`${isExpand ? 'flex-shrink-0' : 'flex-1'} py-2.5 px-1 text-center border-r-2 border-gray-200 dark:border-gray-600 last:border-r-0 transition-colors ${
                  isToday ? 'bg-violet-50 dark:bg-violet-950/30' : i % 2 === 1 ? 'bg-gray-50/60 dark:bg-white/[0.015]' : ''
                }`}
                style={isExpand ? { width: expandWidth } : undefined}
              >
                <div className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${
                  isToday ? 'text-violet-500 dark:text-violet-400' : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {name}
                </div>
                <div className={`font-extrabold leading-none mx-auto flex items-center justify-center rounded-xl transition-all ${
                  isToday
                    ? 'w-10 h-10 text-[22px] bg-violet-600 text-white shadow-lg shadow-violet-500/40'
                    : 'w-9 h-9 text-xl text-gray-700 dark:text-gray-200'
                }`}>
                  {day.getDate()}
                </div>
                <div className={`text-[10px] mt-2 font-semibold px-1.5 py-0.5 rounded-full inline-block ${
                  isToday
                    ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {dayLessons.length > 0 ? `${dayLessons.length} зан.` : '—'}
                </div>
              </div>
            ))}
          </div>

          {/* Body */}
          <div className="flex" style={{ height: totalHeight }}>
            {/* Time gutter */}
            <div
              className="sticky left-0 z-20 w-14 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700"
              style={{ height: totalHeight }}
            >
              {timeSlots.map(slot => (
                <div
                  key={slot}
                  className="relative flex items-start justify-end pr-2 pt-0.5 select-none"
                  style={{ height: PX_PER_HOUR }}
                >
                  <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400">{slot}</span>
                  <span className="absolute right-2 text-[9px] text-gray-300 dark:text-gray-600" style={{ top: PX_PER_HOUR / 2 - 1 }}>
                    :{slot.split(':')[0]}30
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {dayData.map(({ day, expandWidth, layouts, groups, isToday }, colIdx) => (
              <div
                key={day.toISOString()}
                className={`relative ${isExpand ? 'flex-shrink-0' : 'flex-1'} border-r-2 border-gray-200 dark:border-gray-600 last:border-r-0`}
                style={{ ...(isExpand ? { width: expandWidth } : {}), height: totalHeight }}
              >
                {/* Hour rows */}
                {timeSlots.map((slot, i) => (
                  <div
                    key={slot}
                    className={`absolute inset-x-0 ${
                      isToday
                        ? i % 2 === 1 ? 'bg-violet-50/60 dark:bg-violet-950/20' : 'bg-violet-50/30 dark:bg-violet-950/10'
                        : colIdx % 2 === 1
                          ? i % 2 === 1 ? 'bg-gray-50 dark:bg-white/[0.025]' : 'bg-gray-50/50 dark:bg-white/[0.01]'
                          : i % 2 === 1 ? 'bg-gray-50/40 dark:bg-white/[0.01]' : 'bg-white dark:bg-transparent'
                    }`}
                    style={{ top: i * PX_PER_HOUR, height: PX_PER_HOUR }}
                  >
                    <div className="absolute inset-x-0 top-0 h-px bg-gray-200 dark:bg-gray-600/50" />
                    <div className="absolute inset-x-0 h-px bg-gray-100 dark:bg-gray-700/30" style={{ top: PX_PER_HOUR / 2 }} />
                  </div>
                ))}

                {/* expand / fit — side-by-side via assignColumns */}
                {!isGroup && layouts.map(lay => (
                  <div
                    key={lay.lesson.id}
                    className="absolute z-10"
                    style={{
                      top:    lay.top + 1,
                      height: lay.height - 2,
                      left:   `calc(${(lay.col / lay.cols) * 100}% + 2px)`,
                      width:  `calc(${(1 / lay.cols) * 100}% - 4px)`,
                    }}
                  >
                    <LessonCard lesson={lay.lesson} height={lay.height - 2} onClick={() => onLessonClick(lay.lesson)} />
                  </div>
                ))}

                {/* group mode */}
                {isGroup && groups.map((g, gi) => {
                  const top    = Math.max(0, (toMin(g.startTime) - FIRST_MIN) / 60 * PX_PER_HOUR) + 1;
                  const height = Math.max(28, (toMin(g.endTime) - toMin(g.startTime)) / 60 * PX_PER_HOUR) - 2;
                  if (g.lessons.length === 1) {
                    return (
                      <div key={g.lessons[0].id} className="absolute z-10" style={{ top, height, left: 2, right: 2 }}>
                        <LessonCard lesson={g.lessons[0]} height={height} onClick={() => onLessonClick(g.lessons[0])} />
                      </div>
                    );
                  }
                  return (
                    <div
                      key={`grp-${gi}`}
                      className="absolute z-10 cursor-pointer"
                      style={{ top, height, left: 2, right: 2 }}
                      onClick={() => setOverlappingModal({
                        isOpen: true,
                        lessons: g.lessons,
                        timeSlot: `${formatTime(g.startTime)}–${formatTime(g.endTime)}`,
                      })}
                    >
                      <GroupBlock lessons={g.lessons} startTime={g.startTime} endTime={g.endTime} height={height} />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <OverlappingLessonsModal
        isOpen={overlappingModal.isOpen}
        onClose={() => setOverlappingModal({ isOpen: false, lessons: [], timeSlot: '' })}
        lessons={overlappingModal.lessons}
        timeSlot={overlappingModal.timeSlot}
        onLessonClick={onLessonClick}
      />
    </div>
  );
}

// ─── LessonCard ───────────────────────────────────────────────────────────────
interface LessonCardProps {
  lesson: Lesson;
  height: number;
  onClick: () => void;
}

function LessonCard({ lesson, height, onClick }: LessonCardProps) {
  const color  = generateSubjectColor(lesson.subject.subjectName);
  const status = getLessonStatusColor(lesson.lessonStatus);
  const cardRef = useRef<HTMLDivElement>(null);
  const [tipPos, setTipPos] = useState<{ top: number; left: number } | null>(null);

  const showBadges  = height >= 38;
  const showTime    = height >= 46;
  const showGroup   = height >= 76;
  const showRoom    = height >= 106;
  const showTeacher = height >= 136;

  const handleMouseEnter = () => {
    if (!cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    // prefer right side; if not enough room, flip to left
    const left = r.right + 8 + 240 > window.innerWidth ? r.left - 8 - 240 : r.right + 8;
    setTipPos({ top: Math.min(r.top, window.innerHeight - 220), left });
  };
  const handleMouseLeave = () => setTipPos(null);

  return (
    <>
      <div
        ref={cardRef}
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="rounded-lg border-l-4 cursor-pointer relative w-full h-full
                   bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600
                   transition-all duration-150 ease-out
                   hover:scale-[1.03] hover:shadow-lg hover:-translate-y-px hover:z-20"
        style={{ borderLeftColor: color, boxSizing: 'border-box' }}
      >
        <div className="px-1.5 py-1 flex flex-col h-full gap-0.5 overflow-hidden">
          <div className="flex items-start gap-1 min-w-0">
            <span className="font-semibold text-[12px] leading-tight text-gray-900 dark:text-white truncate flex-1 min-w-0">
              {lesson.subject.subjectName}
            </span>
            <div className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: status }} />
          </div>

          {showBadges && (lesson.isMakeUp || lesson.note) && (
            <div className="flex items-center gap-1">
              {lesson.isMakeUp && (
                <span className="text-[9px] px-1 py-px bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 rounded font-medium leading-none flex-shrink-0">
                  Отработка
                </span>
              )}
              {lesson.note && <ChatBubbleLeftIcon className="w-3 h-3 text-blue-400 flex-shrink-0" />}
            </div>
          )}

          {showTime && (
            <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400 leading-none truncate">
              {formatTime(lesson.startTime)}–{formatTime(lesson.endTime)}
            </div>
          )}
          {showGroup && (
            <div className="text-[11px] text-gray-700 dark:text-gray-200 leading-none truncate">
              {lesson.group.name}
            </div>
          )}
          {showRoom && (
            <div className="text-[10px] text-gray-500 dark:text-gray-400 leading-none truncate">
              {lesson.room.name}
            </div>
          )}
          {showTeacher && (
            <div className="text-[10px] text-gray-500 dark:text-gray-400 leading-none truncate">
              {lesson.teacher.name}
            </div>
          )}
        </div>
      </div>

      {/* Portal tooltip — renders at document.body, escapes all stacking contexts */}
      {tipPos && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none
                     bg-gray-900 text-white rounded-xl shadow-2xl border border-white/10
                     min-w-[230px] max-w-[280px]
                     animate-in fade-in zoom-in-95 duration-150"
          style={{ top: tipPos.top, left: tipPos.left }}
        >
          <div className="p-3">
            <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-white/10">
              <div className="w-2.5 h-2.5 rounded flex-shrink-0" style={{ backgroundColor: color }} />
              <span className="font-semibold text-[13px] leading-snug">{lesson.subject.subjectName}</span>
              <div className="w-2 h-2 rounded-full ml-auto flex-shrink-0" style={{ backgroundColor: status }} />
            </div>
            <div className="space-y-1.5 text-[12px]">
              <div className="flex items-center gap-2 text-gray-300">
                <span className="text-gray-500 text-[10px] uppercase tracking-wide w-14 flex-shrink-0">Группа</span>
                <span className="truncate">{lesson.group.name}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <span className="text-gray-500 text-[10px] uppercase tracking-wide w-14 flex-shrink-0">Время</span>
                <span>{formatTime(lesson.startTime)} – {formatTime(lesson.endTime)}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <span className="text-gray-500 text-[10px] uppercase tracking-wide w-14 flex-shrink-0">Учитель</span>
                <span className="truncate">{lesson.teacher.name}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <span className="text-gray-500 text-[10px] uppercase tracking-wide w-14 flex-shrink-0">Кабинет</span>
                <span className="truncate">{lesson.room.name}</span>
              </div>
              {lesson.isMakeUp && (
                <div className="text-orange-400 font-medium pt-1">↩ Отработка</div>
              )}
              {lesson.note && (
                <div className="pt-2 mt-1 border-t border-white/10 text-blue-300 text-[11px]">{lesson.note}</div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ─── GroupBlock ────────────────────────────────────────────────────────────────
interface GroupBlockProps {
  lessons:   Lesson[];
  startTime: string;
  endTime:   string;
  height:    number;
}

function GroupBlock({ lessons, startTime, endTime, height }: GroupBlockProps) {
  const colors   = lessons.map(l => generateSubjectColor(l.subject.subjectName));
  const freq: Record<string, number> = {};
  for (const c of colors) freq[c] = (freq[c] ?? 0) + 1;
  const dominant = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
  const isTiny   = height < 50;

  return (
    <div
      className="w-full h-full rounded-lg overflow-hidden relative hover:shadow-lg transition-all duration-150 ease-out cursor-pointer
                 hover:scale-[1.03] hover:-translate-y-px hover:z-20
                 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 border-l-4"
      style={{ borderLeftColor: dominant, boxSizing: 'border-box' }}
    >
      <div className={`flex flex-col h-full overflow-hidden ${isTiny ? 'justify-center px-1.5' : 'px-1.5 py-1'}`}>
        {isTiny ? (
          <span className="font-semibold text-[11px] text-gray-800 dark:text-white leading-none truncate">{lessons.length} зан.</span>
        ) : (
          <>
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-gray-900 dark:text-white" style={{ fontSize: height > 80 ? '18px' : '14px', lineHeight: 1 }}>
                {lessons.length}
              </span>
              <span className="text-gray-500 dark:text-gray-400 text-[10px] font-medium">зан.</span>
            </div>
            <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400 leading-none mt-0.5">
              {formatTime(startTime)}–{formatTime(endTime)}
            </div>
            {height >= 76 && (
              <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-snug truncate">
                {lessons.map(l => l.subject.subjectName).join(' · ')}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
