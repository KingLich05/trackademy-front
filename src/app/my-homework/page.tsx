'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthenticatedApiService } from '../../services/AuthenticatedApiService';
import { ClipboardDocumentListIcon, CalendarIcon, ClockIcon, CheckCircleIcon, XCircleIcon, AcademicCapIcon, ArrowUpTrayIcon, DocumentIcon, TrashIcon } from '@heroicons/react/24/outline';
import { MyAssignment, MyAssignmentsResponse } from '../../types/MyAssignments';
import { Assignment } from '../../types/Assignment';
import { Submission } from '../../types/Submission';
import { PageHeaderWithStats } from '../../components/ui/PageHeaderWithStats';
import { useApiToast } from '../../hooks/useApiToast';
import { BaseModal } from '../../components/ui/BaseModal';

export default function MyHomeworkPage() {
  const { isAuthenticated, user } = useAuth();
  const [myAssignments, setMyAssignments] = useState<MyAssignmentsResponse>({
    pending: [],
    submitted: [],
    graded: [],
    overdue: []
  });
  const [loading, setLoading] = useState(false);
  
  // Modal state
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<MyAssignment | null>(null);
  const [assignmentDetails, setAssignmentDetails] = useState<Assignment | null>(null);
  const [submissionDetails, setSubmissionDetails] = useState<Submission | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionFiles, setSubmissionFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { loadOperation, createOperation, updateOperation, deleteOperation } = useApiToast();

  const loadMyAssignments = async () => {
    setLoading(true);
    try {
      const organizationId = user?.organizationId || localStorage.getItem('userOrganizationId');
      if (!organizationId) return;

      const response = await loadOperation(
        () => AuthenticatedApiService.getMyAssignments({ OrganizationId: organizationId }),
        'мои задания'
      );

      if (response) {
        setMyAssignments(response);
      }
    } catch (error) {
      console.error('Error loading my assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      loadMyAssignments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  const handleCardClick = async (assignment: MyAssignment) => {
    setSelectedAssignment(assignment);
    setIsDetailModalOpen(true);
    setDetailLoading(true);
    setSubmissionText('');
    setSubmissionFiles([]);
    setSubmissionDetails(null);

    try {
      const details = await loadOperation(
        () => AuthenticatedApiService.getAssignmentById(assignment.assignmentId),
        'детали задания'
      );

      if (details) {
        setAssignmentDetails(details);
      }

      // Загрузка деталей submission, если он существует
      if (assignment.submissionId && assignment.submissionId.trim() !== '') {
        try {
          const submissionData = await loadOperation(
            () => AuthenticatedApiService.getSubmissionById(assignment.submissionId!),
            'детали работы'
          ) as Submission;

          if (submissionData) {
            setSubmissionDetails(submissionData);
            setSubmissionText(submissionData.textContent || '');
            
            // Обновляем статус в selectedAssignment на основе данных submission
            const statusMap: { [key: number]: 'Pending' | 'Submitted' | 'Graded' | 'Returned' | 'Overdue' } = {
              0: 'Pending',
              1: 'Submitted',
              2: 'Graded',
              3: 'Returned',
              4: 'Overdue'
            };
            
            setSelectedAssignment({
              ...assignment,
              status: statusMap[submissionData.status] || assignment.status,
              score: submissionData.score
            });
          }
        } catch (submissionError) {
          console.error('Error loading submission details:', submissionError);
          // Продолжаем работу даже если не удалось загрузить детали submission
        }
      }
    } catch (error) {
      console.error('Error loading assignment details:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSubmissionFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSubmissionFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDownloadFile = async (fileId: string, fileName: string, downloadUrl?: string) => {
    try {
      // Используем API для скачивания с авторизацией
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
      
      // Создаем blob из response
      const blob = await response.blob();
      
      console.log('Blob created:', {
        size: blob.size,
        type: blob.type
      });
      
      if (blob.size === 0) {
        throw new Error('Файл пустой');
      }
      
      // Создаем ссылку для скачивания
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      
      // Небольшая задержка перед очисткой
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        console.log('=== Download completed successfully ===');
      }, 100);
      
    } catch (error) {
      console.error('=== Download error ===', error);
      alert(`Ошибка при скачивании файла: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };

  // Проверка, можно ли редактировать работу
  const canEditSubmission = (): boolean => {
    // Если submission вообще нет - можно создавать
    if (!submissionDetails) return true;
    
    // Проверяем статус: разрешено редактировать только в статусах 0 (Draft), 3 (Returned), 4 (Overdue)
    const editableStatuses = [0, 3, 4]; // Draft, Returned, Overdue
    return editableStatuses.includes(submissionDetails.status);
  };

  const handleDeleteSubmissionFile = async (fileId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот файл?')) {
      return;
    }

    try {
      await deleteOperation(
        () => AuthenticatedApiService.delete(`/Submission/file/${fileId}`),
        'файл'
      );

      // Обновить список файлов в submissionDetails
      if (submissionDetails) {
        setSubmissionDetails({
          ...submissionDetails,
          files: submissionDetails.files.filter(f => f.id !== fileId)
        });
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAssignment || !assignmentDetails) return;

    // Validate that at least one field is filled
    if (!submissionText.trim() && submissionFiles.length === 0 && (!submissionDetails?.files || submissionDetails.files.length === 0)) {
      console.error('No content to submit');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      
      // Always append textContent, even if empty (API might require it)
      formData.append('textContent', submissionText.trim());
      
      // Append each file
      submissionFiles.forEach((file) => {
        formData.append('files', file);
      });

      console.log('Submitting homework:', {
        assignmentId: assignmentDetails.id,
        textContent: submissionText.trim(),
        filesCount: submissionFiles.length
      });

      // Create or update submission
      const result = await createOperation(
        () => AuthenticatedApiService.createOrUpdateSubmission(assignmentDetails.id, formData),
        'работу'
      );

      if (result.success && result.data) {
        const submission = result.data;
        
        console.log('Submission created:', submission);
        
        // Submit the submission
        await updateOperation(
          () => AuthenticatedApiService.submitSubmission(submission.id),
          'работу на проверку'
        );

        setIsDetailModalOpen(false);
        setSubmissionText('');
        setSubmissionFiles([]);
        setAssignmentDetails(null);
        await loadMyAssignments();
      }
    } catch (error) {
      console.error('Error submitting homework:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedAssignment || !assignmentDetails) return;

    // Allow saving draft even with empty content
    setSubmitting(true);

    try {
      const formData = new FormData();
      
      formData.append('textContent', submissionText.trim());
      
      submissionFiles.forEach((file) => {
        formData.append('files', file);
      });

      console.log('Saving draft:', {
        assignmentId: assignmentDetails.id,
        textContent: submissionText.trim(),
        filesCount: submissionFiles.length
      });

      // Create or update submission as draft (don't submit)
      const result = await createOperation(
        () => AuthenticatedApiService.createOrUpdateSubmission(assignmentDetails.id, formData),
        'черновик'
      );

      if (result.success) {
        setIsDetailModalOpen(false);
        setSubmissionText('');
        setSubmissionFiles([]);
        setAssignmentDetails(null);
        await loadMyAssignments();
      }
    } catch (error) {
      console.error('Error saving draft:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const getTotalCount = () => {
    return myAssignments.overdue.length + 
           myAssignments.pending.length + 
           myAssignments.submitted.length + 
           myAssignments.graded.length;
  };

  const getStatusBadgeForModal = (assignment: MyAssignment) => {
    if (assignment.status === 'Graded' && assignment.score !== null) {
      return (
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full">
            Проверено
          </span>
          <span className="px-2 py-1 text-xs font-bold bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 rounded-full">
            {assignment.score} б.
          </span>
        </div>
      );
    }
    if (assignment.status === 'Submitted') {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">
          На проверке
        </span>
      );
    }
    if (assignment.status === 'Overdue') {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-full">
          Просрочено
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded-full">
        К выполнению
      </span>
    );
  };



  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Требуется авторизация</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="w-full space-y-6 pt-10 md:pt-12">
        {/* Header */}
        <PageHeaderWithStats
          icon={ClipboardDocumentListIcon}
          title="Мои домашние задания"
          subtitle="Список всех заданий с группировкой по статусам"
          gradientFrom="blue-500"
          gradientTo="purple-600"
          stats={[
            { label: "Всего заданий", value: getTotalCount(), color: "blue" },
            { label: "Просрочено", value: myAssignments.overdue.length, color: "red" },
            { label: "К выполнению", value: myAssignments.pending.length, color: "indigo" },
            { label: "На проверке", value: myAssignments.submitted.length, color: "cyan" },
            { label: "Проверено", value: myAssignments.graded.length, color: "green" }
          ]}
        />

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Overdue Section */}
            {myAssignments.overdue.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <XCircleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Просрочено ({myAssignments.overdue.length})
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myAssignments.overdue.map((assignment) => (
                    <AssignmentCard 
                      key={assignment.assignmentId} 
                      assignment={assignment} 
                      statusColor="red"
                      onClick={() => handleCardClick(assignment)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Pending Section */}
            {myAssignments.pending.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <ClockIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    К выполнению ({myAssignments.pending.length})
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myAssignments.pending.map((assignment) => (
                    <AssignmentCard 
                      key={assignment.assignmentId} 
                      assignment={assignment} 
                      statusColor="gray"
                      onClick={() => handleCardClick(assignment)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Submitted Section */}
            {myAssignments.submitted.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <ClipboardDocumentListIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    На проверке ({myAssignments.submitted.length})
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myAssignments.submitted.map((assignment) => (
                    <AssignmentCard 
                      key={assignment.assignmentId} 
                      assignment={assignment} 
                      statusColor="blue"
                      onClick={() => handleCardClick(assignment)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Graded Section */}
            {myAssignments.graded.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Проверено ({myAssignments.graded.length})
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myAssignments.graded.map((assignment) => (
                    <AssignmentCard 
                      key={assignment.assignmentId} 
                      assignment={assignment} 
                      statusColor="green"
                      onClick={() => handleCardClick(assignment)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {getTotalCount() === 0 && !loading && (
              <div className="text-center py-12">
                <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Нет заданий</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  У вас пока нет домашних заданий
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <BaseModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedAssignment(null);
          setAssignmentDetails(null);
          setSubmissionText('');
          setSubmissionFiles([]);
        }}
        title={selectedAssignment ? `${selectedAssignment.description.substring(0, 40)}${selectedAssignment.description.length > 40 ? '...' : ''}` : 'Детали задания'}
        customBackground="bg-gray-800 dark:bg-gray-800"
        gradientFrom="from-blue-500"
        gradientTo="to-purple-600"
        maxWidth="2xl"
      >
        <div className="space-y-4">
          {detailLoading ? (
            <div className="text-center py-12">
              <div className="p-4 bg-blue-900/20 rounded-full w-16 h-16 mx-auto mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mt-2"></div>
              </div>
              <p className="text-gray-300">Загрузка деталей...</p>
            </div>
          ) : assignmentDetails ? (
            <div className="space-y-4">
              {/* Assignment Details */}
              <div className="bg-gray-700 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-semibold text-white mb-3">Детали задания</h3>
                
                <div>
                  <label className="text-xs text-gray-400">Описание</label>
                  <p className="text-sm text-white mt-1">{assignmentDetails.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400">Предмет</label>
                    <p className="text-sm text-white mt-1">{assignmentDetails.subjectName || assignmentDetails.subject?.name || 'Не указан'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Группа</label>
                    <p className="text-sm text-white mt-1">{assignmentDetails.group?.name || 'Не указана'}</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400">Статус</label>
                  <div className="mt-1">
                    {selectedAssignment && getStatusBadgeForModal(selectedAssignment)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400">Выдано</label>
                    <p className="text-sm text-white mt-1">
                      {new Date(assignmentDetails.assignedDate).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Срок сдачи</label>
                    <p className="text-sm text-white mt-1">
                      {new Date(assignmentDetails.dueDate).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Conditional rendering based on editing permissions */}
              {!canEditSubmission() && submissionDetails?.status === 1 ? (
                /* View Submitted Work (status: Submitted) - READ ONLY */
                <div className="border-t border-gray-600 pt-4 space-y-4">
                  {/* Status Info */}
                  <div className="bg-gradient-to-r from-blue-900/30 to-blue-800/20 border-l-4 border-blue-500 rounded-lg p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                          <CheckCircleIcon className="h-6 w-6 text-blue-400" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base font-semibold text-blue-300 mb-1">
                          Работа отправлена на проверку
                        </h4>
                        <p className="text-sm text-gray-300 mb-2">
                          Ваша работа находится на рассмотрении у преподавателя. Результаты проверки появятся здесь после завершения.
                        </p>
                        {submissionDetails.submittedAt && (
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Сдано: {new Date(submissionDetails.submittedAt).toLocaleString('ru-RU')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Text Content */}
                  {submissionDetails.textContent && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Текст работы
                      </label>
                      <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                        <p className="text-sm text-white whitespace-pre-wrap">{submissionDetails.textContent}</p>
                      </div>
                    </div>
                  )}

                  {/* Files */}
                  {submissionDetails.files && submissionDetails.files.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Прикрепленные файлы ({submissionDetails.files.length})
                      </label>
                      <div className="space-y-2">
                        {submissionDetails.files.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between bg-gray-700 rounded-lg p-3 border border-gray-600"
                          >
                            <div className="flex items-center space-x-3">
                              <DocumentIcon className="h-5 w-5 text-blue-400" />
                              <div>
                                <div className="text-sm text-white">{file.originalFileName}</div>
                                <div className="text-xs text-gray-400">
                                  {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDownloadFile(file.id, file.originalFileName, file.downloadUrl)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                            >
                              Скачать
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Teacher Comment */}
                  {submissionDetails.teacherComment && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Комментарий преподавателя
                      </label>
                      <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
                        <p className="text-sm text-yellow-300 whitespace-pre-wrap">{submissionDetails.teacherComment}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : !canEditSubmission() && submissionDetails?.status === 2 ? (
                /* View Graded Work (status: Graded) - READ ONLY */
                <div className="border-t border-gray-600 pt-4 space-y-4">
                  {/* Status Info */}
                  <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
                    <div className="flex items-start">
                      <CheckCircleIcon className="h-5 w-5 text-green-400 mt-0.5 mr-3" />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-green-300">
                          Работа проверена
                        </h4>
                        <p className="text-sm text-green-400 mt-1">
                          {selectedAssignment && selectedAssignment.score !== null ? `Оценка: ${selectedAssignment.score} баллов` : 'Оценка не выставлена'}
                        </p>
                        {submissionDetails.gradedAt && (
                          <p className="text-xs text-gray-400 mt-1">
                            Проверено: {new Date(submissionDetails.gradedAt).toLocaleString('ru-RU')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Text Content */}
                  {submissionDetails.textContent && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Текст работы
                      </label>
                      <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                        <p className="text-sm text-white whitespace-pre-wrap">{submissionDetails.textContent}</p>
                      </div>
                    </div>
                  )}

                  {/* Files */}
                  {submissionDetails.files && submissionDetails.files.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Прикрепленные файлы ({submissionDetails.files.length})
                      </label>
                      <div className="space-y-2">
                        {submissionDetails.files.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between bg-gray-700 rounded-lg p-3 border border-gray-600"
                          >
                            <div className="flex items-center space-x-3">
                              <DocumentIcon className="h-5 w-5 text-blue-400" />
                              <div>
                                <div className="text-sm text-white">{file.originalFileName}</div>
                                <div className="text-xs text-gray-400">
                                  {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDownloadFile(file.id, file.originalFileName, file.downloadUrl)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                            >
                              Скачать
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Teacher Comment */}
                  {submissionDetails.teacherComment && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Комментарий преподавателя
                      </label>
                      <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
                        <p className="text-sm text-yellow-300 whitespace-pre-wrap">{submissionDetails.teacherComment}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : canEditSubmission() ? (
                /* Submission Form - editable for Draft (0), Returned (3), Overdue (4), or null */
                <>
                  <div className="border-t border-gray-600 pt-6 mt-4">
                    <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
                      <h3 className="text-base font-semibold text-white mb-1 flex items-center">
                        <ArrowUpTrayIcon className="h-5 w-5 mr-2 text-blue-400" />
                        Выполнить задание
                      </h3>
                      <p className="text-xs text-gray-400">Напишите комментарий или загрузите файлы с выполненным заданием</p>
                    </div>

                    {/* Text Content */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Комментарий / Текст работы
                      </label>
                      <textarea
                        value={submissionText}
                        onChange={(e) => setSubmissionText(e.target.value)}
                        rows={6}
                        placeholder="Введите текст вашей работы..."
                        className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white placeholder-gray-400"
                      />
                    </div>

                    {/* File Upload */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Прикрепить файлы
                      </label>
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-700 hover:bg-gray-600 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <ArrowUpTrayIcon className="w-10 h-10 mb-3 text-gray-400" />
                            <p className="mb-2 text-sm text-gray-400">
                              <span className="font-semibold">Нажмите для выбора</span> или перетащите файлы
                            </p>
                            <p className="text-xs text-gray-500">PDF, DOC, DOCX, JPG, PNG</p>
                          </div>
                          <input
                            type="file"
                            multiple
                            onChange={handleFileChange}
                            className="hidden"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          />
                        </label>
                      </div>
                    </div>

                    {/* File List - New files to upload */}
                    {submissionFiles.length > 0 && (
                      <div className="space-y-2 mb-4">
                        <label className="block text-sm font-medium text-gray-300">
                          Новые файлы ({submissionFiles.length})
                        </label>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {submissionFiles.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between bg-gray-600 rounded-lg p-3"
                            >
                              <div className="flex items-center space-x-3">
                                <DocumentIcon className="h-5 w-5 text-blue-400" />
                                <div>
                                  <div className="text-sm text-white">{file.name}</div>
                                  <div className="text-xs text-gray-400">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveFile(index)}
                                className="text-red-400 hover:text-red-300 transition-colors"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Existing Files from Submission (for Draft, Returned, or Overdue status) */}
                    {submissionDetails?.files && submissionDetails.files.length > 0 && (
                      <div className="space-y-2 mb-4">
                        <label className="block text-sm font-medium text-gray-300">
                          Загруженные файлы ({submissionDetails.files.length})
                        </label>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {submissionDetails.files.map((file) => (
                            <div
                              key={file.id}
                              className="flex items-center justify-between bg-gray-700 rounded-lg p-3 border border-gray-600"
                            >
                              <div className="flex items-center space-x-3">
                                <DocumentIcon className="h-5 w-5 text-green-400" />
                                <div>
                                  <div className="text-sm text-white">{file.originalFileName}</div>
                                  <div className="text-xs text-gray-400">
                                    {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleDownloadFile(file.id, file.originalFileName, file.downloadUrl)}
                                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                                >
                                  Скачать
                                </button>
                                <button
                                  onClick={() => handleDeleteSubmissionFile(file.id)}
                                  className="text-red-400 hover:text-red-300 transition-colors"
                                >
                                  <TrashIcon className="h-5 w-5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Teacher Comment (if exists) */}
                    {submissionDetails?.teacherComment && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Комментарий преподавателя
                        </label>
                        <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
                          <p className="text-sm text-yellow-300 whitespace-pre-wrap">{submissionDetails.teacherComment}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between gap-3 pt-4 border-t border-gray-600">
                    <button
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        setSelectedAssignment(null);
                        setAssignmentDetails(null);
                        setSubmissionText('');
                        setSubmissionFiles([]);
                      }}
                      disabled={submitting}
                      className="px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Отмена
                    </button>
                    <div className="flex gap-3">
                      <button
                        onClick={handleSaveDraft}
                        disabled={submitting}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Сохранение...
                          </>
                        ) : (
                          'Сохранить черновик'
                        )}
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={submitting || (!submissionText && submissionFiles.length === 0 && (!submissionDetails?.files || submissionDetails.files.length === 0))}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      >
                        {submitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Отправка...
                          </>
                        ) : (
                          <>
                            <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                            Сдать работу
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </BaseModal>
    </div>
  );
}

interface AssignmentCardProps {
  assignment: MyAssignment;
  statusColor: 'red' | 'gray' | 'blue' | 'green';
  onClick: () => void;
}

function AssignmentCard({ assignment, statusColor, onClick }: AssignmentCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'short'
    });
  };

  const borderColors = {
    red: 'border-l-red-500',
    gray: 'border-l-gray-500',
    blue: 'border-l-blue-500',
    green: 'border-l-green-500'
  };

  const bgColors = {
    red: 'hover:bg-red-50 dark:hover:bg-red-900/10',
    gray: 'hover:bg-gray-50 dark:hover:bg-gray-700',
    blue: 'hover:bg-blue-50 dark:hover:bg-blue-900/10',
    green: 'hover:bg-green-50 dark:hover:bg-green-900/10'
  };

  const getStatusBadge = () => {
    if (assignment.status === 'Graded' && assignment.score !== null) {
      return (
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full">
            Проверено
          </span>
          <span className="px-2 py-1 text-xs font-bold bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 rounded-full">
            {assignment.score} б.
          </span>
        </div>
      );
    }
    if (assignment.status === 'Submitted') {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">
          На проверке
        </span>
      );
    }
    return null;
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-lg border-l-4 ${borderColors[statusColor]} ${bgColors[statusColor]} shadow-sm hover:shadow-md transition-all cursor-pointer p-4 space-y-3`}
    >
      {/* Description */}
      <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
        {assignment.description}
      </p>

      {/* Subject */}
      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
        <AcademicCapIcon className="h-4 w-4" />
        <span className="truncate">{assignment.subject?.name || 'Не указан'}</span>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
            <CalendarIcon className="h-4 w-4" />
            <span>Выдано</span>
          </div>
          <div className="font-medium text-gray-900 dark:text-white">{formatDate(assignment.assignedDate)}</div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
            <ClockIcon className="h-4 w-4" />
            <span>Срок</span>
          </div>
          <div className="font-medium text-gray-900 dark:text-white">{formatDate(assignment.dueDate)}</div>
        </div>
      </div>

      {/* Status Badge */}
      {getStatusBadge() && (
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          {getStatusBadge()}
        </div>
      )}
    </div>
  );
}
