/**
 * Modal store for managing global modal state
 */

import { create } from 'zustand';

type ModalType = 'fractionalize' | 'redeem' | 'confirm' | null;

interface ModalData {
  title?: string;
  description?: string;
  onConfirm?: () => void;
  [key: string]: unknown;
}

interface ModalStore {
  type: ModalType;
  data: ModalData;
  isOpen: boolean;
  openModal: (type: ModalType, data?: ModalData) => void;
  closeModal: () => void;
}

export const useModalStore = create<ModalStore>((set) => ({
  type: null,
  data: {},
  isOpen: false,
  openModal: (type, data = {}) => set({ type, data, isOpen: true }),
  closeModal: () => set({ type: null, data: {}, isOpen: false }),
}));
