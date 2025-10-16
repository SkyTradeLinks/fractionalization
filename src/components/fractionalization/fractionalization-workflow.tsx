/**
 * Fractionalization workflow component - Multi-step NFT fractionalization
 */

'use client';

import { useFractionalizationStore } from '@/stores';
import { FractionalizationStep } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SelectNFTStep } from './select-nft-step';
import { ConfigureTokensStep } from './configure-tokens-step';

const steps = [
  { number: 1, title: 'Select NFT', step: FractionalizationStep.SelectNFT },
  { number: 2, title: 'Configure Tokens', step: FractionalizationStep.ConfigureTokens },
];

export function FractionalizationWorkflow() {
  const { currentStep } = useFractionalizationStore();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4">
        {steps.map((step, idx) => (
          <div key={step.number} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                  currentStep >= step.step
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step.number}
              </div>
              <span className="text-sm mt-2 hidden sm:block">{step.title}</span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`w-16 md:w-24 h-1 mx-2 transition-colors ${
                  currentStep > step.step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {currentStep === FractionalizationStep.SelectNFT && 'Select Your NFT'}
            {currentStep === FractionalizationStep.ConfigureTokens && 'Configure Fractional Tokens'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentStep === FractionalizationStep.SelectNFT && <SelectNFTStep />}
          {currentStep === FractionalizationStep.ConfigureTokens && <ConfigureTokensStep />}
        </CardContent>
      </Card>
    </div>
  );
}
