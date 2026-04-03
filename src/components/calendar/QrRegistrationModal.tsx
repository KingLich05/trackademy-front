'use client';

import { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { AuthenticatedApiService } from '@/services/AuthenticatedApiService';
import { RegistrationLinkDto } from '@/types/LeadRegistration';
import { XMarkIcon, ClipboardIcon, CheckIcon, QrCodeIcon, TrashIcon } from '@heroicons/react/24/outline';

interface QrRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonId: string;
  groupId: string | null;
  organizationId: string;
  groupName?: string;
}

export default function QrRegistrationModal({
  isOpen,
  onClose,
  lessonId,
  groupId,
  organizationId,
  groupName,
}: QrRegistrationModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeLink, setActiveLink] = useState<RegistrationLinkDto | null>(null);
  const [allLinks, setAllLinks] = useState<RegistrationLinkDto[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deactivating, setDeactivating] = useState<string | null>(null);

  const registrationUrl = activeLink
    ? `${window.location.origin}/register/${activeLink.code}`
    : '';

  const loadLinks = useCallback(async () => {
    setLoadingLinks(true);
    try {
      const links = await AuthenticatedApiService.getRegistrationLinks(organizationId);
      const lessonLinks = links.filter((l) => l.lessonId === lessonId && l.isActive);
      setAllLinks(lessonLinks);
      if (lessonLinks.length > 0 && !activeLink) {
        setActiveLink(lessonLinks[0]);
      }
    } catch {
      // silently fail — existing links are a convenience
    } finally {
      setLoadingLinks(false);
    }
  }, [organizationId, lessonId, activeLink]);

  useEffect(() => {
    if (isOpen) {
      loadLinks();
    } else {
      setActiveLink(null);
      setAllLinks([]);
      setError(null);
      setCopied(false);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const link = await AuthenticatedApiService.generateRegistrationLink({
        organizationId,
        lessonId,
        groupId: groupId ?? undefined,
        expiresInHours: 24,
      });
      setActiveLink(link);
      setAllLinks((prev) => [link, ...prev.filter((l) => l.id !== link.id)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать ссылку');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!registrationUrl) return;
    try {
      await navigator.clipboard.writeText(registrationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback: show URL for manual copy
    }
  };

  const handleDeactivate = async (linkId: string) => {
    setDeactivating(linkId);
    try {
      await AuthenticatedApiService.deactivateRegistrationLink(linkId, organizationId);
      setAllLinks((prev) => prev.filter((l) => l.id !== linkId));
      if (activeLink?.id === linkId) {
        const remaining = allLinks.filter((l) => l.id !== linkId);
        setActiveLink(remaining.length > 0 ? remaining[0] : null);
      }
    } catch {
      // silently fail
    } finally {
      setDeactivating(null);
    }
  };

  const formatExpiry = (expiresAt: string) => {
    const d = new Date(expiresAt);
    return d.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <QrCodeIcon className="w-5 h-5 text-indigo-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              QR-регистрация
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {groupName && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Группа: <span className="font-medium text-gray-700 dark:text-gray-300">{groupName}</span>
            </p>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 p-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* QR display */}
          {activeLink ? (
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-white rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
                <QRCodeSVG value={registrationUrl} size={200} />
              </div>

              {/* Link row */}
              <div className="w-full flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-600">
                <span className="flex-1 text-xs text-gray-600 dark:text-gray-300 truncate">
                  {registrationUrl}
                </span>
                <button
                  onClick={handleCopy}
                  title="Скопировать ссылку"
                  className="shrink-0 p-1.5 rounded-md text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  {copied ? (
                    <CheckIcon className="w-4 h-4 text-green-500" />
                  ) : (
                    <ClipboardIcon className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Expiry */}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Действует до: {formatExpiry(activeLink.expiresAt)}
              </p>

              {/* Generate new */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
              >
                {isGenerating ? 'Создаём...' : 'Создать новую ссылку'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-48 h-48 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                <QrCodeIcon className="w-20 h-20 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Создайте QR-код, который ученики смогут
                <br />отсканировать для записи на урок
              </p>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Создаём...
                  </>
                ) : (
                  <>
                    <QrCodeIcon className="w-4 h-4" />
                    Создать QR-код
                  </>
                )}
              </button>
            </div>
          )}

          {/* Existing links list */}
          {allLinks.length > 1 && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Активные ссылки для этого урока
              </p>
              <ul className="space-y-1.5">
                {allLinks.map((link) => (
                  <li
                    key={link.id}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                      activeLink?.id === link.id
                        ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300'
                        : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                    onClick={() => setActiveLink(link)}
                  >
                    <span className="truncate">/register/{link.code}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-gray-400">{formatExpiry(link.expiresAt)}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeactivate(link.id); }}
                        disabled={deactivating === link.id}
                        title="Деактивировать"
                        className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {loadingLinks && !activeLink && (
            <p className="text-xs text-center text-gray-400">Загружаем ссылки...</p>
          )}
        </div>

        <div className="flex justify-end p-5 pt-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors text-sm"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
