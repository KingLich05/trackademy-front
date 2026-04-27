'use client';

import { useState } from 'react';
import { Lesson, getTimeSlots, getLessonsForDay, getWeekDays, formatTime, generateSubjectColor, getLessonStatusColor } from '@/types/Lesson';
import { ChatBubbleLeftIcon, ViewColumnsIcon, Bars3Icon } from '@heroicons/react/24/outline';
import OverlappingLessonsModal from './OverlappingLessonsModal';

interface WeekViewProps {
  date: Date;
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
    
    // Создаем группу для текущего урока
    const currentGroup: Lesson[] = [sorted[i]];
    used.add(sorted[i].id);
    let groupStartTime = sorted[i].startTime;
    let groupEndTime = sorted[i].endTime;
    
    // Ищем уроки, которые НАПРЯМУЮ пересекаются с любым уроком в группе
    // Используем итеративный подход с проверкой расширения временного окна группы
    let changed = true;
    while (changed) {
      changed = false;
      
      for (let j = i + 1; j < sorted.length; j++) {
        if (used.has(sorted[j].id)) continue;
        
        // Проверяем, пересекается ли урок j с временным окном ГРУППЫ
        // (а не с каждым отдельным уроком в группе)
        if (timeRangesOverlap(groupStartTime, groupEndTime, sorted[j].startTime, sorted[j].endTime)) {
          currentGroup.push(sorted[j]);
          used.add(sorted[j].id);
          
          // Расширяем временное окно группы
          if (sorted[j].startTime < groupStartTime) {
            groupStartTime = sorted[j].startTime;
          }
          if (sorted[j].endTime > groupEndTime) {
            groupEndTime = sorted[j].endTime;
          }
          
          changed = true;
        }
      }
    }
    
    groups.push({
      lessons: currentGroup,
      startTime: groupStartTime,
      endTime: groupEndTime
    });
  }
  
  return groups;
}

export default function WeekView({ date, lessons, onLessonClick }: WeekViewProps) {
  const timeSlots = getTimeSlots(); // 08:00 - 23:00
  const weekDays = getWeekDays(date);

  const [overlapMode, setOverlapMode] = useState<'side-by-side' | 'compact'>('compact');
  const [overlappingModal, setOverlappingModal] = useState<{
    isOpen: boolean;
    lessons: Lesson[];
    timeSlot: string;
  }>({ isOpen: false, lessons: [], timeSlot: '' });

  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  // Calculate lesson position and height
  const getLessonPosition = (lesson: Lesson) => {
    const [startHour, startMin] = lesson.startTime.split(':').map(Number);
    const [endHour, endMin] = lesson.endTime.split(':').map(Number);
    
    const startTotalMin = startHour * 60 + startMin;
    const endTotalMin = endHour * 60 + endMin;
    
    // First time slot is 08:00 (8 * 60 = 480 minutes from midnight)
    const firstSlotMin = 8 * 60;
    
    // Calculate position relative to the first time slot (120px per hour for consistency with DayView)
    const topOffset = ((startTotalMin - firstSlotMin) / 60) * 120;
    const height = ((endTotalMin - startTotalMin) / 60) * 120;
    
    return {
      top: Math.max(0, topOffset), // Ensure non-negative
      height: Math.max(60, height) // Minimum 60px for very short lessons
    };
  };

  const getTimeSlotPosition = (startTime: string, endTime: string) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startTotalMin = startHour * 60 + startMin;
    const endTotalMin = endHour * 60 + endMin;
    const firstSlotMin = 8 * 60;
    const topOffset = ((startTotalMin - firstSlotMin) / 60) * 120;
    const height = ((endTotalMin - startTotalMin) / 60) * 120;
    return { top: Math.max(0, topOffset), height: Math.max(60, height) };
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Overlap mode toggle */}
      <div className="flex justify-end items-center px-4 py-1.5 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
        <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">Наложения:</span>
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
          <button
            onClick={() => setOverlapMode('side-by-side')}
            title="Показывать рядом"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
              overlapMode === 'side-by-side'
                ? 'bg-white dark:bg-gray-600 text-violet-600 dark:text-violet-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <ViewColumnsIcon className="w-3.5 h-3.5" />
            Рядом
          </button>
          <button
            onClick={() => setOverlapMode('compact')}
            title="Объединить в один блок"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
              overlapMode === 'compact'
                ? 'bg-white dark:bg-gray-600 text-violet-600 dark:text-violet-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <Bars3Icon className="w-3.5 h-3.5" />
            Группой
          </button>
        </div>
      </div>

      {/* Single scrollable container — scrolls both X and Y together */}
      <div className="flex-1 overflow-auto">
        {/* Min-width wrapper: 64px time col + 7 × 110px day cols = 834px */}
        <div style={{ minWidth: '834px', width: '100%' }}>

          {/* Header — sticky to top of scroll container */}
          <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="flex">
              {/* Time column header — also sticky to left */}
              <div className="sticky left-0 z-30 w-16 flex-shrink-0 p-2 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="text-xs text-gray-500 dark:text-gray-400">Время</div>
              </div>

              {/* Day headers — grow to fill available width */}
              {weekDays.map((day, index) => {
                const dayLessons = getLessonsForDay(lessons, day);
                const isToday = day.toDateString() === new Date().toDateString();

                return (
                  <div
                    key={day.toISOString()}
                    className="flex-1 min-w-[110px] p-2 border-r border-gray-200 dark:border-gray-700 last:border-r-0"
                  >
                    <div className={`text-center ${isToday ? 'text-violet-600 dark:text-violet-400 font-semibold' : 'text-gray-900 dark:text-white'}`}>
                      <div className="text-sm font-medium">{dayNames[index]}</div>
                      <div className={`text-lg ${isToday ? 'bg-violet-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto' : ''}`}>
                        {day.getDate()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
                className="flex border-b border-gray-100 dark:border-gray-700 min-h-[120px]"
              >
                {/* Time label — sticky to left, above lesson cards (z-20 > z-10) */}
                <div className="sticky left-0 z-20 w-16 flex-shrink-0 p-2 text-sm text-gray-500 dark:text-gray-400 border-r border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                  {timeSlot}
                </div>

                {/* Day cells — grow to fill available width */}
                {weekDays.map((day) => (
                  <div
                    key={`${day.toISOString()}-${timeSlot}`}
                    className="flex-1 min-w-[110px] border-r border-gray-100 dark:border-gray-700 last:border-r-0"
                  />
                ))}
              </div>
            ))}

            {/* Absolutely positioned lesson columns — pixel offsets */}
            {weekDays.map((day, dayIndex) => {
              const dayLessons = getLessonsForDay(lessons, day);
              const timeSlotGroups = groupOverlappingLessons(dayLessons);

              return (
                <div
                  key={`lessons-${day.toISOString()}`}
                  className="absolute top-0 pointer-events-none"
                  style={{
                    left: `calc(64px + ${dayIndex} * ((100% - 64px) / 7))`,
                    width: `calc((100% - 64px) / 7 - 2px)`,
                    height: '100%',
                    zIndex: 10
                  }}
                >
                  {timeSlotGroups.flatMap((slot) => {
                    const count = slot.lessons.length;

                    if (count === 1) {
                      const lesson = slot.lessons[0];
                      const position = getLessonPosition(lesson);
                      return (
                        <div
                          key={lesson.id}
                          className="absolute left-1 right-1 pointer-events-auto"
                          style={{ top: `${position.top}px`, height: `${position.height}px` }}
                        >
                          <WeekLessonBlock
                            lesson={lesson}
                            onClick={() => onLessonClick(lesson)}
                            height={position.height}
                          />
                        </div>
                      );
                    }

                    if (overlapMode === 'compact') {
                      // Compact: single amber block, click opens modal
                      const position = getTimeSlotPosition(slot.startTime, slot.endTime);
                      const subjects = slot.lessons.map(l => l.subject.subjectName).join(', ');
                      return (
                        <div
                          key={`overlap-${slot.startTime}-${slot.endTime}`}
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
                                {formatTime(slot.startTime)}–{formatTime(slot.endTime)}
                              </span>
                              <span className="text-amber-700 dark:text-amber-300 text-[10px] truncate text-center">
                                {count} занятий
                              </span>
                              <span className="text-amber-600 dark:text-amber-400 text-[9px] truncate text-center">
                                {subjects}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Side-by-side for overlapping lessons
                    return slot.lessons.map((lesson, lessonIndex) => {
                      const position = getLessonPosition(lesson);
                      return (
                        <div
                          key={`${lesson.id}-col${lessonIndex}`}
                          className="absolute pointer-events-auto"
                          style={{
                            top: `${position.top}px`,
                            height: `${position.height}px`,
                            left: `calc(2px + ${lessonIndex} * (100% - 4px) / ${count})`,
                            width: `calc((100% - 4px) / ${count} - 1px)`,
                          }}
                        >
                          <WeekLessonBlock
                            lesson={lesson}
                            onClick={() => onLessonClick(lesson)}
                            height={position.height}
                          />
                        </div>
                      );
                    });
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

interface WeekLessonBlockProps {
  lesson: Lesson;
  onClick: () => void;
  height?: number;
}

function WeekLessonBlock({ lesson, onClick, height }: WeekLessonBlockProps) {
  const subjectColor = generateSubjectColor(lesson.subject.subjectName);
  const statusColor = getLessonStatusColor(lesson.lessonStatus);

  // Определяем, что показывать в зависимости от высоты блока (120px per hour scale)
  const showFullInfo = !height || height >= 120; // Полная информация
  const showMinimal = height && height < 120 && height >= 70; // Только предмет и статус
  const showOnlySubject = height && height < 70; // Только предмет

  return (
    <div
      onClick={onClick}
      className="w-full p-1 rounded text-xs cursor-pointer hover:shadow-sm transition-all
                 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 overflow-hidden relative group"
      style={{
        borderLeftColor: subjectColor,
        borderLeftWidth: '3px',
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

      <div className="flex flex-col h-full justify-center gap-0.5 py-0.5">
        {showFullInfo && (
          <>
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <span className="font-medium text-gray-900 dark:text-white text-xs leading-tight line-clamp-2">
                  {lesson.subject.subjectName}
                </span>
                {lesson.isMakeUp && (
                  <span className="text-[9px] px-1 py-px bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 rounded font-medium flex-shrink-0 whitespace-nowrap">
                    Отработка
                  </span>
                )}
                {lesson.note && (
                  <ChatBubbleLeftIcon className="w-3 h-3 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                )}
              </div>
              <div className="w-2 h-2 rounded-full ml-1 flex-shrink-0" style={{ backgroundColor: statusColor }} />
            </div>
            <div className="text-gray-700 dark:text-gray-300 text-[10px] leading-tight line-clamp-1">
              👥 {lesson.group.name}
            </div>
            <div className="text-gray-600 dark:text-gray-400 text-[10px] leading-tight">
              🕐 {formatTime(lesson.startTime)}-{formatTime(lesson.endTime)}
            </div>
            <div className="text-gray-600 dark:text-gray-400 text-[10px] leading-tight line-clamp-1">
              📍 {lesson.room.name}
            </div>
          </>
        )}

        {showMinimal && (
          <>
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900 dark:text-white text-xs leading-tight line-clamp-2 flex-1">
                {lesson.subject.subjectName}
              </span>
              <div className="w-2 h-2 rounded-full ml-1 flex-shrink-0" style={{ backgroundColor: statusColor }} />
            </div>
            <div className="text-gray-600 dark:text-gray-400 text-[10px] leading-tight">
              {formatTime(lesson.startTime)}-{formatTime(lesson.endTime)}
            </div>
          </>
        )}

        {showOnlySubject && (
          <span className="font-medium text-gray-900 dark:text-white text-[10px] leading-tight line-clamp-2">
            {lesson.subject.subjectName}
          </span>
        )}
      </div>
    </div>
  );
}