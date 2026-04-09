'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  UserGroupIcon,
  PlusIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  UserIcon,
  LinkIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  XMarkIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { BranchOwnerApiService } from '@/services/BranchOwnerApiService';
import { AuthenticatedApiService } from '@/services/AuthenticatedApiService';
import { BranchOwnerUserDto, BranchOwnerCreatedResponse } from '@/types/BranchOwner';
import { Organization } from '@/types/Organization';
import { PageHeaderWithStats } from '@/components/ui/PageHeaderWithStats';
import { useToast } from '@/contexts/ToastContext';
import { isOwner } from '@/types/Role';

// ─── Password Reveal Modal ──────────────────────────────────────────────────

function PasswordRevealModal({
  data,
  onClose,
}: {
  data: BranchOwnerCreatedResponse;
  onClose: () => void;
}) {
  const [copiedLogin, setCopiedLogin] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const copy = async (text: string, field: 'login' | 'password') => {
    await navigator.clipboard.writeText(text);
    if (field === 'login') {
      setCopiedLogin(true);
      setTimeout(() => setCopiedLogin(false), 2000);
    } else {
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-5 bg-gradient-to-r from-green-500 to-emerald-600 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <KeyIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Пользователь создан</h2>
              <p className="text-green-100 text-sm">Сохраните данные входа — пароль показывается только один раз</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300">
            ⚠️ После закрытия этого окна пароль невозможно восстановить. Скопируйте и передайте данные пользователю.
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ФИО</label>
            <p className="text-gray-900 dark:text-white font-medium mt-1">{data.fullName}</p>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Логин</label>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white font-mono text-sm">
                {data.login}
              </span>
              <button
                onClick={() => copy(data.login, 'login')}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {copiedLogin ? <CheckIcon className="w-4 h-4 text-green-500" /> : <ClipboardDocumentIcon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Сгенерированный пароль</label>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white font-mono text-sm">
                {data.generatedPassword}
              </span>
              <button
                onClick={() => copy(data.generatedPassword, 'password')}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {copiedPassword ? <CheckIcon className="w-4 h-4 text-green-500" /> : <ClipboardDocumentIcon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-medium transition-all duration-200 shadow-md"
          >
            Я сохранил данные, закрыть
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Create BranchOwner Modal ───────────────────────────────────────────────

function CreateBranchOwnerModal({
  isOpen,
  onClose,
  organizations,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  organizations: Organization[];
  onCreated: (result: BranchOwnerCreatedResponse) => void;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState({ login: '', fullName: '', phone: '', organizationId: '' });
  const [submitting, setSubmitting] = useState(false);

  const reset = () => setForm({ login: '', fullName: '', phone: '', organizationId: '' });

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    if (!form.login.trim() || !form.fullName.trim() || !form.phone.trim() || !form.organizationId) {
      showToast('Заполните все обязательные поля', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const result = await BranchOwnerApiService.createUser({
        login: form.login.trim(),
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        organizationId: form.organizationId,
      });
      reset();
      onClose();
      onCreated(result);
    } catch (e) {
      const msg = (e as { message?: string })?.message || 'Ошибка при создании';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const inputClass =
    'w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <UserGroupIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Создать владельца филиалов</h2>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              ФИО <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Иванов Иван Иванович"
              value={form.fullName}
              onChange={(e) => setForm(p => ({ ...p, fullName: e.target.value }))}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Логин <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="ivan.ivanov"
              value={form.login}
              onChange={(e) => setForm(p => ({ ...p, login: e.target.value }))}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Телефон <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              placeholder="+7 (___) ___-__-__"
              value={form.phone}
              onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Организация <span className="text-red-500">*</span>
            </label>
            <select
              value={form.organizationId}
              onChange={(e) => setForm(p => ({ ...p, organizationId: e.target.value }))}
              className={inputClass}
            >
              <option value="">— Выберите организацию —</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id.toString()}>{org.name}</option>
              ))}
            </select>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Пароль будет сгенерирован автоматически и показан после создания.
          </p>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={handleClose}
            className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Создание...' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Assign Organization Modal ──────────────────────────────────────────────

function AssignOrgModal({
  isOpen,
  onClose,
  branchOwner,
  organizations,
  onAssigned,
}: {
  isOpen: boolean;
  onClose: () => void;
  branchOwner: BranchOwnerUserDto;
  organizations: Organization[];
  onAssigned: () => void;
}) {
  const { showToast } = useToast();
  const [orgId, setOrgId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const assignedOrgIds = new Set(branchOwner.organizations.map(o => o.id));
  const available = organizations.filter(o => !assignedOrgIds.has(o.id.toString()));

  const handleAssign = async () => {
    if (!orgId) { showToast('Выберите организацию', 'error'); return; }
    setSubmitting(true);
    try {
      await BranchOwnerApiService.assignOrganization({ ownerUserId: branchOwner.id, organizationId: orgId });
      showToast('Организация привязана', 'success');
      setOrgId('');
      onAssigned();
      onClose();
    } catch (e) {
      showToast((e as { message?: string })?.message || 'Ошибка', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Привязать организацию</h2>
          <button onClick={onClose}><XMarkIcon className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Пользователь: <span className="font-medium text-gray-900 dark:text-white">{branchOwner.fullName}</span>
          </p>
          {available.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Все организации уже привязаны.</p>
          ) : (
            <select
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Выберите организацию —</option>
              {available.map(org => (
                <option key={org.id} value={org.id.toString()}>{org.name}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Отмена
          </button>
          {available.length > 0 && (
            <button
              onClick={handleAssign}
              disabled={submitting || !orgId}
              className="flex-1 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            >
              {submitting ? 'Привязка...' : 'Привязать'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function BranchOwnersManagementPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [branchOwners, setBranchOwners] = useState<BranchOwnerUserDto[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createdResult, setCreatedResult] = useState<BranchOwnerCreatedResponse | null>(null);

  const [assignTarget, setAssignTarget] = useState<BranchOwnerUserDto | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.push('/login'); return; }
    if (!isOwner(user.role)) { router.push('/'); return; }
  }, [isLoading, user, router]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [bos, orgs] = await Promise.all([
        BranchOwnerApiService.getUsers(),
        AuthenticatedApiService.getOrganizations(),
      ]);
      setBranchOwners(bos);
      setOrganizations(orgs);
    } catch (e) {
      showToast('Ошибка загрузки данных', 'error');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (user && isOwner(user.role)) load();
  }, [user, load]);

  const handleUnassign = async (bo: BranchOwnerUserDto, orgId: string) => {
    try {
      await BranchOwnerApiService.unassignOrganization({ ownerUserId: bo.id, organizationId: orgId });
      showToast('Организация отвязана', 'success');
      load();
    } catch (e) {
      showToast((e as { message?: string })?.message || 'Ошибка', 'error');
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16 md:pt-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16 md:pt-20 max-w-full overflow-x-hidden">
      <div className="w-full space-y-6">
        <PageHeaderWithStats
          title="Владельцы филиалов"
          subtitle="Управление пользователями с ролью BranchOwner"
          icon={UserGroupIcon}
          gradientFrom="blue-500"
          gradientTo="indigo-600"
          actionLabel="Создать"
          onAction={() => setShowCreateModal(true)}
          stats={[
            { label: 'Всего', value: branchOwners.length, color: 'blue' },
            { label: 'Организаций', value: organizations.length, color: 'indigo' },
          ]}
        />

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
          {branchOwners.length === 0 ? (
            <div className="text-center py-16">
              <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full w-16 h-16 mx-auto mb-4">
                <UserGroupIcon className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mt-2" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Нет владельцев филиалов</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">Создайте первого пользователя BranchOwner</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
              >
                <PlusIcon className="w-4 h-4" />
                Создать
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {branchOwners.map((bo) => (
                <div key={bo.id} className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    {/* User info */}
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-white font-bold text-lg">
                          {bo.fullName?.charAt(0)?.toUpperCase() || 'B'}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{bo.fullName}</h3>
                        <div className="flex flex-wrap gap-3 mt-1">
                          <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                            <UserIcon className="w-3.5 h-3.5" />
                            {bo.login}
                          </span>
                          <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                            <PhoneIcon className="w-3.5 h-3.5" />
                            {bo.phone}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          Создан: {new Date(bo.createdDate).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <button
                      onClick={() => setAssignTarget(bo)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors self-start"
                    >
                      <LinkIcon className="w-4 h-4" />
                      Привязать организацию
                    </button>
                  </div>

                  {/* Organizations */}
                  {bo.organizations.length > 0 && (
                    <div className="mt-4 ml-16">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                        Организации ({bo.organizations.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {bo.organizations.map((org) => (
                          <div
                            key={org.id}
                            className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm"
                          >
                            <BuildingOfficeIcon className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-gray-700 dark:text-gray-300">{org.name}</span>
                            <button
                              onClick={() => handleUnassign(bo, org.id)}
                              className="ml-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                              title="Отвязать"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {bo.organizations.length === 0 && (
                    <p className="mt-3 ml-16 text-sm text-gray-400 dark:text-gray-500 italic">
                      Нет привязанных организаций
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <CreateBranchOwnerModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        organizations={organizations}
        onCreated={(result) => {
          setCreatedResult(result);
          load();
        }}
      />

      {/* Password Reveal Modal */}
      {createdResult && (
        <PasswordRevealModal
          data={createdResult}
          onClose={() => setCreatedResult(null)}
        />
      )}

      {/* Assign Org Modal */}
      {assignTarget && (
        <AssignOrgModal
          isOpen={!!assignTarget}
          onClose={() => setAssignTarget(null)}
          branchOwner={assignTarget}
          organizations={organizations}
          onAssigned={load}
        />
      )}
    </div>
  );
}
