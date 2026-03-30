import React, { useState, useEffect, useMemo } from 'react';
import { Subject } from '../../types/Subject';
import { User } from '../../types/User';
import { GroupFormData, StudentWithPackageModel } from '../../types/Group';
import { AuthenticatedApiService } from '../../services/AuthenticatedApiService';

interface GroupFormUniversalProps {
  formData: GroupFormData;
  setFormData: (data: GroupFormData | ((prev: GroupFormData) => GroupFormData)) => void;
  errors: Record<string, string>;
  setErrors: (errors: Record<string, string>) => void;
  isSubmitting: boolean;
  organizationId: string;
}

export const GroupFormUniversal: React.FC<GroupFormUniversalProps> = ({
  formData,
  setFormData,
  errors,
  isSubmitting,
  organizationId
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Computed directly — no extra state/effect needed
  const packages = useMemo(() => {
    if (!formData.subjectId || subjects.length === 0) return [];
    const subject = subjects.find(s => s.id === formData.subjectId);
    return subject?.subjectPackages || [];
  }, [formData.subjectId, subjects]);

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const subjectsResponse = await AuthenticatedApiService.post('/Subject/GetAllSubjects', {
        pageNumber: 1,
        pageSize: 1000,
        organizationId: organizationId
      });
      
      const studentsResponse = await AuthenticatedApiService.post('/User/get-users', {
        pageNumber: 1,
        pageSize: 1000,
        organizationId: organizationId,
        roleIds: [1]
      });
      
      setSubjects((subjectsResponse as { items: Subject[] }).items || []);
      setStudents((studentsResponse as { items: User[] }).items || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentStudents: StudentWithPackageModel[] = formData.students || [];

  const isStudentSelected = (studentId: string) =>
    currentStudents.some(s => s.studentId === studentId);

  const getStudentPackageId = (studentId: string): string =>
    currentStudents.find(s => s.studentId === studentId)?.subjectPackageId || '';

  const handleStudentToggle = (studentId: string) => {
    if (isStudentSelected(studentId)) {
      setFormData((prev: GroupFormData) => ({
        ...prev,
        students: (prev.students || []).filter(s => s.studentId !== studentId)
      }));
    } else {
      // Auto-select first package if only one exists
      const defaultPackageId = packages.length === 1 ? (packages[0].id || '') : '';
      setFormData((prev: GroupFormData) => ({
        ...prev,
        students: [...(prev.students || []), { studentId, subjectPackageId: defaultPackageId }]
      }));
    }
  };

  const handlePackageChange = (studentId: string, subjectPackageId: string) => {
    setFormData((prev: GroupFormData) => ({
      ...prev,
      students: (prev.students || []).map(s =>
        s.studentId === studentId ? { ...s, subjectPackageId } : s
      )
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-300">Загрузка данных...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Название и код группы */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Название группы
          </label>
          <input
            type="text"
            value={formData.name || ''}
            onChange={(e) => setFormData((prev: GroupFormData) => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Введите название группы"
            disabled={isSubmitting}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Код группы
          </label>
          <input
            type="text"
            value={formData.code || ''}
            onChange={(e) => setFormData((prev: GroupFormData) => ({ ...prev, code: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Введите код группы"
            disabled={isSubmitting}
          />
          {errors.code && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.code}</p>
          )}
        </div>
      </div>

      {/* Уровень и предмет */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Уровень
          </label>
          <input
            type="text"
            value={formData.level || ''}
            onChange={(e) => setFormData((prev: GroupFormData) => ({ ...prev, level: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Введите уровень (например, начальный, продвинутый)"
            disabled={isSubmitting}
          />
          {errors.level && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.level}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Предмет *
          </label>
          <select
            value={formData.subjectId || ''}
            onChange={(e) => setFormData((prev: GroupFormData) => ({ ...prev, subjectId: e.target.value, students: [] }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            disabled={isSubmitting}
            required
          >
            <option value="">Выберите предмет</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
          {errors.subjectId && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.subjectId}</p>
          )}
        </div>
      </div>

      {/* Выбор студентов */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Студенты
        </label>

        {!formData.subjectId && (
          <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">Сначала выберите предмет, чтобы добавить студентов.</p>
        )}

        {formData.subjectId && packages.length === 0 && !loading && (
          <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">
            У выбранного предмета нет абонементов. Добавьте абонементы к предмету, чтобы выбирать студентов.
          </p>
        )}
        
        {/* Поиск студентов */}
        <div className="mb-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Поиск по имени или логину..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            disabled={isSubmitting || !formData.subjectId}
          />
        </div>

        <div className="max-h-80 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700">
          {students.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
              Нет доступных студентов
            </p>
          ) : (
            <div className="space-y-1">
              {students
                .filter((student) => {
                  const searchLower = searchTerm.toLowerCase();
                  return (
                    student.name?.toLowerCase().includes(searchLower) ||
                    student.login?.toLowerCase().includes(searchLower)
                  );
                })
                .map((student) => {
                  const checked = isStudentSelected(student.id);
                  const packageId = getStudentPackageId(student.id);
                  const selectedPkg = packages.find(p => p.id === packageId);
                  return (
                    <div key={student.id} className={`rounded-lg border transition-colors ${checked ? 'border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-900/20' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-600'}`}>
                      {/* Student row */}
                      <label className="flex items-center space-x-3 cursor-pointer px-2 py-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleStudentToggle(student.id)}
                          disabled={isSubmitting || !formData.subjectId}
                          className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {student.name || student.login}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                            {student.login}
                          </span>
                        </div>
                        {checked && selectedPkg && (
                          <span className="text-xs text-teal-600 dark:text-teal-400 flex-shrink-0 ml-2">
                            {selectedPkg.name}
                          </span>
                        )}
                      </label>
                      {/* Package selector — only for checked students */}
                      {checked && (
                        <div className="px-2 pb-2 pl-9">
                          {packages.length > 0 ? (
                            <>
                              <select
                                value={packageId}
                                onChange={(e) => handlePackageChange(student.id, e.target.value)}
                                disabled={isSubmitting}
                                className={`w-full px-2 py-1.5 text-sm border rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                                  !packageId
                                    ? 'border-red-400 dark:border-red-500'
                                    : 'border-gray-300 dark:border-gray-500'
                                }`}
                              >
                                <option value="">— Выберите абонемент —</option>
                                {packages.map((pkg) => (
                                  <option key={pkg.id} value={pkg.id}>
                                    {pkg.name}
                                  </option>
                                ))}
                              </select>
                              {!packageId && (
                                <p className="text-xs text-red-500 mt-0.5">Выберите абонемент для этого студента</p>
                              )}
                            </>
                          ) : (
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                              Нет абонементов для этого предмета
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Выбрано студентов: {currentStudents.length}
        </p>
        {errors.students && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.students}</p>
        )}
      </div>
    </div>
  );
};
