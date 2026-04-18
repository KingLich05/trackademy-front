'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { AuthenticatedApiService } from '../../services/AuthenticatedApiService';
import {
  FunnelStageDto, LeadDto, LeadSourceDto, FunnelStageWithLeads,
  CreateLeadRequest, CreateFunnelStageRequest, UpdateFunnelStageRequest,
  CreateLeadSourceRequest, UpdateLeadSourceRequest,
  FunnelAnalyticsDto, LeadActivityDto, LeadActivityType, ConvertLeadRequest,
} from '../../types/SalesFunnel';
import { useDebounce } from '../../hooks/useDebounce';
import { StudentStatus, getStudentStatusName } from '../../types/StudentCrm';
import { StudentFlag } from '../../types/StudentFlag';
import { Subject } from '../../types/Subject';
import { BaseModal } from '../../components/ui/BaseModal';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { API_BASE_URL } from '../../lib/api-config';
import { DateRangePicker } from '../../components/ui/DateRangePicker';
import {
  FunnelIcon, PlusIcon, PencilIcon, TrashIcon,
  UserIcon, PhoneIcon, ChartBarIcon, ClipboardDocumentListIcon,
  CogIcon, CheckCircleIcon, XCircleIcon, CalendarIcon,
  ArrowPathIcon, MagnifyingGlassIcon, SparklesIcon, DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
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

const STAGE_COLORS = [
  '#2196F3', '#FF9800', '#9C27B0', '#4CAF50', '#F44336',
  '#00BCD4', '#FF5722', '#607D8B', '#E91E63', '#795548',
];

// ─── default lead form ────────────────────────────────────────────────────────
const defaultLeadForm = (): CreateLeadRequest => ({
  fullName: '', phone: '', email: null, parentPhone: null,
  sourceId: null, notes: null, assignedToId: null, expectedGroupId: null,
});

// ─── page ─────────────────────────────────────────────────────────────────────
export default function FunnelPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { showSuccess, showError } = useToast();
  const router = useRouter();

  const isAdmin = user?.role === 'Administrator' || user?.role === 'Owner';
  const orgId: string = user?.organizationId
    || (typeof window !== 'undefined' ? localStorage.getItem('userOrganizationId') ?? '' : '')
    || '';

  const [activeTab, setActiveTab] = useState<'kanban' | 'analytics' | 'tasks' | 'settings'>('kanban');

  // ── data ──
  const [stages, setStages] = useState<FunnelStageDto[]>([]);
  const [kanbanStages, setKanbanStages] = useState<FunnelStageWithLeads[]>([]);
  const [sources, setSources] = useState<LeadSourceDto[]>([]);
  const [analytics, setAnalytics] = useState<FunnelAnalyticsDto | null>(null);
  const [tasks, setTasks] = useState<LeadActivityDto[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string; subjectId?: string }[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [staff, setStaff] = useState<{ id: string; fullName: string }[]>([]);

  // ── loading ──
  const [loadingKanban, setLoadingKanban] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);

  // ── kanban drag ──
  const dragLeadId = useRef<string | null>(null);
  const dragOverStageId = useRef<string | null>(null);

  // ── infinite scroll sentinels ──
  const sentinelRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // ── search / filter ──
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const debouncedSearch = useDebounce(search, 400);

  // ── analytics period ──
  const [analyticsFrom, setAnalyticsFrom] = useState('');
  const [analyticsTo, setAnalyticsTo] = useState('');

  // ── create lead modal ──
  const [showCreateLead, setShowCreateLead] = useState(false);
  const [leadForm, setLeadForm] = useState<CreateLeadRequest>(defaultLeadForm());
  const [savingLead, setSavingLead] = useState(false);

  // ── stage modal ──
  const [showStageModal, setShowStageModal] = useState(false);
  const [editingStage, setEditingStage] = useState<FunnelStageDto | null>(null);
  const [stageForm, setStageForm] = useState<CreateFunnelStageRequest>({
    name: '', order: 0, colorHex: '#2196F3', isClosedWon: false, isClosedLost: false,
  });
  const [savingStage, setSavingStage] = useState(false);

  // ── source modal ──
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [editingSource, setEditingSource] = useState<LeadSourceDto | null>(null);
  const [sourceForm, setSourceForm] = useState<CreateLeadSourceRequest>({ name: '' });
  const [savingSource, setSavingSource] = useState(false);

  // ── move comment modal ──
  const [moveTarget, setMoveTarget] = useState<{ leadId: string; stageId: string } | null>(null);
  const [moveComment, setMoveComment] = useState('');

  // ── convert modal (triggered after moving to isClosedWon stage) ──
  const [convertLeadId, setConvertLeadId] = useState<string | null>(null);
  const [convertLeadName, setConvertLeadName] = useState('');
  const [convertForm, setConvertForm] = useState<ConvertLeadRequest>({ login: '', password: '', groupId: null, subjectPackageId: null, flagIds: [], comment: '' });
  const [converting, setConverting] = useState(false);
  const [availableFlags, setAvailableFlags] = useState<StudentFlag[]>([]);

  // ── complete task modal ──
  const [completingTask, setCompletingTask] = useState<LeadActivityDto | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');

  // ── confirm dialog ──
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);

  // ── init ──
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    // Restore pending convert modal after page refresh
    const pending = localStorage.getItem('pendingConvert');
    if (pending) {
      try {
        const { id, name } = JSON.parse(pending);
        setConvertLeadId(id);
        setConvertLeadName(name);
        setConvertForm({ login: '', password: '', groupId: null, subjectPackageId: null, flagIds: [], comment: '' });
      } catch { localStorage.removeItem('pendingConvert'); }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (activeTab === 'analytics') loadAnalytics();
    if (activeTab === 'tasks') loadTasks();
    if (activeTab === 'settings') loadSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ── loaders ──
  const loadKanban = useCallback(async () => {
    if (!orgId) return;
    try {
      setLoadingKanban(true);
      const [board, src, g, u, fl, sub] = await Promise.all([
        AuthenticatedApiService.getFunnelBoard(orgId, {
          take: 20,
          search: debouncedSearch || undefined,
          sourceId: filterSource || undefined,
        }),
        AuthenticatedApiService.getLeadSources(orgId),
        AuthenticatedApiService.getGroups(orgId, 1000),
        AuthenticatedApiService.getUsers({ organizationId: orgId, pageSize: 500, roleIds: [2, 3, 4] }),
        AuthenticatedApiService.getStudentFlags(),
        AuthenticatedApiService.getSubjects(orgId),
      ]);
      const sortedStages = [...board.stages].sort((a, b) => a.order - b.order);
      setKanbanStages(sortedStages);
      setStages(sortedStages.map(s => ({ id: s.id, name: s.name, order: s.order, colorHex: s.colorHex, isClosedWon: s.isClosedWon, isClosedLost: s.isClosedLost, leadsCount: s.totalCount })));
      setSources(src);
      setGroups((g.items || []).map((gr: { id: string; name: string; subject?: { subjectId?: string } | string }) => ({ id: gr.id, name: gr.name, subjectId: typeof gr.subject === 'object' ? (gr.subject as { subjectId?: string })?.subjectId : undefined })));
      setStaff((u.items || []).filter((m: { id: string; name?: string; fullName?: string }) => m.name || m.fullName).map((m: { id: string; name?: string; fullName?: string }) => ({ id: m.id, fullName: m.fullName || m.name || '' })));
      setAvailableFlags(fl);
      setSubjects(sub);
    } catch {
      showError('Ошибка при загрузке воронки');
    } finally {
      setLoadingKanban(false);
    }
  }, [orgId, debouncedSearch, filterSource, showError]);

  // Load more for a specific stage
  const loadMoreForStage = useCallback(async (stageId: string) => {
    if (!orgId) return;
    const stageData = kanbanStages.find(s => s.id === stageId);
    if (!stageData || !stageData.hasMore || stageData.isLoadingMore) return;
    setKanbanStages(prev => prev.map(s => s.id === stageId ? { ...s, isLoadingMore: true } : s));
    try {
      const result = await AuthenticatedApiService.getFunnelStageLeads(orgId, stageId, {
        skip: stageData.leads.length,
        take: 20,
        search: debouncedSearch || undefined,
        sourceId: filterSource || undefined,
      });
      setKanbanStages(prev => prev.map(s => s.id === stageId
        ? { ...s, leads: [...s.leads, ...result.leads], totalCount: result.totalCount, hasMore: result.hasMore, isLoadingMore: false }
        : s,
      ));
    } catch {
      showError('Ошибка при загрузке лидов');
      setKanbanStages(prev => prev.map(s => s.id === stageId ? { ...s, isLoadingMore: false } : s));
    }
  }, [orgId, kanbanStages, debouncedSearch, filterSource, showError]);

  // Infinite scroll: observe sentinel divs at bottom of each column
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const stageId = (entry.target as HTMLElement).dataset.stageId;
          if (stageId) loadMoreForStage(stageId);
        }
      }
    }, { threshold: 0.1 });
    const currentRefs = sentinelRefs.current;
    for (const stageId of Object.keys(currentRefs)) {
      const el = currentRefs[stageId];
      if (el) { el.dataset.stageId = stageId; observer.observe(el); }
    }
    return () => observer.disconnect();
  }, [kanbanStages, loadMoreForStage]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) loadKanban();
  }, [isLoading, isAuthenticated, loadKanban]);

  // Re-fetch board when debounced search or filter changes
  useEffect(() => {
    if (!isLoading && isAuthenticated && orgId) loadKanban();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filterSource]);

  async function loadAnalytics() {
    if (!orgId) return;
    try {
      setLoadingAnalytics(true);
      setAnalytics(await AuthenticatedApiService.getFunnelAnalytics(orgId, analyticsFrom || undefined, analyticsTo || undefined));
    } catch { showError('Ошибка при загрузке аналитики'); }
    finally { setLoadingAnalytics(false); }
  }

  async function loadTasks() {
    if (!orgId) return;
    try {
      setLoadingTasks(true);
      setTasks(await AuthenticatedApiService.getUpcomingActivities(orgId));
    } catch { showError('Ошибка при загрузке задач'); }
    finally { setLoadingTasks(false); }
  }

  async function loadSettings() {
    if (!orgId) return;
    try {
      setLoadingSettings(true);
      const [s, src] = await Promise.all([
        AuthenticatedApiService.getFunnelStages(orgId),
        AuthenticatedApiService.getLeadSources(orgId),
      ]);
      setStages(s.sort((a, b) => a.order - b.order));
      setSources(src);
    } catch { showError('Ошибка при загрузке настроек'); }
    finally { setLoadingSettings(false); }
  }

  // ── create lead ──
  async function handleCreateLead() {
    if (!leadForm.fullName.trim() || !leadForm.phone.trim()) {
      showError('ФИО и телефон обязательны'); return;
    }
    try {
      setSavingLead(true);
      await AuthenticatedApiService.createLead(orgId, {
        ...leadForm,
        email: leadForm.email || null,
        parentPhone: leadForm.parentPhone || null,
        sourceId: leadForm.sourceId || null,
        notes: leadForm.notes || null,
        assignedToId: leadForm.assignedToId || null,
        expectedGroupId: leadForm.expectedGroupId || null,
      });
      showSuccess('Лид создан');
      setShowCreateLead(false);
      setLeadForm(defaultLeadForm());
      await loadKanban();
    } catch { showError('Ошибка при создании лида'); }
    finally { setSavingLead(false); }
  }

  // ── drag-and-drop ──
  function onDragStart(leadId: string) {
    dragLeadId.current = leadId;
  }

  function onDragOver(e: React.DragEvent, stageId: string) {
    e.preventDefault();
    dragOverStageId.current = stageId;
  }

  async function onDrop(stageId: string) {
    const leadId = dragLeadId.current;
    if (!leadId) return;
    const lead = kanbanStages.flatMap(s => s.leads).find(l => l.id === leadId);
    if (!lead || lead.currentStageId === stageId) return;
    if (lead.convertedUserId) { showError('Нельзя перемещать конвертированного лида'); return; }
    setMoveTarget({ leadId, stageId });
    setMoveComment('');
  }

  async function confirmMove() {
    if (!moveTarget) return;
    try {
      const updated = await AuthenticatedApiService.moveLeadStage(moveTarget.leadId, orgId, {
        stageId: moveTarget.stageId,
        comment: moveComment || null,
      });
      // Update kanbanStages: remove from source, prepend to target, adjust totalCount
      setKanbanStages(prev => {
        const fromId = prev.find(s => s.leads.some(l => l.id === updated.id))?.id;
        return prev.map(s => {
          if (s.id === fromId && fromId !== moveTarget.stageId) {
            return { ...s, leads: s.leads.filter(l => l.id !== updated.id), totalCount: Math.max(0, s.totalCount - 1) };
          }
          if (s.id === moveTarget.stageId) {
            const alreadyIn = s.leads.some(l => l.id === updated.id);
            return {
              ...s,
              leads: alreadyIn ? s.leads.map(l => l.id === updated.id ? updated : l) : [updated, ...s.leads],
              totalCount: alreadyIn ? s.totalCount : s.totalCount + 1,
            };
          }
          return s;
        });
      });
      showSuccess('Лид перемещён');
      const targetStage = stages.find(s => s.id === moveTarget.stageId);
      if (targetStage?.isClosedWon && !updated.convertedUserId) {
        localStorage.setItem('pendingConvert', JSON.stringify({ id: updated.id, name: updated.fullName }));
        setConvertLeadId(updated.id);
        setConvertLeadName(updated.fullName);
        setConvertForm({ login: '', password: '', groupId: null, subjectPackageId: null, flagIds: [], comment: '' });
      }
    } catch { showError('Ошибка при перемещении лида'); }
    finally { setMoveTarget(null); dragLeadId.current = null; }
  }

  async function handleConvert() {
    if (!convertLeadId) return;
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
      const updated = await AuthenticatedApiService.convertLead(convertLeadId, orgId, payload);
      setKanbanStages(prev => prev.map(s => ({
        ...s,
        leads: s.leads.map(l => l.id === updated.id ? updated : l),
      })));
      showSuccess('Лид конвертирован в студента!');
      localStorage.removeItem('pendingConvert');
      setConvertLeadId(null);
      setConvertLeadName('');
      setConvertForm({ login: '', password: '', groupId: null, subjectPackageId: null, flagIds: [], comment: '' });
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message;
      showError(message && message !== 'Failed to fetch' ? message : 'Ошибка при конвертации лида');
    }
    finally { setConverting(false); }
  }

  // ── delete lead ──
  function handleDeleteLead(lead: LeadDto) {
    setConfirmDialog({
      title: 'Удалить лида',
      message: `Удалить лида «${lead.fullName}»? Это действие нельзя отменить.`,
      danger: true,
      onConfirm: async () => {
        try {
          await AuthenticatedApiService.deleteLead(lead.id, orgId);
          showSuccess('Лид удалён');
          setKanbanStages(prev => prev.map(s => ({
            ...s,
            leads: s.leads.filter(l => l.id !== lead.id),
            totalCount: s.leads.some(l => l.id === lead.id) ? Math.max(0, s.totalCount - 1) : s.totalCount,
          })));
        } catch { showError('Ошибка при удалении лида'); }
      },
    });
  }

  // ── delete task ──
  function handleDeleteTask(task: LeadActivityDto) {
    setConfirmDialog({
      title: 'Удалить задачу',
      message: `Удалить задачу «${task.description}»? Это действие нельзя отменить.`,
      danger: true,
      onConfirm: async () => {
        try {
          await AuthenticatedApiService.deleteLeadActivity(task.id, orgId);
          setTasks(prev => prev.filter(t => t.id !== task.id));
          showSuccess('Задача удалена');
        } catch { showError('Ошибка при удалении задачи'); }
      },
    });
  }

  // ── complete task ──
  function handleCompleteTask(task: LeadActivityDto) {
    setCompletingTask(task);
    setCompletionNotes('');
  }

  async function confirmCompleteTask() {
    if (!completingTask) return;
    try {
      const updated = await AuthenticatedApiService.completeLeadActivity(
        completingTask.id, orgId,
        completionNotes.trim() ? { completionNotes: completionNotes.trim() } : undefined,
      );
      setTasks(prev => prev.filter(t => t.id !== updated.id));
      showSuccess('Задача выполнена');
    } catch { showError('Ошибка при выполнении задачи'); }
    finally { setCompletingTask(null); }
  }

  // ── initialize defaults ──
  function handleInitDefaults() {
    setConfirmDialog({
      title: 'Инициализировать воронку',
      message: 'Создать стандартные этапы воронки и источники лидов?',
      onConfirm: async () => {
        try {
          await AuthenticatedApiService.initializeFunnelDefaults(orgId);
          showSuccess('Дефолтные этапы и источники созданы');
          await loadSettings();
        } catch { showError('Ошибка при инициализации'); }
      },
    });
  }

  // ── stage CRUD ──
  function openStageModal(stage?: FunnelStageDto) {
    if (stage) {
      setEditingStage(stage);
      setStageForm({ name: stage.name, order: stage.order, colorHex: stage.colorHex, isClosedWon: stage.isClosedWon, isClosedLost: stage.isClosedLost });
    } else {
      setEditingStage(null);
      setStageForm({ name: '', order: stages.length, colorHex: STAGE_COLORS[stages.length % STAGE_COLORS.length], isClosedWon: false, isClosedLost: false });
    }
    setShowStageModal(true);
  }

  async function handleSaveStage() {
    if (!stageForm.name.trim()) { showError('Введите название этапа'); return; }
    if (stageForm.isClosedWon && stageForm.isClosedLost) { showError('Этап не может быть одновременно «Записан» и «Потерян»'); return; }
    try {
      setSavingStage(true);
      if (editingStage) {
        await AuthenticatedApiService.updateFunnelStage(editingStage.id, orgId, stageForm);
        showSuccess('Этап обновлён');
      } else {
        await AuthenticatedApiService.createFunnelStage(orgId, stageForm);
        showSuccess('Этап создан');
      }
      setShowStageModal(false);
      await loadSettings();
      await loadKanban();
    } catch { showError('Ошибка при сохранении этапа'); }
    finally { setSavingStage(false); }
  }

  function handleDeleteStage(stage: FunnelStageDto) {
    if (stage.leadsCount > 0) { showError('Нельзя удалить этап с лидами. Переместите лидов сначала.'); return; }
    setConfirmDialog({
      title: 'Удалить этап',
      message: `Удалить этап «${stage.name}»?`,
      danger: true,
      onConfirm: async () => {
        try {
          await AuthenticatedApiService.deleteFunnelStage(stage.id, orgId);
          showSuccess('Этап удалён');
          await loadSettings();
          await loadKanban();
        } catch { showError('Ошибка при удалении этапа'); }
      },
    });
  }

  // ── source CRUD ──
  function openSourceModal(source?: LeadSourceDto) {
    if (source) {
      setEditingSource(source);
      setSourceForm({ name: source.name });
    } else {
      setEditingSource(null);
      setSourceForm({ name: '' });
    }
    setShowSourceModal(true);
  }

  async function handleSaveSource() {
    if (!sourceForm.name.trim()) { showError('Введите название источника'); return; }
    try {
      setSavingSource(true);
      if (editingSource) {
        await AuthenticatedApiService.updateLeadSource(editingSource.id, orgId, { name: sourceForm.name.trim(), isActive: editingSource.isActive });
        showSuccess('Источник обновлён');
      } else {
        await AuthenticatedApiService.createLeadSource(orgId, { name: sourceForm.name.trim() });
        showSuccess('Источник создан');
      }
      setShowSourceModal(false);
      await loadSettings();
    } catch { showError('Ошибка при сохранении источника'); }
    finally { setSavingSource(false); }
  }

  function handleDeleteSource(source: LeadSourceDto) {
    if (source.leadsCount > 0) { showError('Нельзя удалить источник с лидами'); return; }
    setConfirmDialog({
      title: 'Удалить источник',
      message: `Удалить источник «${source.name}»?`,
      danger: true,
      onConfirm: async () => {
        try {
          await AuthenticatedApiService.deleteLeadSource(source.id, orgId);
          showSuccess('Источник удалён');
          await loadSettings();
        } catch { showError('Ошибка при удалении источника'); }
      },
    });
  }

  // ── filtered leads per stage ──
  // With the new board API, leads are already pre-filtered server-side;
  // this just looks up the stage's lead array from kanbanStages.
  const stageLeads = useMemo(() => {
    const map: Record<string, LeadDto[]> = {};
    for (const s of kanbanStages) map[s.id] = s.leads;
    return map;
  }, [kanbanStages]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ── funnel export ──
  const [showFunnelExport, setShowFunnelExport] = useState(false);
  const [funnelExportLoading, setFunnelExportLoading] = useState(false);
  const [funnelExportFilters, setFunnelExportFilters] = useState({
    dateFrom: '', dateTo: '', stageId: '', sourceId: '', assignedToId: '', includeAnalytics: true,
  });

  const handleExportFunnel = async () => {
    if (!orgId) return;
    setFunnelExportLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const body: Record<string, unknown> = { organizationId: orgId, includeAnalytics: funnelExportFilters.includeAnalytics };
      if (funnelExportFilters.dateFrom) body.dateFrom = new Date(funnelExportFilters.dateFrom).toISOString();
      if (funnelExportFilters.dateTo) body.dateTo = new Date(funnelExportFilters.dateTo).toISOString();
      if (funnelExportFilters.stageId) body.stageId = funnelExportFilters.stageId;
      if (funnelExportFilters.sourceId) body.sourceId = funnelExportFilters.sourceId;
      if (funnelExportFilters.assignedToId) body.assignedToId = funnelExportFilters.assignedToId;
      const res = await fetch(`${API_BASE_URL}/Export/funnel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Ошибка экспорта');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `funnel_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      showSuccess('Экспорт воронки скачан');
      setShowFunnelExport(false);
    } catch {
      showError('Ошибка при экспорте воронки');
    } finally {
      setFunnelExportLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  const TABS = [
    { id: 'kanban', label: 'Канбан', icon: FunnelIcon },
    { id: 'analytics', label: 'Аналитика', icon: ChartBarIcon },
    { id: 'tasks', label: 'Задачи', icon: ClipboardDocumentListIcon },
    ...(isAdmin ? [{ id: 'settings', label: 'Настройки', icon: CogIcon }] : []),
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 max-w-full">
      <div className="max-w-full mx-auto">

        {/* Header */}
        <div className="mb-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow">
              <FunnelIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Воронка продаж</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">CRM — от лида до студента</p>
            </div>
          </div>
          {activeTab === 'kanban' && (
            <div className="w-2" />
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white dark:bg-gray-800 rounded-xl p-1 border border-gray-200 dark:border-gray-700 mb-5 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Kanban ── */}
        {activeTab === 'kanban' && (
          <>
            {/* Search / filter bar — stays put, never scrolls */}
            <div className="flex gap-3 flex-wrap mb-4 flex-shrink-0">
              <div className="relative flex-1 min-w-[200px]">
                <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Поиск по имени или телефону..."
                  className="pl-9 pr-3 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-violet-500 focus:border-violet-500"
                />
              </div>
              <select
                value={filterSource}
                onChange={e => { setFilterSource(e.target.value); }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-violet-500 focus:border-violet-500"
              >
                <option value="">Все источники</option>
                {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button onClick={loadKanban} className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <ArrowPathIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowFunnelExport(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
              >
                <DocumentArrowDownIcon className="h-4 w-4" />
                Экспорт
              </button>
              <button
                onClick={() => { setLeadForm(defaultLeadForm()); setShowCreateLead(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
              >
                <PlusIcon className="h-4 w-4" />
                Добавить лида
              </button>
            </div>

            {/* Board area — fills remaining viewport height, only this scrolls horizontally */}
            <div style={{ height: 'calc(100vh - 290px)', minHeight: '400px', overflow: 'hidden' }}>
              {loadingKanban ? (
                <div className="flex justify-center pt-16">
                  <div className="animate-spin h-10 w-10 border-b-2 border-violet-600 rounded-full" />
                </div>
              ) : kanbanStages.length === 0 ? (
                <div className="text-center py-20">
                  <FunnelIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 text-lg mb-3">Воронка не настроена</p>
                  {isAdmin && (
                    <button
                      onClick={handleInitDefaults}
                      className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors font-medium"
                    >
                      Инициализировать дефолтные этапы
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-full h-full flex gap-4 overflow-x-auto overflow-y-hidden pb-3 scrollbar-custom">
                  {kanbanStages.map(stage => {
                    const sLeads = stageLeads[stage.id] ?? [];
                    const isWon = stage.isClosedWon;
                    const isLost = stage.isClosedLost;
                    return (
                      <div
                        key={stage.id}
                        className="flex-shrink-0 w-72 h-full flex flex-col rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm"
                        onDragOver={e => onDragOver(e, stage.id)}
                        onDrop={() => onDrop(stage.id)}
                      >
                        {/* Column header — fixed height */}
                        <div
                          className="flex-shrink-0 px-4 py-3 rounded-t-xl flex items-center justify-between"
                          style={{ borderTop: `3px solid ${stage.colorHex}` }}
                        >
                          <div className="flex items-center gap-2">
                            {isWon && <CheckCircleIcon className="h-4 w-4 text-green-500" />}
                            {isLost && <XCircleIcon className="h-4 w-4 text-red-500" />}
                            <span className="font-semibold text-gray-900 dark:text-white text-sm">{stage.name}</span>
                            <span
                              className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: stage.colorHex }}
                            >{stage.totalCount}</span>
                          </div>
                        </div>

                        {/* Cards — fills remaining column height, scrolls vertically */}
                        <div className="flex-1 min-h-0 p-2 space-y-2 overflow-y-auto">
                          {sLeads.map(lead => (
                            <div
                              key={lead.id}
                              draggable
                              onDragStart={() => onDragStart(lead.id)}
                              onClick={() => router.push(`/funnel/${lead.id}`)}
                              className={`group bg-gray-50 dark:bg-gray-700/60 rounded-lg p-3 border border-gray-200 dark:border-gray-600 cursor-pointer hover:shadow-md hover:border-violet-300 dark:hover:border-violet-600 transition-all select-none ${
                                lead.convertedUserId ? 'opacity-70' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between gap-1 mb-1.5">
                                <span className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">{lead.fullName}</span>
                                {isAdmin && (
                                  <button
                                    onClick={e => { e.stopPropagation(); if (!lead.convertedUserId) handleDeleteLead(lead); }}
                                    disabled={!!lead.convertedUserId}
                                    title={lead.convertedUserId ? 'Нельзя удалить конвертированного лида' : 'Удалить'}
                                    className={`p-0.5 transition-all shrink-0 ${lead.convertedUserId ? 'opacity-30 cursor-not-allowed text-gray-400' : 'opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500'}`}
                                  >
                                    <TrashIcon className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                                <PhoneIcon className="h-3 w-3 shrink-0" />
                                <span>{lead.phone}</span>
                              </div>
                              {lead.sourceName && (
                                <span className="inline-block text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded mb-1">
                                  {lead.sourceName}
                                </span>
                              )}
                              {lead.assignedToName && (
                                <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mt-1">
                                  <UserIcon className="h-3 w-3" />
                                  <span>{lead.assignedToName}</span>
                                </div>
                              )}
                              {lead.convertedUserId && (
                                <div className="mt-1.5 flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                                  <CheckCircleIcon className="h-3.5 w-3.5" />
                                  Конвертирован
                                </div>
                              )}
                              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                                {fmtDate(lead.createdAt)}
                              </div>
                            </div>
                          ))}

                          {sLeads.length === 0 && (
                            <div className="text-center py-6 text-xs text-gray-400 dark:text-gray-500">
                              Нет лидов
                            </div>
                          )}

                          {/* Sentinel for infinite scroll */}
                          {stage.hasMore && (
                            <div
                              ref={el => { sentinelRefs.current[stage.id] = el; }}
                              className="py-2 flex items-center justify-center"
                            >
                              {stage.isLoadingMore && (
                                <span className="animate-spin h-4 w-4 border-b-2 border-violet-500 rounded-full inline-block" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Analytics ── */}
        {activeTab === 'analytics' && (
          <div className="space-y-5">
            {/* Period filter */}
            <div className="flex gap-3 flex-wrap items-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex-1 min-w-[240px]">
                <DateRangePicker
                  startDate={analyticsFrom || undefined}
                  endDate={analyticsTo || undefined}
                  onDateChange={(from, to) => {
                    setAnalyticsFrom(from ?? '');
                    setAnalyticsTo(to ?? '');
                  }}
                  placeholder="Выберите период аналитики"
                />
              </div>
              <button onClick={loadAnalytics} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors">
                Применить
              </button>
            </div>

            {loadingAnalytics ? (
              <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-b-2 border-violet-600 rounded-full" /></div>
            ) : analytics ? (
              <>
                {/* KPI cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Всего лидов', value: analytics.totalLeads, color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' },
                    { label: 'Конвертировано', value: analytics.convertedLeads, color: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' },
                    { label: 'Потеряно', value: analytics.lostLeads, color: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' },
                    { label: 'Конверсия', value: `${analytics.conversionRate.toFixed(1)}%`, color: 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400' },
                  ].map(card => (
                    <div key={card.label} className={`rounded-xl p-5 ${card.color}`}>
                      <div className="text-3xl font-bold mb-1">{card.value}</div>
                      <div className="text-sm font-medium opacity-80">{card.label}</div>
                    </div>
                  ))}
                </div>

                {/* Stage funnel */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Распределение по этапам</h3>
                  <div className="space-y-3">
                    {analytics.stageConversions.map(s => (
                      <div key={s.stageId}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700 dark:text-gray-300">{s.stageName}</span>
                          <span className="text-gray-500 dark:text-gray-400">{s.leadsCount} ({s.percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(s.percentage, 1)}%`, backgroundColor: s.colorHex }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Source analytics */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Конверсия по источникам</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                          <th className="pb-2 font-medium">Источник</th>
                          <th className="pb-2 font-medium text-right">Лидов</th>
                          <th className="pb-2 font-medium text-right">Конвертировано</th>
                          <th className="pb-2 font-medium text-right">Конверсия</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {analytics.sourceAnalytics.map((s, i) => (
                          <tr key={s.sourceId ?? i}>
                            <td className="py-2.5 font-medium text-gray-900 dark:text-white">{s.sourceName}</td>
                            <td className="py-2.5 text-right text-gray-600 dark:text-gray-400">{s.totalLeads}</td>
                            <td className="py-2.5 text-right text-green-600 dark:text-green-400 font-medium">{s.convertedLeads}</td>
                            <td className="py-2.5 text-right">
                              <span className={`font-bold ${s.conversionRate >= 50 ? 'text-green-600 dark:text-green-400' : s.conversionRate >= 25 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-500 dark:text-red-400'}`}>
                                {s.conversionRate.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-20 text-gray-500 dark:text-gray-400">
                <ChartBarIcon className="h-16 w-16 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p>Нажмите «Применить» для загрузки аналитики</p>
              </div>
            )}
          </div>
        )}

        {/* ── Tasks ── */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">Предстоящие задачи по всем лидам</p>
                {!loadingTasks && tasks.length > 0 && (
                  <span className="text-xs font-semibold bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-full">
                    {tasks.length}
                  </span>
                )}
              </div>
              <button onClick={loadTasks} className="p-2 text-gray-400 hover:text-violet-600 transition-colors">
                <ArrowPathIcon className="h-4 w-4" />
              </button>
            </div>
            {loadingTasks ? (
              <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 border-b-2 border-violet-600 rounded-full" /></div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-20">
                <ClipboardDocumentListIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">Нет предстоящих задач</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                {tasks.map((task, index) => (
                  <div key={task.id} className="flex items-center gap-4 px-5 py-3.5">
                    <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-semibold flex items-center justify-center shrink-0 select-none tabular-nums">{index + 1}</span>
                    <button
                      onClick={() => handleCompleteTask(task)}
                      className="w-5 h-5 border-2 border-violet-400 rounded-full hover:bg-violet-100 dark:hover:bg-violet-900/30 flex-shrink-0 transition-colors"
                      title="Отметить выполненной"
                    />
                    <div className="flex-1 min-w-0">
                      {task.name && (
                        <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 truncate mb-0.5">{task.name}</p>
                      )}
                      <div className="flex items-center gap-2 mb-0.5">
                        <span>{activityIcon(task.type)}</span>
                        <span className="font-medium text-gray-900 dark:text-white text-sm truncate">{task.description}</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <span>{task.typeName}</span>
                        {task.scheduledAt && (
                          <span className={`flex items-center gap-1 ${new Date(task.scheduledAt) < new Date() ? 'text-red-500 dark:text-red-400 font-medium' : ''}`}>
                            <CalendarIcon className="h-3 w-3" />
                            {fmtDate(task.scheduledAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => router.push(`/funnel/${task.leadId}`)}
                        className="p-1.5 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-lg transition-colors"
                        title="Перейти к лиду"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task)}
                        className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Удалить задачу"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Settings (admin only) ── */}
        {activeTab === 'settings' && isAdmin && (
          <div className="space-y-6">
            {loadingSettings ? (
              <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 border-b-2 border-violet-600 rounded-full" /></div>
            ) : (
              <>
                {/* Init defaults */}
                {stages.length === 0 && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-amber-800 dark:text-amber-400">Воронка не настроена</p>
                      <p className="text-sm text-amber-700 dark:text-amber-500 mt-0.5">Создайте стандартные этапы одним кликом</p>
                    </div>
                    <button onClick={handleInitDefaults} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
                      Инициализировать
                    </button>
                  </div>
                )}

                {/* Stages management */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Этапы воронки ({stages.length})</h3>
                    <button onClick={() => openStageModal()} className="flex items-center gap-2 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm transition-colors">
                      <PlusIcon className="h-3.5 w-3.5" />Добавить этап
                    </button>
                  </div>
                  {stages.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">Этапов нет</div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {stages.map(stage => (
                        <div key={stage.id} className="flex items-center gap-3 px-4 py-3">
                          <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: stage.colorHex }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-white text-sm">{stage.name}</span>
                              {stage.isClosedWon && <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded">Записан</span>}
                              {stage.isClosedLost && <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded">Потерян</span>}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Порядок: {stage.order} · Лидов: {stage.leadsCount}
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => openStageModal(stage)} className="p-1.5 text-gray-400 hover:text-violet-600 transition-colors">
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDeleteStage(stage)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sources management */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Источники лидов ({sources.length})</h3>
                    <button onClick={() => openSourceModal()} className="flex items-center gap-2 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm transition-colors">
                      <PlusIcon className="h-3.5 w-3.5" />Добавить
                    </button>
                  </div>
                  {sources.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">Источников нет</div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {sources.map(src => (
                        <div key={src.id} className="flex items-center gap-3 px-4 py-3">
                          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${src.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-gray-900 dark:text-white text-sm">{src.name}</span>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Лидов: {src.leadsCount} · {src.isActive ? 'Активен' : 'Неактивен'}</div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => openSourceModal(src)} className="p-1.5 text-gray-400 hover:text-violet-600 transition-colors">
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDeleteSource(src)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Complete Task Modal ── */}
      <BaseModal isOpen={!!completingTask} onClose={() => setCompletingTask(null)} title="Выполнить задачу">
        <div className="space-y-4">
          {completingTask && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm font-medium text-green-800 dark:text-green-400">{completingTask.description}</p>
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
              onClick={() => setCompletingTask(null)}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={confirmCompleteTask}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <CheckCircleIcon className="h-4 w-4" />
              Выполнено
            </button>
          </div>
        </div>
      </BaseModal>

      {/* ── Move stage comment modal ── */}
      <BaseModal isOpen={!!moveTarget} onClose={() => { setMoveTarget(null); dragLeadId.current = null; }} title="Перемещение лида">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Комментарий к перемещению (необязательно)</p>
          <textarea
            rows={3}
            value={moveComment}
            onChange={e => setMoveComment(e.target.value)}
            placeholder="Причина, результат встречи..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-violet-500 focus:border-violet-500 resize-none text-sm"
            autoFocus
          />
          <div className="flex justify-end gap-3">
            <button onClick={() => { setMoveTarget(null); dragLeadId.current = null; }} className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors">
              Отмена
            </button>
            <button onClick={confirmMove} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors">
              Переместить
            </button>
          </div>
        </div>
      </BaseModal>

      {/* ── Funnel Export Modal ── */}
      <BaseModal isOpen={showFunnelExport} onClose={() => setShowFunnelExport(false)} title="Экспорт воронки продаж">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Дата от</label>
              <input type="date" value={funnelExportFilters.dateFrom}
                onChange={e => setFunnelExportFilters(p => ({ ...p, dateFrom: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Дата до</label>
              <input type="date" value={funnelExportFilters.dateTo}
                onChange={e => setFunnelExportFilters(p => ({ ...p, dateTo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Этап</label>
            <select value={funnelExportFilters.stageId}
              onChange={e => setFunnelExportFilters(p => ({ ...p, stageId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Все этапы</option>
              {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Источник</label>
            <select value={funnelExportFilters.sourceId}
              onChange={e => setFunnelExportFilters(p => ({ ...p, sourceId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Все источники</option>
              {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ответственный</label>
            <select value={funnelExportFilters.assignedToId}
              onChange={e => setFunnelExportFilters(p => ({ ...p, assignedToId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Все</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="funnelIncludeAnalytics" checked={funnelExportFilters.includeAnalytics}
              onChange={e => setFunnelExportFilters(p => ({ ...p, includeAnalytics: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
            />
            <label htmlFor="funnelIncludeAnalytics" className="text-sm text-gray-700 dark:text-gray-300">Включить аналитику</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowFunnelExport(false)}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors">
              Отмена
            </button>
            <button onClick={handleExportFunnel} disabled={funnelExportLoading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors">
              {funnelExportLoading ? <span className="animate-spin h-4 w-4 border-b-2 border-white rounded-full inline-block" /> : <DocumentArrowDownIcon className="h-4 w-4" />}
              Экспортировать
            </button>
          </div>
        </div>
      </BaseModal>

      {/* ── Create Lead Modal ── */}
      <BaseModal isOpen={showCreateLead} onClose={() => setShowCreateLead(false)} title="Новый лид">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ФИО <span className="text-red-500">*</span></label>
              <input type="text" value={leadForm.fullName} onChange={e => setLeadForm(p => ({ ...p, fullName: e.target.value }))} placeholder="Иванов Иван Иванович"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-violet-500 focus:border-violet-500 text-sm" autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Телефон <span className="text-red-500">*</span></label>
              <PhoneInput
                value={leadForm.phone}
                onChange={v => setLeadForm(p => ({ ...p, phone: v }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Телефон родителя</label>
              <PhoneInput
                value={leadForm.parentPhone ?? ''}
                onChange={v => setLeadForm(p => ({ ...p, parentPhone: v || null }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input type="email" value={leadForm.email ?? ''} onChange={e => setLeadForm(p => ({ ...p, email: e.target.value || null }))} placeholder="email@example.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-violet-500 focus:border-violet-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Источник</label>
              <select value={leadForm.sourceId ?? ''} onChange={e => setLeadForm(p => ({ ...p, sourceId: e.target.value || null }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-violet-500 focus:border-violet-500 text-sm">
                <option value="">Не указан</option>
                {sources.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ответственный</label>
              <select value={leadForm.assignedToId ?? ''} onChange={e => setLeadForm(p => ({ ...p, assignedToId: e.target.value || null }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-violet-500 focus:border-violet-500 text-sm">
                <option value="">Не назначен</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Целевая группа</label>
              <select value={leadForm.expectedGroupId ?? ''} onChange={e => setLeadForm(p => ({ ...p, expectedGroupId: e.target.value || null }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-violet-500 focus:border-violet-500 text-sm">
                <option value="">Не указана</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Заметки</label>
              <textarea rows={2} value={leadForm.notes ?? ''} onChange={e => setLeadForm(p => ({ ...p, notes: e.target.value || null }))} placeholder="Что интересует, пожелания..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-violet-500 focus:border-violet-500 text-sm resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowCreateLead(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors">
              Отмена
            </button>
            <button onClick={handleCreateLead} disabled={savingLead || !leadForm.fullName.trim() || !leadForm.phone.trim()} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors">
              {savingLead ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </div>
      </BaseModal>

      {/* ── Stage Modal ── */}
      <BaseModal isOpen={showStageModal} onClose={() => setShowStageModal(false)} title={editingStage ? 'Редактировать этап' : 'Новый этап'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Название <span className="text-red-500">*</span></label>
            <input type="text" value={stageForm.name} onChange={e => setStageForm(p => ({ ...p, name: e.target.value }))} placeholder="Пробное занятие"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-violet-500 focus:border-violet-500 text-sm" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Порядок</label>
              <input type="number" min={0} value={stageForm.order} onChange={e => setStageForm(p => ({ ...p, order: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-violet-500 focus:border-violet-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Цвет</label>
              <div className="flex items-center gap-2">
                <input type="color" value={stageForm.colorHex} onChange={e => setStageForm(p => ({ ...p, colorHex: e.target.value }))}
                  className="w-10 h-9 rounded border border-gray-300 dark:border-gray-600 cursor-pointer bg-white dark:bg-gray-700" />
                <input type="text" value={stageForm.colorHex} onChange={e => setStageForm(p => ({ ...p, colorHex: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-violet-500 focus:border-violet-500 text-sm font-mono" />
              </div>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {STAGE_COLORS.map(c => (
                  <button key={c} onClick={() => setStageForm(p => ({ ...p, colorHex: c }))}
                    className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${stageForm.colorHex === c ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={stageForm.isClosedWon} onChange={e => setStageForm(p => ({ ...p, isClosedWon: e.target.checked, isClosedLost: e.target.checked ? false : p.isClosedLost }))} className="rounded" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Записан (ClosedWon)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={stageForm.isClosedLost} onChange={e => setStageForm(p => ({ ...p, isClosedLost: e.target.checked, isClosedWon: e.target.checked ? false : p.isClosedWon }))} className="rounded" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Потерян (ClosedLost)</span>
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowStageModal(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors">Отмена</button>
            <button onClick={handleSaveStage} disabled={savingStage || !stageForm.name.trim()} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors">
              {savingStage ? 'Сохранение...' : editingStage ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </div>
      </BaseModal>

      {/* ── Source Modal ── */}
      <BaseModal isOpen={showSourceModal} onClose={() => setShowSourceModal(false)} title={editingSource ? 'Редактировать источник' : 'Новый источник'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Название <span className="text-red-500">*</span></label>
            <input type="text" value={sourceForm.name} onChange={e => setSourceForm({ name: e.target.value })} placeholder="Instagram"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-violet-500 focus:border-violet-500 text-sm" autoFocus />
          </div>
          {editingSource && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={editingSource.isActive} onChange={e => setEditingSource(p => p ? { ...p, isActive: e.target.checked } : null)} className="rounded" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Активен</span>
            </label>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowSourceModal(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors">Отмена</button>
            <button onClick={handleSaveSource} disabled={savingSource || !sourceForm.name.trim()} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors">
              {savingSource ? 'Сохранение...' : editingSource ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
        </div>
      </BaseModal>

      {/* ── Confirm Dialog ── */}
      <BaseModal isOpen={!!confirmDialog} onClose={() => setConfirmDialog(null)} title={confirmDialog?.title ?? ''}>
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            {confirmDialog?.danger && (
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <TrashIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
            )}
            <p className="text-sm text-gray-600 dark:text-gray-400 pt-2">{confirmDialog?.message}</p>
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setConfirmDialog(null)}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={() => { confirmDialog?.onConfirm(); setConfirmDialog(null); }}
              className={`px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors ${
                confirmDialog?.danger
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-violet-600 hover:bg-violet-700'
              }`}
            >
              {confirmDialog?.danger ? 'Удалить' : 'Подтвердить'}
            </button>
          </div>
        </div>
      </BaseModal>

      {/* ── Convert Lead Modal (triggered after drop onto isClosedWon stage) ── */}
      <BaseModal
        isOpen={!!convertLeadId}
        onClose={() => {}}
        hideClose
        title="Конвертировать в студента"
        gradientFrom="from-green-500"
        gradientTo="to-emerald-600"
      >
        <div className="space-y-4">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-700 dark:text-green-400">
              Лид <strong>{convertLeadName}</strong> перемещён в этап «Записан». Создайте аккаунт студента для него.
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
            <button onClick={handleConvert} disabled={converting || !convertForm.login.trim() || !convertForm.password.trim()}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
              {converting ? 'Конвертация...' : 'Конвертировать'}
            </button>
          </div>
        </div>
      </BaseModal>
    </div>
  );
}

