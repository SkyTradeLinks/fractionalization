# Fractionalization Protocol - Frontend Documentation

## 📁 Project Structure

```
src/
├── app/                    # Next.js 15 App Router pages
│   ├── explorer/          # Browse all vaults
│   ├── fractionalize/     # NFT fractionalization workflow
│   ├── vault/[id]/        # Individual vault details (dynamic route)
│   ├── redeem/            # Redeem fractional tokens
│   └── redemption/        # Redemption history
├── components/
│   ├── fractionalization/ # Feature-specific components
│   ├── solana/           # Solana/Wallet integration
│   └── ui/               # Reusable UI components (shadcn/ui)
├── hooks/                # Custom React Query hooks
├── mocks/                # Mock data for development
├── stores/               # Zustand state management
├── types/                # TypeScript type definitions
└── lib/                  # Utility functions
```

## 🎨 Design System

### Responsive Breakpoints
Following Tailwind's default breakpoints:
- **Mobile**: 390px - 639px (base styles)
- **Tablet**: 640px - 1023px (`sm:` and `md:` prefixes)
- **Desktop**: 1024px - 1920px (`lg:` and `xl:` prefixes)

### Theme Support
- Light/Dark mode using `next-themes`
- Theme toggle available in header
- Colors: Blue/White primary palette (SkyTrade branding)

## 🔄 Mock Data System

The frontend is built to work **independently** of the Solana program during development. All on-chain calls are wrapped in hooks that currently use mock data.

### How It Works

1. **Hooks Layer** (`src/hooks/`)
   - All blockchain interactions are abstracted into custom hooks
   - Built with `@tanstack/react-query` for caching and state management
   - Each hook has a TODO comment marking where to add real RPC calls

2. **Mock Data** (`src/mocks/`)
   - `vaults.ts` - Mock fractionalized NFT vaults
   - `nfts.ts` - Mock user NFTs for fractionalization

3. **Type Safety** (`src/types/`)
   - All data structures are strongly typed
   - No `any` types in the codebase
   - Types match the expected on-chain account structures

### Switching from Mocks to Real Data

When the Solana program is deployed to devnet:

#### Step 1: Update Hook Functions

Example with `useVaults`:

**Before (Mock):**
```typescript
const fetchVaults = async (): Promise<Vault[]> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return mockVaults;
};
```

**After (Real):**
```typescript
const fetchVaults = async (): Promise<Vault[]> => {
  const program = getProgram(); // Your Anchor program instance
  const vaultAccounts = await program.account.vault.all();
  
  return vaultAccounts.map(({ account, publicKey }) => ({
    id: publicKey.toString(),
    publicKey: publicKey.toString(),
    nftMint: account.nftMint.toString(),
    // ... map other fields
  }));
};
```

#### Step 2: Update Mutations

Example with `useFractionalize`:

**Replace mock transaction with real Anchor call:**
```typescript
const fractionalizeNFT = async (params: FractionalizeParams): Promise<string> => {
  const program = getProgram();
  const tx = await program.methods
    .fractionalize(
      params.tokenName,
      params.tokenSymbol,
      new BN(params.totalSupply)
    )
    .accounts({
      // ... your account context
    })
    .rpc();
  
  return tx;
};
```

## 🪝 Available Hooks

### Query Hooks (Data Fetching)

| Hook | Purpose | Returns |
|------|---------|---------|
| `useVaults()` | Fetch all vaults | `Vault[]` |
| `useVaultsByStatus(status)` | Filter vaults by status | `Vault[]` |
| `useVaultDetails(id)` | Get single vault details | `Vault \| null` |
| `useUserNFTs(address)` | Fetch user's NFTs | `UserNFT[]` |
| `useUserBalance(address, mint)` | Get fractional token balance | `UserBalance \| null` |

### Mutation Hooks (Transactions)

| Hook | Purpose | Parameters |
|------|---------|------------|
| `useFractionalize()` | Create fractional vault | `nftMint, tokenName, tokenSymbol, totalSupply` |
| `useRedeem()` | Redeem fractional tokens | `vaultId, amount` |
| `useReclaim()` | Reclaim NFT (vault authority) | `vaultId` |

All hooks include:
- ✅ Automatic loading states
- ✅ Error handling
- ✅ Success/error toast notifications
- ✅ Cache invalidation on mutations

## 🎯 State Management (Zustand)

### Available Stores

1. **`useFractionalizationStore`** - Fractionalization workflow state
   ```typescript
   {
     currentStep: FractionalizationStep;
     formData: Partial<FractionalizationFormData>;
     setStep: (step) => void;
     updateFormData: (data) => void;
     resetForm: () => void;
   }
   ```

2. **`useModalStore`** - Global modal management
   ```typescript
   {
     type: ModalType | null;
     data: ModalData;
     isOpen: boolean;
     openModal: (type, data?) => void;
     closeModal: () => void;
   }
   ```

3. **`useThemeStore`** - Theme state (supplementary to next-themes)
   ```typescript
   {
     isMounted: boolean;
     setMounted: (mounted) => void;
   }
   ```

## 📦 Key Dependencies

- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **Tailwind CSS 4** - Styling
- **Wallet UI** - Solana wallet adapter (@wallet-ui/react)
- **Gill** - Solana client library
- **TanStack Query** - Data fetching and caching
- **Zustand** - State management
- **Sonner** - Toast notifications
- **next-themes** - Dark mode support
- **Lucide React** - Icon library

## 🚀 Development Workflow

### Running the Dev Server
```bash
npm run dev
```
Opens on http://localhost:3000

### Building for Production
```bash
npm run build
npm start
```

### Code Quality
```bash
npm run lint        # ESLint
npm run format      # Prettier formatting
npm run format:check # Check formatting
```

## 🌐 Wallet Integration

The project uses **@wallet-ui/react** with **Gill** for Solana integration:

```typescript
import { useWallet } from '@/components/solana/solana-provider';

const { account, connected, connect, disconnect } = useWallet();
```

- `account.address` - Wallet public key
- `connected` - Connection status
- `connect()` - Trigger wallet connection
- `disconnect()` - Disconnect wallet

## 📝 Type Definitions

### Core Types

**Vault**
```typescript
interface Vault {
  id: string;
  publicKey: string;
  nftMint: string;
  nftMetadata: NFTMetadata;
  fractionalMint: string;
  totalSupply: number;
  circulatingSupply: number;
  status: VaultStatus;
  authority: string;
  createdAt: number;
  updatedAt: number;
}
```

**UserNFT**
```typescript
interface UserNFT {
  mint: string;
  name: string;
  symbol: string;
  image: string;
  uri: string;
}
```

## 🎨 UI Components

All UI components are in `src/components/ui/` following **shadcn/ui** patterns:
- `Button`, `Input`, `Label`, `Card`, `Badge`, `Dialog`, `Table`, etc.
- Fully typed with TypeScript
- Support for dark mode via CSS variables
- Accessible (ARIA compliant)

## 📱 Responsive Design Examples

All components are responsive. Examples:

```tsx
{/* Responsive Grid */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Items */}
</div>

{/* Responsive Text */}
<h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">

{/* Responsive Padding */}
<div className="px-4 sm:px-6 md:px-8">

{/* Show/Hide on Mobile */}
<div className="hidden md:block">Desktop only</div>
<div className="block md:hidden">Mobile only</div>
```

## 🔐 Type Safety

The entire codebase follows strict TypeScript practices:
- ✅ No `any` types
- ✅ Strict null checks
- ✅ All props typed
- ✅ All functions have return types
- ✅ JSDoc comments on all hooks and utilities

## 📚 Further Reading

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TanStack Query](https://tanstack.com/query/latest)
- [Zustand](https://zustand-demo.pmnd.rs/)
- [Wallet UI](https://github.com/wallet-ui/wallet-ui)
- [Gill](https://github.com/wallet-ui/gill)

---

**Note**: This frontend is production-ready UI with mock data. Once the Anchor program is deployed, simply update the hook implementations to point to real on-chain data.
