'use client';

import { useState } from 'react';
import { Lesson, getTimeSlots, getLessonsForDay, formatTime, generateSubjectColor, getLessonStatusColor } from '@/types/Lesson';
import OverlappingLessonsModal from './OverlappingLessonsModal';

interface RangeCalendarViewProps {
  dateFrom: Date;
  dateTo: Date;
  lessons: Lesson[];
  onLessonClick: (lesson: Lesson) => void;
}

interface TimeSlot {
  lessons: Lesson[];
  startTime: string;
  endTime: string;
}

// Helper function to check if two time ranges overlap
function timeRangesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const toMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };
  
  const s1 = toMinutes(start1);
  const e1 = toMinutes(end1);
  const s2 = toMinutes(start2);
  const e2 = toMinutes(end2);
  
  return s1 < e2 && s2 < e1;
}

// Group overlapping lessons together
function groupOverlappingLessons(lessonsList: Lesson[]): TimeSlot[] {
  if (lessonsList.length === 0) return [];
  
  const sorted = [...lessonsList].sort((a, b) => {
    const timeA = a.startTime.localeCompare(b.startTime);
    if (timeA !== 0) return timeA;
    return a.endTime.localeCompare(b.endTime);
  });
  
  const groups: TimeSlot[] = [];
  const used = new Set<string>();
  
  for (let i = 0; i < sorted.length; i++) {
    if (used.has(sorted[i].id)) continue;
    
    const overlapping: Lesson[] = [sorted[i]];
    used.add(sorted[i].id);
    
    for (let j = i + 1; j < sorted.length; j++) {
      if (used.has(sorted[j].id)) continue;
      
      const hasOverlap = overlapping.some(lesson => 
        timeRangesOverlap(lesson.startTime, lesson.endTime, sorted[j].startTime, sorted[j].endTime)
      );
      
      if (hasOverlap) {
        overlapping.push(sorted[j]);
        used.add(sorted[j].id);
      }
    }
    
    // Находим минимальное время начала и максимальное время окончания
    const minStartTime = overlapping.reduce((min, l) => l.startTime < min ? l.startTime : min, overlapping[0].startTime);
    const maxEndTime = overlapping.reduce((max, l) => l.endTime > max ? l.endTime : max, overlapping[0].endTime);
    
    groups.push({
      lessons: overlapping,
      startTime: minStartTime,
      endTime: maxEndTime
    });
  }
  
  return groups;
}

export default function RangeCalendarView({ dateFrom, dateTo, lessons, onLessonClick }: RangeCalendarViewProps) {
  const timeSlots = getTimeSlots(); // 08:00 - 23:00
  
  const [overlappingModal, setOverlappingModal] = useState<{
    isOpen: boolean;
    lessons: Lesson[];
    timeSlot: string;
  }>({
    isOpen: false,
    lessons: [],
    timeSlot: ''
  });

  // Generate array of days in the range
  const getRangeDays = (from: Date, to: Date): Date[] => {
    const days: Date[] = [];
    const current = new Date(from);
    const end = new Date(to);
    
    while (current <= end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const rangeDays = getRangeDays(dateFrom, dateTo);

  // Calculate lesson position and height
  const getLessonPosition = (lesson: Lesson) => {
    const [startHour, startMin] = lesson.startTime.split(':').map(Number);
    const [endHour, endMin] = lesson.endTime.split(':').map(Number);
    
    const startTotalMin = startHour * 60 + startMin;
    const endTotalMin = endHour * 60 + endMin;
    
    // First time slot is 08:00 (8 * 60 = 480 minutes from midnight)
    const firstSlotMin = 8 * 60;
    
    // Calculate position relative to the first time slot
    const topOffset = ((startTotalMin - firstSlotMin) / 60) * 60; // 60px per hour
    const height = ((endTotalMin - startTotalMin) / 60) * 60; // 60px per hour
    
    return {
      top: Math.max(0, topOffset),
      height: Math.max(25, height) // Minimum 25px for very short lessons
    };
  };

  // Calculate position for time slot (used for overlapping lessons block)
  const getTimeSlotPosition = (startTime: string, endTime: string) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startTotalMin = startHour * 60 + startMin;
    const endTotalMin = endHour * 60 + endMin;
    
    // First time slot is 08:00 (8 * 60 = 480 minutes from midnight)
    const firstSlotMin = 8 * 60;
    
    // Calculate position relative to the first time slot
    const topOffset = ((startTotalMin - firstSlotMin) / 60) * 60; // 60px per hour
    const height = ((endTotalMin - startTotalMin) / 60) * 60; // 60px per hour
    
    return {
      top: Math.max(0, topOffset),
      height: Math.max(25, height) // Minimum 25px for very short lessons
    };
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Single scrollable container — scrolls both X and Y together */}
      <div className="flex-1 overflow-auto">
        {/* Min-width: 64px time col + N × 128px day cols */}
        <div style={{ minWidth: `${64 + rangeDays.length * 128}px` }}>

          {/* Header — sticky to top */}
          <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="flex">
              {/* Time column header — sticky left */}
              <div className="sticky left-0 z-30 w-16 flex-shrink-0 p-2 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="text-xs text-gray-500 dark:text-gray-400">Время</div>
              </div>

              {/* Day headers — fixed 128px each */}
              {rangeDays.map((day) => {
                const dayLessons = getLessonsForDay(lessons, day);
                const isToday = day.toDateString() === new Date().toDateString();

                return (
                  <div
                    key={day.toISOString()}
                    className="flex-shrink-0 w-32 p-2 border-r border-gray-200 dark:border-gray-700 last:border-r-0"
                  >
                    <div className={`text-center ${isToday ? 'text-violet-600 dark:text-violet-400 font-semibold' : 'text-gray-900 dark:text-white'}`}>
                      <div className="text-sm font-medium">
                        {day.toLocaleDateString('ru-RU', { weekday: 'short' })}
                      </div>
                      <div className={`text-lg ${isToday ? 'bg-violet-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto' : ''}`}>
                        {day.getDate()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {day.toLocaleDateString('ru-RU', { month: 'short' })}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {dayLessons.length} занятий
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Time grid — positioned relative for absolutely-placed lesson cards */}
          <div className="relative">
            {/* Time slot rows */}
            {timeSlots.map((timeSlot) => (
              <div
                key={timeSlot}
                className="flex border-b border-gray-100 dark:border-gray-700 min-h-[60px]"
              >
                {/* Time label — sticky left, above lesson cards (z-20 > z-10) */}
                <div className="sticky left-0 z-20 w-16 flex-shrink-0 p-2 text-sm text-gray-500 dark:text-gray-400 border-r border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                  {timeSlot}
                </div>

                {/* Day cells — fixed 128px each */}
                {rangeDays.map((day) => (
                  <div
                    key={`${day.toISOString()}-${timeSlot}`}
                    className="flex-shrink-0 w-32 border-r border-gray-100 dark:border-gray-700 last:border-r-0"
                  />
                ))}
              </div>
            ))}

            {/* Absolutely positioned lesson columns — pixel offsets */}
            {rangeDays.map((day, dayIndex) => {
              const dayLessons = getLessonsForDay(lessons, day);
              const timeSlotGroups = groupOverlappingLessons(dayLessons);

              return (
                <div
                  key={`lessons-${day.toISOString()}`}
                  className="absolute top-0 pointer-events-none"
                  style={{
                    left: `${64 + dayIndex * 128}px`,
                    width: '126px',
                    height: '100%',
                    zIndex: 10
                  }}
                >
                  {timeSlotGroups.map((slot, idx) => {
                    const hasOverlap = slot.lessons.length > 1;
                    const position = hasOverlap
                      ? getTimeSlotPosition(slot.startTime, slot.endTime)
                      : getLessonPosition(slot.lessons[0]);

                    if (hasOverlap) {
                      return (
                        <div
                          key={`overlap-${idx}`}
                          className="absolute left-1 right-1 pointer-events-auto cursor-pointer"
                          style={{ top: `${position.top}px`, height: `${position.height}px` }}
                          onClick={() => setOverlappingModal({
                            isOpen: true,
                            lessons: slot.lessons,
                            timeSlot: `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`
                          })}
                        >
                          <div className="w-full h-full p-1.5 rounded text-xs bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 border border-amber-300 dark:border-amber-600 hover:shadow-sm transition-all overflow-hidden">
                            <div className="flex flex-col h-full justify-center gap-0.5">
                              <span className="font-semibold text-amber-900 dark:text-amber-100 truncate text-center">
                                {slot.lessons.length} {slot.lessons.length < 5 ? 'занятия' : 'занятий'}
                              </span>
                              <span className="text-amber-700 dark:text-amber-300 text-[10px] whitespace-nowrap text-center">
                                {formatTime(slot.startTime)}-{formatTime(slot.endTime)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      const lesson = slot.lessons[0];
                      return (
                        <div
                          key={lesson.id}
                          className="absolute left-1 right-1 pointer-events-auto"
                          style={{ top: `${position.top}px`, height: `${position.height}px` }}
                        >
                          <RangeLessonBlock
                            lesson={lesson}
                            onClick={() => onLessonClick(lesson)}
                            height={position.height}
                          />
                        </div>
                      );
                    }
                  })}
                </div>
              );
            })}
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

interface RangeLessonBlockProps {
  lesson: Lesson;
  onClick: () => void;
  height?: number;
}

function RangeLessonBlock({ lesson, onClick, height }: RangeLessonBlockProps) {
  const subjectColor = generateSubjectColor(lesson.subject.subjectName);
  const statusColor = getLessonStatusColor(lesson.lessonStatus);
  
  // Определяем, что показывать в зависимости от высоты блока
  const showFullInfo = !height || height >= 60; // Полная информация
  const showMinimal = height && height < 60 && height >= 35; // Только предмет и статус
  const showOnlySubject = height && height < 35; // Только предмет

  return (
    <div
      onClick={onClick}
      className="p-1 rounded-lg border-l-4 cursor-pointer hover:shadow-sm transition-all
                 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs overflow-hidden relative group"
      style={{ 
        borderLeftColor: subjectColor,
        height: height ? `${height}px` : 'auto',
        maxHeight: height ? `${height}px` : 'none',
        boxSizing: 'border-box'
      }}
      title={`${lesson.subject.subjectName}\n${lesson.group.name}\n${formatTime(lesson.startTime)}-${formatTime(lesson.endTime)}\n${lesson.room.name}${lesson.note ? `\nКомментарий: ${lesson.note}` : ''}`}
    >
      {/* Tooltip при наведении */}
      <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-50 bg-gray-900 text-white text-xs rounded p-2 shadow-lg min-w-[200px]">
        <div className="font-semibold mb-1">{lesson.subject.subjectName}</div>
        <div>Группа: {lesson.group.name}</div>
        <div>Время: {formatTime(lesson.startTime)}-{formatTime(lesson.endTime)}</div>
        <div>Кабинет: {lesson.room.name}</div>
        {lesson.isMakeUp && <div className="mt-1 text-orange-400 font-medium">↩ Отработка</div>}
        {lesson.note && <div className="mt-1 text-gray-300">💬 {lesson.note}</div>}
      </div>

      <div className="flex flex-col h-full justify-center">
        {showFullInfo && (
          <>
            <div className="flex items-center justify-between mb-0.5">
              <h4 className="font-medium text-gray-900 dark:text-white truncate flex-1 text-xs">
                {lesson.subject.subjectName}
              </h4>
              <div className="w-2 h-2 rounded-full flex-shrink-0 ml-1" style={{ backgroundColor: statusColor }} />
            </div>
            {lesson.isMakeUp && (
              <span className="text-[9px] px-1 py-px bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 rounded font-medium w-fit">
                Отработка
              </span>
            )}
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              {formatTime(lesson.startTime)}-{formatTime(lesson.endTime)}
            </p>
          </>
        )}

        {showMinimal && (
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900 dark:text-white truncate flex-1 text-xs">
              {lesson.subject.subjectName}
            </h4>
            <div className="w-2 h-2 rounded-full flex-shrink-0 ml-1" style={{ backgroundColor: statusColor }} />
          </div>
        )}

        {showOnlySubject && (
          <h4 className="font-medium text-gray-900 dark:text-white truncate text-[10px]">
            {lesson.subject.subjectName}
          </h4>
        )}
      </div>
    </div>
  );
}