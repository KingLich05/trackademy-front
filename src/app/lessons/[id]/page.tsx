'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  Lesson,
  formatDate,
  formatTimeRange,
  getLessonStatusText,
  getLessonStatusColor,
  generateSubjectColor,
} from '@/types/Lesson';
import { getAttendanceStatusText, getAttendanceStatusColor } from '@/types/Attendance';
import { Room } from '@/types/Room';
import { AuthenticatedApiService } from '@/services/AuthenticatedApiService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { ProtectedPage } from '@/components/ProtectedPage';
import ImprovedAttendance from '@/components/attendance/ImprovedAttendance';
import StudentGradeModal from '@/components/attendance/StudentGradeModal';
import ReplaceTeacherModal from '@/components/calendar/ReplaceTeacherModal';
import QrRegistrationModal from '@/components/calendar/QrRegistrationModal';
import { TimeInput } from '@/components/ui/TimeInput';
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  AcademicCapIcon,
  BuildingOfficeIcon,
  BookOpenIcon,
  ChatBubbleLeftIcon,
  QrCodeIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = 'details' | 'students' | 'attendance';

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LessonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <ProtectedPage>
      <LessonDetailContent lessonId={id} />
    </ProtectedPage>
  );
}

// ─── Content ─────────────────────────────────────────────────────────────────

function LessonDetailContent({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [note, setNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteSuccess, setNoteSuccess] = useState(false);

  // Action panels
  const [actionPanel, setActionPanel] = useState<'move' | 'cancel' | 'restore' | null>(null);

  // Move form
  const [moveDate, setMoveDate] = useState('');
  const [moveStartTime, setMoveStartTime] = useState('');
  const [moveEndTime, setMoveEndTime] = useState('');
  const [moveReason, setMoveReason] = useState('');
  const [isMoving, setIsMoving] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Cancel form
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Restore form
  const [restoreReason, setRestoreReason] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

  // Sub-modals
  const [isReplaceTeacherOpen, setIsReplaceTeacherOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);

  // Attendance grade modal
  const [selectedStudent, setSelectedStudent] = useState<Lesson['students'][0] | null>(null);
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);

  // ── Roles ──
  const userRole = user?.role;
  const roleStr = String(userRole);
  const isStudent = userRole === 'Student' || roleStr === '1';
  const isAdministrator = userRole === 'Administrator' || roleStr === '2';
  const isTeacher = userRole === 'Teacher' || roleStr === '3';
  const isOwner = userRole === 'Owner' || roleStr === '4';
  const canEdit = isAdministrator || isTeacher || isOwner;

  // ── Load lesson ──
  const loadLesson = useCallback(async () => {
    try {
      const data = await AuthenticatedApiService.getLessonById(lessonId);
      setLesson(data);
      setNote(data.note || '');
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    loadLesson();
  }, [loadLesson]);

  // Collapse action panel when lesson status changes (after action)
  useEffect(() => {
    if (lesson) setActionPanel(null);
  }, [lesson?.lessonStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset to details tab on cancel
  useEffect(() => {
    if (lesson?.lessonStatus === 'Cancelled') setActiveTab('details');
  }, [lesson?.lessonStatus]);

  // ── Load rooms ──
  const loadRooms = useCallback(async () => {
    setLoadingRooms(true);
    try {
      const orgId = user?.organizationId || localStorage.getItem('userOrganizationId');
      if (!orgId) return;
      const res = await AuthenticatedApiService.post<{ items: Room[] }>('/Room/GetAllRooms', {
        pageNumber: 1,
        pageSize: 1000,
        organizationId: orgId,
      });
      setRooms(res.items);
    } catch {
      showToast('Не удалось загрузить список аудиторий', 'error');
    } finally {
      setLoadingRooms(false);
    }
  }, [user?.organizationId, showToast]);

  // ── Actions ──
  const handleSaveNote = async () => {
    if (!lesson) return;
    setIsSavingNote(true);
    setNoteError(null);
    setNoteSuccess(false);
    try {
      await AuthenticatedApiService.updateLessonNote(lesson.id, note);
      setNoteSuccess(true);
      await loadLesson();
      setTimeout(() => setNoteSuccess(false), 3000);
    } catch (e) {
      setNoteError(e instanceof Error ? e.message : 'Ошибка при сохранении');
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleMove = async () => {
    if (!lesson || !moveDate || !moveStartTime || !moveEndTime || !moveReason.trim()) {
      showToast('Заполните все поля', 'error');
      return;
    }
    setIsMoving(true);
    try {
      const pad = (t: string) => (t.split(':').length === 2 ? `${t}:00` : t);
      await AuthenticatedApiService.moveLesson(lesson.id, moveDate, pad(moveStartTime), pad(moveEndTime), moveReason, selectedRoomId || undefined);
      showToast('Урок успешно перенесён', 'success');
      setActionPanel(null);
      setMoveDate(''); setMoveStartTime(''); setMoveEndTime(''); setMoveReason(''); setSelectedRoomId('');
      await loadLesson();
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error || (e as { message?: string })?.message || 'Ошибка';
      showToast(msg, 'error');
    } finally {
      setIsMoving(false);
    }
  };

  const handleCancel = async () => {
    if (!lesson || !cancelReason.trim()) { showToast('Укажите причину', 'error'); return; }
    setIsCancelling(true);
    try {
      await AuthenticatedApiService.cancelLesson(lesson.id, 3, cancelReason);
      showToast('Урок отменён', 'success');
      setActionPanel(null);
      setCancelReason('');
      await loadLesson();
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error || (e as { message?: string })?.message || 'Ошибка';
      showToast(msg, 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRestore = async () => {
    if (!lesson || !restoreReason.trim()) { showToast('Укажите причину', 'error'); return; }
    setIsRestoring(true);
    try {
      await AuthenticatedApiService.restoreLesson(lesson.id, restoreReason);
      showToast('Урок восстановлен', 'success');
      setActionPanel(null);
      setRestoreReason('');
      await loadLesson();
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error || (e as { message?: string })?.message || 'Ошибка';
      showToast(msg, 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  // ─── Render states ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600"></div>
          <p>Загрузка урока...</p>
        </div>
      </div>
    );
  }

  if (notFound || !lesson) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-gray-500 dark:text-gray-400 text-lg">Урок не найден</p>
        <button onClick={() => router.push('/lessons')} className="text-violet-600 hover:underline flex items-center gap-1">
          <ArrowLeftIcon className="w-4 h-4" /> Вернуться к расписанию
        </button>
      </div>
    );
  }

  const subjectColor = generateSubjectColor(lesson.subject.subjectName);
  const statusColor = getLessonStatusColor(lesson.lessonStatus);
  const isCancelled = lesson.lessonStatus === 'Cancelled';
  const isActionable = lesson.lessonStatus === 'Planned' || lesson.lessonStatus === 'Moved';

  const attendedStudents = lesson.students.filter(s => s.attendanceStatus === 1 || s.attendanceStatus === 3);
  const absentStudents = lesson.students.filter(s => s.attendanceStatus === 2 || s.attendanceStatus === 4);
  const unmarkedStudents = lesson.students.filter(s => s.attendanceStatus === null);

  return (
    <div className="space-y-4">
      {/* ── Back button ────────────────────────────────────────────── */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all text-sm font-medium w-fit"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Назад
      </button>

      {/* ── Hero Card ────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden shadow-lg"
        style={{ background: `linear-gradient(135deg, ${subjectColor}22, ${subjectColor}11)` }}
      >
        <div className="border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-3">
                <div
                  className="w-5 h-5 rounded-md flex-shrink-0"
                  style={{ backgroundColor: subjectColor }}
                />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {lesson.subject.subjectName}
                </h1>
                <span
                  className="px-3 py-1 rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: statusColor }}
                >
                  {getLessonStatusText(lesson.lessonStatus)}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                <InfoChip icon={<CalendarDaysIcon className="w-4 h-4" />} label="Дата" value={formatDate(lesson.date)} />
                <InfoChip icon={<ClockIcon className="w-4 h-4" />} label="Время" value={formatTimeRange(lesson.startTime, lesson.endTime)} />
                <InfoChip icon={<UserGroupIcon className="w-4 h-4" />} label="Группа" value={lesson.group.name} />
                <InfoChip icon={<BuildingOfficeIcon className="w-4 h-4" />} label="Кабинет" value={lesson.room.name} />
              </div>
            </div>

            {/* ── Action buttons ── */}
            {canEdit && (
              <div className="flex flex-wrap gap-2 flex-shrink-0">
                {isActionable && (
                  <>
                    <ActionButton
                      label="Перенести"
                      color="blue"
                      active={actionPanel === 'move'}
                      onClick={() => {
                        if (actionPanel === 'move') { setActionPanel(null); return; }
                        setSelectedRoomId(lesson.room.id);
                        loadRooms();
                        setActionPanel('move');
                      }}
                      icon={<CalendarDaysIcon className="w-4 h-4" />}
                    />
                    {(isAdministrator || isOwner) && (
                      <ActionButton
                        label="Заменить преп."
                        color="emerald"
                        onClick={() => setIsReplaceTeacherOpen(true)}
                        icon={<UserIcon className="w-4 h-4" />}
                      />
                    )}
                    <ActionButton
                      label="Отменить"
                      color="red"
                      active={actionPanel === 'cancel'}
                      onClick={() => setActionPanel(actionPanel === 'cancel' ? null : 'cancel')}
                      icon={<XCircleIcon className="w-4 h-4" />}
                    />
                    <ActionButton
                      label="QR-регистрация"
                      color="indigo"
                      onClick={() => setIsQrOpen(true)}
                      icon={<QrCodeIcon className="w-4 h-4" />}
                    />
                  </>
                )}
                {isCancelled && (
                  <ActionButton
                    label="Восстановить"
                    color="green"
                    active={actionPanel === 'restore'}
                    onClick={() => setActionPanel(actionPanel === 'restore' ? null : 'restore')}
                    icon={<CheckCircleIcon className="w-4 h-4" />}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Inline Action Panels ─────────────────────────────────────── */}
      {actionPanel === 'move' && (
        <ActionPanel title="Перенести урок" onClose={() => setActionPanel(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Новая дата <RequiredStar />
              </label>
              <input
                type="date"
                value={moveDate}
                onChange={(e) => setMoveDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Начало <RequiredStar />
              </label>
              <TimeInput value={moveStartTime} onChange={(v) => setMoveStartTime(v || '')} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Конец <RequiredStar />
              </label>
              <TimeInput value={moveEndTime} onChange={(v) => setMoveEndTime(v || '')} className={inputClass} />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Аудитория
            </label>
            {loadingRooms ? (
              <p className="text-sm text-gray-400">Загрузка...</p>
            ) : (
              <select value={selectedRoomId} onChange={(e) => setSelectedRoomId(e.target.value)} className={inputClass}>
                <option value="">Не менять аудиторию</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} (вместимость: {r.capacity})</option>
                ))}
              </select>
            )}
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Причина <RequiredStar />
            </label>
            <textarea
              value={moveReason}
              onChange={(e) => setMoveReason(e.target.value)}
              rows={3}
              className={inputClass}
              placeholder="Укажите причину переноса..."
            />
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <button onClick={() => setActionPanel(null)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors text-sm">
              Отмена
            </button>
            <SubmitButton onClick={handleMove} loading={isMoving} loadingLabel="Переносим..." label="Подтвердить перенос" color="blue"
              disabled={!moveDate || !moveStartTime || !moveEndTime || !moveReason.trim()} />
          </div>
        </ActionPanel>
      )}

      {actionPanel === 'cancel' && (
        <ActionPanel title="Отменить урок" onClose={() => setActionPanel(null)}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Причина <RequiredStar />
          </label>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={4}
            className={inputClass}
            placeholder="Укажите причину отмены урока..."
          />
          <div className="mt-4 flex justify-end gap-3">
            <button onClick={() => setActionPanel(null)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors text-sm">
              Отмена
            </button>
            <SubmitButton onClick={handleCancel} loading={isCancelling} loadingLabel="Отменяем..." label="Подтвердить отмену" color="red"
              disabled={!cancelReason.trim()} />
          </div>
        </ActionPanel>
      )}

      {actionPanel === 'restore' && (
        <ActionPanel title="Восстановить урок" onClose={() => setActionPanel(null)}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Причина <RequiredStar />
          </label>
          <textarea
            value={restoreReason}
            onChange={(e) => setRestoreReason(e.target.value)}
            rows={4}
            className={inputClass}
            placeholder="Укажите причину восстановления..."
          />
          <div className="mt-4 flex justify-end gap-3">
            <button onClick={() => setActionPanel(null)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors text-sm">
              Отмена
            </button>
            <SubmitButton onClick={handleRestore} loading={isRestoring} loadingLabel="Восстанавливаем..." label="Подтвердить восстановление" color="green"
              disabled={!restoreReason.trim()} />
          </div>
        </ActionPanel>
      )}

      {/* ── Tab Navigation ───────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <TabButton label="Детали урока" icon={<BookOpenIcon className="w-4 h-4" />} active={activeTab === 'details'} onClick={() => setActiveTab('details')} />
          {!isStudent && !isCancelled && (
            <>
              <TabButton
                label={`Студенты (${lesson.students.length})`}
                icon={<UserGroupIcon className="w-4 h-4" />}
                active={activeTab === 'students'}
                onClick={() => setActiveTab('students')}
              />
              <TabButton
                label="Посещаемость"
                icon={<PencilSquareIcon className="w-4 h-4" />}
                active={activeTab === 'attendance'}
                onClick={() => setActiveTab('attendance')}
              />
            </>
          )}
        </div>

        {/* ── Tab Content ── */}
        <div className="p-6">
          {/* DETAILS TAB */}
          {activeTab === 'details' && (
            <div className="space-y-8">
              {/* Info grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <section className="space-y-4">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2">
                    Основная информация
                  </h2>
                  <DetailRow icon={<BookOpenIcon className="w-4 h-4" />} label="Предмет">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: subjectColor }} />
                      <span className="font-medium text-gray-900 dark:text-white">{lesson.subject.subjectName}</span>
                    </div>
                  </DetailRow>
                  <DetailRow icon={<UserGroupIcon className="w-4 h-4" />} label="Группа">
                    <span className="font-medium text-gray-900 dark:text-white">{lesson.group.name}</span>
                  </DetailRow>
                  <DetailRow icon={<UserIcon className="w-4 h-4" />} label="Преподаватель">
                    <span className="font-medium text-gray-900 dark:text-white">{lesson.teacher.name}</span>
                  </DetailRow>
                  <DetailRow icon={<BuildingOfficeIcon className="w-4 h-4" />} label="Аудитория">
                    <span className="font-medium text-gray-900 dark:text-white">{lesson.room.name}</span>
                  </DetailRow>
                </section>

                <section className="space-y-4">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2">
                    Расписание и статус
                  </h2>
                  <DetailRow icon={<CalendarDaysIcon className="w-4 h-4" />} label="Дата">
                    <span className="font-medium text-gray-900 dark:text-white">{formatDate(lesson.date)}</span>
                  </DetailRow>
                  <DetailRow icon={<ClockIcon className="w-4 h-4" />} label="Время">
                    <span className="font-medium text-gray-900 dark:text-white">{formatTimeRange(lesson.startTime, lesson.endTime)}</span>
                  </DetailRow>
                  <DetailRow icon={<AcademicCapIcon className="w-4 h-4" />} label="Статус">
                    <span
                      className="px-3 py-1 rounded-full text-sm font-medium text-white"
                      style={{ backgroundColor: statusColor }}
                    >
                      {getLessonStatusText(lesson.lessonStatus)}
                    </span>
                  </DetailRow>
                </section>
              </div>

              {/* Cancel reason */}
              {lesson.cancelReason && (
                <section>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2 mb-4">
                    Причина отмены / переноса
                  </h2>
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                    <p className="text-red-700 dark:text-red-300">{lesson.cancelReason}</p>
                  </div>
                </section>
              )}

              {/* Teacher note */}
              <section>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2 mb-4 flex items-center gap-2">
                  <ChatBubbleLeftIcon className="w-4 h-4" />
                  Примечание преподавателя
                </h2>
                {canEdit ? (
                  <div className="space-y-3">
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={4}
                      placeholder="Добавьте примечание к уроку..."
                      disabled={isSavingNote}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-y"
                    />
                    {noteError && (
                      <p className="text-sm text-red-600 dark:text-red-400">{noteError}</p>
                    )}
                    {noteSuccess && (
                      <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                        <CheckCircleIcon className="w-4 h-4" /> Сохранено
                      </p>
                    )}
                    <button
                      onClick={handleSaveNote}
                      disabled={isSavingNote}
                      className="px-5 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 font-medium text-sm"
                    >
                      {isSavingNote ? 'Сохранение...' : 'Сохранить'}
                    </button>
                  </div>
                ) : (
                  lesson.note ? (
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                      <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{lesson.note}</p>
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 italic">Примечание отсутствует</p>
                  )
                )}
              </section>

              {/* Student own grade (for student role) */}
              {isStudent && (() => {
                const me = lesson.students.find(s => s.id === user?.id);
                if (!me || (!me.grade && !me.comment)) return null;
                return (
                  <section>
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2 mb-4">
                      Ваша оценка и комментарий
                    </h2>
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                      {me.grade && (
                        <div className="mb-2">
                          <p className="text-xs font-medium text-blue-500">Оценка</p>
                          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{me.grade}</p>
                        </div>
                      )}
                      {me.comment && (
                        <div>
                          <p className="text-xs font-medium text-blue-500">Комментарий</p>
                          <p className="text-blue-700 dark:text-blue-300 whitespace-pre-wrap">{me.comment}</p>
                        </div>
                      )}
                    </div>
                  </section>
                );
              })()}
            </div>
          )}

          {/* STUDENTS TAB */}
          {activeTab === 'students' && (
            <div className="space-y-6">
              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label="Всего" value={lesson.students.length} color="gray" />
                <StatCard label="Присутствовали" value={attendedStudents.length} color="green" />
                <StatCard label="Отсутствовали" value={absentStudents.length} color="red" />
                <StatCard label="Не отмечены" value={unmarkedStudents.length} color="gray" />
              </div>

              {lesson.lessonStatus === 'Planned' ? (
                <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                  <span className="text-4xl">📅</span>
                  <p className="mt-3 font-medium text-gray-600 dark:text-gray-400">Занятие ещё не проведено</p>
                  <p className="text-sm mt-1">Посещаемость будет доступна после проведения</p>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300">
                    Нажмите на студента для редактирования статуса, оценки и комментария
                  </div>
                  <div className="space-y-2">
                    {lesson.students.map((student) => (
                      <div
                        key={student.id}
                        onClick={() => { setSelectedStudent(student); setIsGradeModalOpen(true); }}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-transparent hover:border-violet-200 dark:hover:border-violet-700 hover:bg-white dark:hover:bg-gray-700 cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {student.photoPath ? (
                            <img src={student.photoPath} alt={student.fullName} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                              <span className="text-violet-600 dark:text-violet-300 font-semibold text-sm">{student.fullName.charAt(0)}</span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">{student.fullName}</p>
                            <p className={`text-xs mt-0.5 ${student.remainingLessons === 0 ? 'text-red-500' : student.remainingLessons <= 2 ? 'text-amber-500' : 'text-gray-400'}`}>
                              Ост. занятий: {student.remainingLessons}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className="px-3 py-1 rounded-full text-xs font-medium"
                            style={{ backgroundColor: getAttendanceStatusColor(student.attendanceStatus) + '20', color: getAttendanceStatusColor(student.attendanceStatus) }}
                          >
                            {getAttendanceStatusText(student.attendanceStatus)}
                          </span>
                          {(student.grade || student.comment) && (
                            <span className="text-xs text-gray-400">
                              {student.grade ? `${student.grade}б` : ''}
                              {student.grade && student.comment ? ' · ' : ''}
                              {student.comment ? '📝' : ''}
                            </span>
                          )}
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ATTENDANCE TAB */}
          {activeTab === 'attendance' && (
            <ImprovedAttendance
              lesson={lesson}
              onUpdate={loadLesson}
              onClose={() => setActiveTab('details')}
            />
          )}
        </div>
      </div>

      {/* ── Sub-modals ───────────────────────────────────────────────── */}
      <ReplaceTeacherModal
        isOpen={isReplaceTeacherOpen}
        onClose={() => setIsReplaceTeacherOpen(false)}
        lessonId={lesson.id}
        currentTeacherId={lesson.teacher.id}
        currentTeacherName={lesson.teacher.name}
        onUpdate={loadLesson}
      />

      <QrRegistrationModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        lessonId={lesson.id}
        groupId={lesson.group.id}
        organizationId={user?.organizationId ?? ''}
        groupName={lesson.group.name}
      />

      {selectedStudent && (
        <StudentGradeModal
          student={selectedStudent}
          lessonId={lesson.id}
          isOpen={isGradeModalOpen}
          onClose={() => { setIsGradeModalOpen(false); setSelectedStudent(null); }}
          onUpdate={loadLesson}
        />
      )}
    </div>
  );
}

// ─── Small reusable components ────────────────────────────────────────────────

const inputClass =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm';

function RequiredStar() {
  return <span className="text-red-500">*</span>;
}

function InfoChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="text-gray-500 dark:text-gray-400 mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-gray-400 dark:text-gray-500 flex-shrink-0">{icon}</div>
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sm text-gray-500 dark:text-gray-400 w-28 flex-shrink-0">{label}</span>
        <div>{children}</div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: 'gray' | 'green' | 'red' }) {
  const colors = {
    gray: 'bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',
  };
  return (
    <div className={`${colors[color]} rounded-xl p-4 text-center`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-1 opacity-70">{label}</p>
    </div>
  );
}

function TabButton({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 ${
        active
          ? 'text-violet-600 dark:text-violet-400 border-violet-600 dark:border-violet-400'
          : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ActionButton({
  label, icon, color, active, onClick, disabled,
}: {
  label: string;
  icon: React.ReactNode;
  color: 'blue' | 'red' | 'green' | 'emerald' | 'indigo';
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  const base = 'px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 border';
  const colors = {
    blue: active
      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
      : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/40',
    red: active
      ? 'bg-red-600 text-white border-red-600 shadow-md'
      : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/40',
    green: active
      ? 'bg-green-600 text-white border-green-600 shadow-md'
      : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/40',
    emerald: active
      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
      : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/40',
    indigo: active
      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
      : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/40',
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${colors[color]} disabled:opacity-50`}>
      {icon}
      {label}
    </button>
  );
}

function ActionPanel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {children}
    </div>
  );
}

function SubmitButton({
  onClick, loading, loadingLabel, label, color, disabled,
}: {
  onClick: () => void;
  loading: boolean;
  loadingLabel: string;
  label: string;
  color: 'blue' | 'red' | 'green';
  disabled?: boolean;
}) {
  const colors = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    red: 'bg-red-600 hover:bg-red-700',
    green: 'bg-green-600 hover:bg-green-700',
  };
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`px-5 py-2 ${colors[color]} text-white rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2 font-medium text-sm`}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          {loadingLabel}
        </>
      ) : label}
    </button>
  );
}
