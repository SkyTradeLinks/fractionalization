/**
 * Step 2: Configure fractional tokens
 */

'use client';

import { useState } from 'react';
import { useFractionalizationStore } from '@/stores';
import { useFractionalize } from '@/hooks';
import { FractionalizationStep } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function ConfigureTokensStep() {
  const router = useRouter();
  const { formData, updateFormData, setStep, resetForm } = useFractionalizationStore();
  const { mutate: fractionalize, isPending } = useFractionalize();

  const [tokenName, setTokenName] = useState(formData.tokenName || '');
  const [tokenSymbol, setTokenSymbol] = useState(formData.tokenSymbol || '');
  const [totalSupply, setTotalSupply] = useState(formData.totalSupply || 1000000);

  const handleBack = () => {
    setStep(FractionalizationStep.SelectNFT);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nftMint || !tokenName || !tokenSymbol || !totalSupply) {
      return;
    }

    fractionalize(
      {
        nftMint: formData.nftMint,
        tokenName,
        tokenSymbol,
        totalSupply,
      },
      {
        onSuccess: () => {
          resetForm();
          router.push('/explorer');
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tokenName">Token Name</Label>
          <Input
            id="tokenName"
            placeholder="e.g., MyFractionalNFT"
            value={tokenName}
            onChange={(e) => setTokenName(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">
            Choose a descriptive name for your fractional tokens
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tokenSymbol">Token Symbol</Label>
          <Input
            id="tokenSymbol"
            placeholder="e.g., FNFT"
            value={tokenSymbol}
            onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
            maxLength={10}
            required
          />
          <p className="text-xs text-muted-foreground">
            A short symbol for your token (max 10 characters)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="totalSupply">Total Supply</Label>
          <Input
            id="totalSupply"
            type="number"
            placeholder="1000000"
            value={totalSupply}
            onChange={(e) => setTotalSupply(Number(e.target.value))}
            min="1"
            required
          />
          <p className="text-xs text-muted-foreground">
            Total number of fractional tokens to create
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-muted rounded-lg p-4 space-y-2">
        <h4 className="font-semibold text-sm">Summary</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Token Name:</span>
            <span className="font-medium">{tokenName || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Symbol:</span>
            <span className="font-medium">{tokenSymbol || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Supply:</span>
            <span className="font-medium">
              {totalSupply ? totalSupply.toLocaleString() : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={isPending}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          type="submit"
          disabled={isPending || !tokenName || !tokenSymbol || !totalSupply}
          className="flex-1"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Fractionalize'
          )}
        </Button>
      </div>
    </form>
  );
}