import { useSolana } from '@/components/solana/use-solana'
import { WalletDropdown } from '@/components/wallet-dropdown'
import { AppHero } from '@/components/app-hero'
import { FractionalizationskytradeUiProgramExplorerLink } from './ui/fractionalizationskytrade-ui-program-explorer-link'
import { FractionalizationskytradeUiCreate } from './ui/fractionalizationskytrade-ui-create'
import { FractionalizationskytradeUiProgram } from '@/features/fractionalizationskytrade/ui/fractionalizationskytrade-ui-program'

export default function FractionalizationskytradeFeature() {
  const { account } = useSolana()

  if (!account) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="hero py-[64px]">
          <div className="hero-content text-center">
            <WalletDropdown />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <AppHero title="Fractionalizationskytrade" subtitle={'Run the program by clicking the "Run program" button.'}>
        <p className="mb-6">
          <FractionalizationskytradeUiProgramExplorerLink />
        </p>
        <FractionalizationskytradeUiCreate account={account} />
      </AppHero>
      <FractionalizationskytradeUiProgram />
    </div>
  )
}
