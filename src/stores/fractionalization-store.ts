/**
 * Store for managing fractionalization workflow state
 */

import { create } from 'zustand';
import { FractionalizationStep, FractionalizationFormData } from '@/types';

interface FractionalizationStore {
  currentStep: FractionalizationStep;
  formData: Partial<FractionalizationFormData>;
  setStep: (step: FractionalizationStep) => void;
  updateFormData: (data: Partial<FractionalizationFormData>) => void;
  resetForm: () => void;
}

const initialFormData: Partial<FractionalizationFormData> = {
  nftMint: '',
  tokenName: '',
  tokenSymbol: '',
  totalSupply: 1000000,
};

export const useFractionalizationStore = create<FractionalizationStore>((set) => ({
  currentStep: FractionalizationStep.SelectNFT,
  formData: initialFormData,
  setStep: (step) => set({ currentStep: step }),
  updateFormData: (data) =>
    set((state) => ({
      formData: { ...state.formData, ...data },
    })),
  resetForm: () =>
    set({
      currentStep: FractionalizationStep.SelectNFT,
      formData: initialFormData,
    }),
}));
