'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { AuthenticatedApiService } from '../../../services/AuthenticatedApiService';
import {
  LeadDetailDto, LeadActivityDto, LeadStageHistoryDto, FunnelStageDto,
  LeadSourceDto, LeadActivityType, CreateLeadActivityRequest,
  UpdateLeadRequest, ConvertLeadRequest, LoseLeadRequest,
} from '../../../types/SalesFunnel';
import { StudentStatus, getStudentStatusName } from '../../../types/StudentCrm';
import { StudentFlag } from '../../../types/StudentFlag';
import { Subject } from '../../../types/Subject';
import { BaseModal } from '../../../components/ui/BaseModal';
import { PasswordInput } from '../../../components/ui/PasswordInput';
import {
  ArrowLeftIcon, PhoneIcon, EnvelopeIcon, UserIcon, TagIcon,
  ClockIcon, CheckCircleIcon, XCircleIcon, PlusIcon, PencilIcon,
  TrashIcon, CalendarIcon, ArrowPathIcon, ChevronDownIcon,
  UserGroupIcon, Bars3BottomLeftIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(s: string) {
  return new Date(s).toLocaleString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Converts a UTC ISO string to a value suitable for <input type="datetime-local">
function toDatetimeLocal(utcIso: string): string {
  const d = new Date(utcIso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function activityIcon(type: LeadActivityType) {
  switch (type) {
    case LeadActivityType.Call: return '📞';
    case LeadActivityType.Message: return '💬';
    case LeadActivityType.Meeting: return '🤝';
    case LeadActivityType.Note: return '📝';
    case LeadActivityType.TrialLesson: return '🎓';
    case LeadActivityType.WhatsApp: return '📱';
    case LeadActivityType.Task: return '✅';
    default: return '•';
  }
}

const ACTIVITY_TYPES = [
  { value: LeadActivityType.Call, label: 'Звонок' },
  { value: LeadActivityType.Message, label: 'Сообщение' },
  { value: LeadActivityType.Meeting, label: 'Встреча' },
  { value: LeadActivityType.Note, label: 'Заметка' },
  { value: LeadActivityType.TrialLesson, label: 'Пробное занятие' },
  { value: LeadActivityType.WhatsApp, label: 'WhatsApp' },
  { value: LeadActivityType.Task, label: 'Задача' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LeadDetailPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();
  const router = useRouter();
  const params = useParams<{ leadId: string }>();
  const leadId = params.leadId;

  const isAdmin = user?.role === 'Administrator' || user?.role === 'Owner';
  const orgId: string = user?.organizationId
    || (typeof window !== 'undefined' ? localStorage.getItem('userOrganizationId') ?? '' : '')
    || '';

  // ── data ──
  const [lead, setLead] = useState<LeadDetailDto | null>(null);
  const [stages, setStages] = useState<FunnelStageDto[]>([]);
  const [sources, setSources] = useState<LeadSourceDto[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string; subjectId?: string }[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [staff, setStaff] = useState<{ id: string; fullName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageChanging, setStageChanging] = useState(false);

  // ── edit lead modal ──
  const [showEditLead, setShowEditLead] = useState(false);
  const [editForm, setEditForm] = useState<UpdateLeadRequest>({ fullName: '', phone: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  // ── add activity modal ──
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState<LeadActivityDto | null>(null);
  const [activityForm, setActivityForm] = useState<{ type: LeadActivityType; description: string; scheduledAt: string }>({
    type: LeadActivityType.Call, description: '', scheduledAt: '',
  });
  const [savingActivity, setSavingActivity] = useState(false);

  // ── stage move modal ──
  const [moveTarget, setMoveTarget] = useState<string | null>(null);
  const [moveComment, setMoveComment] = useState('');

  // ── complete activity modal ──
  const [completingActivity, setCompletingActivity] = useState<LeadActivityDto | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');

  // ── convert modal ──
  const [showConvert, setShowConvert] = useState(false);
  const [convertForm, setConvertForm] = useState<ConvertLeadRequest>({ login: '', password: '', groupId: null, subjectPackageId: null, flagIds: [], comment: '' });
  const [converting, setConverting] = useState(false);
  const [availableFlags, setAvailableFlags] = useState<StudentFlag[]>([]);

  // ── lose modal ──
  const [showLose, setShowLose] = useState(false);
  const [loseReason, setLoseReason] = useState('');
  const [losing, setLosing] = useState(false);

  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── init ──
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, leadId]);

  const load = useCallback(async () => {
    if (!leadId || !orgId) return;
    try {
      setLoading(true);
      const [l, s, src, g, u, fl, sub] = await Promise.all([
        AuthenticatedApiService.getLeadById(leadId, orgId),
        AuthenticatedApiService.getFunnelStages(orgId),
        AuthenticatedApiService.getLeadSources(orgId),
        AuthenticatedApiService.getGroups(orgId, 1000),
        AuthenticatedApiService.getUsers({ organizationId: orgId, pageSize: 500, roleIds: [2, 3, 4] }),
        AuthenticatedApiService.getStudentFlags(),
        AuthenticatedApiService.getSubjects(orgId),
      ]);
      setLead(l);
      setStages(s.sort((a, b) => a.order - b.order));
      setSources(src);
      setGroups((g.items ?? []).map((gr: { id: string; name: string; subject?: { subjectId?: string } | string }) => ({ id: gr.id, name: gr.name, subjectId: typeof gr.subject === 'object' ? (gr.subject as { subjectId?: string })?.subjectId : undefined })));
      setStaff((u.items ?? []).filter((m: { id: string; name?: string; fullName?: string }) => m.name || m.fullName).map((m: { id: string; name?: string; fullName?: string }) => ({ id: m.id, fullName: m.fullName || m.name || '' })));
      setAvailableFlags(fl);
      setSubjects(sub);
    } catch {
      showError('Ошибка при загрузке лида');
    } finally {
      setLoading(false);
    }
  }, [leadId, orgId, showError]);

  // ── stage move ──
  async function handleMoveStage() {
    if (!moveTarget || !lead) return;
    try {
      setStageChanging(true);
      const updated = await AuthenticatedApiService.moveLeadStage(lead.id, orgId, { stageId: moveTarget, comment: moveComment || null });
      setLead(prev => prev ? { ...prev, ...updated } : null);
      showSuccess('Этап обновлён');
      setMoveTarget(null);
      setMoveComment('');
      await load();
    } catch { showError('Ошибка при смене этапа'); }
    finally { setStageChanging(false); }
  }

  // ── edit lead ──
  function openEditLead() {
    if (!lead) return;
    setEditForm({
      fullName: lead.fullName, phone: lead.phone,
      email: lead.email, parentPhone: lead.parentPhone,
      sourceId: lead.sourceId, notes: lead.notes,
      assignedToId: lead.assignedToId, expectedGroupId: lead.expectedGroupId,
    });
    setShowEditLead(true);
  }

  async function handleSaveLead() {
    if (!lead || !editForm.fullName.trim() || !editForm.phone.trim()) { showError('ФИО и телефон обязательны'); return; }
    try {
      setSavingEdit(true);
      const updated = await AuthenticatedApiService.updateLead(lead.id, orgId, {
        ...editForm,
        email: editForm.email || null,
        parentPhone: editForm.parentPhone || null,
        sourceId: editForm.sourceId || null,
        notes: editForm.notes || null,
        assignedToId: editForm.assignedToId || null,
        expectedGroupId: editForm.expectedGroupId || null,
      });
      setLead(prev => prev ? { ...prev, ...updated } : null);
      showSuccess('Лид обновлён');
      setShowEditLead(false);
    } catch { showError('Ошибка при обновлении лида'); }
    finally { setSavingEdit(false); }
  }

  // ── activities ──
  function openAddActivity(activity?: LeadActivityDto) {
    if (activity) {
      setEditingActivity(activity);
      setActivityForm({
        type: activity.type,
        description: activity.description,
      scheduledAt: activity.scheduledAt ? toDatetimeLocal(activity.scheduledAt) : '',
      });
    } else {
      setEditingActivity(null);
      setActivityForm({ type: LeadActivityType.Call, description: '', scheduledAt: '' });
    }
    setShowAddActivity(true);
  }

  async function handleSaveActivity() {
    if (!lead || !activityForm.description.trim()) { showError('Введите описание'); return; }
    try {
      setSavingActivity(true);
      if (editingActivity) {
        const updated = await AuthenticatedApiService.updateLeadActivity(editingActivity.id, orgId, {
          description: activityForm.description.trim(),
          scheduledAt: activityForm.scheduledAt ? new Date(activityForm.scheduledAt).toISOString() : null,
          isCompleted: editingActivity.isCompleted,
        });
        setLead(prev => prev ? { ...prev, activities: prev.activities.map(a => a.id === updated.id ? updated : a) } : null);
        showSuccess('Активность обновлена');
      } else {
        const req: CreateLeadActivityRequest = {
          leadId: lead.id,
          type: activityForm.type,
          description: activityForm.description.trim(),
          scheduledAt: activityForm.scheduledAt ? new Date(activityForm.scheduledAt).toISOString() : null,
        };
        const created = await AuthenticatedApiService.createLeadActivity(orgId, req);
        setLead(prev => prev ? { ...prev, activities: [created, ...prev.activities] } : null);
        showSuccess('Активность добавлена');
      }
      setShowAddActivity(false);
    } catch { showError('Ошибка при сохранении активности'); }
    finally { setSavingActivity(false); }
  }

  function handleCompleteActivity(activity: LeadActivityDto) {
    setCompletingActivity(activity);
    setCompletionNotes('');
  }

  async function confirmCompleteActivity() {
    if (!completingActivity) return;
    try {
      const updated = await AuthenticatedApiService.completeLeadActivity(
        completingActivity.id, orgId,
        completionNotes.trim() ? { completionNotes: completionNotes.trim() } : undefined,
      );
      setLead(prev => prev ? { ...prev, activities: prev.activities.map(a => a.id === updated.id ? updated : a) } : null);
      showSuccess('Активность выполнена');
    } catch { showError('Ошибка при отметке выполнения'); }
    finally { setCompletingActivity(null); }
  }

  async function handleDeleteActivity(activity: LeadActivityDto) {
    if (!confirm('Удалить активность?')) return;
    try {
      await AuthenticatedApiService.deleteLeadActivity(activity.id, orgId);
      setLead(prev => prev ? { ...prev, activities: prev.activities.filter(a => a.id !== activity.id) } : null);
      showSuccess('Активность удалена');
    } catch { showError('Ошибка при удалении активности'); }
  }

  // ── convert ──
  async function handleConvert() {
    if (!lead) return;
    if (!convertForm.login.trim() || !convertForm.password.trim()) {
      showError('Логин и пароль обязательны'); return;
    }
    try {
      setConverting(true);
      const payload: { login: string; password: string; groupId?: string; subjectPackageId?: string; status?: StudentStatus; flagIds?: string[]; comment?: string } = {
        login: convertForm.login.trim(),
        password: convertForm.password,
      };
      if (convertForm.groupId) payload.groupId = convertForm.groupId;
      if (convertForm.subjectPackageId) payload.subjectPackageId = convertForm.subjectPackageId;
      if (convertForm.status !== undefined) payload.status = convertForm.status;
      if (convertForm.flagIds && convertForm.flagIds.length > 0) payload.flagIds = convertForm.flagIds;
      if (convertForm.comment?.trim()) payload.comment = convertForm.comment.trim();
      const updated = await AuthenticatedApiService.convertLead(lead.id, orgId, payload);
      setLead(prev => prev ? { ...prev, ...updated } : null);
      showSuccess('Лид конвертирован в студента!');
      setShowConvert(false);
      setConvertForm({ login: '', password: '', groupId: null, subjectPackageId: null, flagIds: [], comment: '' });
    } catch { showError('Ошибка при конвертации лида'); }
    finally { setConverting(false); }
  }

  // ── lose ──
  async function handleLose() {
    if (!lead) return;
    if (!loseReason.trim()) { showError('Укажите причину'); return; }
    try {
      setLosing(true);
      const updated = await AuthenticatedApiService.loseLead(lead.id, orgId, { reason: loseReason.trim() });
      setLead(prev => prev ? { ...prev, ...updated } : null);
      showSuccess('Лид отмечен как потерянный');
      setShowLose(false);
      setLoseReason('');
    } catch { showError('Ошибка при изменении статуса лида'); }
    finally { setLosing(false); }
  }

  async function handleDeleteLead() {
    if (!lead) return;
    try {
      setDeleting(true);
      await AuthenticatedApiService.deleteLead(lead.id, orgId);
      showSuccess('Лид удалён');
      router.push('/funnel');
    } catch { showError('Ошибка при удалении лида'); }
    finally { setDeleting(false); }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin h-10 w-10 border-b-2 border-violet-600 rounded-full" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 gap-4">
        <p className="text-gray-500 dark:text-gray-400 text-lg">Лид не найден</p>
        <button onClick={() => router.push('/funnel')} className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-sm">
          Вернуться к воронке
        </button>
      </div>
    );
  }

  const isConverted = !!lead.convertedUserId;
  const isLost = !!lead.lostReason;
  const currentStage = stages.find(s => s.id === lead.currentStageId);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 page-container max-w-full">
      <div className="max-w-5xl mx-auto">

        {/* Back */}
        <button
          onClick={() => router.push('/funnel')}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 mb-5 transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Назад к воронке
        </button>

        {/* Header card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm mb-5 overflow-hidden">
          {/* Color bar */}
          {currentStage && (
            <div className="h-1.5" style={{ backgroundColor: currentStage.colorHex }} />
          )}
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center shrink-0">
                  <UserIcon className="h-7 w-7 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">{lead.fullName}</h1>
                    {isConverted && (
                      <span className="flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                        <CheckCircleIcon className="h-3.5 w-3.5" />Конвертирован
                      </span>
                    )}
                    {isLost && !isConverted && (
                      <span className="flex items-center gap-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
                        <XCircleIcon className="h-3.5 w-3.5" />Потерян
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1"><PhoneIcon className="h-3.5 w-3.5" />{lead.phone}</span>
                    {lead.email && <span className="flex items-center gap-1"><EnvelopeIcon className="h-3.5 w-3.5" />{lead.email}</span>}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {!isConverted && (
                  <button onClick={openEditLead} className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <PencilIcon className="h-4 w-4" />Редактировать
                  </button>
                )}
                {isAdmin && !isConverted && !isLost && (
                  <>
                    <button onClick={() => setShowConvert(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium">
                      <CheckCircleIcon className="h-4 w-4" />Конвертировать
                    </button>
                    <button onClick={() => setShowLose(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium">
                      <XCircleIcon className="h-4 w-4" />Потерян
                    </button>
                  </>
                )}
                {isAdmin && (
                  <button
                    onClick={isConverted ? undefined : () => setShowDelete(true)}
                    disabled={isConverted}
                    title={isConverted ? 'Нельзя удалить конвертированного лида' : 'Удалить'}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg transition-colors ${isConverted ? 'border-red-200 dark:border-red-900 text-red-400 dark:text-red-700 opacity-50 cursor-not-allowed' : 'border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                  >
                    <TrashIcon className="h-4 w-4" />Удалить
                  </button>
                )}
              </div>
            </div>

            {/* Lead info grid */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              {/* Current stage */}
              <div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-1 font-medium uppercase tracking-wide">Этап</div>
                {!isConverted && !isLost ? (
                  <div className="relative">
                    <select
                      value={lead.currentStageId}
                      onChange={e => { setMoveTarget(e.target.value); setMoveComment(''); }}
                      disabled={stageChanging}
                      className="w-full text-sm font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 pr-8 focus:ring-violet-500 focus:border-violet-500 appearance-none cursor-pointer"
                    >
                      {stages.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <ChevronDownIcon className="h-3.5 w-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1 text-sm font-medium px-2.5 py-1.5 rounded-lg text-white" style={{ backgroundColor: currentStage?.colorHex ?? '#6b7280' }}>
                    {lead.currentStageName}
                  </span>
                )}
              </div>

              {/* Source */}
              <div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-1 font-medium uppercase tracking-wide">Источник</div>
                <div className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
                  <TagIcon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  {lead.sourceName ?? <span className="text-gray-400">—</span>}
                </div>
              </div>

              {/* Assigned to */}
              <div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-1 font-medium uppercase tracking-wide">Ответственный</div>
                <div className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
                  <UserIcon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  {lead.assignedToName ?? <span className="text-gray-400">—</span>}
                </div>
              </div>

              {/* Expected group */}
              <div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-1 font-medium uppercase tracking-wide">Целевая группа</div>
                <div className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
                  <UserGroupIcon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  {lead.expectedGroupName ?? <span className="text-gray-400">—</span>}
                </div>
              </div>

              {/* Parent phone */}
              {lead.parentPhone && (
                <div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mb-1 font-medium uppercase tracking-wide">Тел. родителя</div>
                  <div className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
                    <PhoneIcon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    {lead.parentPhone}
                  </div>
                </div>
              )}

              {/* Created at */}
              <div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-1 font-medium uppercase tracking-wide">Создан</div>
                <div className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
                  <ClockIcon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  {fmtDate(lead.createdAt)}
                </div>
              </div>

              {/* Converted at */}
              {isConverted && lead.convertedAt && (
                <div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mb-1 font-medium uppercase tracking-wide">Конвертирован</div>
                  <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400 font-medium">
                    <CheckCircleIcon className="h-3.5 w-3.5 shrink-0" />
                    {fmtDate(lead.convertedAt)}
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            {lead.notes && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-1.5 font-medium uppercase tracking-wide flex items-center gap-1">
                  <Bars3BottomLeftIcon className="h-3.5 w-3.5" />Заметки
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{lead.notes}</p>
              </div>
            )}

            {/* Lost reason */}
            {isLost && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="text-xs text-red-500 dark:text-red-400 font-medium mb-1 uppercase tracking-wide">Причина потери</div>
                <p className="text-sm text-red-700 dark:text-red-300">{lead.lostReason}</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Activities — main column */}
          <div className="lg:col-span-3 space-y-5">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-violet-500" />
                  Активность ({lead.activities?.length ?? 0})
                </h2>
                <button
                  onClick={() => openAddActivity()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <PlusIcon className="h-3.5 w-3.5" />Добавить
                </button>
              </div>

              {(!lead.activities || lead.activities.length === 0) ? (
                <div className="py-12 text-center">
                  <CalendarIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Нет активностей. Добавьте звонок, заметку или задачу.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {lead.activities.map(activity => (
                    <div key={activity.id} className={`px-4 py-3.5 flex items-start gap-3 group ${activity.isCompleted ? 'opacity-60' : ''}`}>
                      <div className="text-xl mt-0.5 select-none">{activityIcon(activity.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm text-gray-900 dark:text-white mb-0.5 ${activity.isCompleted ? 'line-through' : ''}`}>
                          {activity.description}
                        </div>
                        <div className="flex items-center gap-3 flex-wrap text-xs text-gray-400 dark:text-gray-500">
                          <span>{activity.typeName}</span>
                          {activity.scheduledAt && (
                            <span className={`flex items-center gap-0.5 ${!activity.isCompleted && new Date(activity.scheduledAt) < new Date() ? 'text-red-500 dark:text-red-400 font-medium' : ''}`}>
                              <CalendarIcon className="h-3 w-3" />
                              {fmtDateTime(activity.scheduledAt)}
                            </span>
                          )}
                          <span>{fmtDate(activity.createdAt)} · {activity.createdByName}</span>
                          {activity.isCompleted && activity.completedAt && (
                            <span className="text-green-600 dark:text-green-400 font-medium">✓ Выполнено {fmtDate(activity.completedAt)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!activity.isCompleted && (
                          <button onClick={() => handleCompleteActivity(activity)} title="Выполнено"
                            className="p-1.5 text-gray-400 hover:text-green-600 transition-colors">
                            <CheckCircleSolid className="h-4 w-4" />
                          </button>
                        )}
                        <button onClick={() => openAddActivity(activity)} title="Редактировать"
                          className="p-1.5 text-gray-400 hover:text-violet-600 transition-colors">
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDeleteActivity(activity)} title="Удалить"
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Stage history — side column */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <ArrowPathIcon className="h-5 w-5 text-violet-500" />
                  История этапов
                </h2>
                <button onClick={load} className="p-1.5 text-gray-400 hover:text-violet-600 transition-colors">
                  <ArrowPathIcon className="h-4 w-4" />
                </button>
              </div>
              {(!lead.stageHistory || lead.stageHistory.length === 0) ? (
                <div className="py-10 text-center">
                  <p className="text-gray-500 dark:text-gray-400 text-sm">История пуста</p>
                </div>
              ) : (
                <div className="p-4 space-y-0">
                  {lead.stageHistory.slice().reverse().map((h: LeadStageHistoryDto, i: number) => (
                    <div key={h.id} className="relative flex gap-3">
                      {/* Timeline line */}
                      {i < lead.stageHistory.length - 1 && (
                        <div className="absolute left-[11px] top-5 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                      )}
                      {/* Dot */}
                      <div className="w-5.5 h-5.5 rounded-full bg-violet-100 dark:bg-violet-900/30 border-2 border-violet-400 shrink-0 mt-0.5 z-10 flex items-center justify-center">
                      </div>
                      <div className="pb-4 min-w-0 flex-1">
                        <div className="text-sm text-gray-900 dark:text-white font-medium">
                          {h.fromStageName ? (
                            <><span className="text-gray-500 dark:text-gray-400">{h.fromStageName}</span> → {h.toStageName}</>
                          ) : h.toStageName}
                        </div>
                        {h.comment && (
                          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 italic">{h.comment}</div>
                        )}
                        <div className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                          {h.changedByName} · {fmtDateTime(h.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Stage move modal ── */}
      <BaseModal isOpen={!!moveTarget} onClose={() => { setMoveTarget(null); setMoveComment(''); }} title="Смена этапа">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Перемещение в: <strong>{stages.find(s => s.id === moveTarget)?.name}</strong>
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Комментарий</label>
            <textarea rows={3} value={moveComment} onChange={e => setMoveComment(e.target.value)}
              placeholder="Что произошло, результат звонка..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-violet-500 focus:border-violet-500 resize-none"
              autoFocus />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => { setMoveTarget(null); setMoveComment(''); }} className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors">Отмена</button>
            <button onClick={handleMoveStage} disabled={stageChanging} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
              {stageChanging ? 'Перемещение...' : 'Переместить'}
            </button>
          </div>
        </div>
      </BaseModal>

      {/* ── Edit lead modal ── */}
      <BaseModal isOpen={showEditLead} onClose={() => setShowEditLead(false)} title="Редактировать лида">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ФИО <span className="text-red-500">*</span></label>
              <input type="text" value={editForm.fullName} onChange={e => setEditForm(p => ({ ...p, fullName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-violet-500 focus:border-violet-500 text-sm" autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Телефон <span className="text-red-500">*</span></label>
              <input type="text" value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-violet-500 focus:border-violet-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Телефон родителя</label>
              <input type="text" value={editForm.parentPhone ?? ''} onChange={e => setEditForm(p => ({ ...p, parentPhone: e.target.value || null }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-violet-500 focus:border-violet-500 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input type="email" value={editForm.email ?? ''} onChange={e => setEditForm(p => ({ ...p, email: e.target.value || null }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-violet-500 focus:border-violet-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Источник</label>
              <select value={editForm.sourceId ?? ''} onChange={e => setEditForm(p => ({ ...p, sourceId: e.target.value || null }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-violet-500 focus:border-violet-500 text-sm">
                <option value="">Не указан</option>
                {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ответственный</label>
              <select value={editForm.assignedToId ?? ''} onChange={e => setEditForm(p => ({ ...p, assignedToId: e.target.value || null }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-violet-500 focus:border-violet-500 text-sm">
                <option value="">Не назначен</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Целевая группа</label>
              <select value={editForm.expectedGroupId ?? ''} onChange={e => setEditForm(p => ({ ...p, expectedGroupId: e.target.value || null }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-violet-500 focus:border-violet-500 text-sm">
                <option value="">Не указана</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Заметки</label>
              <textarea rows={3} value={editForm.notes ?? ''} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value || null }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-violet-500 focus:border-violet-500 text-sm resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowEditLead(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors">Отмена</button>
            <button onClick={handleSaveLead} disabled={savingEdit || !editForm.fullName.trim() || !editForm.phone.trim()} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
              {savingEdit ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
      </BaseModal>

      {/* ── Add/Edit Activity modal ── */}
      <BaseModal isOpen={showAddActivity} onClose={() => setShowAddActivity(false)} title={editingActivity ? 'Редактировать активность' : 'Новая активность'}>
        <div className="space-y-4">
          {!editingActivity && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Тип</label>
              <select value={activityForm.type} onChange={e => setActivityForm(p => ({ ...p, type: Number(e.target.value) as LeadActivityType }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-violet-500 focus:border-violet-500 text-sm">
                {ACTIVITY_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{activityIcon(t.value)} {t.label}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Описание <span className="text-red-500">*</span></label>
            <textarea rows={3} value={activityForm.description} onChange={e => setActivityForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Что сделали, что обсудили..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-violet-500 focus:border-violet-500 text-sm resize-none"
              autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Запланировано на</label>
            <input type="datetime-local" value={activityForm.scheduledAt} onChange={e => setActivityForm(p => ({ ...p, scheduledAt: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-violet-500 focus:border-violet-500 text-sm" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowAddActivity(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors">Отмена</button>
            <button onClick={handleSaveActivity} disabled={savingActivity || !activityForm.description.trim()} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
              {savingActivity ? 'Сохранение...' : editingActivity ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
        </div>
      </BaseModal>

      {/* ── Convert modal ── */}
      <BaseModal isOpen={showConvert} onClose={() => setShowConvert(false)} title="Конвертировать в студента">
        <div className="space-y-4">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-700 dark:text-green-400">
              Будет создан аккаунт студента для <strong>{lead.fullName}</strong>. После конвертации лид нельзя изменить.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Логин <span className="text-red-500">*</span></label>
            <input type="text" value={convertForm.login} onChange={e => setConvertForm(p => ({ ...p, login: e.target.value }))}
              placeholder="student_login"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-violet-500 focus:border-violet-500 text-sm" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Пароль <span className="text-red-500">*</span></label>
            <PasswordInput
              value={convertForm.password}
              onChange={value => setConvertForm(p => ({ ...p, password: value }))}
              placeholder="Минимум 8 символов"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Добавить в группу</label>
            <select value={convertForm.groupId ?? ''} onChange={e => setConvertForm(p => ({ ...p, groupId: e.target.value || null, subjectPackageId: null }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-violet-500 focus:border-violet-500 text-sm">
              <option value="">Без группы</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          {convertForm.groupId && (() => {
            const grp = groups.find(g => g.id === convertForm.groupId);
            const pkgs = subjects.find(s => s.id === grp?.subjectId)?.subjectPackages ?? [];
            return pkgs.length > 0 ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Пакет занятий</label>
                <select value={convertForm.subjectPackageId ?? ''} onChange={e => setConvertForm(p => ({ ...p, subjectPackageId: e.target.value || null }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-violet-500 focus:border-violet-500 text-sm">
                  <option value="">Без пакета</option>
                  {pkgs.map(p => <option key={p.id ?? p.name} value={p.id ?? ''}>{p.name}</option>)}
                </select>
              </div>
            ) : null;
          })()}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Статус студента</label>
            <select value={convertForm.status !== undefined ? String(convertForm.status) : ''}
              onChange={e => setConvertForm(p => ({ ...p, status: e.target.value !== '' ? Number(e.target.value) as StudentStatus : undefined }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-violet-500 focus:border-violet-500 text-sm">
              <option value="">Не указан</option>
              {(Object.values(StudentStatus).filter(v => typeof v === 'number') as StudentStatus[]).map(s => (
                <option key={s} value={String(s)}>{getStudentStatusName(s)}</option>
              ))}
            </select>
          </div>
          {availableFlags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Флаги</label>
              <div className="max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 py-1 px-2 space-y-1">
                {availableFlags.map(flag => (
                  <label key={flag.id} className="flex items-center gap-2 cursor-pointer py-0.5">
                    <input type="checkbox" checked={convertForm.flagIds?.includes(flag.id) ?? false}
                      onChange={e => setConvertForm(p => ({
                        ...p,
                        flagIds: e.target.checked
                          ? [...(p.flagIds ?? []), flag.id]
                          : (p.flagIds ?? []).filter(id => id !== flag.id),
                      }))}
                      className="rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{flag.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Комментарий</label>
            <textarea rows={2} value={convertForm.comment ?? ''}
              onChange={e => setConvertForm(p => ({ ...p, comment: e.target.value }))}
              placeholder="Дополнительная информация..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-violet-500 focus:border-violet-500 text-sm resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowConvert(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors">Отмена</button>
            <button onClick={handleConvert} disabled={converting || !convertForm.login.trim() || !convertForm.password.trim()} className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
              {converting ? 'Конвертация...' : 'Конвертировать'}
            </button>
          </div>
        </div>
      </BaseModal>

      {/* ── Complete Activity Modal ── */}
      <BaseModal isOpen={!!completingActivity} onClose={() => setCompletingActivity(null)} title="Выполнить активность">
        <div className="space-y-4">
          {completingActivity && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-xs text-green-600 dark:text-green-500 mb-1">{completingActivity.typeName}</p>
              <p className="text-sm font-medium text-green-800 dark:text-green-400">{completingActivity.description}</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Что сделали / что обсудили <span className="text-gray-400 font-normal">(необязательно)</span>
            </label>
            <textarea
              rows={4}
              value={completionNotes}
              onChange={e => setCompletionNotes(e.target.value)}
              placeholder="Опишите результат, договорённости, следующие шаги..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-violet-500 focus:border-violet-500 text-sm resize-none"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button
              onClick={() => setCompletingActivity(null)}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={confirmCompleteActivity}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <CheckCircleSolid className="h-4 w-4" />
              Выполнено
            </button>
          </div>
        </div>
      </BaseModal>

      {/* ── Lose modal ── */}
      <BaseModal isOpen={showLose} onClose={() => setShowLose(false)} title="Отметить как потерянного">
        <div className="space-y-4">
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-400">Лид будет помечен как потерянный. Укажите причину для аналитики.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Причина <span className="text-red-500">*</span></label>
            <textarea rows={3} value={loseReason} onChange={e => setLoseReason(e.target.value)}
              placeholder="Передумал, нашёл другую школу, дорого..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-violet-500 focus:border-violet-500 text-sm resize-none"
              autoFocus />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowLose(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors">Отмена</button>
            <button onClick={handleLose} disabled={losing || !loseReason.trim()} className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
              {losing ? 'Сохранение...' : 'Потерян'}
            </button>
          </div>
        </div>
      </BaseModal>

      {/* Delete confirmation modal */}
      <BaseModal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        title="Удалить лида"
        subtitle={lead?.fullName}
        gradientFrom="from-red-500"
        gradientTo="to-red-700"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-400">Это действие необратимо. Вся активность и история этапов лида будут удалены.</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowDelete(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors">Отмена</button>
            <button onClick={handleDeleteLead} disabled={deleting} className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
              {deleting ? 'Удаление...' : 'Да, удалить'}
            </button>
          </div>
        </div>
      </BaseModal>
    </div>
  );
}
