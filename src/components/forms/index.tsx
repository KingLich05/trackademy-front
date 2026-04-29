'use client';

import React from 'react';
import { RoomFormData } from '../../types/Room';
import { SubjectFormData, SubjectPackage, PaymentType, getPaymentTypeLabel } from '../../types/Subject';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

export { OrganizationViewForm } from './OrganizationViewForm';

interface RoomFormProps {
  formData: RoomFormData;
  setFormData: React.Dispatch<React.SetStateAction<RoomFormData>>;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export const RoomForm: React.FC<RoomFormProps> = ({
  formData,
  setFormData,
  errors,
  setErrors
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData((prev: RoomFormData) => ({
      ...prev,
      [name]: name === 'capacity' ? Number.parseInt(value) || 0 : value
    }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Room Name */}
      <div>
        <label htmlFor="roomName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Название кабинета *
        </label>
        <input
          id="roomName"
          type="text"
          name="name"
          value={formData.name || ''}
          onChange={handleInputChange}
          className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
            errors.name 
              ? 'border-red-400 bg-red-50 dark:bg-red-900/20' 
              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
          } text-gray-900 dark:text-white`}
          placeholder="Например: Кабинет 101"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
        )}
      </div>

      {/* Capacity */}
      <div>
        <label htmlFor="roomCapacity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Вместимость *
        </label>
        <input
          id="roomCapacity"
          type="number"
          name="capacity"
          min="1"
          value={formData.capacity || ''}
          onChange={handleInputChange}
          className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
            errors.capacity 
              ? 'border-red-400 bg-red-50 dark:bg-red-900/20' 
              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
          } text-gray-900 dark:text-white`}
          placeholder="Введите количество мест"
        />
        {errors.capacity && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.capacity}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="roomDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Описание
        </label>
        <textarea
          id="roomDescription"
          name="description"
          rows={3}
          value={formData.description || ''}
          onChange={handleInputChange}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
          placeholder="Дополнительная информация о кабинете"
        />
      </div>
    </div>
  );
};

interface SubjectFormProps {
  formData: SubjectFormData;
  setFormData: React.Dispatch<React.SetStateAction<SubjectFormData>>;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export const SubjectForm: React.FC<SubjectFormProps> = ({
  formData,
  setFormData,
  errors,
  setErrors
}) => {
  const packages: SubjectPackage[] = (formData.subjectPackages as SubjectPackage[]) || [];

  const updatePackage = (index: number, field: keyof SubjectPackage, value: unknown) => {
    const updated = packages.map((pkg, i) =>
      i === index ? { ...pkg, [field]: value } : pkg
    );
    setFormData((prev: SubjectFormData) => ({ ...prev, subjectPackages: updated }));
    const errKey = `pkg_${index}_${field}`;
    if (errors[errKey]) setErrors(prev => ({ ...prev, [errKey]: '' }));
  };

  const addPackage = () => {
    const newPkg: SubjectPackage = {
      name: '',
      description: '',
      price: 0,
      paymentType: PaymentType.Monthly,
      lessonsPerMonth: 0,
      totalLessons: 0,
      hasFreezeOption: false,
      hasMakeUpLessons: false,
      isExemption: false,
    };
    setFormData((prev: SubjectFormData) => ({
      ...prev,
      subjectPackages: [...packages, newPkg],
    }));
  };

  const removePackage = (index: number) => {
    setFormData((prev: SubjectFormData) => ({
      ...prev,
      subjectPackages: packages.filter((_, i) => i !== index),
    }));
  };

  const inputClass = (errKey: string) =>
    `w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors text-gray-900 dark:text-white text-sm ${
      errors[errKey]
        ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
    }`;

  return (
    <div className="space-y-5">
      {/* Subject Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Название предмета *
        </label>
        <input
          type="text"
          value={formData.name || ''}
          onChange={(e) => {
            setFormData((prev: SubjectFormData) => ({ ...prev, name: e.target.value }));
            if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
          }}
          className={inputClass('name')}
          placeholder="Например: Математика"
        />
        {errors.name && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.name}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Описание
        </label>
        <textarea
          rows={2}
          value={formData.description || ''}
          onChange={(e) => setFormData((prev: SubjectFormData) => ({ ...prev, description: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none text-sm"
          placeholder="Описание предмета"
        />
      </div>

      {/* Packages */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Пакеты ({packages.length})
          </label>
          <button
            type="button"
            onClick={addPackage}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-blue-500 to-violet-600 rounded-lg hover:opacity-90 transition-opacity"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Добавить пакет
          </button>
        </div>
        {errors.subjectPackages && (
          <p className="mb-2 text-xs text-red-600 dark:text-red-400">{errors.subjectPackages}</p>
        )}
        <div className="space-y-4">
          {packages.map((pkg, i) => (
            <div
              key={i}
              className="border border-gray-200 dark:border-gray-600 rounded-xl p-4 bg-gray-50/60 dark:bg-gray-700/40 space-y-3"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Пакет {i + 1}
                  </span>
                  {pkg.isExemption && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700/40">
                      🎫 Льготный
                    </span>
                  )}
                </div>
                {packages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePackage(i)}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    title="Удалить пакет"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Package Name */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Название *</label>
                <input
                  type="text"
                  value={pkg.name || ''}
                  onChange={(e) => updatePackage(i, 'name', e.target.value)}
                  className={inputClass(`pkg_${i}_name`)}
                  placeholder="Например: Стандартный абонемент"
                />
                {errors[`pkg_${i}_name`] && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors[`pkg_${i}_name`]}</p>
                )}
              </div>

              {/* Package Description */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Описание</label>
                <input
                  type="text"
                  value={pkg.description || ''}
                  onChange={(e) => updatePackage(i, 'description', e.target.value)}
                  className={inputClass(`pkg_${i}_description`)}
                  placeholder="Описание пакета"
                />
              </div>

              {/* Price + Payment Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Цена (тенге) *</label>
                  <input
                    type="number"
                    value={pkg.price === 0 ? '' : pkg.price}
                    onChange={(e) => updatePackage(i, 'price', e.target.value === '' ? 0 : Number(e.target.value))}
                    className={inputClass(`pkg_${i}_price`)}
                    placeholder="0"
                    min="0"
                  />
                  {errors[`pkg_${i}_price`] && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors[`pkg_${i}_price`]}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Тип оплаты *</label>
                  <select
                    value={pkg.paymentType ?? ''}
                    onChange={(e) => updatePackage(i, 'paymentType', Number(e.target.value))}
                    className={inputClass(`pkg_${i}_paymentType`)}
                  >
                    <option value="" disabled>Выбрать</option>
                    <option value={PaymentType.Monthly}>{getPaymentTypeLabel(PaymentType.Monthly)}</option>
                    <option value={PaymentType.OneTime}>{getPaymentTypeLabel(PaymentType.OneTime)}</option>
                  </select>
                </div>
              </div>

              {/* Lessons */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {pkg.paymentType === PaymentType.Monthly ? 'Уроков/месяц' : 'Всего уроков'}
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  {pkg.paymentType === PaymentType.Monthly ? (
                    <input
                      type="number"
                      value={pkg.lessonsPerMonth === 0 ? '' : pkg.lessonsPerMonth}
                      onChange={(e) => updatePackage(i, 'lessonsPerMonth', e.target.value === '' ? 0 : Number(e.target.value))}
                      className={inputClass(`pkg_${i}_lessonsPerMonth`)}
                      placeholder="0"
                      min="0"
                    />
                  ) : (
                    <input
                      type="number"
                      value={pkg.totalLessons === 0 ? '' : pkg.totalLessons}
                      onChange={(e) => updatePackage(i, 'totalLessons', e.target.value === '' ? 0 : Number(e.target.value))}
                      className={inputClass(`pkg_${i}_totalLessons`)}
                      placeholder="0"
                      min="0"
                    />
                  )}
                </div>
                {pkg.paymentType === PaymentType.OneTime && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Уроков/месяц <span className="text-red-500 ml-0.5">*</span></label>
                    <input
                      type="number"
                      value={pkg.lessonsPerMonth === 0 ? '' : pkg.lessonsPerMonth}
                      onChange={(e) => updatePackage(i, 'lessonsPerMonth', e.target.value === '' ? 0 : Number(e.target.value))}
                      className={inputClass(`pkg_${i}_lessonsPerMonth`)}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                )}
              </div>

              {/* Flags */}
              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={pkg.hasFreezeOption}
                    onChange={(e) => updatePackage(i, 'hasFreezeOption', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">Заморозка</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={pkg.hasMakeUpLessons}
                    onChange={(e) => updatePackage(i, 'hasMakeUpLessons', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">Отработка</span>
                </label>
              </div>
              {/* Exemption toggle */}
              <div className={`mt-1 rounded-xl border p-3 flex items-start gap-3 transition-colors ${
                pkg.isExemption
                  ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700/40'
                  : 'bg-gray-50 border-gray-200 dark:bg-gray-800/40 dark:border-gray-700'
              }`}>
                <label className="flex items-start gap-3 cursor-pointer select-none flex-1">
                  <div className="relative mt-0.5">
                    <input
                      type="checkbox"
                      checked={!!pkg.isExemption}
                      onChange={(e) => updatePackage(i, 'isExemption', e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      onClick={() => updatePackage(i, 'isExemption', !pkg.isExemption)}
                      className={`w-9 h-5 rounded-full transition-colors cursor-pointer ${
                        pkg.isExemption ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm absolute top-0.75 transition-transform ${
                        pkg.isExemption ? 'translate-x-4' : 'translate-x-0.5'
                      }`} style={{ top: '3px', left: '3px', position: 'absolute', transform: pkg.isExemption ? 'translateX(16px)' : 'translateX(0)' }} />
                    </div>
                  </div>
                  <div>
                    <p className={`text-xs font-semibold ${
                      pkg.isExemption ? 'text-amber-700 dark:text-amber-400' : 'text-gray-600 dark:text-gray-400'
                    }`}>🎫 Льготный абонемент</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                      Автопополнение; ручное пополнение баланса будет недоступно
                    </p>
                  </div>
                </label>
              </div>
            </div>
          ))}
          {packages.length === 0 && (
            <div className="text-center py-6 text-sm text-gray-400 dark:text-gray-500 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl">
              Нет пакетов. Нажмите «Добавить пакет».
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface GroupFormProps {
  formData: { name: string; description?: string };
  setFormData: React.Dispatch<React.SetStateAction<{ name: string; description?: string }>>;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export const GroupForm: React.FC<GroupFormProps> = ({
  formData,
  setFormData,
  errors,
  setErrors
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData((prev: { name: string; description?: string }) => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Group Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Название группы *
        </label>
        <input
          type="text"
          name="name"
          value={formData.name || ''}
          onChange={handleInputChange}
          className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors ${
            errors.name 
              ? 'border-red-400 bg-red-50 dark:bg-red-900/20' 
              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
          } text-gray-900 dark:text-white`}
          placeholder="Например: ИС-21"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Описание
        </label>
        <textarea
          name="description"
          rows={3}
          value={formData.description || ''}
          onChange={handleInputChange}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
          placeholder="Описание группы"
        />
      </div>
    </div>
  );
};