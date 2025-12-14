'use client';

import React from 'react';
import { RoomFormData } from '../../types/Room';
import { SubjectFormData } from '../../types/Subject';

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
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData((prev: SubjectFormData) => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Subject Name */}
      <div>
        <label htmlFor="subjectName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Название предмета *
        </label>
        <input
          id="subjectName"
          type="text"
          name="name"
          value={formData.name || ''}
          onChange={handleInputChange}
          className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
            errors.name 
              ? 'border-red-400 bg-red-50 dark:bg-red-900/20' 
              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
          } text-gray-900 dark:text-white`}
          placeholder="Например: Математика"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="subjectDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Описание
        </label>
        <textarea
          id="subjectDescription"
          name="description"
          rows={3}
          value={formData.description || ''}
          onChange={handleInputChange}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
          placeholder="Описание предмета"
        />
      </div>

      {/* Price */}
      <div>
        <label htmlFor="subjectPrice" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Цена *
        </label>
        <input
          id="subjectPrice"
          type="number"
          name="price"
          value={formData.price === 0 ? '' : formData.price}
          onChange={(e) => {
            const value = e.target.value === '' ? 0 : Number(e.target.value);
            setFormData((prev: SubjectFormData) => ({
              ...prev,
              price: value
            }));
            if (errors.price) {
              setErrors(prev => ({ ...prev, price: '' }));
            }
          }}
          className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
            errors.price 
              ? 'border-red-400 bg-red-50 dark:bg-red-900/20' 
              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
          } text-gray-900 dark:text-white`}
          placeholder="Введите цену"
          min="0"
          required
        />
        {errors.price && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.price}</p>
        )}
      </div>

      {/* Payment Type */}
      <div>
        <label htmlFor="subjectPaymentType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Тип оплаты *
        </label>
        <select
          id="subjectPaymentType"
          name="paymentType"
          value={formData.paymentType ?? ''}
          onChange={(e) => {
            const value = Number(e.target.value);
            setFormData((prev: SubjectFormData) => ({
              ...prev,
              paymentType: value
            }));
            if (errors.paymentType) {
              setErrors(prev => ({ ...prev, paymentType: '' }));
            }
          }}
          className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
            errors.paymentType 
              ? 'border-red-400 bg-red-50 dark:bg-red-900/20' 
              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
          } text-gray-900 dark:text-white`}
          required
        >
          <option value="" disabled>Выберите тип оплаты</option>
          <option value={1}>Ежемесячный</option>
          <option value={2}>Единоразовый</option>
        </select>
        {errors.paymentType && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.paymentType}</p>
        )}
      </div>

      {/* Lessons Per Month - показывается только для ежемесячного типа оплаты */}
      {formData.paymentType === 1 && (
        <div>
          <label htmlFor="subjectLessonsPerMonth" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Занятий в месяц *
          </label>
          <input
            id="subjectLessonsPerMonth"
            type="number"
            name="lessonsPerMonth"
            value={formData.lessonsPerMonth || ''}
            onChange={(e) => {
              const value = e.target.value === '' ? 0 : Number(e.target.value);
              setFormData((prev: SubjectFormData) => ({
                ...prev,
                lessonsPerMonth: value
              }));
              if (errors.lessonsPerMonth) {
                setErrors(prev => ({ ...prev, lessonsPerMonth: '' }));
              }
            }}
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
              errors.lessonsPerMonth 
                ? 'border-red-400 bg-red-50 dark:bg-red-900/20' 
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
            } text-gray-900 dark:text-white`}
            placeholder="Количество занятий в месяц"
            min="1"
            required
          />
          {errors.lessonsPerMonth && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.lessonsPerMonth}</p>
          )}
        </div>
      )}

      {/* Total Lessons - показывается только для единоразового типа оплаты */}
      {formData.paymentType === 2 && (
        <div>
          <label htmlFor="subjectTotalLessons" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Всего занятий *
          </label>
          <input
            id="subjectTotalLessons"
            type="number"
            name="totalLessons"
            value={formData.totalLessons || ''}
            onChange={(e) => {
              const value = e.target.value === '' ? 0 : Number(e.target.value);
              setFormData((prev: SubjectFormData) => ({
                ...prev,
                totalLessons: value
              }));
              if (errors.totalLessons) {
                setErrors(prev => ({ ...prev, totalLessons: '' }));
              }
            }}
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
              errors.totalLessons 
                ? 'border-red-400 bg-red-50 dark:bg-red-900/20' 
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
            } text-gray-900 dark:text-white`}
            placeholder="Общее количество занятий"
            min="1"
            required
          />
          {errors.totalLessons && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.totalLessons}</p>
          )}
        </div>
      )}
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