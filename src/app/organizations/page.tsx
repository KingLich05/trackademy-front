'use client';

import React, { useState, useEffect } from 'react';
import { Organization, OrganizationDetail, OrganizationFormData } from '../../types/Organization';
import { UserFormData } from '../../types/User';
import { AuthenticatedApiService } from '../../services/AuthenticatedApiService';
import { PhoneIcon, MapPinIcon, PencilIcon, TrashIcon, PlusIcon, BuildingOfficeIcon, UserPlusIcon, EyeIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import Link from 'next/link';

import UniversalModal from '../../components/ui/UniversalModal';
import { useUniversalModal } from '../../hooks/useUniversalModal';
import { OrganizationViewForm } from '../../components/forms/OrganizationViewForm';
import { DeleteConfirmationModal } from '../../components/ui/DeleteConfirmationModal';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { PageHeaderWithStats } from '../../components/ui/PageHeaderWithStats';
import OwnerProtectedRoute from '../../components/OwnerProtectedRoute';
import { useApiToast } from '../../hooks/useApiToast';

function OrganizationsPage() {
  const { isAuthenticated } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingOrganization, setDeletingOrganization] = useState<Organization | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingOrganizationId, setEditingOrganizationId] = useState<number | null>(null);

  // Универсальная система модалов для организаций
  const organizationModal = useUniversalModal('organization', {
    name: '',
    phone: '',
    address: ''
  });

  // Модалка для создания администратора
  const adminModal = useUniversalModal('user', {
    login: '',
    fullName: '',
    password: '',
    phone: '',
    role: 2,
    organizationId: ''
  });

  // Модалка для просмотра организации
  const viewModal = useUniversalModal('organization', {
    name: '',
    phone: '',
    address: ''
  });

  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  
  // Toast уведомления для API операций
  const { createOperation, updateOperation, deleteOperation, loadOperation } = useApiToast();

  const loadOrganizations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await loadOperation(
        () => AuthenticatedApiService.getOrganizations(),
        'организации'
      );
      setOrganizations(data);
    } catch (err) {
      setError('Не удалось загрузить организации. Попробуйте еще раз.');
      console.error('Error loading organizations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadOrganizations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Check authentication after all hooks are called
  if (!isAuthenticated) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium" style={{ color: 'var(--foreground)' }}>Требуется авторизация</h3>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Войдите в систему для управления организациями
          </p>
          <div className="mt-6">
            <Link
              href="/login"
              className="btn-primary"
            >
              Войти в систему
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleEdit = (id: number) => {
    const organization = organizations.find(org => org.id === id);
    if (organization) {
      setEditingOrganizationId(id);
      organizationModal.openEditModal({
        name: organization.name,
        phone: organization.phone || '',
        address: organization.address || ''
      });
    }
  };

  const handleSaveEdit = async (formData: OrganizationFormData) => {
    if (!editingOrganizationId) {
      throw new Error('ID организации не найден');
    }
    
    const result = await updateOperation(
      () => AuthenticatedApiService.updateOrganization(editingOrganizationId.toString(), formData),
      'организацию'
    );
    
    // Always reload data and close modal regardless of result
    if (result.success) {
      await loadOrganizations();
    }
    setEditingOrganizationId(null);
    organizationModal.closeModal();
  };

  const handleDelete = (id: number) => {
    const organization = organizations.find(org => org.id === id);
    if (organization) {
      setDeletingOrganization(organization);
      setIsDeleteModalOpen(true);
    }
  };

  const handleCreate = () => {
    setEditingOrganizationId(null);
    organizationModal.openCreateModal();
  };

  const handleView = async (id: number) => {
    try {
      const organizationDetail = await AuthenticatedApiService.getOrganizationById(id.toString());
      viewModal.openViewModal(organizationDetail as any);
    } catch (error) {
      console.error('Ошибка при загрузке данных организации:', error);
    }
  };

  const handleAddAdmin = (organizationId: string) => {
    setSelectedOrganizationId(organizationId);
    adminModal.openCreateModal();
  };

  const handleSaveAdmin = async (formData: Record<string, unknown>) => {
    if (!selectedOrganizationId) {
      throw new Error('ID организации не найден');
    }

    const adminData: UserFormData = {
      login: formData.login as string,
      fullName: formData.fullName as string,
      password: formData.password as string,
      phone: formData.phone as string,
      role: 2,
      organizationId: selectedOrganizationId,
      isTrial: false
    };

    const result = await createOperation(
      () => AuthenticatedApiService.createUser(adminData),
      'администратора'
    );

    setSelectedOrganizationId(null);
    adminModal.closeModal();
  };

  const handleSaveCreate = async (formData: OrganizationFormData) => {
    const result = await createOperation(
      () => AuthenticatedApiService.createOrganization(formData),
      'организацию'
    );
    
    // Always reload data and close modal regardless of result
    if (result.success) {
      await loadOrganizations();
    }
    organizationModal.closeModal();
  };

  const handleConfirmDelete = async () => {
    if (!deletingOrganization) return;
    
    await deleteOperation(
      () => AuthenticatedApiService.deleteOrganization(deletingOrganization.id.toString()),
      'организацию'
    );
    
    await loadOrganizations();
    handleCloseDeleteModal();
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingOrganization(null);
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
        
        <div className="card">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Организации</h1>
          <p className="page-subtitle">Управление образовательными организациями</p>
        </div>
        
        <div className="card text-center py-12">
          <div className="text-red-500 dark:text-red-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={loadOrganizations}
            className="btn-primary"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 pt-20 md:pt-24">
      <div className="w-full space-y-6">
        {/* Modern Header Card */}
        <PageHeaderWithStats
          title="Организации"
          subtitle="Управление образовательными организациями"
          icon={BuildingOfficeIcon}
          gradientFrom="indigo-500"
          gradientTo="purple-600"
          actionLabel="Добавить организацию"
          onAction={handleCreate}
          stats={[
            { label: "Всего организаций", value: organizations.length, color: "violet" }
          ]}
        />
        
{/* Content Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg rounded-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          {organizations.length === 0 ? (
            <div className="text-center py-16 p-6">
              <div className="p-4 bg-indigo-100 dark:bg-indigo-900/30 rounded-full w-16 h-16 mx-auto mb-6">
                <BuildingOfficeIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400 mx-auto mt-2" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Нет организаций</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Создайте первую организацию для начала работы
              </p>
              <button
                onClick={handleCreate}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all duration-200 hover:scale-105 inline-flex items-center"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Добавить организацию
              </button>
            </div>
          ) : (
            <div className="p-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {organizations.map((organization) => (
                  <div
                    key={organization.id}
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow duration-200 cursor-pointer"
                    onClick={() => handleView(organization.id)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                          <BuildingOfficeIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {organization.name}
                          </h3>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleView(organization.id);
                          }}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                          title="Просмотр"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddAdmin(organization.id.toString());
                          }}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                          title="Добавить администратора"
                        >
                          <UserPlusIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(organization.id);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                          title="Редактировать"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(organization.id);
                          }}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                          title="Удалить"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <PhoneIcon className="h-4 w-4 mr-2" />
                        {organization.phone}
                      </div>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <MapPinIcon className="h-4 w-4 mr-2" />
                        {organization.address}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Universal Organization Modal */}
      <UniversalModal
        isOpen={organizationModal.isOpen}
        mode={organizationModal.mode}
        title={organizationModal.getConfig().title}
        subtitle={organizationModal.getConfig().subtitle}
        icon={organizationModal.getConfig().icon}
        gradientFrom={organizationModal.getConfig().gradientFrom}
        gradientTo={organizationModal.getConfig().gradientTo}
        maxWidth="lg"
        initialData={{
          name: '',
          phone: '',
          address: ''
        }}
        data={organizationModal.editData || undefined}
        onClose={() => {
          setEditingOrganizationId(null);
          organizationModal.closeModal();
        }}
        onSave={async (data: Record<string, unknown>) => {
          if (organizationModal.mode === 'create') {
            await handleSaveCreate(data as unknown as OrganizationFormData);
          } else {
            await handleSaveEdit(data as unknown as OrganizationFormData);
          }
        }}
        submitText={organizationModal.getConfig().submitText}
        loadingText={organizationModal.getConfig().loadingText}
      >
        {({ formData, setFormData }) => (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Название организации <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={(formData.name as string) || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Введите название организации"
                required
              />
            </div>

            <div>
              <PhoneInput
                label="Телефон"
                value={(formData.phone as string) || ''}
                onChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
                placeholder="+7 (___) ___-__-__"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Адрес <span className="text-red-500">*</span>
              </label>
              <textarea
                value={(formData.address as string) || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Введите адрес организации"
                rows={3}
                required
              />
            </div>
          </div>
        )}
      </UniversalModal>

      {/* Admin Creation Modal */}
      <UniversalModal
        isOpen={adminModal.isOpen}
        mode="create"
        title="Добавить администратора"
        subtitle="Создайте нового администратора для организации"
        icon={UserPlusIcon}
        gradientFrom="green-500"
        gradientTo="emerald-600"
        maxWidth="lg"
        initialData={{
          login: '',
          fullName: '',
          password: '',
          phone: ''
        }}
        onClose={() => {
          setSelectedOrganizationId(null);
          adminModal.closeModal();
        }}
        onSave={handleSaveAdmin}
        submitText="Создать администратора"
        loadingText="Создание администратора..."
      >
        {({ formData, setFormData }) => (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Логин <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={(formData.login as string) || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, login: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Введите логин"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ФИО <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={(formData.fullName as string) || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Введите ФИО"
                required
              />
            </div>

            <div>
              <PhoneInput
                label="Телефон"
                value={(formData.phone as string) || ''}
                onChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
                placeholder="+7 (___) ___-__-__"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Пароль <span className="text-red-500">*</span>
              </label>
              <PasswordInput
                value={(formData.password as string) || ''}
                onChange={(value) => setFormData(prev => ({ ...prev, password: value }))}
                placeholder="Введите пароль"
                required
              />
            </div>
          </div>
        )}
      </UniversalModal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Удалить организацию"
        message={`Вы уверены, что хотите удалить организацию "${deletingOrganization?.name}"? Это действие нельзя отменить.`}
        onConfirm={handleConfirmDelete}
        onClose={handleCloseDeleteModal}
      />

      {/* View Organization Modal */}
      <UniversalModal
        isOpen={viewModal.isOpen}
        mode="view"
        title={viewModal.getConfig().title}
        subtitle={viewModal.getConfig().subtitle}
        icon={viewModal.getConfig().icon}
        gradientFrom={viewModal.getConfig().gradientFrom}
        gradientTo={viewModal.getConfig().gradientTo}
        maxWidth="lg"
        onClose={viewModal.closeModal}
        submitText={viewModal.getConfig().submitText}
        loadingText={viewModal.getConfig().loadingText}
      >
        {() => viewModal.editData ? (
          <OrganizationViewForm data={viewModal.editData as OrganizationDetail} />
        ) : (
          <div>Загрузка...</div>
        )}
      </UniversalModal>
    </div>
  );
}

// Wrap the entire component with OwnerProtectedRoute
function ProtectedOrganizationsPage() {
  return (
    <OwnerProtectedRoute>
      <OrganizationsPage />
    </OwnerProtectedRoute>
  );
}

export default ProtectedOrganizationsPage;
