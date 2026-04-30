import React from 'react';
import { XMarkIcon, ClockIcon, UserGroupIcon, UserIcon, HomeIcon } from '@heroicons/react/24/outline';
import { Schedule, formatScheduleSlots } from '../../types/Schedule';

interface OverlappingSchedulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedules: Schedule[];
  timeSlot: string;
  onScheduleClick?: (schedule: Schedule) => void;
}

export const OverlappingSchedulesModal: React.FC<OverlappingSchedulesModalProps> = ({
  isOpen,
  onClose,
  schedules,
  timeSlot,
  onScheduleClick
}) => {
  if (!isOpen) return null;

  // Debug logging
  console.log('OverlappingSchedulesModal - schedules:', schedules);
  console.log('OverlappingSchedulesModal - schedules length:', schedules?.length);
  if (schedules && schedules.length > 0) {
    console.log('First schedule:', schedules[0]);
    console.log('First schedule keys:', Object.keys(schedules[0]));
    console.log('First schedule subject:', schedules[0].subject);
    console.log('First schedule group:', schedules[0].group);
    console.log('First schedule teacher:', schedules[0].teacher);
    console.log('First schedule room:', schedules[0].room);
  }

  const handleScheduleClick = (schedule: Schedule) => {
    onScheduleClick?.(schedule);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Background overlay */}
      <div 
        className="fixed inset-0 bg-black/50 dark:bg-black/70 transition-opacity"
        onClick={onClose}
      />

      {/* Modal content */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden z-10">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Наложение занятий
                </h3>
                <p className="text-sm text-violet-100 mt-1">
                  <ClockIcon className="inline-block w-4 h-4 mr-1" />
                  {timeSlot} • {schedules.length} {schedules.length === 1 ? 'занятие' : schedules.length < 5 ? 'занятия' : 'занятий'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-violet-100 transition-colors p-1 hover:bg-white/10 rounded-lg"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
            {!schedules || schedules.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">Нет данных о расписании</p>
              </div>
            ) : (
              <div className="space-y-3">
                {schedules.map((schedule, index) => (
                <div
                  key={`${schedule.id}-${index}`}
                  onClick={() => handleScheduleClick(schedule)}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-violet-300 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 cursor-pointer transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                        {schedule.subject.subjectName}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-300">
                          <ClockIcon className="w-3 h-3 mr-1" />
                          {formatScheduleSlots(schedule.scheduleSlots)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-start gap-2">
                      <UserGroupIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">
                          Группа
                        </div>
                        <div className="text-sm text-gray-900 dark:text-white font-medium truncate">
                          {schedule.group.name}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <UserIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">
                          Преподаватель
                        </div>
                        <div className="text-sm text-gray-900 dark:text-white truncate">
                          {schedule.teacher.name}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <HomeIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">
                          Аудитория
                        </div>
                        <div className="text-sm text-gray-900 dark:text-white truncate">
                          {schedule.room?.name ?? '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            )}
          </div>
      </div>
    </div>
  );
};
