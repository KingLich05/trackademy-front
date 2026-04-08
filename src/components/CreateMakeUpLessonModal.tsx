'use client';

import { useState, useEffect, useCallback } from 'react';
import { XCircleIcon, PlusIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { AuthenticatedApiService } from '@/services/AuthenticatedApiService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import type { Group } from '@/types/Group';
import type { Room } from '@/types/Room';
import type { User } from '@/types/User';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the new lessonId after successful creation */
  onCreated?: (lessonId: string) => void;
}

export default function CreateMakeUpLessonModal({ isOpen, onClose, onCreated }: Props) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const orgId = user?.organizationId || '';

  // Form fields
  const [groupId, setGroupId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [note, setNote] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<User[]>([]);

  // Data lists
  const [groups, setGroups] = useState<Group[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState<User[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── Load groups, rooms, teachers on open ──────────────────────────────────
  useEffect(() => {
    if (!isOpen || !orgId) return;
    setLoadingMeta(true);
    Promise.all([
      AuthenticatedApiService.getGroups(orgId, 200),
      AuthenticatedApiService.getRooms(orgId, 1, 200),
      AuthenticatedApiService.getUsers({ organizationId: orgId, roleIds: [3], pageSize: 200 }),
    ])
      .then(([g, r, t]) => {
        setGroups(g.items ?? (g as unknown as Group[]));
        setRooms(r.items ?? (r as unknown as Room[]));
        setTeachers(t.items ?? []);
      })
      .catch(() => showToast('Ошибка загрузки данных', 'error'))
      .finally(() => setLoadingMeta(false));
  }, [isOpen, orgId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Search students ───────────────────────────────────────────────────────
  const searchStudents = useCallback(async (q: string) => {
    if (!orgId) return;
    setSearchLoading(true);
    try {
      const res = await AuthenticatedApiService.getUsers({
        organizationId: orgId,
        roleIds: [1],
        search: q,
        pageSize: 30,
      });
      // Exclude already-selected students
      setStudentResults(
        (res.items ?? []).filter(s => !selectedStudents.some(sel => sel.id === s.id))
      );
    } catch {
      // ignore
    } finally {
      setSearchLoading(false);
    }
  }, [orgId, selectedStudents]);

  useEffect(() => {
    if (isOpen) searchStudents('');
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const addStudent = (student: User) => {
    setSelectedStudents(prev => [...prev, student]);
    setStudentResults(prev => prev.filter(s => s.id !== student.id));
  };

  const removeStudent = (id: string) => {
    const removed = selectedStudents.find(s => s.id === id);
    setSelectedStudents(prev => prev.filter(s => s.id !== id));
    if (removed) setStudentResults(prev => [removed, ...prev]);
  };

  // ── Reset on close ────────────────────────────────────────────────────────
  const handleClose = () => {
    setGroupId(''); setDate(''); setStartTime(''); setEndTime('');
    setTeacherId(''); setRoomId(''); setNote('');
    setSelectedStudents([]); setStudentSearch(''); setStudentResults([]);
    onClose();
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!groupId || !date || !startTime || !endTime || !teacherId || !roomId || selectedStudents.length === 0) {
      showToast('Заполните все обязательные поля и выберите хотя бы одного студента', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await AuthenticatedApiService.createMakeUpLesson({
        groupId,
        date,
        startTime,
        endTime,
        teacherId,
        roomId,
        note: note.trim() || undefined,
        studentIds: selectedStudents.map(s => s.id),
      });
      showToast('Урок-отработка создан', 'success');
      handleClose();
      onCreated?.(res.lessonId);
    } catch (e) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (e as { message?: string })?.message ||
        'Ошибка при создании';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔄</span>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Создать урок-отработку</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <XCircleIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {loadingMeta ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-b-2 border-amber-500 rounded-full" />
            </div>
          ) : (
            <>
              {/* Group */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Группа <span className="text-red-500">*</span>
                </label>
                <select value={groupId} onChange={e => setGroupId(e.target.value)} className={inputClass}>
                  <option value="">Выберите группу</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              {/* Date + Times */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Дата <span className="text-red-500">*</span>
                  </label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Начало <span className="text-red-500">*</span>
                  </label>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Конец <span className="text-red-500">*</span>
                  </label>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className={inputClass} />
                </div>
              </div>

              {/* Teacher + Room */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Преподаватель <span className="text-red-500">*</span>
                  </label>
                  <select value={teacherId} onChange={e => setTeacherId(e.target.value)} className={inputClass}>
                    <option value="">Выберите преподавателя</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.fullName || t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Кабинет <span className="text-red-500">*</span>
                  </label>
                  <select value={roomId} onChange={e => setRoomId(e.target.value)} className={inputClass}>
                    <option value="">Выберите кабинет</option>
                    {rooms.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Примечание
                </label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={2}
                  placeholder="Например: отработка по математике за 31 марта"
                  className={inputClass}
                />
              </div>

              {/* Students */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Студенты <span className="text-red-500">*</span>
                  {selectedStudents.length > 0 && (
                    <span className="ml-2 text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
                      {selectedStudents.length}
                    </span>
                  )}
                </label>

                {/* Selected students */}
                {selectedStudents.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedStudents.map(s => (
                      <span
                        key={s.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-sm rounded-full border border-amber-200 dark:border-amber-700"
                      >
                        {s.fullName || s.name}
                        <button
                          onClick={() => removeStudent(s.id)}
                          className="hover:text-red-600 transition-colors"
                        >
                          <XCircleIcon className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Search */}
                <div className="relative mb-2">
                  <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Поиск студента..."
                    value={studentSearch}
                    onChange={e => {
                      setStudentSearch(e.target.value);
                      searchStudents(e.target.value);
                    }}
                    className={`${inputClass} pl-9`}
                  />
                </div>

                {/* Results */}
                <div className="max-h-44 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                  {searchLoading ? (
                    <div className="flex justify-center py-6">
                      <div className="animate-spin h-5 w-5 border-b-2 border-amber-500 rounded-full" />
                    </div>
                  ) : studentResults.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-6">
                      {studentSearch ? 'Студенты не найдены' : 'Введите имя для поиска'}
                    </p>
                  ) : (
                    studentResults.map(s => (
                      <button
                        key={s.id}
                        onClick={() => addStudent(s)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors text-left border-b border-gray-100 dark:border-gray-700/50 last:border-b-0"
                      >
                        <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-amber-600 dark:text-amber-300 text-xs font-semibold">
                            {(s.fullName || s.name).charAt(0)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{s.fullName || s.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{s.phone}</p>
                        </div>
                        <PlusIcon className="w-4 h-4 text-amber-500 flex-shrink-0 ml-auto" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !groupId || !date || !startTime || !endTime || !teacherId || !roomId || selectedStudents.length === 0}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Создаём...
              </>
            ) : (
              <>
                <PlusIcon className="w-4 h-4" />
                Создать отработку
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
