'use client';

import { useState } from 'react';
import { Lesson, getLessonsForDay, getCalendarGrid, generateSubjectColor, formatTime } from '@/types/Lesson';
import { ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import OverlappingLessonsModal from './OverlappingLessonsModal';

interface MonthViewProps {
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
    
    const maxEndTime = overlapping.reduce((max, l) => l.endTime > max ? l.endTime : max, overlapping[0].endTime);
    
    groups.push({
      lessons: overlapping,
      startTime: overlapping[0].startTime,
      endTime: maxEndTime
    });
  }
  
  // Сортируем группы по времени начала, чтобы ранние уроки были сверху
  return groups.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export default function MonthView({ date, lessons, onLessonClick }: MonthViewProps) {
  const calendarDays = getCalendarGrid(date);
  const currentMonth = date.getMonth();
  const today = new Date();
  
  const [overlappingModal, setOverlappingModal] = useState<{
    isOpen: boolean;
    lessons: Lesson[];
    timeSlot: string;
  }>({
    isOpen: false,
    lessons: [],
    timeSlot: ''
  });

  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  return (
    <div className="flex flex-col h-full">
      {/* Month header */}
      <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-10">
        <div className="grid grid-cols-7">
          {dayNames.map((dayName) => (
            <div
              key={dayName}
              className="p-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 last:border-r-0"
            >
              {dayName}
            </div>
          ))}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-7" style={{ gridTemplateRows: 'repeat(6, minmax(140px, 1fr))' }}>
          {calendarDays.map((day) => {
            const dayLessons = getLessonsForDay(lessons, day);
            const isCurrentMonth = day.getMonth() === currentMonth;
            const isToday = day.toDateString() === today.toDateString();
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;

            return (
              <div
                key={day.toISOString()}
                className={`border-r border-b border-gray-200 dark:border-gray-700 p-2 min-h-[140px] last:border-r-0 ${
                  isCurrentMonth 
                    ? 'bg-white dark:bg-gray-800' 
                    : 'bg-gray-50 dark:bg-gray-900'
                } ${isWeekend ? 'bg-gray-25 dark:bg-gray-850' : ''}`}
              >
                {/* Day number */}
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`text-sm font-medium ${
                      isToday
                        ? 'bg-violet-600 text-white rounded-full w-6 h-6 flex items-center justify-center'
                        : isCurrentMonth
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {day.getDate()}
                  </div>
                  
                  {dayLessons.length > 0 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {dayLessons.length}
                    </div>
                  )}
                </div>

                {/* Lessons */}
                <div className="space-y-1">
                  {(() => {
                    const timeSlotGroups = groupOverlappingLessons(dayLessons);
                    const displaySlots = timeSlotGroups.slice(0, 3);
                    
                    return (
                      <>
                        {displaySlots.map((slot, idx) => {
                          const hasOverlap = slot.lessons.length > 1;
                          
                          if (hasOverlap) {
                            // Получаем все предметы для отображения
                            const subjects = slot.lessons.map(l => l.subject.subjectName).join(', ');
                            
                            return (
                              <div
                                key={`overlap-${idx}`}
                                onClick={() => setOverlappingModal({
                                  isOpen: true,
                                  lessons: slot.lessons,
                                  timeSlot: `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`
                                })}
                                className="text-xs p-1 rounded cursor-pointer hover:shadow-sm transition-all
                                           bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-800/50 border border-amber-300 dark:border-amber-600"
                                style={{ 
                                  borderLeft: '3px solid #f59e0b',
                                  paddingLeft: '6px'
                                }}
                                title={`${slot.lessons.length} накладывающихся ${slot.lessons.length === 1 ? 'занятие' : slot.lessons.length < 5 ? 'занятия' : 'занятий'} (${formatTime(slot.startTime)}-${formatTime(slot.endTime)})\n${subjects}`}
                              >
                                <div className="flex items-center gap-1 font-semibold text-amber-900 dark:text-amber-100">
                                  <span className="line-clamp-1 flex-1 min-w-0">
                                    {formatTime(slot.startTime)} • {subjects}
                                  </span>
                                </div>
                              </div>
                            );
                          } else {
                            const lesson = slot.lessons[0];
                            return (
                              <MonthLessonBlock
                                key={lesson.id}
                                lesson={lesson}
                                onClick={() => onLessonClick(lesson)}
                              />
                            );
                          }
                        })}
                        
                        {timeSlotGroups.length > 3 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-1">
                            +{timeSlotGroups.length - 3} еще
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            );
          })}
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

interface MonthLessonBlockProps {
  lesson: Lesson;
  onClick: () => void;
}

function MonthLessonBlock({ lesson, onClick }: MonthLessonBlockProps) {
  const subjectColor = generateSubjectColor(lesson.subject.subjectName);

  return (
    <div
      onClick={onClick}
      className="text-xs p-1 rounded cursor-pointer hover:shadow-sm transition-all truncate
                 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
      style={{ 
        borderLeft: `3px solid ${subjectColor}`,
        paddingLeft: '6px'
      }}
      title={`${lesson.subject.subjectName} - ${lesson.group.name} (${formatTime(lesson.startTime)}-${formatTime(lesson.endTime)})${lesson.isMakeUp ? ' • Отработка' : ''}${lesson.note ? ' • Есть комментарий' : ''}`}
    >
      <div className="flex items-center gap-1 font-medium text-gray-900 dark:text-white">
        {lesson.isMakeUp && (
          <span className="text-orange-500 dark:text-orange-400 flex-shrink-0" title="Отработка">↩</span>
        )}
        <span className="line-clamp-1 flex-1 min-w-0">
          {formatTime(lesson.startTime)} {lesson.subject.subjectName}
        </span>
        {lesson.note && (
          <ChatBubbleLeftIcon 
            className="w-3 h-3 text-blue-500 dark:text-blue-400 flex-shrink-0" 
          />
        )}
      </div>
    </div>
  );
}