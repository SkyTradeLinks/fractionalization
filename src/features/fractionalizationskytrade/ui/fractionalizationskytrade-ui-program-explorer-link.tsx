import { FRACTIONALIZATIONSKYTRADE_PROGRAM_ADDRESS } from '@project/anchor'
import { AppExplorerLink } from '@/components/app-explorer-link'
import { ellipsify } from '@wallet-ui/react'

export function FractionalizationskytradeUiProgramExplorerLink() {
  return <AppExplorerLink address={FRACTIONALIZATIONSKYTRADE_PROGRAM_ADDRESS} label={ellipsify(FRACTIONALIZATIONSKYTRADE_PROGRAM_ADDRESS)} />
}
