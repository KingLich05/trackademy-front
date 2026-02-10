'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthenticatedApiService } from '../../services/AuthenticatedApiService';
import { HomeModernIcon, PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Room, RoomFormData } from '../../types/Room';
import UniversalModal from '../../components/ui/UniversalModal';
import { useUniversalModal } from '../../hooks/useUniversalModal';
import { DeleteConfirmationModal } from '../../components/ui/DeleteConfirmationModal';
import { PageHeaderWithStats } from '../../components/ui/PageHeaderWithStats';
import { useApiToast } from '../../hooks/useApiToast';
import Link from 'next/link';

interface RoomsResponse {
  items: Room[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export default function RoomsPage() {
  const { isAuthenticated, user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [tableLoading, setTableLoading] = useState(false);
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);

  // Универсальная система модалов для комнат
  const roomModal = useUniversalModal('room', {
    name: '',
    capacity: ''
  });

  // API Toast уведомления
  const { createOperation, updateOperation, deleteOperation, loadOperation } = useApiToast();

  const [pageSize, setPageSize] = useState(10);

  const loadRooms = useCallback(async (page: number = currentPage, isTableOnly: boolean = true, customPageSize?: number) => {
    const actualPageSize = customPageSize ?? pageSize;
    if (isTableOnly) {
      setTableLoading(true);
    }
    setError(null);
    
    try {
      const organizationId = user?.organizationId || localStorage.getItem('userOrganizationId');
      
      if (!organizationId) {
        setError('Не удается определить организацию пользователя');
        return;
      }

      const requestBody = {
        pageNumber: page,
        pageSize: actualPageSize,
        organizationId: organizationId
      };

      const data = await loadOperation(
        () => AuthenticatedApiService.post<RoomsResponse>('/Room/GetAllRooms', requestBody),
        'кабинеты'
      );
      
      setRooms(data.items);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to load rooms:', error);
      setError('Не удалось загрузить список кабинетов');
    } finally {
      if (isTableOnly) {
        setTableLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.organizationId, pageSize]);

  useEffect(() => {
    if (isAuthenticated && user?.organizationId) {
      loadRooms(1, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.organizationId]);

  // Check authentication after all hooks are called
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
            <div className="text-center">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full w-16 h-16 mx-auto mb-4">
                <svg className="w-10 h-10 text-green-600 dark:text-green-400 mx-auto mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Требуется авторизация</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                Войдите в систему для управления кабинетами организации
              </p>
              <Link
                href="/login"
                className="w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
              >
                Войти в систему
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handlePageChange = (page: number) => {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      loadRooms(page, true);
    }
  };

  const handleCreate = () => {
    setEditingRoomId(null);
    roomModal.openCreateModal();
  };

  const handleSaveCreate = async (formData: RoomFormData) => {
    const organizationId = user?.organizationId || localStorage.getItem('userOrganizationId');
    
    if (!organizationId) {
      throw new Error('Не удается определить организацию пользователя');
    }

    const dataToSend = {
      ...formData,
      organizationId: organizationId,
    };

    const result = await createOperation(
      () => AuthenticatedApiService.post('/Room/create', dataToSend),
      'кабинет'
    );
    
    // Always reload data and close modal regardless of result
    if (result.success) {
      await loadRooms(currentPage, true);
    }
    roomModal.closeModal();
  };

  const handleEdit = (id: string) => {
    const room = rooms.find(r => r.id === id);
    if (room) {
      setEditingRoomId(id);
      roomModal.openEditModal({
        name: room.name,
        capacity: room.capacity.toString()
      });
    }
  };

  const handleSaveEdit = async (formData: RoomFormData) => {
    if (!editingRoomId) {
      throw new Error('ID кабинета не найден');
    }
    
    const result = await updateOperation(
      () => AuthenticatedApiService.put(`/Room/${editingRoomId}`, formData),
      'кабинет'
    );
    
    // Always reload data and close modal regardless of result
    if (result.success) {
      await loadRooms(currentPage, true);
    }
    setEditingRoomId(null);
    roomModal.closeModal();
  };

  const handleDelete = (id: string) => {
    const room = rooms.find(r => r.id === id);
    if (room) {
      setDeletingRoom(room);
      setIsDeleteModalOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingRoom) return;
    
    await deleteOperation(
      () => AuthenticatedApiService.delete(`/Room/${deletingRoom.id}`),
      'кабинет'
    );
    
    await loadRooms(currentPage, true);
    handleCloseDeleteModal();
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingRoom(null);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    loadRooms(1, true, newPageSize);
  };

  const renderPagination = () => {
    // Показываем пагинацию всегда, если есть totalPages или totalCount
    if (totalPages === 0 && totalCount === 0) return null;

    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="bg-gradient-to-r from-gray-50 to-green-50 dark:from-gray-700 dark:to-gray-600 px-6 py-4 border-t border-gray-200/50 dark:border-gray-600/50">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Mobile Pagination */}
          <div className="flex justify-center sm:hidden w-full">
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Предыдущая
              </button>
              <div className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-medium rounded-lg">
                {currentPage} из {totalPages}
              </div>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Следующая
              </button>
            </div>
          </div>

          {/* Desktop Pagination */}
          <div className="hidden sm:flex sm:items-center sm:justify-between w-full">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Показано <span className="font-semibold text-green-600 dark:text-green-400">{(currentPage - 1) * pageSize + 1}</span> до{' '}
                <span className="font-semibold text-green-600 dark:text-green-400">{Math.min(currentPage * pageSize, totalCount)}</span> из{' '}
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{totalCount}</span> результатов
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  На странице:
                </label>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={40}>40</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
              >
                ←
              </button>
              
              {pageNumbers.map((number) => (
                <button
                  key={number}
                  onClick={() => handlePageChange(number)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105 ${
                    currentPage === number
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
                      : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {number}
                </button>
              ))}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
              >
                →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl rounded-xl border border-red-200/50 dark:border-red-700/50 p-6">
            <div className="text-center">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full w-16 h-16 mx-auto mb-4">
                <svg className="w-10 h-10 text-red-600 dark:text-red-400 mx-auto mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Ошибка загрузки</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{error}</p>
              <button
                onClick={() => loadRooms(currentPage, true)}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                Попробовать снова
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 page-container max-w-full overflow-x-hidden">
      <div className="w-full space-y-6">
        {/* Modern Header Card */}
        <PageHeaderWithStats
          title="Кабинеты"
          subtitle="Управление кабинетами организации"
          icon={HomeModernIcon}
          gradientFrom="green-500"
          gradientTo="emerald-600"
          actionLabel="Добавить кабинет"
          onAction={handleCreate}
          stats={[
            { label: "Всего кабинетов", value: totalCount, color: "emerald" },
            { label: "Текущая страница", value: currentPage, color: "green" },
            { label: "Всего страниц", value: totalPages, color: "teal" }
          ]}
        />

        {/* Content Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg rounded-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          {/* Loading State */}
          {tableLoading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-600 mx-auto"></div>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Загрузка кабинетов...</p>
            </div>
          )}

          {/* Desktop Table */}
          <div className="hidden md:block">{!tableLoading && (
            <div className="overflow-x-auto scrollbar-custom">
              <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gradient-to-r from-gray-50 to-green-50 dark:from-gray-700 dark:to-gray-600">
                  <tr>
                    <th className="px-3 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider w-16">
                      №
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                      Название кабинета
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                      Вместимость
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {rooms.map((room, index) => (
                    <tr key={room.id} className="hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 dark:hover:from-gray-700 dark:hover:to-gray-600 transition-all duration-200">
                      <td className="px-3 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-medium rounded-lg shadow-sm mx-auto">
                          {(currentPage - 1) * pageSize + index + 1}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="p-2 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 rounded-lg mr-3">
                            <HomeModernIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">{room.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-lg font-medium">
                            {room.capacity} мест
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button 
                            onClick={() => handleEdit(room.id)}
                            className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-lg transition-all duration-200 hover:scale-110"
                            title="Редактировать"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(room.id)}
                            className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded-lg transition-all duration-200 hover:scale-110"
                            title="Удалить"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
          {/* Mobile Cards */}
          <div className="md:hidden">{!tableLoading && (
            <div className="space-y-4 p-4">
              {rooms.map((room, index) => (
                <div key={room.id} className="bg-gradient-to-r from-white to-green-50 dark:from-gray-800 dark:to-gray-700 border border-gray-200/50 dark:border-gray-600/50 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-medium rounded-lg shadow-sm">
                        {(currentPage - 1) * pageSize + index + 1}
                      </div>
                      <div className="flex items-center">
                        <div className="p-2 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 rounded-lg mr-2">
                          <HomeModernIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{room.name}</h3>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleEdit(room.id)}
                        className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-lg transition-all duration-200 hover:scale-110"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(room.id)}
                        className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded-lg transition-all duration-200 hover:scale-110"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-3 p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-gray-200/30 dark:border-gray-600/30">
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                      <span className="font-medium">Вместимость:</span>
                      <span className="ml-2 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-lg">{room.capacity} мест</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>

          {/* Empty State */}
          {rooms.length === 0 && !tableLoading && (
            <div className="text-center py-12">
              <div className="p-4 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 rounded-full w-16 h-16 mx-auto mb-4">
                <HomeModernIcon className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mt-2" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Нет кабинетов</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Начните с добавления первого кабинета в вашу организацию
              </p>
              <div className="mt-6">
                <button 
                  onClick={handleCreate}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Добавить кабинет
                </button>
              </div>
            </div>
          )}

          {/* Pagination */}
          {renderPagination()}
        </div>
      </div>

      {/* Universal Room Modal */}
      <UniversalModal
        isOpen={roomModal.isOpen}
        mode={roomModal.mode}
        title={roomModal.getConfig().title}
        subtitle={roomModal.getConfig().subtitle}
        icon={roomModal.getConfig().icon}
        gradientFrom={roomModal.getConfig().gradientFrom}
        gradientTo={roomModal.getConfig().gradientTo}
        maxWidth="md"
        initialData={{
          name: '',
          capacity: ''
        }}
        data={roomModal.editData || undefined}
        onClose={() => {
          setEditingRoomId(null);
          roomModal.closeModal();
        }}
        onSave={async (data: Record<string, unknown>) => {
          const roomData: RoomFormData = {
            name: data.name as string,
            capacity: parseInt(data.capacity as string) || 1
          };
          
          if (roomModal.mode === 'create') {
            await handleSaveCreate(roomData);
          } else {
            await handleSaveEdit(roomData);
          }
        }}
        submitText={roomModal.getConfig().submitText}
        loadingText={roomModal.getConfig().loadingText}
      >
        {({ formData, setFormData }) => (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Название комнаты
              </label>
              <input
                type="text"
                value={(formData.name as string) || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Введите название комнаты"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Вместимость
              </label>
              <input
                type="number"
                value={(formData.capacity as string) || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Введите вместимость"
                min="1"
                required
              />
            </div>
          </div>
        )}
      </UniversalModal>

      {/* Delete Room Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Удаление кабинета"
        message={`Вы уверены, что хотите удалить кабинет "${deletingRoom?.name}"?`}
        itemName={deletingRoom?.name}
      />
    </div>
  );
}
