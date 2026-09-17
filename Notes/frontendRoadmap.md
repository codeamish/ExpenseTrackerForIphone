# Expense Tracker iPhone Frontend Roadmap

## 1. Recommended Direction

Use **Expo + React Native + TypeScript** for the frontend instead of building a separate native Swift app initially.

Benefits:

- Native-quality iPhone UI
- Easier Android and web testing during development
- Expo modules for notifications, haptics, secure storage, and device features
- A future path to App Store deployment through EAS Build

The existing frontend already uses this stack through Expo Router and React Native.

## 2. Product Areas

### Home

- Current-month spending
- Income versus expenses
- Recent transactions
- Spending by category
- Quick Add or Import Transaction action

### Transactions

- Chronological transaction list
- Search
- Category, provider, and account filters
- Date-range filters
- Pull-to-refresh
- Transaction detail view

### Analytics

- Monthly spending trends
- Category breakdown
- Merchant summaries
- Account/card usage
- Comparison with previous months

### Import

- Paste a bank SMS
- Submit it for parsing
- Show the parsed transaction preview
- Allow corrections before saving
- Show duplicate warnings

### Settings

- Currency
- Categories
- Accounts and cards
- Notification preferences
- Privacy and data export
- Development API/server configuration

Recommended tab layout:

```text
Home | Transactions | Analytics | Settings
```

The import flow can be opened from Home with a prominent action button or a bottom sheet.

## 3. Recommended Open-Source Libraries

### Navigation and iOS-style UI

Already present in the main frontend:

- `expo-router`
- `react-native-safe-area-context`
- `react-native-screens`
- `expo-symbols`
- `expo-image`
- `react-native-reanimated`

Recommended additions:

```bash
npx expo install expo-haptics expo-blur expo-linear-gradient
npm install @shopify/flash-list @gorhom/bottom-sheet
```

Use:

- `expo-symbols` for SF Symbols where available
- `expo-haptics` for subtle interaction feedback
- `expo-blur` for translucent iOS-style surfaces
- `@shopify/flash-list` for efficient transaction lists
- `@gorhom/bottom-sheet` for filters, transaction details, and confirmations
- `expo-linear-gradient` only for restrained accents

### API and Server State

Recommended:

```bash
npm install @tanstack/react-query zod
```

Use:

- **TanStack Query** for loading, caching, refreshing, and mutations
- **Zod** for validating API responses
- Native `fetch` or `axios` for HTTP requests
- A central API client for base URLs, headers, errors, and timeouts

### Local and Secure Storage

```bash
npx expo install expo-secure-store @react-native-async-storage/async-storage expo-sqlite
```

Use:

- `expo-secure-store` for authentication tokens and sensitive configuration
- `@react-native-async-storage/async-storage` for non-sensitive preferences
- `expo-sqlite` later for offline transaction caching

Avoid storing raw SMS messages locally unless it is explicitly required. They may contain sensitive financial information.

### Charts

Choose one:

- `victory-native`
- `react-native-gifted-charts`

Start with these analytics:

- Monthly total
- Category bar chart
- Six-month spending line chart
- Top merchants

### Forms and Validation

```bash
npm install react-hook-form @hookform/resolvers zod
```

Use these for:

- Editing parsed transactions
- Adding manual transactions
- Category and account forms
- Validating amounts and dates

### Testing

Recommended tools:

- Jest
- React Native Testing Library
- MSW for mocked API responses
- Maestro or Detox for end-to-end testing

## 4. Transaction Type

The frontend should mirror the backend transaction model:

```ts
type Transaction = {
  id: number;
  raw_message: string;
  provider: string;
  instrument_type: string;
  account_last4?: string;
  transaction_type: string;
  channel?: string;
  amount: string;
  currency: string;
  merchant?: string;
  transaction_date?: string;
  reference_id?: string;
  reference_type?: string;
  category?: string;
  parser_confidence?: string;
  created_at: string;
  transaction_fingerprint?: string;
};
```

Keep monetary values as strings at the API boundary. Format them only for display to avoid JavaScript floating-point errors.

Example transaction row:

```text
Food                          -₹420.00
Swiggy · HDFC •••• 1234
Today, 8:42 PM                         >
```

Raw SMS, parser confidence, reference ID, and fingerprint belong on the transaction detail screen rather than the main list.

## 5. Suggested Frontend Structure

```text
src/
  app/
    _layout.tsx
    index.tsx
    transactions/
      index.tsx
      [id].tsx
    import.tsx
    analytics.tsx
    settings.tsx

  components/
    TransactionRow.tsx
    TransactionCard.tsx
    SpendingSummary.tsx
    CategoryBreakdown.tsx
    EmptyState.tsx
    LoadingState.tsx

  features/
    transactions/
      api.ts
      hooks.ts
      schemas.ts
      types.ts
    analytics/
      api.ts
      hooks.ts
    import/
      api.ts
      hooks.ts

  lib/
    apiClient.ts
    queryClient.ts
    currency.ts
    dates.ts

  theme/
    colors.ts
    spacing.ts
    typography.ts
```

Use feature-based folders for transaction, analytics, and import logic. Avoid placing all API calls, components, and types into large global files.

## 6. iPhone Visual Design Direction

Aim for a minimalist native iPhone aesthetic:

- Light neutral background such as `#F2F2F7`
- White grouped sections
- One strong accent color
- Large readable totals
- Compact secondary metadata
- SF-style icons
- Subtle separators instead of heavy borders
- Rounded corners around 12 to 16 points
- Dense, scannable transaction rows
- Limited use of color for income, expenses, and warnings
- Safe-area support
- Dynamic Type and accessibility support
- Sheets and native-feeling transitions

The main list should prioritize quick scanning. Detailed technical fields should appear only after opening a transaction.

## 7. Backend API Recommendations

The existing backend exposes:

- `POST /transactions/import`
- `GET /transactions`

The frontend will eventually need:

```text
GET    /transactions
GET    /transactions/:id
PATCH  /transactions/:id
DELETE /transactions/:id

GET    /transactions/summary
GET    /transactions/categories
GET    /transactions/merchants

POST   /transactions/import/preview
POST   /transactions/import
```

### Separate Preview and Save

The import flow should have two backend actions:

1. User pastes an SMS.
2. Backend parses it.
3. App displays the parsed result.
4. User confirms or edits it.
5. App saves the transaction.

The current import endpoint parses and saves in one operation. A separate preview endpoint will make correction and duplicate handling safer.

### Table Name

The schema description refers to a table called `transaction`, while the controller queries `transactions`.

Use `transactions` consistently. It is also less confusing in PostgreSQL because `transaction` relates to SQL transaction syntax.

## 8. Implementation Roadmap

### Phase 1: Foundation

- Replace the placeholder app entry point
- Create the Expo Router layout
- Add tab navigation
- Add theme tokens
- Add an API client
- Add TanStack Query
- Configure an environment-based backend URL
- Create loading, error, and empty states

### Phase 2: Transaction List

- Connect `GET /transactions`
- Display transaction rows
- Format INR amounts and dates
- Add pull-to-refresh
- Add transaction details
- Add search
- Add category filtering

### Phase 3: Import Workflow

- Add paste/import screen
- Add preview endpoint
- Display parsed fields
- Allow editing category, merchant, amount, and date
- Confirm and save the transaction
- Handle duplicate fingerprints visibly

### Phase 4: Home Dashboard

- Add current-month totals
- Add recent transactions
- Add category summary
- Add income/expense breakdown
- Add an empty state for first-time users

### Phase 5: Analytics

- Add monthly totals
- Add category charts
- Add merchant ranking
- Add date-range selection
- Add previous-month comparisons

### Phase 6: Quality and Privacy

- Add offline read cache
- Add retry handling
- Add API authentication
- Add secure storage
- Add crash reporting
- Add unit and component tests
- Test all supported bank SMS formats
- Test accessibility and Dynamic Type

## 9. First Complete Milestone

Build this vertical slice first:

```text
Home
  -> Recent transactions
  -> Import button

Import
  -> Paste SMS
  -> Preview parsed transaction
  -> Edit category
  -> Save

Transactions
  -> List saved transactions
  -> Open transaction detail
```

This proves the complete product loop before investing in charts, offline support, or advanced settings.

## 10. Initial Test Cases

1. Transactions render correctly from API data.
2. Empty and error states work.
3. INR amounts format correctly.
4. Dates display correctly for the user's locale.
5. Import preview handles parser errors.
6. A parsed transaction can be edited before saving.
7. Duplicate transactions are clearly identified.
8. Filters return the expected transactions.
9. Pull-to-refresh reloads the list.
10. Network failures provide a useful retry action.

## 11. Recommended Immediate Next Steps

1. Resolve the `transaction` versus `transactions` table naming discrepancy.
2. Add a preview-only import endpoint.
3. Create the Expo Router layout and tab navigation.
4. Add the typed API client and TanStack Query provider.
5. Implement the transaction list using real backend data.
6. Implement the import preview and confirmation flow.
7. Add transaction details and editing.
8. Add dashboard summaries and analytics after the core flow works.
