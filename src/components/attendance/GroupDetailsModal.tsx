'use client';

import { useState, useEffect } from 'react';
import {
  XMarkIcon,
  UserGroupIcon,
  BookOpenIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { AuthenticatedApiService } from '@/services/AuthenticatedApiService';
import { useToast } from '@/contexts/ToastContext';

interface GroupDetailsStudent {
  studentId: string;
  studentName: string;
  studentLogin: string;
  totalLessons: number;
  attendedLessons: number;
  lateLessons: number;
  missedLessons: number;
  specialReasonLessons: number;
  attendanceRate: number;
  comment: string | null;
}

interface GroupDetailsResponse {
  groupId: string;
  groupName: string;
  groupCode: string;
  subjectName: string;
  students: GroupDetailsStudent[];
}

interface GroupDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
}

function getRate(rate: number) {
  if (rate >= 80) return { text: 'text-emerald-400', bar: 'bg-emerald-400', ring: 'text-emerald-400' };
  if (rate >= 60) return { text: 'text-amber-400', bar: 'bg-amber-400', ring: 'text-amber-400' };
  return { text: 'text-red-400', bar: 'bg-red-400', ring: 'text-red-400' };
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(' ');
  const initials = parts.length >= 2 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2);
  return <>{initials.toUpperCase()}</>;
}

function RateDonut({ rate }: { rate: number }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const filled = (rate / 100) * circ;
  const { ring } = getRate(rate);
  return (
    <svg width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r={r} fill="none" strokeWidth="4" stroke="#374151" />
      <circle
        cx="22" cy="22" r={r}
        fill="none" strokeWidth="4"
        stroke="currentColor"
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 22 22)"
        className={ring}
      />
      <text x="22" y="26" textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor" className={ring}>
        {Math.round(rate)}%
      </text>
    </svg>
  );
}

export const GroupDetailsModal = ({ isOpen, onClose, groupId, groupName }: GroupDetailsModalProps) => {
  const [details, setDetails] = useState<GroupDetailsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const { showError } = useToast();

  useEffect(() => {
    if (isOpen && groupId) loadDetails();
    if (!isOpen) setDetails(null);
  }, [isOpen, groupId]);

  const loadDetails = async () => {
    setLoading(true);
    try {
      const response = await AuthenticatedApiService.get<GroupDetailsResponse>(
        `/Attendance/stats/groups/${groupId}/details`
      );
      setDetails(response);
    } catch {
      showError('Не удалось загрузить детали группы');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const students = details?.students ?? [];

  const effRate = (s: GroupDetailsStudent) =>
    s.totalLessons > 0 ? ((s.attendedLessons + s.lateLessons) / s.totalLessons) * 100 : 0;

  const sorted = [...students].sort((a, b) => effRate(b) - effRate(a));
  const avgRate = students.length
    ? students.reduce((sum, st) => sum + effRate(st), 0) / students.length
    : 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-700/60 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-700/60 flex items-start gap-4 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
            <UserGroupIcon className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-white truncate">
              {details?.groupName ?? groupName}
            </h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {details?.groupCode && (
                <span className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded bg-gray-700 text-gray-300 border border-gray-600">
                  {details.groupCode}
                </span>
              )}
              {details?.subjectName && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <BookOpenIcon className="h-3.5 w-3.5" />
                  {details.subjectName}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-700 transition-colors flex-shrink-0"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-56">
              <div className="animate-spin rounded-full h-9 w-9 border-2 border-gray-600 border-t-emerald-400" />
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-44 text-gray-500 gap-2">
              <UserGroupIcon className="h-9 w-9 opacity-30" />
              <p className="text-sm">Нет данных по студентам</p>
            </div>
          ) : (
            <div className="p-5 space-y-4">

              {/* ── Summary strip ── */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Студентов', value: students.length, color: 'text-white' },
                  { label: 'Ср. посещаемость', value: `${avgRate.toFixed(1)}%`, color: getRate(avgRate).text },
                ].map((s) => (
                  <div key={s.label} className="bg-gray-800/70 border border-gray-700/50 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1.5 leading-tight">{s.label}</p>
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* ── Student rows ── */}
              <div className="space-y-2">
                {sorted.map((student, idx) => {
                  // late counts as attended for the bar and donut
                  const effectiveRate = effRate(student);
                  return (
                    <div
                      key={student.studentId}
                      className="bg-gray-800/50 border border-gray-700/40 rounded-xl px-4 py-3 hover:border-gray-600 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar with rank badge */}
                        <div className="flex-shrink-0 relative">
                          <div className="w-9 h-9 rounded-lg bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300 select-none">
                            <Initials name={student.studentName} />
                          </div>
                          <span className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-gray-900 border border-gray-600 flex items-center justify-center text-[9px] font-bold text-gray-400">
                            {idx + 1}
                          </span>
                        </div>

                        {/* Name + bar + chips */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2 mb-1">
                            <p className="text-sm font-semibold text-white truncate">{student.studentName}</p>
                          </div>
                          {/* Two-segment bar: attended (green) + late (amber) */}
                          <div className="h-1.5 rounded-full bg-gray-700 mb-2 relative overflow-hidden flex">
                            <div
                              className="h-1.5 bg-emerald-400 transition-all"
                              style={{ width: `${student.totalLessons > 0 ? (student.attendedLessons / student.totalLessons) * 100 : 0}%` }}
                            />
                            {student.lateLessons > 0 && student.totalLessons > 0 && (
                              <div
                                className="h-1.5 bg-amber-400 transition-all"
                                style={{ width: `${(student.lateLessons / student.totalLessons) * 100}%` }}
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                              <CheckCircleIcon className="h-3 w-3" />
                              {student.attendedLessons} посещено
                            </span>
                            {student.lateLessons > 0 && (
                              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                                <ClockIcon className="h-3 w-3" />
                                {student.lateLessons} опоздание
                              </span>
                            )}
                            {student.missedLessons > 0 && (
                              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-medium">
                                <XCircleIcon className="h-3 w-3" />
                                {student.missedLessons} пропущено
                              </span>
                            )}
                            {student.specialReasonLessons > 0 && (
                              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
                                <ExclamationCircleIcon className="h-3 w-3" />
                                {student.specialReasonLessons} ув.
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-gray-700/60 text-gray-500 font-medium">
                              <UserIcon className="h-3 w-3" />
                              {student.studentLogin}
                            </span>
                          </div>
                          {student.comment && (
                            <p className="mt-1.5 text-[11px] text-gray-500 italic">💬 {student.comment}</p>
                          )}
                        </div>

                        {/* Donut */}
                        <div className="flex-shrink-0">
                          <RateDonut rate={effectiveRate} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-3 border-t border-gray-700/60 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors border border-gray-600"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

