'use client';

import React, { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import { AuthenticatedApiService } from '@/services/AuthenticatedApiService';
import { useApiToast } from '@/hooks/useApiToast';
import { 
  DocumentArrowDownIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ClockIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface SubmissionFile {
  id: string;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  uploadedAt: string;
  isImage: boolean;
  downloadUrl: string;
}

interface SubmissionDetail {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  textContent: string | null;
  status: number;
  score: number | null;
  teacherComment: string | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  gradedAt: string | null;
  files: SubmissionFile[];
}

interface SubmissionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissionId: string | null;
  studentName: string;
  onUpdate?: () => void;
  userRole?: string;
}

const getStatusInfo = (status: number) => {
  switch (status) {
    case 0:
      return { text: 'Черновик', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' };
    case 1:
      return { text: 'Отправлено', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' };
    case 2:
      return { text: 'Оценен', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' };
    case 3:
      return { text: 'Возвращено', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' };
    case 4:
      return { text: 'Просрочено', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' };
    default:
      return { text: 'Неизвестно', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' };
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

const formatDate = (dateString: string | null): string => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const SubmissionDetailModal: React.FC<SubmissionDetailModalProps> = ({
  isOpen,
  onClose,
  submissionId,
  studentName,
  onUpdate,
  userRole
}) => {
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'grade'>('info');
  const [score, setScore] = useState<string>('');
  const [teacherComment, setTeacherComment] = useState('');
  const [returnComment, setReturnComment] = useState('');
  
  const { loadOperation, createOperation } = useApiToast();

  useEffect(() => {
    if (isOpen && submissionId) {
      loadSubmissionDetail();
    }
  }, [isOpen, submissionId]);

  // Автоматически переключаемся на вкладку "info", если вкладка "оценить" недоступна
  useEffect(() => {
    if (submission && activeTab === 'grade') {
      const canGrade = submission.status !== 2 && submission.score === null && !(userRole === 'Teacher' && submission.status === 3) && userRole !== 'Administrator';
      if (!canGrade) {
        setActiveTab('info');
      }
    }
  }, [submission, activeTab, userRole]);

  const loadSubmissionDetail = async () => {
    if (!submissionId) return;

    try {
      setLoading(true);
      const data = await loadOperation(
        async () => {
          const result = await AuthenticatedApiService.get<SubmissionDetail>(`/Submission/${submissionId}`);
          console.log('Raw API result:', result);
          return result;
        },
        'данные работы'
      );
      console.log('Loaded submission data:', data);
      console.log('Files array:', data?.files);
      console.log('Files length:', data?.files?.length);
      console.log('Submission status:', data?.status);
      console.log('Submission score:', data?.score);
      setSubmission(data);
      setScore(data.score?.toString() || '');
      setTeacherComment(data.teacherComment || '');
    } catch (error) {
      console.error('Error loading submission:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadFile = async (fileId: string, fileName: string) => {
    console.log('=== Download file started (Teacher) ===');
    console.log('File info:', { fileId, fileName });
    
    try {
      console.log('Fetching file via API...');
      const response = await AuthenticatedApiService.downloadFile(`/Submission/file/${fileId}`);

      console.log('API Response:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      
      console.log('Blob created:', {
        size: blob.size,
        type: blob.type
      });
      
      if (blob.size === 0) {
        throw new Error('Файл пустой');
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        console.log('=== Download completed successfully ===');
      }, 100);
    } catch (error) {
      console.error('=== Download error ===', error);
      alert(`Ошибка при скачивании файла: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };

  const handleGradeSubmission = async () => {
    if (!submissionId) return;

    const scoreValue = parseInt(score);
    if (isNaN(scoreValue) || scoreValue < 0 || scoreValue > 100) {
      return;
    }

    try {
      setActionLoading(true);
      const result = await createOperation(
        async () => {
          return await AuthenticatedApiService.post(
            `/Submission/${submissionId}/grade`,
            {
              score: scoreValue,
              teacherComment: teacherComment.trim() || undefined
            }
          );
        },
        'оценка'
      );
      
      if (result.success) {
        console.log('Grading successful, reloading submission data...');
        // Переключаемся на вкладку с информацией сразу
        setActiveTab('info');
        // Обновляем данные в модалке
        await loadSubmissionDetail();
        // Уведомляем родительский компонент
        onUpdate?.();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturnSubmission = async () => {
    if (!submissionId || !returnComment.trim()) return;

    try {
      setActionLoading(true);
      const result = await createOperation(
        async () => {
          return await AuthenticatedApiService.post(
            `/Submission/${submissionId}/return`,
            {
              teacherComment: returnComment.trim()
            }
          );
        },
        'возврат работы'
      );
      
      if (result.success) {
        // Переключаемся на вкладку с информацией сразу
        setActiveTab('info');
        // Очищаем поле комментария
        setReturnComment('');
        // Обновляем данные в модалке
        await loadSubmissionDetail();
        // Уведомляем родительский компонент
        onUpdate?.();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Разрешаем пустую строку для возможности очистки
    if (value === '') {
      setScore('');
      return;
    }
    
    // Удаляем ведущие нули
    const numericValue = value.replace(/^0+/, '') || '0';
    const parsed = parseInt(numericValue);
    
    // Проверяем диапазон
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      setScore(numericValue);
    }
  };

  const statusInfo = submission ? getStatusInfo(submission.status) : null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Работа студента: ${studentName}`}
      maxWidth="3xl"
    >
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : submission ? (
        <div className="space-y-6">
          {/* Status and Score Header */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Статус</div>
                  <span className={`mt-1 px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusInfo?.color}`}>
                    {statusInfo?.text}
                  </span>
                </div>
                {submission.score !== null && (
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Оценка</div>
                    <div className="mt-1 flex items-baseline">
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">{submission.score}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">/100</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                {submission.submittedAt && (
                  <div>Сдано: {formatDate(submission.submittedAt)}</div>
                )}
                {submission.gradedAt && (
                  <div>Проверено: {formatDate(submission.gradedAt)}</div>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('info')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'info'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <DocumentTextIcon className="h-5 w-5 inline-block mr-2" />
                Информация
              </button>
              {/* Show grading tab only if not yet graded (status not 2 and no score) and not returned for teachers, and not for administrators */}
              {submission.status !== 2 && submission.score === null && !(userRole === 'Teacher' && submission.status === 3) && userRole !== 'Administrator' && (
                <button
                  onClick={() => setActiveTab('grade')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'grade'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <CheckCircleIcon className="h-5 w-5 inline-block mr-2" />
                  Оценить
                </button>
              )}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'info' ? (
            <div className="space-y-4">
              {/* Text Content */}
              {submission.textContent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Текст работы
                  </label>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{submission.textContent}</p>
                  </div>
                </div>
              )}

              {/* Files */}
              {submission.files && submission.files.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Файлы ({submission.files.length})
                  </label>
                  <div className="space-y-2">
                    {submission.files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <DocumentArrowDownIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {file.originalFileName}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {formatFileSize(file.fileSize)} • {formatDate(file.uploadedAt)}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDownloadFile(file.id, file.originalFileName)}
                          className="ml-4 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex-shrink-0"
                        >
                          Скачать
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Teacher Comment (if exists) */}
              {submission.teacherComment && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Комментарий преподавателя
                  </label>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                    <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{submission.teacherComment}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Grade Form */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                  <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400 mr-2" />
                  Выставить оценку
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Оценка (0-100) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={score}
                      onChange={handleScoreChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-800 dark:text-white"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Комментарий (необязательно)
                    </label>
                    <textarea
                      value={teacherComment}
                      onChange={(e) => setTeacherComment(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-800 dark:text-white"
                      placeholder="Ваш комментарий..."
                    />
                  </div>
                  <button
                    onClick={handleGradeSubmission}
                    disabled={actionLoading || !score || parseInt(score) < 0 || parseInt(score) > 100}
                    className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                  >
                    {actionLoading ? 'Сохранение...' : 'Выставить оценку'}
                  </button>
                </div>
              </div>

              {/* Return Form */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6 border border-yellow-200 dark:border-yellow-800">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                  <XCircleIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400 mr-2" />
                  Вернуть на доработку
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Комментарий *
                    </label>
                    <textarea
                      value={returnComment}
                      onChange={(e) => setReturnComment(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 dark:bg-gray-800 dark:text-white"
                      placeholder="Укажите, что нужно исправить..."
                    />
                  </div>
                  <button
                    onClick={handleReturnSubmission}
                    disabled={actionLoading || !returnComment.trim()}
                    className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                  >
                    {actionLoading ? 'Отправка...' : 'Вернуть на доработку'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Не удалось загрузить данные
        </div>
      )}
    </BaseModal>
  );
};
