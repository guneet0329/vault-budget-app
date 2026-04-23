# 💰 Vault — Personal Budget App

A React Native Android budget app built for real personal finance tracking. No subscriptions, no cloud, everything stored locally on-device via SQLite.

## Features

### Wallets
- Create budget wallets with monthly limits (Food, Rent, Entertainment, etc.)
- **Nested wallet groups** — put WiFi, Hydro, and Phone under a Utilities group. The group total auto-sums from its members
- **Fixed vs Flexible** — Fixed wallets (Rent, Phone) never show red over-budget warnings since hitting 100% is expected
- Drag or use ↑↓ arrows to reorder wallets — order persists across restarts

### Home Screen
- **Income allocation view** — log your biweekly or monthly pay and see exactly where it goes: bills, day-to-day spending, savings, and free cash
- Income hidden by default with an inline 👁️ toggle
- Stacked colour bar showing bills / spending / savings / debt payments as a share of income

### Goals
- Set savings goals (Emergency Fund, Vacation, etc.)
- Contribute from a wallet — the deduction is tracked and reversible
- Full contribution history with delete support

### Debts
- Track money lent and borrowed
- Link a wallet to a borrowed debt — settling it auto-deducts from the wallet

### Gift Cards
- Add gift cards with balance, store, expiry date, and a note
- Record partial use, track remaining balance
- Expiry warnings when a card is within 7 days of expiring
- Home screen reminder so you never forget you have them

### Notifications
- Daily 8pm reminder to log expenses (fires once, no stacking)
- Budget alerts at 80%, 90%, and 100% for flexible wallets — sent once per month per wallet, not every app launch

### Other
- Dark and light theme
- Currency support (CAD, USD, EUR, GBP, and more)
- Custom tags on transactions
- Full transaction history with edit, delete, and wallet reassignment
- Analysis screen with spending charts
- Recurring expense engine

## Screenshots

<p align="center">
  <img width="23%" alt="Home" src="https://github.com/user-attachments/assets/ee7f71fb-2afb-4609-a133-a4ff4bae957d" />
  <img width="23%" alt="Features" src="https://github.com/user-attachments/assets/e61326ff-3ee7-4274-8c98-cdb6ca7143db" />
</p>

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native CLI (Android) |
| Database | SQLite via `@op-engineering/op-sqlite` v15 |
| Notifications | `@notifee/react-native` |
| Charts | `react-native-svg` |
| Navigation | Custom bottom tab + drawer (no React Navigation) |
| State | `useState` / `useCallback` in App.js — no Redux |

## Getting Started

```bash
# Install dependencies
npm install

# Run on Android (with device/emulator connected)
npx react-native run-android

# Build release APK
cd android && ./gradlew assembleRelease
```

The APK will be at `android/app/build/outputs/apk/release/app-release.apk`.

## Project Structure

```
src/
├── components/
│   ├── WalletCard.js       # Standalone, parent group, and child wallet cards
│   ├── EmojiPicker.js      # Shared collapsible emoji picker
│   ├── AddExpenseModal.js
│   ├── Drawer.js
│   └── ...
├── screens/
│   ├── HomeScreen.js       # Income allocation dashboard
│   ├── WalletsScreen.js    # Wallet list with nested groups
│   ├── ManageWalletsScreen.js
│   ├── GoalsScreen.js
│   ├── DebtScreen.js
│   ├── GiftCardsScreen.js
│   ├── IncomeScreen.js
│   ├── TransactionsScreen.js
│   ├── AnalysisScreen.js
│   └── ...
├── services/
│   ├── notifications.js    # Notifee budget alerts (DB-persisted dedup)
│   ├── recurring.js        # Recurring expense engine
│   └── insights.js         # Streak and analytics calculations
├── storage/
│   └── store.js            # All SQLite CRUD — single source of truth
├── theme.js                # Colors, palette, emoji list, currencies
└── ThemeContext.js         # Dark/light theme provider
```

## Notes

- Built for Android; iOS untested
- All data is local — no backend, no accounts, no analytics
- SQLite schema migrations are safe (ALTER TABLE wrapped in try/catch)

## License

[MIT](./LICENSE)
