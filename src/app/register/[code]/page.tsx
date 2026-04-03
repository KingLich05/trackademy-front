'use client';

import { useState, useEffect, use } from 'react';
import { API_BASE_URL } from '@/lib/api-config';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { LinkContextDto, RegisterLeadRequest } from '@/types/LeadRegistration';

type PageState = 'loading' | 'form' | 'success' | 'invalid';

export default function RegisterPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);

  const [pageState, setPageState] = useState<PageState>('loading');
  const [context, setContext] = useState<LinkContextDto | null>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const fetchContext = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/LeadRegistration/link/${code}`);
        if (!res.ok) {
          setPageState('invalid');
          return;
        }
        const data: LinkContextDto = await res.json();
        setContext(data);
        setPageState('form');
      } catch {
        setPageState('invalid');
      }
    };
    fetchContext();
  }, [code]);

  const validate = () => {
    let valid = true;
    setNameError('');
    setPhoneError('');

    if (!fullName.trim()) {
      setNameError('Введите полное имя');
      valid = false;
    }
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      setPhoneError('Введите корректный номер телефона');
      valid = false;
    }
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError('');

    const body: RegisterLeadRequest = {
      fullName: fullName.trim(),
      phone,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/LeadRegistration/register/${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        if (res.status === 404 || res.status === 410) {
          setPageState('invalid');
          return;
        }
        const data = await res.json().catch(() => ({}));
        setSubmitError(data?.message ?? 'Произошла ошибка. Попробуйте ещё раз.');
        return;
      }

      setPageState('success');
    } catch {
      setSubmitError('Нет соединения с сервером. Проверьте интернет и попробуйте снова.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Render states ---

  if (pageState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <svg className="animate-spin h-8 w-8" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (pageState === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-sm w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Ссылка недействительна</h1>
          <p className="text-gray-500 text-sm">
            QR-код больше не активен или срок его действия истёк.
            Обратитесь к преподавателю за новым кодом.
          </p>
        </div>
      </div>
    );
  }

  if (pageState === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-sm w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Заявка принята!</h1>
          <p className="text-gray-500 text-sm">
            Спасибо! Мы свяжемся с вами в ближайшее время.
          </p>
        </div>
      </div>
    );
  }

  // pageState === 'form'
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-sm w-full">
        {/* School header */}
        <div className="bg-indigo-600 rounded-t-2xl px-6 py-5 text-white">
          <p className="text-indigo-200 text-xs uppercase tracking-wider mb-0.5">Запись на урок</p>
          <h1 className="text-xl font-bold">{context?.organizationName ?? 'Школа'}</h1>
        </div>

        {/* Lesson info */}
        {context && (
          <div className="px-6 pt-5 pb-4 border-b border-gray-100 space-y-1.5">
            {context.groupName && (
              <InfoRow label="Группа" value={context.groupName} />
            )}
            {context.subjectName && (
              <InfoRow label="Предмет" value={context.subjectName} />
            )}
            {context.teacherName && (
              <InfoRow label="Преподаватель" value={context.teacherName} />
            )}
            {context.lessonDate && (
              <InfoRow
                label="Дата"
                value={new Date(context.lessonDate).toLocaleDateString('ru-RU', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              />
            )}
            {context.lessonTime && (
              <InfoRow label="Время" value={context.lessonTime} />
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Полное имя <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Иванов Иван Иванович"
              className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors
                ${nameError
                  ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                  : 'border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
                }`}
            />
            {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
          </div>

          <div>
            <PhoneInput
              label="Номер телефона"
              value={phone}
              onChange={setPhone}
              required
              error={phoneError}
            />
          </div>

          {submitError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
              {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Отправляем...
              </>
            ) : (
              'Записаться'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-gray-400 shrink-0">{label}:</span>
      <span className="font-medium text-gray-700 capitalize">{value}</span>
    </div>
  );
}
