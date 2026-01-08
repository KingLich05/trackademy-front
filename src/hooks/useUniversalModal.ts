import { useState } from 'react';
import { modalConfigs, EntityType, ModalMode } from '../config/modalConfigs';

export const useUniversalModal = <T extends Record<string, unknown>>(
  entityType: EntityType,
  initialData: T
) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<ModalMode>('create');
  const [editData, setEditData] = useState<T | null>(null);

  const openCreateModal = () => {
    setMode('create');
    setEditData(null);
    setIsOpen(true);
  };

  const openEditModal = (data: T) => {
    setMode('edit');
    setEditData(data);
    setIsOpen(true);
  };

  const openViewModal = (data: T) => {
    setMode('view');
    setEditData(data);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setEditData(null);
  };

  const getConfig = () => modalConfigs[entityType][mode];

  return {
    isOpen,
    mode,
    editData,
    openCreateModal,
    openEditModal,
    openViewModal,
    closeModal,
    getConfig,
    initialData
  };
};