'use client';

import { Lesson, formatDate, formatTimeRange, getLessonStatusText, getLessonStatusColor, generateSubjectColor } from '@/types/Lesson';
import { getAttendanceStatusText, getAttendanceStatusColor } from '@/types/Attendance';
import { useState, useEffect } from 'react';
import QuickAttendance from '@/components/attendance/QuickAttendance';
import ImprovedAttendance from '@/components/attendance/ImprovedAttendance';
import StudentGradeModal from '@/components/attendance/StudentGradeModal';
import { useAuth } from '@/contexts/AuthContext';
import { AuthenticatedApiService } from '@/services/AuthenticatedApiService';
import { ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { useToast } from '@/contexts/ToastContext';
import { TimeInput } from '@/components/ui/TimeInput';
import { Room } from '@/types/Room';
import ReplaceTeacherModal from './ReplaceTeacherModal';

interface LessonDetailModalProps {
  lesson: Lesson;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function LessonDetailModal({ lesson, isOpen, onClose, onUpdate }: LessonDetailModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'details' | 'attendance' | 'quick-attendance'>('details');
  const [note, setNote] = useState(lesson.note || '');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteSuccess, setNoteSuccess] = useState(false);
  
  // Cancel modal state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  
  // Move modal state
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [moveDate, setMoveDate] = useState('');
  const [moveStartTime, setMoveStartTime] = useState('');
  const [moveEndTime, setMoveEndTime] = useState('');
  const [moveReason, setMoveReason] = useState('');
  const [isMoving, setIsMoving] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Replace teacher modal state
  const [isReplaceTeacherModalOpen, setIsReplaceTeacherModalOpen] = useState(false);

  // Update note when lesson changes
  useEffect(() => {
    setNote(lesson.note || '');
    setNoteError(null);
    setNoteSuccess(false);
  }, [lesson.id]);

  if (!isOpen) return null;

  // Check if user can edit notes (Administrator, Teacher or Owner)
  const userRole = user?.role;
  const roleStr = String(userRole);
  const isStudent = userRole === 'Student' || roleStr === '1';
  const isAdministrator = userRole === 'Administrator' || roleStr === '2';
  const isTeacher = userRole === 'Teacher' || roleStr === '3';
  const isOwner = userRole === 'Owner' || roleStr === '4';
  const canEditNote = isAdministrator || isTeacher || isOwner;

  const handleSaveNote = async () => {
    setIsSavingNote(true);
    setNoteError(null);
    setNoteSuccess(false);

    try {
      await AuthenticatedApiService.updateLessonNote(lesson.id, note);
      setNoteSuccess(true);
      
      // Update lesson data if callback provided
      if (onUpdate) {
        onUpdate();
      }

      // Hide success message after 3 seconds
      setTimeout(() => {
        setNoteSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error saving note:', error);
      setNoteError(error instanceof Error ? error.message : 'Ошибка при сохранении комментария');
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleCancelLesson = async () => {
    if (!cancelReason.trim()) {
      showToast('Пожалуйста, укажите причину отмены', 'error');
      return;
    }

    setIsCancelling(true);
    try {
      await AuthenticatedApiService.cancelLesson(lesson.id, 3, cancelReason);
      
      showToast('Урок успешно отменен', 'success');
      
      if (onUpdate) {
        onUpdate();
      }
      
      setIsCancelModalOpen(false);
      setCancelReason('');
      onClose();
    } catch (error) {
      console.error('Error cancelling lesson:', error);
      const errorMessage = (error as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error 
        || (error as { message?: string })?.message 
        || 'Ошибка при отмене урока';
      showToast(errorMessage, 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  const loadRooms = async () => {
    setLoadingRooms(true);
    try {
      const organizationId = user?.organizationId || localStorage.getItem('userOrganizationId');
      
      if (!organizationId) {
        showToast('Не удается определить организацию пользователя', 'error');
        return;
      }

      const requestBody = {
        pageNumber: 1,
        pageSize: 1000,
        organizationId: organizationId
      };

      const response = await AuthenticatedApiService.post<{
        items: Room[];
        totalCount: number;
        pageNumber: number;
        pageSize: number;
        totalPages: number;
      }>('/Room/GetAllRooms', requestBody);
      
      setRooms(response.items);
    } catch (error) {
      console.error('Failed to load rooms:', error);
      showToast('Не удалось загрузить список аудиторий', 'error');
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleMoveLesson = async () => {
    if (!moveDate || !moveStartTime || !moveEndTime || !moveReason.trim()) {
      showToast('Пожалуйста, заполните все поля', 'error');
      return;
    }

    setIsMoving(true);
    try {
      // Add seconds to time format (HH:mm:ss)
      const startTimeWithSeconds = moveStartTime.includes(':') && moveStartTime.split(':').length === 2 
        ? `${moveStartTime}:00` 
        : moveStartTime;
      const endTimeWithSeconds = moveEndTime.includes(':') && moveEndTime.split(':').length === 2 
        ? `${moveEndTime}:00` 
        : moveEndTime;
      
      await AuthenticatedApiService.moveLesson(
        lesson.id, 
        moveDate, 
        startTimeWithSeconds, 
        endTimeWithSeconds, 
        moveReason,
        selectedRoomId || undefined
      );
      
      showToast('Урок успешно перенесен', 'success');
      
      if (onUpdate) {
        onUpdate();
      }
      
      setIsMoveModalOpen(false);
      setMoveDate('');
      setMoveStartTime('');
      setMoveEndTime('');
      setMoveReason('');
      setSelectedRoomId('');
      onClose();
    } catch (error) {
      console.error('Error moving lesson:', error);
      const errorMessage = (error as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error 
        || (error as { message?: string })?.message 
        || 'Ошибка при переносе урока';
      showToast(errorMessage, 'error');
    } finally {
      setIsMoving(false);
    }
  };

  const subjectColor = generateSubjectColor(lesson.subject.subjectName);
  const statusColor = getLessonStatusColor(lesson.lessonStatus);
  
  // Присутствовали = Присутствовал (1) + Опоздал (3)
  const attendedStudents = lesson.students.filter(s => s.attendanceStatus === 1 || s.attendanceStatus === 3);
  // Отсутствовали = Отсутствовал (2) + Уважительная причина (4)
  const absentStudents = lesson.students.filter(s => s.attendanceStatus === 2 || s.attendanceStatus === 4);
  const unmarkedStudents = lesson.students.filter(s => s.attendanceStatus === null);

  return (
    <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {lesson.subject.subjectName}
              </h2>
              <div
                className="px-3 py-1 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: statusColor }}
              >
                {getLessonStatusText(lesson.lessonStatus)}
              </div>
            </div>
            
            <div className="text-gray-600 dark:text-gray-300 space-y-1">
              <p><strong>Дата:</strong> {formatDate(lesson.date)}</p>
              <p><strong>Время:</strong> {formatTimeRange(lesson.startTime, lesson.endTime)}</p>
              <p><strong>Группа:</strong> {lesson.group.name}</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'details'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Детали
          </button>
          {!isStudent && (
            <>
              <button
                onClick={() => setActiveTab('attendance')}
                className={`px-6 py-3 font-medium text-sm transition-colors ${
                  activeTab === 'attendance'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Студенты ({lesson.students.length})
              </button>
              <button
                onClick={() => setActiveTab('quick-attendance')}
                className={`px-6 py-3 font-medium text-sm transition-colors ${
                  activeTab === 'quick-attendance'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Отметить посещаемость
              </button>
            </>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          {activeTab === 'details' && (
            <DetailsTab
              lesson={lesson}
              subjectColor={subjectColor}
              note={note}
              setNote={setNote}
              canEditNote={canEditNote}
              isSavingNote={isSavingNote}
              noteError={noteError}
              noteSuccess={noteSuccess}
              onSaveNote={handleSaveNote}
            />
          )}
          
          {activeTab === 'attendance' && (
            <AttendanceTab
              students={lesson.students}
              attendedStudents={attendedStudents}
              absentStudents={absentStudents}
              unmarkedStudents={unmarkedStudents}
              lessonStatus={lesson.lessonStatus}
              lessonId={lesson.id}
              onUpdate={onUpdate || (() => {})}
              canViewGrades={!isStudent}
            />
          )}
          
          {activeTab === 'quick-attendance' && (
            <ImprovedAttendance 
              lesson={lesson} 
              onUpdate={onUpdate || (() => {})} 
              onClose={onClose}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex gap-3">
            {/* Show action buttons for Planned and Moved lessons, but not for Cancelled */}
            {/* Показываем кнопки только на вкладке "Детали" */}
            {activeTab === 'details' && (lesson.lessonStatus === 'Planned' || lesson.lessonStatus === 'Moved') && (isAdministrator || isTeacher || isOwner) && (
              <>
                <button
                  onClick={() => {
                    setIsMoveModalOpen(true);
                    setSelectedRoomId(lesson.room.id);
                    loadRooms();
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Перенести урок
                </button>
                <button
                  onClick={() => setIsReplaceTeacherModalOpen(true)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Заменить преподавателя
                </button>
                <button
                  onClick={() => setIsCancelModalOpen(true)}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Отменить урок
                </button>
              </>
            )}
          </div>
          
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>

      {/* Cancel Lesson Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Отменить урок
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Причина <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Укажите причину отмены урока..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsCancelModalOpen(false);
                  setCancelReason('');
                }}
                disabled={isCancelling}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleCancelLesson}
                disabled={isCancelling || !cancelReason.trim()}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isCancelling ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Отменяем...
                  </>
                ) : (
                  'Подтвердить отмену'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Lesson Modal */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Перенести урок
            </h3>
            
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Новая дата <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={moveDate}
                  onChange={(e) => setMoveDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Время начала <span className="text-red-500">*</span>
                  </label>
                  <TimeInput
                    value={moveStartTime}
                    onChange={(val) => setMoveStartTime(val || '')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Время окончания <span className="text-red-500">*</span>
                  </label>
                  <TimeInput
                    value={moveEndTime}
                    onChange={(val) => setMoveEndTime(val || '')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Аудитория
                </label>
                {loadingRooms ? (
                  <div className="flex items-center gap-2 px-3 py-2 text-gray-500 dark:text-gray-400">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Загрузка аудиторий...
                  </div>
                ) : (
                  <select
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Не менять аудиторию</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name} (вместимость: {room.capacity})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Причина <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={moveReason}
                  onChange={(e) => setMoveReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Укажите причину переноса урока..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsMoveModalOpen(false);
                  setMoveDate('');
                  setMoveStartTime('');
                  setMoveEndTime('');
                  setMoveReason('');
                  setSelectedRoomId('');
                }}
                disabled={isMoving}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleMoveLesson}
                disabled={isMoving || !moveDate || !moveStartTime || !moveEndTime || !moveReason.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isMoving ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Переносим...
                  </>
                ) : (
                  'Подтвердить перенос'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Replace Teacher Modal */}
      <ReplaceTeacherModal
        isOpen={isReplaceTeacherModalOpen}
        onClose={() => setIsReplaceTeacherModalOpen(false)}
        lessonId={lesson.id}
        currentTeacherId={lesson.teacher.id}
        currentTeacherName={lesson.teacher.name}
        onUpdate={onUpdate}
      />
    </div>
  );
}

interface DetailsTabProps {
  lesson: Lesson;
  subjectColor: string;
  note: string;
  setNote: (note: string) => void;
  canEditNote: boolean;
  isSavingNote: boolean;
  noteError: string | null;
  noteSuccess: boolean;
  onSaveNote: () => void;
}

function DetailsTab({ lesson, subjectColor, note, setNote, canEditNote, isSavingNote, noteError, noteSuccess, onSaveNote }: DetailsTabProps) {
  return (
    <div className="space-y-6">
      {/* Main Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Основная информация
          </h3>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Предмет</label>
              <div className="flex items-center gap-2 mt-1">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: subjectColor }}
                />
                <span className="text-gray-900 dark:text-white font-medium">
                  {lesson.subject.subjectName}
                </span>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Группа</label>
              <p className="text-gray-900 dark:text-white font-medium mt-1">
                {lesson.group.name}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Преподаватель</label>
              <p className="text-gray-900 dark:text-white font-medium mt-1">
                {lesson.teacher.name}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Аудитория</label>
              <p className="text-gray-900 dark:text-white font-medium mt-1">
                {lesson.room.name}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Расписание
          </h3>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Дата</label>
              <p className="text-gray-900 dark:text-white font-medium mt-1">
                {formatDate(lesson.date)}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Время</label>
              <p className="text-gray-900 dark:text-white font-medium mt-1">
                {formatTimeRange(lesson.startTime, lesson.endTime)}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Статус</label>
              <div className="mt-1">
                <span
                  className="px-3 py-1 rounded-full text-sm font-medium text-white"
                  style={{ backgroundColor: getLessonStatusColor(lesson.lessonStatus) }}
                >
                  {getLessonStatusText(lesson.lessonStatus)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Teacher Note Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <ChatBubbleLeftIcon className="w-5 h-5" />
          Примечание преподавателя
        </h3>
        
        {canEditNote ? (
          <div className="space-y-3">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Добавьте примечание к уроку..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[100px] resize-y"
              disabled={isSavingNote}
            />
            
            {noteError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-600 dark:text-red-400">{noteError}</p>
              </div>
            )}
            
            {noteSuccess && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Комментарий успешно сохранен
                </p>
              </div>
            )}
            
            <button
              onClick={onSaveNote}
              disabled={isSavingNote}
              className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-medium"
            >
              {isSavingNote ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Сохранение...
                </span>
              ) : (
                'Сохранить комментарий'
              )}
            </button>
          </div>
        ) : (
          <div>
            {lesson.note ? (
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{lesson.note}</p>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">Примечание отсутствует</p>
            )}
          </div>
        )}
      </div>

      {/* Cancel Reason */}
      {lesson.cancelReason && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Причина
          </h3>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-red-600 dark:text-red-400">{lesson.cancelReason}</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface AttendanceTabProps {
  students: Lesson['students'];
  attendedStudents: Lesson['students'];
  absentStudents: Lesson['students'];
  unmarkedStudents: Lesson['students'];
  lessonStatus: Lesson['lessonStatus'];
  lessonId: string;
  onUpdate: () => void;
  canViewGrades: boolean;
}

function AttendanceTab({ students, attendedStudents, absentStudents, unmarkedStudents, lessonStatus, lessonId, onUpdate, canViewGrades }: AttendanceTabProps) {
  const [selectedStudent, setSelectedStudent] = useState<typeof students[0] | null>(null);
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);

  if (lessonStatus === 'Planned') {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 dark:text-gray-500 text-4xl mb-4">
          📅
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Занятие ещё не проведено
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Посещаемость будет доступна после проведения занятия
        </p>
      </div>
    );
  }

  const handleStudentClick = (student: typeof students[0]) => {
    setSelectedStudent(student);
    setIsGradeModalOpen(true);
  };

  const handleModalClose = () => {
    setIsGradeModalOpen(false);
    setSelectedStudent(null);
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {students.length}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Всего студентов
          </div>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {attendedStudents.length}
          </div>
          <div className="text-sm text-green-600 dark:text-green-400">
            Присутствовали
          </div>
        </div>
        
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {absentStudents.length}
          </div>
          <div className="text-sm text-red-600 dark:text-red-400">
            Отсутствовали
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
            {unmarkedStudents.length}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Не отмечены
          </div>
        </div>
      </div>

      {/* Instructions */}
      {canViewGrades && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="text-blue-600 dark:text-blue-400 mt-0.5">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Индивидуальное редактирование
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-200 mt-1">
                Нажмите на студента для редактирования статуса, добавления оценки и комментария
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Student List */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Список студентов
        </h3>
        
        <div className="space-y-2">
          {students.map((student) => (
            <div
              key={student.id}
              onClick={canViewGrades ? () => handleStudentClick(student) : undefined}
              className={`flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg transition-colors ${
                canViewGrades 
                  ? 'hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer border border-transparent hover:border-blue-200 dark:hover:border-blue-600'
                  : 'border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                {student.photoPath ? (
                  <img
                    src={student.photoPath}
                    alt={student.fullName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                    <span className="text-gray-600 dark:text-gray-300 font-medium text-lg">
                      {student.fullName.charAt(0)}
                    </span>
                  </div>
                )}
                
                <div>
                  <span className="font-medium text-gray-900 dark:text-white block">
                    {student.fullName}
                  </span>
                  {canViewGrades && student.grade && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Оценка: {student.grade}
                    </span>
                  )}
                  {canViewGrades && student.comment && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm truncate">
                      💬 {student.comment}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span
                    className="px-3 py-1 rounded-full text-sm font-medium"
                    style={{
                      backgroundColor: getAttendanceStatusColor(student.attendanceStatus) + '20',
                      color: getAttendanceStatusColor(student.attendanceStatus),
                    }}
                  >
                    {getAttendanceStatusText(student.attendanceStatus)}
                  </span>
                  {canViewGrades && (student.grade || student.comment) && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {student.grade && `Оценка: ${student.grade}`}
                      {student.grade && student.comment && ' • '}
                      {student.comment && 'Есть комментарий'}
                    </div>
                  )}
                </div>
                
                {canViewGrades && (
                  <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Student Grade Modal */}
      {canViewGrades && selectedStudent && (
        <StudentGradeModal
          student={selectedStudent}
          lessonId={lessonId}
          isOpen={isGradeModalOpen}
          onClose={handleModalClose}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
}