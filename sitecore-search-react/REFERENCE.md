# API Reference

TypeScript interfaces, API signatures, and quick reference for Sitecore Search.

## Table of Contents

- [Package Imports](#package-imports)
- [TypeScript Interfaces](#typescript-interfaces)
- [useSearchResults Hook](#usesearchresults-hook)
- [SearchUrlManager API](#searchurlmanager-api)
- [widget() HOC](#widget-hoc)
- [PageController](#pagecontroller)
- [WidgetsProvider](#widgetsprovider)
- [Common Calculations](#common-calculations)
- [URL Schema](#url-schema)
- [Environment Variables](#environment-variables)
- [Auto-Reset Behavior](#auto-reset-behavior)

## Package Imports

```typescript
// Core SDK
import { widget, useSearchResults, PageController, WidgetsProvider } from '@sitecore-search/react';
import { WidgetDataType, Environment } from '@sitecore-search/data';

// Next.js (App Router)
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { ReadonlyURLSearchParams } from 'next/navigation';
```

## TypeScript Interfaces

### Search State

```typescript
interface SearchState {
  searchTerm?: string;
  page?: number;
  facets?: Record<string, string[]>; // facetId -> array of selected text values
}
```

### Search Callbacks

```typescript
interface SearchStateCallbacks {
  onKeyphraseChange?: ({ keyphrase }: { keyphrase: string }) => void;
  onPageNumberChange?: ({ page }: { page: number }) => void;
  onFacetClick?: (payload: FacetClickPayload) => void;
  onClearFilters?: () => void;
  onClearFacets?: () => void;
}
```

### Facet Click Payload

```typescript
interface FacetClickPayload {
  facetId: string;              // REQUIRED - Facet identifier
  facetValueText?: string;      // Text-based value (current codebase strategy)
  facetValueId?: string;        // ID-based value (for compatibility)
  type: 'text' | 'valueId';    // REQUIRED - 'text' in current codebase
  checked: boolean;             // REQUIRED - true=select, false=deselect
  facetIndex: number;           // REQUIRED - Position in facets array
}
```

### Search Item

```typescript
interface SearchItem {
  id: string;
  source_id?: string;
  type?: string;
  url?: string;
  title?: string;
  description?: string;
  image_url?: string;
  [key: string]: any;  // Dynamic Sitecore fields
}
```

### Facet Structure

```typescript
interface Facet {
  name: string;            // Facet ID
  type: 'valueId' | 'text';
  value: FacetValue[];
}

interface FacetValue {
  id: string;              // Internal identifier
  text: string;            // Display label — used as filter value in text-based strategy
  count: number;           // Number of results
}
```

### Query Result

```typescript
interface QueryResult<T = any> {
  isLoading: boolean;
  isFetching: boolean;
  data?: {
    content: T[];
    total_item: number;
    limit: number;
    offset: number;
    facet?: Facet[];
    sort?: Sort;
  };
  error?: Error;
}
```

## useSearchResults Hook

```typescript
const {
  actions,
  queryResult,
  context,
  state,
  widgetRef,
} = useSearchResults<SearchItem>();
```

### Actions API

```typescript
interface SearchActions {
  // Search term
  onKeyphraseChange(payload: { keyphrase: string }): void;

  // Pagination
  onPageNumberChange(payload: { page: number }): void;
  onResultsPerPageChange(payload: { numItems: number }): void;

  // Facets
  onFacetClick(payload: FacetClickPayload): void;
  onRemoveFilter(payload: RemoveFilterPayload): void;
  onClearFilters(): void;

  // Sorting
  onSortChange(payload: { name: string; order?: 'asc' | 'desc' }): void;

  // Items per page
  onItemClick(payload: { id: string; index: number }): void;
}
```

#### onKeyphraseChange

```typescript
actions.onKeyphraseChange({ keyphrase: string });

// Example
actions.onKeyphraseChange({ keyphrase: 'pediatric care' });
```

#### onPageNumberChange

```typescript
actions.onPageNumberChange({ page: number });

// Example
actions.onPageNumberChange({ page: 2 });
```

#### onFacetClick

```typescript
// Text-based (current codebase strategy)
actions.onFacetClick({
  facetId: string,
  facetValueText: string,  // Use facetValue.text
  type: 'text',
  checked: boolean,
  facetIndex: number,
});

// Example
actions.onFacetClick({
  facetId: 'category',
  facetValueText: 'News',
  type: 'text',
  checked: true,
  facetIndex: 0,
});
```

#### onRemoveFilter

```typescript
actions.onRemoveFilter({
  facetId: string,
  facetValueId: string,
  type: 'valueId',
  facetLabel?: string,
  valueLabel?: string,
});

// Example
actions.onRemoveFilter({
  facetId: 'category',
  facetValueId: 'news',
  type: 'valueId',
});
```

#### onClearFilters

```typescript
actions.onClearFilters();

// Clears all facets and filters
```

#### onSortChange

```typescript
actions.onSortChange({ name: string, order?: 'asc' | 'desc' });

// Example
actions.onSortChange({ name: 'date', order: 'desc' });
```

### Query Result API

```typescript
queryResult.data = {
  content: SearchItem[],     // Array of results
  total_item: number,        // Total matching items
  limit: number,             // Items per page
  offset: number,            // Starting index (0-based)
  facet?: Facet[],          // Available facets
};

// Access
const results = queryResult.data?.content || [];
const totalItems = queryResult.data?.total_item || 0;
const limit = queryResult.data?.limit || 24;
const offset = queryResult.data?.offset || 0;
```

## SearchUrlManager API

```typescript
import { searchUrlManager } from '@/atoms/search/utils/searchUrlManager';
```

Singleton instance. All mutating methods require App Router args: `router: AppRouterInstance`, `pathname: string`, `searchParams: ReadonlyURLSearchParams`.

### Methods

#### initialize

```typescript
initialize(
  searchParams: ReadonlyURLSearchParams,
  callbacks: SearchStateCallbacks
): SearchState;

// Example
const initialState = searchUrlManager.initialize(searchParams, {
  onKeyphraseChange: ({ keyphrase }) => actions.onKeyphraseChange({ keyphrase }),
  onPageNumberChange: ({ page }) => actions.onPageNumberChange({ page }),
  onFacetClick: (payload) => actions.onFacetClick(payload),
  onClearFilters: () => actions.onClearFilters(),
  onClearFacets: () => { /* clear SDK, re-apply keyphrase */ },
});
```

#### setSearchTerm

```typescript
async setSearchTerm(
  router: AppRouterInstance,
  pathname: string,
  searchParams: ReadonlyURLSearchParams,
  term: string
): Promise<void>;

// Auto-resets pagination to page 1, clears facets
await searchUrlManager.setSearchTerm(router, pathname, searchParams, 'search term');
```

#### addFacet

```typescript
async addFacet(
  router: AppRouterInstance,
  pathname: string,
  searchParams: ReadonlyURLSearchParams,
  facetId: string,
  facetValueText: string,
  options?: { allowMultiSelectWithinCategory?: boolean }
): Promise<void>;

// Auto-resets pagination to page 1
await searchUrlManager.addFacet(router, pathname, searchParams, 'category', 'News');
```

#### removeFacet

```typescript
async removeFacet(
  router: AppRouterInstance,
  pathname: string,
  searchParams: ReadonlyURLSearchParams,
  facetId: string,
  facetValueText: string
): Promise<void>;

// Auto-resets pagination to page 1
await searchUrlManager.removeFacet(router, pathname, searchParams, 'category', 'News');
```

#### setPage

```typescript
async setPage(
  router: AppRouterInstance,
  pathname: string,
  searchParams: ReadonlyURLSearchParams,
  page: number
): Promise<void>;

// Does NOT reset other state
await searchUrlManager.setPage(router, pathname, searchParams, 2);
```

#### clearFacets

```typescript
async clearFacets(
  router: AppRouterInstance,
  pathname: string,
  searchParams: ReadonlyURLSearchParams
): Promise<void>;

// Clears facets only, preserves keyphrase. Resets pagination.
await searchUrlManager.clearFacets(router, pathname, searchParams);
```

#### clearAllFilters

```typescript
async clearAllFilters(
  router: AppRouterInstance,
  pathname: string,
  searchParams: ReadonlyURLSearchParams
): Promise<void>;

// Clears search term, facets, and pagination
await searchUrlManager.clearAllFilters(router, pathname, searchParams);
```

#### syncFromUrl

```typescript
syncFromUrl(searchParams: ReadonlyURLSearchParams): void;

// Call on URL changes (back/forward button)
searchUrlManager.syncFromUrl(searchParams);
```

#### getCurrentState

```typescript
getCurrentState(): SearchState;

// Get current state
const state = searchUrlManager.getCurrentState();
```

## widget() HOC

```typescript
widget<T>(
  component: React.ComponentType<T>,
  dataType: WidgetDataType,
  rfkId: string
): React.ComponentType<T>;

// Example
export default widget(
  MySearchWidget,
  WidgetDataType.SEARCH_RESULTS,
  'content'
);
```

## PageController

```typescript
import { PageController } from '@sitecore-search/react';

const context = PageController.getContext();

// Set page context
context.setPage({
  ...context.getPage(),
  uri: window.location.pathname,
});

// Set locale
context.setLocale({
  country: 'us',
  language: 'en',
});
```

## WidgetsProvider

```typescript
import { WidgetsProvider } from '@sitecore-search/react';
import { Environment } from '@sitecore-search/data';

<WidgetsProvider
  env={process.env.NEXT_PUBLIC_SEARCH_ENV as Environment}
  customerKey={process.env.NEXT_PUBLIC_SEARCH_CUSTOMER_KEY}
  apiKey={process.env.NEXT_PUBLIC_SEARCH_API_KEY}
>
  {children}
</WidgetsProvider>
```

## Common Calculations

### Pagination

```typescript
const totalItems = queryResult.data?.total_item || 0;
const limit = queryResult.data?.limit || 24;
const offset = queryResult.data?.offset || 0;

const currentPage = parseInt(searchParams.get('p') || '1', 10);
const totalPages = Math.ceil(totalItems / limit);

const start = offset + 1;
const end = Math.min(offset + content.length, totalItems);
const summary = `Showing ${start}-${end} of ${totalItems} results`;
```

### Facet Index

```typescript
const getFacetIndex = (facets: Facet[], facetId: string): number => {
  const index = facets.findIndex((facet) => facet.name === facetId);
  return index >= 0 ? index : 0;
};

// Usage
const facetIndex = getFacetIndex(queryResult.data?.facet || [], 'category');
```

### Selected Facet Values from URL

```typescript
const getSelectedFacetValues = (
  searchParams: ReadonlyURLSearchParams,
  facetId: string
): string[] => {
  const facetsParam = searchParams.get('facets');
  if (!facetsParam) return [];

  try {
    const params = new URLSearchParams(facetsParam);
    return Array.from(params.entries())
      .filter(([id]) => id === facetId)
      .map(([, value]) => value);
  } catch {
    return [];
  }
};

// Usage
const selectedCategories = getSelectedFacetValues(searchParams, 'category');
```

## URL Schema

```
?q=search+term&p=2&facets=category%3DNews%26type%3Darticle
```

**Parameters:**
- `q` - Search term (URL encoded)
- `p` - Page number (1-indexed, omitted if 1)
- `facets` - URLSearchParams string (facetId=textValue pairs)

**Facets encoding (text-based):**
```typescript
// State: { category: ['News', 'Events'], location: ['Chicago'] }
// URL: facets=category%3DNews%26category%3DEvents%26location%3DChicago

const params = new URLSearchParams();
params.append('category', 'News');
params.append('category', 'Events');
params.append('location', 'Chicago');
const facetsString = params.toString();
```

## Environment Variables

```bash
# Required
NEXT_PUBLIC_SEARCH_CUSTOMER_KEY=your_customer_key
NEXT_PUBLIC_SEARCH_API_KEY=your_api_key
NEXT_PUBLIC_SEARCH_ENV=prod  # or staging

# Optional
NEXT_PUBLIC_SEARCH_SOURCE_ID=your_source_id
```

## Auto-Reset Behavior

**Methods that auto-reset pagination to page 1:**
- `searchUrlManager.setSearchTerm()`
- `searchUrlManager.addFacet()`
- `searchUrlManager.removeFacet()`
- `searchUrlManager.clearFacets()`
- `searchUrlManager.clearAllFilters()`

**Method that does NOT reset:**
- `searchUrlManager.setPage()`

---

**Quick Links:**
- Full templates: `templates/` directory
- Implementation guide: `QUICK-START.md`
- Common issues: `TROUBLESHOOTING.md`
