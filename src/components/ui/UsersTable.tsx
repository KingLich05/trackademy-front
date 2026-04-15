'use client';

import React from 'react';
import { UserIcon, PencilIcon, TrashIcon, EyeIcon, ArrowUturnLeftIcon, ChevronUpIcon, ChevronDownIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { User } from '../../types/User';
import { canManageUsers } from '../../types/Role';
import { useColumnVisibility, ColumnVisibilityControl } from './ColumnVisibilityControl';
import Link from 'next/link';

interface UsersTableProps {
  users: User[];
  isLoading: boolean;
  currentUser?: User;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onRestore?: (userId: string) => void;
  onExportDetailed?: (user: User) => void;
  showArchive?: boolean;
  showColumnControls?: boolean;
  columnVisibility?: (columnKey: string) => boolean;
  currentPage?: number;
  itemsPerPage?: number;
  selectedStudentIds?: string[];
  onSelectStudent?: (userId: string) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
}

export const UsersTable: React.FC<UsersTableProps> = ({
  users,
  isLoading,
  currentUser,
  onEdit,
  onDelete,
  onRestore,
  onExportDetailed,
  showArchive = false,
  showColumnControls = true,
  columnVisibility,
  currentPage = 1,
  itemsPerPage = 10,
  selectedStudentIds = [],
  onSelectStudent,
  onSelectAll,
  onDeselectAll,
  sortBy = 'createddate',
  sortOrder = 'desc',
  onSort,
}) => {
  // Конфигурация колонок - используется только если нет внешнего управления
  const { columns, toggleColumn, isColumnVisible: internalIsColumnVisible } = useColumnVisibility([
    { key: 'number', label: '#', required: true },
    { key: 'user', label: 'Пользователь', required: true },
    { key: 'contacts', label: 'Контакты' },
    { key: 'role', label: 'Роль' },
    { key: 'group', label: 'Группа' },
    { key: 'createdDate', label: 'Дата создания' },
    { key: 'actions', label: 'Действия' }
  ]);

  // Используем внешнюю функцию видимости колонок если предоставлена, иначе внутреннюю
  const isColumnVisible = columnVisibility || internalIsColumnVisible;
  
  // Студенты на текущей странице
  const studentsOnPage = users.filter(user => user.role === 1);
  const allStudentsSelected = studentsOnPage.length > 0 && studentsOnPage.every(student => selectedStudentIds.includes(student.id));
  const someStudentsSelected = studentsOnPage.some(student => selectedStudentIds.includes(student.id)) && !allStudentsSelected;
  
  const handleSelectAllOnPage = () => {
    if (allStudentsSelected && onDeselectAll) {
      onDeselectAll();
    } else if (onSelectAll) {
      onSelectAll();
    }
  };
  
  const getRoleText = (role: number) => {
    switch (role) {
      case 1: return 'Студент';
      case 2: return 'Администратор';
      case 3: return 'Преподаватель';
      default: return 'Неизвестно';
    }
  };

  const getRoleBadgeClass = (role: number) => {
    switch (role) {
      case 1: return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 2: return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 3: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const renderSortIcon = (column: string) => {
    if (sortBy !== column) {
      return null;
    }
    return sortOrder === 'asc' ? (
      <ChevronUpIcon className="h-4 w-4 inline ml-1" />
    ) : (
      <ChevronDownIcon className="h-4 w-4 inline ml-1" />
    );
  };

  const SortableHeader: React.FC<{column: string; label: string; sortable?: boolean}> = ({column, label, sortable = true}) => {
    if (!sortable || !onSort) {
      return <span>{label}</span>;
    }
    
    return (
      <button 
        onClick={() => onSort(column)}
        className="flex items-center hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
      >
        <span>{label}</span>
        {renderSortIcon(column)}
      </button>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/3"></div>
              </div>
              <div className="w-20 h-6 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
              <div className="w-16 h-8 bg-gray-200 dark:bg-gray-600 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="text-gray-400 dark:text-gray-500 text-4xl mb-4">
          👥
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Пользователи не найдены
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Попробуйте изменить параметры поиска или добавить новых пользователей
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {/* Column Controls - показываем только если showColumnControls = true и нет внешнего управления */}
      {showColumnControls && !columnVisibility && (
        <div className="mb-4 flex justify-end">
          <ColumnVisibilityControl
            columns={columns}
            onColumnToggle={toggleColumn}
          />
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto scrollbar-custom">
        <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              {/* Checkbox column - только для студентов и не в архиве */}
              {onSelectStudent && currentUser && canManageUsers(currentUser.role) && !showArchive && (
                <th className="pl-3 pr-1 py-3 text-left" style={{ width: '50px' }}>
                  <input
                    type="checkbox"
                    checked={allStudentsSelected}
                    ref={(input) => {
                      if (input) {
                        input.indeterminate = someStudentsSelected;
                      }
                    }}
                    onChange={handleSelectAllOnPage}
                    disabled={studentsOnPage.length === 0}
                    className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 dark:focus:ring-emerald-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </th>
              )}
              {isColumnVisible('number') && (
                <th className="pl-1 pr-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" style={{ width: '50px' }}>
                  №
                </th>
              )}
              {isColumnVisible('user') && (
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" style={{ width: '25%' }}>
                  <SortableHeader column="fullname" label="Пользователь" />
                </th>
              )}
              {isColumnVisible('contacts') && (
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" style={{ width: '15%' }}>
                  <SortableHeader column="phone" label="Контакты" />
                </th>
              )}
              {isColumnVisible('role') && (
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" style={{ width: '12%' }}>
                  <SortableHeader column="role" label="Роль" />
                </th>
              )}
              {isColumnVisible('group') && (
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" style={{ width: '20%' }}>
                  <span>Группа</span>
                </th>
              )}
              {isColumnVisible('createdDate') && (
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" style={{ width: '12%' }}>
                  <SortableHeader column="createddate" label="Дата создания" />
                </th>
              )}
              {isColumnVisible('actions') && currentUser && canManageUsers(currentUser.role) && (
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" style={{ width: '100px' }}>
                  Действия
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((user, index) => {
              const isStudent = user.role === 1;
              const isSelected = selectedStudentIds.includes(user.id);
              
              return (
              <tr 
                key={user.id} 
                onClick={() => {
                  if (isStudent && onSelectStudent) {
                    onSelectStudent(user.id);
                  }
                }}
                className={`transition-colors ${
                  isStudent && onSelectStudent ? 'cursor-pointer' : ''
                } ${
                  user.isTrial 
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                } ${isSelected ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''}`}
              >
                {/* Checkbox column - только для студентов и не в архиве */}
                {onSelectStudent && currentUser && canManageUsers(currentUser.role) && !showArchive && (
                  <td className="pl-3 pr-1 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    {isStudent ? (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onSelectStudent(user.id)}
                        className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 dark:focus:ring-emerald-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                      />
                    ) : (
                      <div className="w-4 h-4"></div>
                    )}
                  </td>
                )}
                {isColumnVisible('number') && (
                  <td className="pl-1 pr-3 py-3 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium rounded-lg shadow-sm mx-auto">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </div>
                  </td>
                )}
                {isColumnVisible('user') && (
                  <td className="px-3 py-3">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-12 w-12">
                        <div className="h-12 w-12 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                          <UserIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                        </div>
                      </div>
                      <div className="ml-4 min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {user.name}
                          </div>
                          {user.isTrial && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200">
                              ПРОБНЫЙ
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          @{user.login}
                        </div>
                      </div>
                    </div>
                  </td>
                )}
                {isColumnVisible('contacts') && (
                  <td className="px-3 py-3 truncate">
                    <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.phone}</div>
                  </td>
                )}
                {isColumnVisible('role') && (
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeClass(user.role)}`}>
                      {getRoleText(user.role)}
                    </span>
                  </td>
                )}
                {isColumnVisible('group') && (
                  <td className="px-3 py-3 text-sm text-gray-900 dark:text-white truncate">
                    {user.groups.length > 0 
                      ? (() => {
                          const groupNames = user.groups.map((group: string | { id: string; name?: string; groupName?: string }) => 
                            typeof group === 'string' ? group : group.name || group.groupName || group
                          ).join(', ');
                          return groupNames.length > 30 ? groupNames.substring(0, 30) + '...' : groupNames;
                        })()
                      : '-'
                    }
                  </td>
                )}
                {isColumnVisible('createdDate') && (
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(user.createdDate).toLocaleDateString('ru-RU')}
                    </div>
                  </td>
                )}
                {isColumnVisible('actions') && currentUser && canManageUsers(currentUser.role) && (
                  <td className="px-3 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                      {user.role === 3 ? (
                        <Link
                          href={`/teachers/${user.id}`}
                          className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 
                                   hover:bg-gray-50 dark:hover:bg-gray-900/20 rounded-lg transition-all"
                          title="Просмотр"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Link>
                      ) : (
                        <Link
                          href={`/students/${user.id}`}
                          className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 
                                   hover:bg-gray-50 dark:hover:bg-gray-900/20 rounded-lg transition-all"
                          title="Просмотр"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Link>
                      )}
                      {onExportDetailed && (
                        <button
                          onClick={() => onExportDetailed(user)}
                          className="p-2 text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300
                                   hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all"
                          title="Детальный экспорт"
                        >
                          <DocumentArrowDownIcon className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onEdit(user)}
                        className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 
                                 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                        title="Редактировать"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      {showArchive && onRestore ? (
                        <>
                          <button
                            onClick={() => onRestore(user.id)}
                            className="p-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 
                                     hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all"
                            title="Восстановить"
                          >
                            <ArrowUturnLeftIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onDelete(user)}
                            className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 
                                     hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                            title="Удалить навсегда"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => onDelete(user)}
                          className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 
                                   hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                          title="Удалить"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4 p-4">
        {users.map((user, index) => (
          <div 
            key={user.id} 
            className={`rounded-lg border p-4 shadow-sm ${
              user.isTrial 
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' 
                : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
            }`}
          >
            <div className="flex items-start space-x-3">
              {isColumnVisible('number') && (
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium rounded-lg shadow-sm">
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </div>
                </div>
              )}
              {isColumnVisible('user') && (
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                    <UserIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                  </div>
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  {isColumnVisible('user') && (
                    <div className="flex items-center space-x-2 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {user.name}
                      </h4>
                      {user.isTrial && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200 flex-shrink-0">
                          ПРОБНЫЙ
                        </span>
                      )}
                    </div>
                  )}
                  {isColumnVisible('role') && (
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeClass(user.role)}`}>
                      {getRoleText(user.role)}
                    </span>
                  )}
                </div>
                
                <div className="mt-1 space-y-1">
                  {isColumnVisible('contacts') && (
                    <>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{user.phone}</p>
                    </>
                  )}
                  {isColumnVisible('group') && user.groups.length > 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Группы: {user.groups.map((group: string | { id: string; name?: string; groupName?: string }) => 
                        typeof group === 'string' ? group : group.name || group.groupName || group
                      ).join(', ')}
                    </p>
                  )}
                  {isColumnVisible('createdDate') && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Создан: {new Date(user.createdDate).toLocaleDateString('ru-RU')}
                    </p>
                  )}
                </div>

                {isColumnVisible('actions') && currentUser && canManageUsers(currentUser.role) && (
                  <div className="mt-3 flex space-x-2">
                    <Link
                      href={`/students/${user.id}`}
                      className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400 
                               text-sm font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900/30 transition-colors text-center"
                    >
                      Просмотр
                    </Link>
                    <button
                      onClick={() => onEdit(user)}
                      className="flex-1 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 
                               text-sm font-medium rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                    >
                      Редактировать
                    </button>
                    {showArchive && onRestore ? (
                      <>
                        <button
                          onClick={() => onRestore(user.id)}
                          className="flex-1 px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 
                                   text-sm font-medium rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                        >
                          Восстановить
                        </button>
                        <button
                          onClick={() => onDelete(user)}
                          className="flex-1 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 
                                   text-sm font-medium rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        >
                          Удалить
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => onDelete(user)}
                        className="flex-1 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 
                                 text-sm font-medium rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};