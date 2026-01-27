'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

interface Organization {
  id: string; // Changed to string since API uses GUIDs
  name: string;
}

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onClose }) => {
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [formData, setFormData] = useState({
    fullName: '', // Combined name field
    login: '', // Separate login field
    password: '',
    phone: '+7', // Initialize with +7 prefix
    role: 1, // Default to Student
    organizationId: '' // Changed to string for GUID
  });
  const [error, setError] = useState('');

  // Fetch organizations for dropdown
  useEffect(() => {
    if (isOpen) {
      fetchOrganizations();
    }
  }, [isOpen]);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('https://trackademy.kz/api/Organization');
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data);
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const registrationData = {
        fullName: formData.fullName,
        login: formData.login,
        password: formData.password,
        phone: formData.phone,
        role: formData.role,
        ...(formData.organizationId && { organizationId: formData.organizationId })
      };
      
      await register(registrationData);
      onClose();
      // Reset form
      setFormData({
        fullName: '',
        login: '',
        password: '',
        phone: '+7',
        role: 1,
        organizationId: ''
      });
    } catch (error) {
      setError('Ошибка регистрации. Попробуйте еще раз.');
      console.error('Registration failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'phone') {
      // Allow deleting to empty string
      if (value === '') {
        setFormData(prev => ({
          ...prev,
          [name]: '+7',
        }));
        return;
      }
      
      // Must start with +7
      if (!value.startsWith('+7')) {
        setFormData(prev => ({
          ...prev,
          [name]: '+7',
        }));
        return;
      }
      
      // Remove +7 and all non-digits from the rest
      const digits = value.slice(2).replaceAll(/\D/g, '');
      
      // Apply phone mask +7(xxx) xxx-xxxx
      let maskedValue = '+7';
      if (digits.length > 0) {
        if (digits.length <= 3) {
          maskedValue = `+7(${digits}`;
        } else if (digits.length <= 6) {
          maskedValue = `+7(${digits.slice(0, 3)}) ${digits.slice(3)}`;
        } else {
          maskedValue = `+7(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
        }
      }
      
      setFormData(prev => ({
        ...prev,
        [name]: maskedValue,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'role' ? Number.parseInt(value, 10) : value // Only parse role as int, organizationId stays as string
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">Регистрация</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
              Полное имя<span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
              placeholder="Иван Иванов"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="login" className="block text-sm font-medium text-gray-700 mb-1">
              Логин<span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              id="login"
              name="login"
              value={formData.login}
              onChange={handleChange}
              required
              placeholder="username"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Телефон<span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              placeholder="+7 XXX XXX XX XX"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Пароль<span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Роль
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>Студент</option>
              <option value={2}>Администратор</option>
              <option value={3}>Преподаватель</option>
            </select>
          </div>

          <div>
            <label htmlFor="organizationId" className="block text-sm font-medium text-gray-700 mb-1">
              Организация<span className="text-red-500 ml-1">*</span>
            </label>
            <select
              id="organizationId"
              name="organizationId"
              value={formData.organizationId}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Не выбрано</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Регистрация...' : 'Зарегистрироваться'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterModal;
