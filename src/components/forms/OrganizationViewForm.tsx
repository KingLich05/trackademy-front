'use client';

import React from 'react';
import { 
  BuildingOfficeIcon, 
  PhoneIcon, 
  MapPinIcon, 
  KeyIcon 
} from '@heroicons/react/24/outline';
import { OrganizationDetail } from '../../types/Organization';

interface OrganizationViewFormProps {
  data: OrganizationDetail;
}

export const OrganizationViewForm: React.FC<OrganizationViewFormProps> = ({ data }) => {
  return (
    <div className="space-y-6">
      {/* Organization Name */}
      <div className="flex items-center space-x-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
          <BuildingOfficeIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Название организации</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">{data.name}</p>
        </div>
      </div>

      {/* Contact Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Phone */}
        <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
            <PhoneIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Телефон</p>
            <p className="text-lg font-medium text-gray-900 dark:text-white">{data.phone}</p>
          </div>
        </div>

        {/* Address */}
        <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
            <MapPinIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Адрес</p>
            <p className="text-lg font-medium text-gray-900 dark:text-white">{data.address}</p>
          </div>
        </div>
      </div>

      {/* Activation Key */}
      <div className="flex items-center space-x-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-2 border-yellow-200 dark:border-yellow-800">
        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg">
          <KeyIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Ключ активации</p>
          <div className="flex items-center justify-between">
            <code className="text-lg font-mono bg-yellow-100 dark:bg-yellow-900/50 px-3 py-1 rounded text-yellow-800 dark:text-yellow-200">
              {data.activationKey}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(data.activationKey)}
              className="ml-3 px-3 py-1 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 text-sm font-medium rounded hover:bg-yellow-300 dark:hover:bg-yellow-700 transition-colors duration-200"
            >
              Копировать
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};