# SearchUrlManager (App Router)

Singleton that syncs search state (term, facets, pagination) with the URL for shareability, browser navigation, and persistence.

**Full implementation:** `templates/SearchUrlManager.ts`

## Table of Contents

- [URL Schema](#url-schema)
- [State Interfaces](#state-interfaces)
- [Core Methods](#core-methods)
- [Auto-Reset Behavior](#auto-reset-behavior)
- [Queue & Debounce](#queue--debounce)
- [Usage Patterns](#usage-patterns)
- [Common Pitfalls](#common-pitfalls)

## URL Schema

```
?q=search+term&p=2&facets=category%3Dnews%26type%3Darticle
```

| Param | Description | Omitted when |
|-------|-------------|-------------|
| `q` | Search term (URL encoded) | Empty |
| `p` | Page number | Page 1 |
| `facets` | Nested URLSearchParams string | No facets |

Non-search params are preserved across updates.

## State Interfaces

```typescript
interface SearchState {
  searchTerm?: string;
  page?: number;
  facets?: Record<string, string[]>; // facetId -> selected values
}

interface SearchStateCallbacks {
  onKeyphraseChange?: ({ keyphrase }: { keyphrase: string }) => void;
  onPageNumberChange?: ({ page }: { page: number }) => void;
  onFacetClick?: (payload: {
    facetId: string;
    facetValueText?: string;
    facetValueId?: string;
    checked: boolean;
    type: 'text' | 'valueId';
    facetIndex: number;
  }) => void;
  onClearFilters?: () => void;
  onClearFacets?: () => void;  // Clears facets only, preserves search term
}
```

## Core Methods

All mutating methods take `(router: AppRouterInstance, pathname: string, searchParams: ReadonlyURLSearchParams, ...)`.

| Method | Signature (after common params) | Resets page? |
|--------|--------------------------------|-------------|
| `initialize` | `(searchParams, callbacks)` | N/A |
| `syncFromUrl` | `(searchParams)` | N/A |
| `setSearchTerm` | `(..., term)` | Yes + clears facets |
| `addFacet` | `(..., facetId, value, options?)` | Yes |
| `removeFacet` | `(..., facetId, value)` | Yes |
| `setPage` | `(..., page)` | No |
| `clearAllFilters` | `(...)` | Yes (clears everything) |
| `clearFacets` | `(...)` | Yes (keeps search term) |
| `getCurrentState` | `()` | N/A |

**`initialize(searchParams, callbacks)`** — Note: takes `searchParams` directly, NOT router. Parses URL, stores callbacks, applies state via callbacks, returns parsed `SearchState`.

**`syncFromUrl(searchParams)`** — Takes `searchParams` directly. Compares URL state to internal state; applies diffs via callbacks. On facet changes, calls `onClearFacets` before re-applying.

**`addFacet(..., facetId, value, options?)`** — `options.allowMultiSelectWithinCategory` controls whether multiple values stack within the same facet category (default: single-select replaces previous value).

**`clearFacets` vs `clearAllFilters`** — `clearFacets` clears only facet selections (preserves search term). `clearAllFilters` clears everything: term, facets, and page.

## Auto-Reset Behavior

Methods that change what results are shown auto-reset pagination to page 1. New search/facet = new result set, so old page numbers are invalid.

`setSearchTerm` additionally clears all facets (state + SDK via `onClearFacets` callback).

## Queue & Debounce

- **Queue:** Promise chain ensures sequential URL updates, preventing race conditions.
- **Debounce:** `setSearchTerm` uses 100ms debounce. All other methods update immediately.

URL updates use `router.push(newUrl, { scroll: false })`.

## Usage Patterns

All hooks from `next/navigation`:

```typescript
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
```

### Initialization

```typescript
const initializedRef = useRef(false);
const router = useRouter();
const searchParams = useSearchParams();
const pathname = usePathname();

useEffect(() => {
  if (initializedRef.current) return;
  initializedRef.current = true;

  const initialState = searchUrlManager.initialize(searchParams, {
    onKeyphraseChange: ({ keyphrase }) => {
      actions.onKeyphraseChange({ keyphrase });
      setSearchTerm(keyphrase);
    },
    onPageNumberChange: ({ page }) => actions.onPageNumberChange({ page }),
    onFacetClick: (payload) => actions.onFacetClick(payload),
    onClearFacets: () => actions.onClearFilters(),
    setSearchTerm: (term) => setSearchTerm(term),
  });

  if (initialState.searchTerm) {
    setSearchTerm(initialState.searchTerm);
  }
}, []);
```

### Sync on URL Change (back/forward)

```typescript
useEffect(() => {
  searchUrlManager.syncFromUrl(searchParams);
}, [searchParams]);
```

### Search Submission

```typescript
const handleSearch = async (term: string) => {
  actions.onKeyphraseChange({ keyphrase: term });
  await searchUrlManager.setSearchTerm(router, pathname, searchParams, term);
};
```

### Facet Selection

```typescript
const handleFacetClick = async (
  facetId: string, valueText: string, checked: boolean
) => {
  actions.onFacetClick({
    facetId, facetValueText: valueText,
    type: 'text', checked, facetIndex: 0,
  });

  if (checked) {
    await searchUrlManager.addFacet(router, pathname, searchParams, facetId, valueText);
  } else {
    await searchUrlManager.removeFacet(router, pathname, searchParams, facetId, valueText);
  }
};
```

### Pagination

```typescript
const handlePageChange = async (page: number) => {
  actions.onPageNumberChange({ page });
  await searchUrlManager.setPage(router, pathname, searchParams, page);
};
```

## Common Pitfalls

**Do not use `router.isReady`** — App Router has no `isReady`. Use `initializedRef` pattern for one-time init.

**Do not pass router object to `initialize` or `syncFromUrl`** — These take `searchParams` directly.

**Do not manually reset pagination** — `setSearchTerm`, `addFacet`, `removeFacet` auto-reset. Calling `onPageNumberChange` yourself will double-fire.

**Do not use `router.push({ pathname, query }, undefined, { shallow: true })`** — That's Pages Router. App Router uses `router.push(urlString, { scroll: false })`.

**Sync effect depends on `[searchParams]`** — Not `[router.query]`. App Router provides reactive `searchParams` from `useSearchParams()`.
