'use client';

import { Lesson, getTimeSlots, getLessonsForDay, formatTime, generateSubjectColor, getLessonStatusColor } from '@/types/Lesson';
import { ChatBubbleLeftIcon } from '@heroicons/react/24/outline';

interface DayViewProps {
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

// Group overlapping lessons together - improved version
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
    
    // Continue checking for overlaps until no more are found
    let foundNew = true;
    while (foundNew) {
      foundNew = false;
      for (let j = 0; j < sorted.length; j++) {
        if (used.has(sorted[j].id)) continue;
        
        // Check if sorted[j] overlaps with ANY lesson in the overlapping group
        const hasOverlap = overlapping.some(lesson => 
          timeRangesOverlap(lesson.startTime, lesson.endTime, sorted[j].startTime, sorted[j].endTime)
        );
        
        if (hasOverlap) {
          overlapping.push(sorted[j]);
          used.add(sorted[j].id);
          foundNew = true;
        }
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

export default function DayView({ date, lessons, onLessonClick }: DayViewProps) {
  const timeSlots = getTimeSlots(); // 08:00 - 23:00
  const dayLessons = getLessonsForDay(lessons, date);
  const timeSlotGroups = groupOverlappingLessons(dayLessons);

  // Calculate lesson position and height
  const getLessonPosition = (lesson: Lesson) => {
    const [startHour, startMin] = lesson.startTime.split(':').map(Number);
    const [endHour, endMin] = lesson.endTime.split(':').map(Number);
    
    const startTotalMin = startHour * 60 + startMin;
    const endTotalMin = endHour * 60 + endMin;
    
    // First time slot is 08:00 (8 * 60 = 480 minutes from midnight)
    const firstSlotMin = 8 * 60;
    
    // Calculate position relative to the first time slot (120px per hour for better visibility)
    const topOffset = ((startTotalMin - firstSlotMin) / 60) * 120;
    const height = ((endTotalMin - startTotalMin) / 60) * 120;
    
    return {
      top: Math.max(0, topOffset), // Ensure non-negative
      height: Math.max(60, height) // Minimum 60px for very short lessons
    };
  };

  return (
    <div className="flex flex-col h-full">
      {/* Day header */}
      <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 z-10">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {date.toLocaleDateString('ru-RU', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          })}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Занятий: {dayLessons.length}
        </p>
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative">
          {/* Time slots grid */}
          {timeSlots.map((timeSlot) => (
            <div
              key={timeSlot}
              className="flex border-b border-gray-100 dark:border-gray-700 h-[120px]"
            >
              {/* Time label */}
              <div className="w-16 flex-shrink-0 flex items-center justify-end pr-3 text-sm font-medium text-gray-600 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600">
                {timeSlot}
              </div>

              {/* Empty lesson area */}
              <div className="flex-1 relative">
                {/* This space will be filled by absolutely positioned lessons */}
              </div>
            </div>
          ))}

          {/* Absolutely positioned lessons */}
          <div className="absolute inset-0 left-16 pointer-events-none">
            {timeSlotGroups.map((slot, idx) => {
              const hasOverlap = slot.lessons.length > 1;
              
              if (hasOverlap) {
                // Calculate width for each overlapping lesson with proper gap
                const lessonWidth = 100 / slot.lessons.length;
                const gapPercent = 0.5; // 0.5% gap between lessons
                
                return (
                  <div key={`overlap-${idx}`} className="absolute inset-x-2 pointer-events-auto">
                    {slot.lessons.map((lesson, lessonIdx) => {
                      const position = getLessonPosition(lesson);
                      
                      return (
                        <div
                          key={lesson.id}
                          className="absolute"
                          style={{
                            top: `${position.top}px`,
                            height: `${position.height}px`,
                            left: `calc(${lessonIdx * lessonWidth}% + ${gapPercent}%)`,
                            width: `calc(${lessonWidth}% - ${gapPercent * 2}%)`,
                            zIndex: 10
                          }}
                        >
                          <LessonBlock
                            lesson={lesson}
                            onClick={() => onLessonClick(lesson)}
                            height={position.height}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              } else {
                const lesson = slot.lessons[0];
                const position = getLessonPosition(lesson);
                return (
                  <div
                    key={lesson.id}
                    className="absolute left-2 right-2 pointer-events-auto"
                    style={{
                      top: `${position.top}px`,
                      height: `${position.height}px`,
                      zIndex: 10
                    }}
                  >
                    <LessonBlock
                      lesson={lesson}
                      onClick={() => onLessonClick(lesson)}
                      height={position.height}
                    />
                  </div>
                );
              }
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

interface LessonBlockProps {
  lesson: Lesson;
  onClick: () => void;
  height?: number;
}

function LessonBlock({ lesson, onClick, height }: LessonBlockProps) {
  const subjectColor = generateSubjectColor(lesson.subject.subjectName);
  const statusColor = getLessonStatusColor(lesson.lessonStatus);
  
  // Определяем уровни отображения в зависимости от высоты (обновлено для 120px на час)
  const showFull = !height || height >= 140; // Вся информация (70+ минут)
  const showMedium = height && height >= 100 && height < 140; // Без преподавателя (50-70 минут)
  const showCompact = height && height >= 80 && height < 100; // Только предмет, группа, время (40-50 минут)
  const showMinimal = height && height < 80; // Только предмет и время (меньше 40 минут)

  return (
    <div
      onClick={onClick}
      className="p-2 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition-all relative group
                 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 overflow-hidden"
      style={{ 
        borderLeftColor: subjectColor,
        height: height ? `${height}px` : 'auto',
        maxHeight: height ? `${height}px` : 'none',
        boxSizing: 'border-box'
      }}
    >
      {/* Tooltip при наведении */}
      <div className="absolute left-full ml-2 top-0 hidden group-hover:block z-50 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl min-w-[240px] whitespace-nowrap">
        <div className="font-semibold text-sm mb-2 text-violet-300">{lesson.subject.subjectName}</div>
        <div className="space-y-1">
          <div><span className="text-gray-400">Группа:</span> {lesson.group.name}</div>
          <div><span className="text-gray-400">Время:</span> {formatTime(lesson.startTime)} - {formatTime(lesson.endTime)}</div>
          <div><span className="text-gray-400">Преподаватель:</span> {lesson.teacher.name}</div>
          <div><span className="text-gray-400">Кабинет:</span> {lesson.room.name}</div>
          {lesson.note && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <span className="text-gray-400">💬 Комментарий:</span>
              <div className="mt-1 text-blue-300">{lesson.note}</div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col h-full justify-between gap-1">
        {/* Заголовок с предметом и статусом */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="font-semibold text-gray-900 dark:text-white truncate text-sm">
                {lesson.subject.subjectName}
              </h4>
              {lesson.note && (
                <ChatBubbleLeftIcon 
                  className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 flex-shrink-0" 
                />
              )}
            </div>
          </div>
          
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
            style={{ backgroundColor: statusColor }}
            title={lesson.lessonStatus}
          />
        </div>

        {/* Информация в зависимости от высоты */}
        {showFull && (
          <>
            <div className="text-xs text-gray-600 dark:text-gray-300 truncate">
              👥 {lesson.group.name}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              🕐 {formatTime(lesson.startTime)} - {formatTime(lesson.endTime)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
              📍 {lesson.room.name}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
              👨‍🏫 {lesson.teacher.name}
            </div>
          </>
        )}

        {showMedium && (
          <>
            <div className="text-xs text-gray-600 dark:text-gray-300 truncate">
              👥 {lesson.group.name}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              🕐 {formatTime(lesson.startTime)} - {formatTime(lesson.endTime)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
              📍 {lesson.room.name}
            </div>
          </>
        )}

        {showCompact && (
          <>
            <div className="text-xs text-gray-600 dark:text-gray-300 truncate">
              {lesson.group.name}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {formatTime(lesson.startTime)} - {formatTime(lesson.endTime)}
            </div>
          </>
        )}

        {showMinimal && (
          <div className="text-[10px] text-gray-500 dark:text-gray-400">
            {formatTime(lesson.startTime)} - {formatTime(lesson.endTime)}
          </div>
        )}
      </div>
    </div>
  );
}