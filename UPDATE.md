# Update Log: cNFTs Fractionalization

## Implementation Status

- ✅ Deposit cNFT and mint fractions to depositor (see `fractionalize.rs`)
- ✅ Withdraw and burn fractions (see `fractionalize.rs`)
- ⏳ Buyback system and compensation for other mint holders (in progress)
- ⏳ Updating test to be generic: to include cNFT creation flow (in progress)

---

## Latest Devnet Test Results

**Fractionalize**

- Fractions Metadata PDA: `8j9RJsLCy9pYDvwVskeDFJ74cKpCHjGfx3kfbqGYp7UY`
- Metadata Bump: 255
- InitFractionalizationData tx: [66oBwB3uWXu1KW3bHubfrrZwPH63KctWf7r7QK2j5jwhXgyzWviRpoYu1Ms2W3b3VDn96WH9QCPZVVjEqGuSTfNA](https://solscan.io/tx/66oBwB3uWXu1KW3bHubfrrZwPH63KctWf7r7QK2j5jwhXgyzWviRpoYu1Ms2W3b3VDn96WH9QCPZVVjEqGuSTfNA?cluster=devnet)
- Fractionalize tx: [4ZhXCSGX6pqdyLKKMX24VJ6YG6GTzVUMrVfJvYXmg2CLGNAGtK2LCfJUEVWd2MZaK1ou7cv6zFz8giSiUHvZFVdb](https://solscan.io/tx/4ZhXCSGX6pqdyLKKMX24VJ6YG6GTzVUMrVfJvYXmg2CLGNAGtK2LCfJUEVWd2MZaK1ou7cv6zFz8giSiUHvZFVdb?cluster=devnet)
- Reclaim tx: [4SzDNz7ScZLFAvYnKpepVSB8zdvuUifTutJXUak3fEiPcGbtEKwcEKzhe1Wd5Pc6sQP1fXMAmYKRVCG6Wty1DNNm](https://solscan.io/tx/4SzDNz7ScZLFAvYnKpepVSB8zdvuUifTutJXUak3fEiPcGbtEKwcEKzhe1Wd5Pc6sQP1fXMAmYKRVCG6Wty1DNNm?cluster=devnet)

All tests passing on devnet:

```
  2 passing (28s)
```
