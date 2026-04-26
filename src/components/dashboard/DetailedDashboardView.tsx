'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { DatePicker } from '../ui/DatePicker';
import { DashboardApiService } from '../../services/DashboardApiService';
import {
  DetailedDashboard,
  SubjectIncomeStats,
  TeacherIncomeStats,
  GroupAttendanceStats,
  TeacherStat,
} from '../../types/DetailedDashboard';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  UsersIcon,
  ClipboardDocumentCheckIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  AcademicCapIcon,
  ChartBarIcon,
  ArrowPathIcon,
  MinusIcon,
} from '@heroicons/react/24/outline';

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString('ru-RU');
}
function fmtMoney(n: number): string {
  return `${n.toLocaleString('ru-RU')} ₸`;
}
function fmtTrend(trend: number): string {
  if (!isFinite(trend)) return '—';
  return `${trend > 0 ? '+' : ''}${trend.toFixed(1)}%`;
}
function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}
function getFirstDayOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

// ─── sub-components ───────────────────────────────────────────────────────────

function TrendBadge({ value, small }: { value: number; small?: boolean }) {
  if (!isFinite(value) || value === 0) {
    return (
      <span className={`inline-flex items-center gap-0.5 text-gray-500 dark:text-gray-400 ${small ? 'text-xs' : 'text-sm'}`}>
        <MinusIcon className={small ? 'w-3 h-3' : 'w-4 h-4'} />0%
      </span>
    );
  }
  const positive = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 font-medium ${positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'} ${small ? 'text-xs' : 'text-sm'}`}>
      {positive
        ? <ArrowTrendingUpIcon className={small ? 'w-3 h-3' : 'w-4 h-4'} />
        : <ArrowTrendingDownIcon className={small ? 'w-3 h-3' : 'w-4 h-4'} />}
      {fmtTrend(value)}
    </span>
  );
}

function KpiCard({
  label, value, sub, trend, icon: Icon, color,
}: {
  label: string; value: string | number; sub?: string; trend?: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'purple' | 'blue' | 'emerald' | 'amber' | 'red';
}) {
  const colorMap = {
    purple: 'from-purple-500 to-purple-700',
    blue: 'from-blue-500 to-blue-700',
    emerald: 'from-emerald-500 to-emerald-700',
    amber: 'from-amber-500 to-amber-600',
    red: 'from-red-500 to-red-700',
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex gap-4 items-start">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorMap[color]} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none truncate">{value}</p>
        {(sub || trend !== undefined) && (
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            {sub && <span className="text-xs text-gray-500 dark:text-gray-400">{sub}</span>}
            {trend !== undefined && <TrendBadge value={trend} small />}
          </div>
        )}
      </div>
    </div>
  );
}

function HBarChart({
  items, maxAbs, formatValue,
}: {
  items: { label: string; value: number; prevValue?: number }[];
  maxAbs: number;
  formatValue: (v: number) => string;
}) {
  if (items.length === 0) return <p className="text-gray-400 text-sm">Нет данных</p>;
  const safeMax = maxAbs === 0 ? 1 : maxAbs;
  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const pct = Math.min(100, (Math.abs(item.value) / safeMax) * 100);
        const isNeg = item.value < 0;
        return (
          <div key={i} className="grid grid-cols-[1fr_auto] gap-2 items-center">
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-[200px]">{item.label}</span>
                <span className={`text-xs font-semibold ml-2 ${isNeg ? 'text-red-500 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                  {formatValue(item.value)}
                </span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isNeg ? 'bg-red-400 dark:bg-red-500' : 'bg-emerald-400 dark:bg-emerald-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            {item.prevValue !== undefined && (
              <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                пред: {formatValue(item.prevValue)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AttendanceBar({ rate, prevRate }: { rate: number; prevRate: number }) {
  const colorBar = rate >= 80 ? 'bg-emerald-500' : rate >= 60 ? 'bg-amber-400' : 'bg-red-400';
  const textColor = rate >= 80 ? 'text-emerald-600 dark:text-emerald-400' : rate >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-500 dark:text-red-400';
  const delta = rate - prevRate;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colorBar}`} style={{ width: `${rate}%` }} />
      </div>
      <span className={`text-xs font-semibold w-10 text-right ${textColor}`}>{rate}%</span>
      {prevRate > 0 && (
        <span className={`text-xs w-10 text-right ${delta >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
          {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
        </span>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, children }: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
        <Icon className="w-5 h-5 text-purple-500" />
        <h2 className="font-semibold text-gray-800 dark:text-white text-sm uppercase tracking-wide">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  organizationId: string;
}

export function DetailedDashboardView({ organizationId }: Props) {
  const { showError } = useToast();
  const [data, setData] = useState<DetailedDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(getFirstDayOfMonth());
  const [dateTo, setDateTo] = useState(getToday());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await DashboardApiService.getDetailedDashboard(organizationId, dateFrom, dateTo);
      setData(result);
    } catch {
      showError('Ошибка загрузки подробной аналитики');
    } finally {
      setLoading(false);
    }
  }, [organizationId, dateFrom, dateTo, showError]);

  useEffect(() => {
    load();
  }, [load]);

  const fin = data?.financialStats;
  const st = data?.studentStats;
  const att = data?.attendanceStats;
  const conv = data?.conversionStats;
  const ret = data?.retentionStats;

  const subjectItems = (fin?.subjectIncomeStats ?? [])
    .slice()
    .sort((a: SubjectIncomeStats, b: SubjectIncomeStats) => Math.abs(b.incomeAmountForPeriod) - Math.abs(a.incomeAmountForPeriod))
    .map((s: SubjectIncomeStats) => ({ label: s.subject.subjectName, value: s.incomeAmountForPeriod, prevValue: s.incomeAmountForPreviousPeriod }));

  const teacherItems = (fin?.teacherIncomeStats ?? [])
    .filter((t: TeacherIncomeStats) => t.teacher.id !== '00000000-0000-0000-0000-000000000000')
    .slice()
    .sort((a: TeacherIncomeStats, b: TeacherIncomeStats) => Math.abs(b.incomeAmountForPeriod) - Math.abs(a.incomeAmountForPeriod))
    .map((t: TeacherIncomeStats) => ({ label: t.teacher.name ?? 'Без преподавателя', value: t.incomeAmountForPeriod, prevValue: t.incomeAmountForPreviousPeriod }));

  const subMaxAbs = Math.max(...subjectItems.map(s => Math.abs(s.value)), 1);
  const tchMaxAbs = Math.max(...teacherItems.map(t => Math.abs(t.value)), 1);

  const groupAttItems = (att?.groupAttendanceStats ?? [])
    .slice()
    .sort((a: GroupAttendanceStats, b: GroupAttendanceStats) => b.groupAttendanceRateForPeriod - a.groupAttendanceRateForPeriod);

  const teacherStatItems = (data?.teacherStats ?? [])
    .slice()
    .sort((a: TeacherStat, b: TeacherStat) => b.lessonsForPeriod - a.lessonsForPeriod);

  const totalIncome = fin?.totalIncomeForPeriod ?? 0;
  const prevIncome = fin?.totalIncomeForPreviousPeriod ?? 0;
  const incomeTrend = fin?.incomeTrend ?? 0;

  return (
    <div className="space-y-6">
      {/* Period controls */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-gray-800 rounded-2xl px-5 py-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Период:</span>
        <DatePicker label="С" value={dateFrom} onChange={setDateFrom} maxDate={dateTo} />
        <span className="text-gray-400 dark:text-gray-600 select-none">—</span>
        <DatePicker label="По" value={dateTo} onChange={setDateTo} minDate={dateFrom} align="left" />
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-60 transition-all text-sm shadow"
        >
          <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Загрузка…' : 'Применить'}
        </button>
        {data && (
          <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
            Обновлено: {new Date(data.generatedAt).toLocaleString('ru-RU')}
          </span>
        )}
      </div>

      {loading && !data && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
        </div>
      )}

      {data && (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Общий доход"
              value={fmtMoney(totalIncome)}
              sub={`Пред: ${fmtMoney(prevIncome)}`}
              trend={incomeTrend}
              icon={CurrencyDollarIcon}
              color={totalIncome >= 0 ? 'emerald' : 'red'}
            />
            <KpiCard
              label="Студенты"
              value={st?.totalStudentsCount ?? 0}
              sub={`Активных: ${st?.activeStudentsCount ?? 0}`}
              icon={AcademicCapIcon}
              color="blue"
            />
            <KpiCard
              label="Посещаемость"
              value={`${att?.overallAttendanceRateForPeriod ?? 0}%`}
              sub={`Пред: ${att?.overallAttendanceRateForPreviousPeriod ?? 0}%`}
              trend={(att?.overallAttendanceRateForPeriod ?? 0) - (att?.overallAttendanceRateForPreviousPeriod ?? 0)}
              icon={ClipboardDocumentCheckIcon}
              color="purple"
            />
            <KpiCard
              label="Конверсия"
              value={`${(conv?.conversionRateForPeriod ?? 0).toFixed(2)}%`}
              sub={`Лидов: ${fmt(conv?.leadsCountForPeriod ?? 0)}`}
              trend={(conv?.conversionRateForPeriod ?? 0) - (conv?.conversionRateForPreviousPeriod ?? 0)}
              icon={FunnelIcon}
              color="amber"
            />
          </div>

          {/* Finance */}
          <Section title="Финансы" icon={CurrencyDollarIcon}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Доход за период', val: fmtMoney(totalIncome), cls: totalIncome >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400' },
                { label: 'Доход за пред. период', val: fmtMoney(prevIncome), cls: 'text-gray-900 dark:text-white' },
                { label: 'Тренд дохода', val: fmtTrend(incomeTrend), cls: incomeTrend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400' },
                { label: 'Ср. доход на студента', val: fmtMoney(Math.round(fin?.averageStudentIncome ?? 0)), cls: (fin?.averageStudentIncome ?? 0) >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-500 dark:text-red-400' },
              ].map(item => (
                <div key={item.label} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{item.label}</p>
                  <p className={`text-lg font-bold ${item.cls}`}>{item.val}</p>
                </div>
              ))}
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <ChartBarIcon className="w-4 h-4 text-purple-400" />Доход по предметам
                </h3>
                <HBarChart items={subjectItems} maxAbs={subMaxAbs} formatValue={fmtMoney} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <ChartBarIcon className="w-4 h-4 text-indigo-400" />Доход по преподавателям
                </h3>
                <HBarChart items={teacherItems} maxAbs={tchMaxAbs} formatValue={fmtMoney} />
              </div>
            </div>
          </Section>

          {/* Students */}
          <Section title="Студенты" icon={AcademicCapIcon}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { label: 'Всего', val: fmt(st?.totalStudentsCount ?? 0), color: 'text-blue-600 dark:text-blue-400', sub: undefined },
                { label: 'Активных', val: fmt(st?.activeStudentsCount ?? 0), color: 'text-emerald-600 dark:text-emerald-400', sub: undefined },
                { label: 'Новых за период', val: fmt(st?.newStudentsForPeriodCount ?? 0), color: 'text-purple-600 dark:text-purple-400', sub: `Пред: ${fmt(st?.newStudentsForPreviousPeriodCount ?? 0)}` },
                { label: 'Отток', val: fmt(st?.studentsChurnForPeriodCount ?? 0), color: 'text-orange-500 dark:text-orange-400', sub: `Пред: ${fmt(st?.studentsChurnForPreviousPeriodCount ?? 0)}` },
                { label: '% оттока', val: `${(st?.churnForPeriodRate ?? 0).toFixed(1)}%`, color: (st?.churnForPeriodRate ?? 0) > 10 ? 'text-red-500 dark:text-red-400' : 'text-gray-900 dark:text-white', sub: `Пред: ${(st?.churnForPreviousPeriodRate ?? 0).toFixed(1)}%` },
              ].map(item => (
                <div key={item.label} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{item.label}</p>
                  <p className={`text-2xl font-bold ${item.color}`}>{item.val}</p>
                  {item.sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{item.sub}</p>}
                </div>
              ))}
            </div>
          </Section>

          {/* Attendance */}
          <Section title="Посещаемость" icon={ClipboardDocumentCheckIcon}>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
              {[
                { label: 'Посещаемость', val: `${att?.overallAttendanceRateForPeriod ?? 0}%`, color: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Пропуски', val: `${att?.absentRateForPeriod ?? 0}%`, color: 'text-red-500 dark:text-red-400' },
                { label: 'Всего отметок', val: fmt(att?.totalAttendanceMarksCountForPeriod ?? 0), color: 'text-gray-900 dark:text-white' },
                { label: 'Присутствовали', val: fmt(att?.presentAttendancesCountForPeriod ?? 0), color: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Отсутствовали', val: fmt(att?.absentAttendancesCountForPeriod ?? 0), color: 'text-red-500 dark:text-red-400' },
              ].map(item => (
                <div key={item.label} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{item.label}</p>
                  <p className={`text-xl font-bold ${item.color}`}>{item.val}</p>
                </div>
              ))}
            </div>
            {groupAttItems.length > 0 && (
              <>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Посещаемость по группам</h3>
                <div className="space-y-3">
                  {groupAttItems.map((g: GroupAttendanceStats) => (
                    <div key={g.group.id} className="grid grid-cols-[1fr_auto] gap-4 items-center">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{g.group.name}</span>
                          <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">{g.groupCode}</span>
                        </div>
                        <AttendanceBar rate={g.groupAttendanceRateForPeriod} prevRate={g.groupAttendanceRateForPreviousPeriod} />
                      </div>
                      <div className="text-right text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                        пропуски: {g.groupAbsentRateForPeriod}%
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Section>

          {/* Teachers */}
          <Section title="Преподаватели" icon={UserGroupIcon}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Преподаватель</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Студентов</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Групп</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Уроков</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Пред.</th>
                    <th className="py-2 pl-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase min-w-[180px]">Посещаемость</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {teacherStatItems.map((t: TeacherStat) => (
                    <tr key={t.teacher.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{t.teacher.name ?? 'Без имени'}</td>
                      <td className="py-3 px-3 text-right text-gray-600 dark:text-gray-300">{t.studentCount}</td>
                      <td className="py-3 px-3 text-right text-gray-600 dark:text-gray-300">{t.groupCount}</td>
                      <td className="py-3 px-3 text-right font-semibold text-gray-900 dark:text-white">{t.lessonsForPeriod}</td>
                      <td className="py-3 px-3 text-right text-gray-400 dark:text-gray-500">{t.lessonsForPreviousPeriod}</td>
                      <td className="py-3 pl-3">
                        <AttendanceBar rate={t.averageAttendanceRateForPeriod} prevRate={t.averageAttendanceRateForPreviousPeriod} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* Bottom row: Conversion + Retention + Low perf */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Conversion */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <div className="flex items-center gap-2 mb-4">
                <FunnelIcon className="w-5 h-5 text-amber-500" />
                <h2 className="font-semibold text-gray-800 dark:text-white text-sm uppercase tracking-wide">Конверсия</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Конверсия за период</p>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-amber-500">{(conv?.conversionRateForPeriod ?? 0).toFixed(2)}%</span>
                    <TrendBadge value={(conv?.conversionRateForPeriod ?? 0) - (conv?.conversionRateForPreviousPeriod ?? 0)} small />
                  </div>
                  <div className="mt-2 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.min(100, conv?.conversionRateForPeriod ?? 0)}%` }} />
                  </div>
                </div>
                {[
                  { label: 'Лидов за период', val: fmt(conv?.leadsCountForPeriod ?? 0), prev: fmt(conv?.leadsCountForPreviousPeriod ?? 0) },
                  { label: 'Конвертировано', val: fmt(conv?.convertedStudentsCountForPeriod ?? 0), prev: fmt(conv?.convertedStudentsCountForPreviousPeriod ?? 0) },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between py-2 border-t border-gray-50 dark:border-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{row.label}</span>
                    <div className="text-right">
                      <span className="font-semibold text-gray-900 dark:text-white">{row.val}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">(пред: {row.prev})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Retention */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <div className="flex items-center gap-2 mb-4">
                <UsersIcon className="w-5 h-5 text-blue-500" />
                <h2 className="font-semibold text-gray-800 dark:text-white text-sm uppercase tracking-wide">Удержание</h2>
              </div>
              <div className="space-y-4">
                <div className="text-center py-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Долгосрочных студентов</p>
                  <p className="text-5xl font-bold text-blue-500">{ret?.longTermStudentsCount ?? 0}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">из {st?.totalStudentsCount ?? 0} всего</p>
                </div>
                {(st?.totalStudentsCount ?? 0) > 0 && (
                  <div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-400 rounded-full"
                        style={{ width: `${Math.min(100, ((ret?.longTermStudentsCount ?? 0) / (st?.totalStudentsCount ?? 1)) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">
                      {(((ret?.longTermStudentsCount ?? 0) / (st?.totalStudentsCount ?? 1)) * 100).toFixed(1)}%
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Low performance */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <div className="flex items-center gap-2 mb-4">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                <h2 className="font-semibold text-gray-800 dark:text-white text-sm uppercase tracking-wide">Проблемные группы</h2>
              </div>
              {(data?.lowPerformanceGroups ?? []).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <ClipboardDocumentCheckIcon className="w-10 h-10 text-emerald-400 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Проблемных групп нет</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {data?.lowPerformanceGroups.map(g => (
                    <div key={g.groupId} className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{g.groupName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{g.subjectName}</p>
                        </div>
                        <span className="text-sm font-bold text-red-500 dark:text-red-400 whitespace-nowrap">{g.attendanceRate}%</span>
                      </div>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">{g.performanceIssue}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{g.activeStudents} активных из {g.totalStudents}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
