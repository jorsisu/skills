# API Reference

TypeScript interfaces, API signatures, and quick reference for Sitecore Search.

## Package Imports

```typescript
// Core SDK
import { widget, useSearchResults, PageController, WidgetsProvider } from '@sitecore-search/react';
import { WidgetDataType, Environment } from '@sitecore-search/data';

// Next.js
import { useRouter } from 'next/router';
import type { NextRouter } from 'next/router';
```

## TypeScript Interfaces

### Search State

```typescript
interface SearchState {
  searchTerm?: string;
  page?: number;
  tab?: string;
  facets?: Record<string, string[]>;
}
```

### Search Callbacks

```typescript
interface SearchStateCallbacks {
  onKeyphraseChange?: ({ keyphrase }: { keyphrase: string }) => void;
  onPageNumberChange?: ({ page }: { page: number }) => void;
  onFacetClick?: (payload: FacetClickPayload) => void;
  onRemoveFilter?: (payload: RemoveFilterPayload) => void;
  onClearFilters?: () => void;
  setSearchTerm?: (term: string) => void;
}
```

### Facet Click Payload

```typescript
interface FacetClickPayload {
  facetId: string;        // REQUIRED - Facet identifier
  facetValueId: string;   // REQUIRED - Use facetValue.id
  type: 'valueId' | 'text'; // REQUIRED - Usually 'valueId'
  checked: boolean;       // REQUIRED - true=select, false=deselect
  facetIndex: number;     // REQUIRED - Position in facets array
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
  id: string;              // Use this for facetValueId
  text: string;            // Display label
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
actions.onFacetClick({
  facetId: string,
  facetValueId: string,  // Use facetValue.id
  type: 'valueId',
  checked: boolean,
  facetIndex: number,
});

// Example
actions.onFacetClick({
  facetId: 'category',
  facetValueId: 'news',
  type: 'valueId',
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

// Or create instance
import { SearchUrlManager } from '@/atoms/search/utils/searchUrlManager';
const manager = SearchUrlManager.getInstance();
```

### Methods

#### initialize

```typescript
initialize(
  router: NextRouter,
  callbacks: SearchStateCallbacks
): SearchState;

// Example
const initialState = searchUrlManager.initialize(router, {
  onKeyphraseChange: ({ keyphrase }) => actions.onKeyphraseChange({ keyphrase }),
  onPageNumberChange: ({ page }) => actions.onPageNumberChange({ page }),
  onFacetClick: (payload) => actions.onFacetClick(payload),
});
```

#### setSearchTerm

```typescript
async setSearchTerm(
  router: NextRouter,
  term: string
): Promise<void>;

// Auto-resets pagination to page 1
await searchUrlManager.setSearchTerm(router, 'search term');
```

#### addFacet

```typescript
async addFacet(
  router: NextRouter,
  facetId: string,
  facetValueId: string
): Promise<void>;

// Auto-resets pagination to page 1
await searchUrlManager.addFacet(router, 'category', 'news');
```

#### removeFacet

```typescript
async removeFacet(
  router: NextRouter,
  facetId: string,
  facetValueId: string
): Promise<void>;

// Auto-resets pagination to page 1
await searchUrlManager.removeFacet(router, 'category', 'news');
```

#### setPage

```typescript
async setPage(
  router: NextRouter,
  page: number
): Promise<void>;

// Does NOT reset other state
await searchUrlManager.setPage(router, 2);
```

#### setTab

```typescript
async setTab(
  router: NextRouter,
  tab: string
): Promise<void>;

// Auto-resets pagination to page 1
await searchUrlManager.setTab(router, 'locations');
```

#### clearAllFacets

```typescript
async clearAllFacets(
  router: NextRouter
): Promise<void>;

// Clears facets, resets pagination
await searchUrlManager.clearAllFacets(router);
```

#### clearAllFilters

```typescript
async clearAllFilters(
  router: NextRouter
): Promise<void>;

// Clears search term, facets, tab, pagination
await searchUrlManager.clearAllFilters(router);
```

#### syncFromUrl

```typescript
syncFromUrl(router: NextRouter): void;

// Call on URL changes (back/forward button)
searchUrlManager.syncFromUrl(router);
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

const currentPage = Math.floor(offset / limit) + 1;
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
  router: NextRouter,
  facetId: string
): string[] => {
  if (!router.isReady || !router.query.facets) return [];

  try {
    const params = new URLSearchParams(router.query.facets as string);
    return Array.from(params.entries())
      .filter(([id]) => id === facetId)
      .map(([, value]) => value);
  } catch {
    return [];
  }
};

// Usage
const selectedCategories = getSelectedFacetValues(router, 'category');
```

## URL Schema

```
?q=search+term&page=2&tab=locations&facets=category%3Dnews%26type%3Darticle
```

**Parameters:**
- `q` - Search term (URL encoded)
- `page` - Page number (1-indexed, omitted if 1)
- `tab` - Active tab (omitted if default)
- `facets` - URLSearchParams string (facetId=value pairs)

**Facets encoding:**
```typescript
// State: { category: ['news', 'events'], location: ['chicago'] }
// URL: facets=category%3Dnews%26category%3Devents%26location%3Dchicago

const params = new URLSearchParams();
params.append('category', 'news');
params.append('category', 'events');
params.append('location', 'chicago');
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
- `searchUrlManager.setTab()`
- `searchUrlManager.clearAllFacets()`
- `searchUrlManager.clearAllFilters()`

**Method that does NOT reset:**
- `searchUrlManager.setPage()`

---

**Quick Links:**
- Full templates: `templates/` directory
- Implementation guide: `QUICK-START.md`
- Common issues: `TROUBLESHOOTING.md`
