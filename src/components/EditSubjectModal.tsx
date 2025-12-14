'use client';

import { useState, useEffect } from 'react';
import { Subject, SubjectFormData, PaymentType } from '../types/Subject';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface EditSubjectModalProps {
  isOpen: boolean;
  subject: Subject | null;
  onClose: () => void;
  onSave: (id: string, data: SubjectFormData) => Promise<void>;
}

const EditSubjectModal: React.FC<EditSubjectModalProps> = ({
  isOpen,
  subject,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<SubjectFormData>({
    name: '',
    description: '',
    price: 0,
    paymentType: undefined as unknown as PaymentType, // Без значения по умолчанию
    lessonsPerMonth: 0,
    totalLessons: 0,
    organizationId: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (subject) {
      setFormData({
        name: subject.name,
        description: subject.description,
        price: subject.price,
        paymentType: subject.paymentType,
        lessonsPerMonth: subject.lessonsPerMonth || 4,
        totalLessons: subject.totalLessons || 36,
        organizationId: subject.organizationId || '',
      });
    }
  }, [subject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject) return;

    setIsLoading(true);
    setError(null);

    try {
      await onSave(subject.id, formData);
      onClose();
    } catch (err) {
      setError('Не удалось обновить предмет. Попробуйте еще раз.');
      console.error('Error updating subject:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  if (!isOpen || !subject) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Редактировать предмет
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Название предмета
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Например: Математика"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Описание
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Описание предмета"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSubjectModal;
