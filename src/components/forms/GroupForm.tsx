import React, { useState, useEffect } from 'react';
import { GroupFormData, StudentWithPackageModel } from '../../types/Group';
import { Subject } from '../../types/Subject';
import { User } from '../../types/User';
import { AuthenticatedApiService } from '../../services/AuthenticatedApiService';

interface GroupFormProps {
  initialData?: Partial<GroupFormData>;
  onSubmit: (data: GroupFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const GroupForm: React.FC<GroupFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<GroupFormData>({
    name: initialData?.name || '',
    code: initialData?.code || '',
    level: initialData?.level || '',
    subjectId: initialData?.subjectId || '',
    students: initialData?.students || [],
    organizationId: initialData?.organizationId || ''
  });

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [subjectsResponse, studentsResponse] = await Promise.all([
        AuthenticatedApiService.get('/Subject'),
        AuthenticatedApiService.get('/User/students')
      ]);
      setSubjects((subjectsResponse as { data: { items: Subject[] } }).data.items || []);
      setStudents((studentsResponse as { data: { items: User[] } }).data.items || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const handleStudentToggle = (studentId: string) => {
    setFormData(prev => {
      const isSelected = prev.students.some((s: StudentWithPackageModel) => s.studentId === studentId);
      return {
        ...prev,
        students: isSelected
          ? prev.students.filter((s: StudentWithPackageModel) => s.studentId !== studentId)
          : [...prev.students, { studentId, subjectPackageId: '' }]
      };
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Название группы
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Введите название группы"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Код группы
          </label>
          <input
            type="text"
            value={formData.code}
            onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Введите код группы"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Уровень
          </label>
          <input
            type="text"
            value={formData.level}
            onChange={(e) => setFormData(prev => ({ ...prev, level: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Введите уровень (например, начальный, продвинутый)"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Предмет
          </label>
          <select
            value={formData.subjectId}
            onChange={(e) => setFormData(prev => ({ ...prev, subjectId: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          >
            <option value="">Выберите предмет</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Студенты
        </label>
        <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700">
          {students.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
              Нет доступных студентов
            </p>
          ) : (
            <div className="space-y-2">
              {students.map((student) => (
                <label key={student.id} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.students.some((s: StudentWithPackageModel) => s.studentId === student.id)}
                    onChange={() => handleStudentToggle(student.id)}
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {(student as User).name}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50"
        >
          Отмена
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-cyan-600 rounded-lg hover:from-teal-600 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </form>
  );
};