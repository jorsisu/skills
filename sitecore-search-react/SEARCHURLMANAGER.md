# SearchUrlManager Implementation Guide

Complete guide to implementing the SearchUrlManager singleton for URL state synchronization.

## Why SearchUrlManager?

**Problem:** Search state (term, facets, pagination) exists in memory. Page refresh or sharing links loses state.

**Solution:** Singleton that syncs search state ↔ URL for shareability, browser navigation, and persistence.

## Core Responsibilities

1. **Parse URL** → Extract search state on page load
2. **Build URL** → Construct URL from current state
3. **Sync State** → Keep SDK, URL, and components in sync
4. **Auto-Reset** → Reset pagination on search/facet changes
5. **Queue Updates** → Prevent race conditions
6. **Debounce** → Optimize rapid state changes

## URL Schema

```
?q=search+term&page=2&tab=locations&facets=category%3Dnews%26type%3Darticle
```

- `q` - Search term (URL encoded)
- `page` - Page number (omitted if 1)
- `tab` - Active tab (omitted if default)
- `facets` - URLSearchParams string

## Implementation

**Full template:** `templates/SearchUrlManager.ts`

### State Interfaces

```typescript
interface SearchState {
  searchTerm?: string;
  page?: number;
  tab?: string;
  facets?: Record<string, string[]>;
}

interface SearchStateCallbacks {
  onKeyphraseChange?: ({ keyphrase }: { keyphrase: string }) => void;
  onPageNumberChange?: ({ page }: { page: number }) => void;
  onFacetClick?: (payload: {
    facetId: string;
    facetValueId: string;
    checked: boolean;
    type: 'valueId';
    facetIndex: number;
  }) => void;
  onClearFilters?: () => void;
  setSearchTerm?: (term: string) => void;
}
```

### Core Methods

**initialize(router, callbacks)**
- Parse URL into SearchState
- Store callbacks for later use
- Apply state to SDK via callbacks
- Return parsed state

**setSearchTerm(router, term)**
- Update searchTerm in state
- **Auto-reset** page to undefined
- Call onPageNumberChange({ page: 1 })
- Update URL with debouncing

**addFacet(router, facetId, valueId)**
- Add value to facets[facetId] array
- **Auto-reset** page to undefined
- Call onPageNumberChange({ page: 1 })
- Update URL immediately

**removeFacet(router, facetId, valueId)**
- Remove value from facets[facetId] array
- **Auto-reset** page to undefined
- Update URL immediately

**setPage(router, page)**
- Update page in state
- Does NOT auto-reset other state
- Update URL immediately

**syncFromUrl(router)**
- Parse current URL
- Compare to internal state
- Apply changes via callbacks if different

**clearAllFilters(router)**
- Clear searchTerm, facets, page, tab
- Reset URL to clean state

## Auto-Reset Behavior

**Methods that auto-reset pagination:**
```typescript
setSearchTerm()    // Reset to page 1
addFacet()         // Reset to page 1
removeFacet()      // Reset to page 1
setTab()           // Reset to page 1
clearAllFacets()   // Reset to page 1
clearAllFilters()  // Reset to page 1
```

**Method that does NOT reset:**
```typescript
setPage()          // Only updates page number
```

**Why?** New search = new results. Page 5 of "pediatric" isn't valid for "neurology".

## Queue System

**Problem:** Multiple async URL updates can race.

**Solution:** Promise queue ensures sequential execution.

```typescript
private urlUpdateQueue: Promise<void> = Promise.resolve();

private async updateUrl(router: NextRouter) {
  this.urlUpdateQueue = this.urlUpdateQueue.then(async () => {
    await router.push(
      { pathname: router.pathname, query },
      undefined,
      { shallow: true, scroll: false }
    );
  });

  return this.urlUpdateQueue;
}
```

## Debouncing

**Why?** Rapid typing triggers many URL updates.

**Solution:** 100ms debounce for search term changes.

```typescript
const URL_UPDATE_DEBOUNCE_MS = 100;

// Debounced for search term
await this.updateUrl(router, false); // Uses debounce

// Immediate for facets/pagination
await this.updateUrl(router, true);  // No debounce
```

## Usage Patterns

### Initialization (useEffect on mount)

```typescript
useEffect(() => {
  if (!router.isReady) return;

  const initialState = searchUrlManager.initialize(router, {
    onKeyphraseChange: ({ keyphrase }) => {
      actions.onKeyphraseChange({ keyphrase });
      setSearchTerm(keyphrase);
    },
    onPageNumberChange: ({ page }) => actions.onPageNumberChange({ page }),
    onFacetClick: (payload) => actions.onFacetClick(payload),
    setSearchTerm: (term) => setSearchTerm(term),
  });

  if (initialState.searchTerm) {
    setSearchTerm(initialState.searchTerm);
  }
}, [router.isReady]);
```

### Sync on URL Change (back/forward button)

```typescript
useEffect(() => {
  if (!router.isReady) return;
  searchUrlManager.syncFromUrl(router);
}, [router.query, router.isReady]);
```

### Search Submission

```typescript
const handleSearch = async (e: React.FormEvent) => {
  e.preventDefault();

  // 1. Update SDK
  actions.onKeyphraseChange({ keyphrase: searchTerm });

  // 2. Update URL (auto-resets page)
  if (router.isReady) {
    await searchUrlManager.setSearchTerm(router, searchTerm);
  }
};
```

### Facet Selection

```typescript
const handleFacetClick = async (facetId: string, valueId: string, checked: boolean) => {
  // 1. Update SDK
  actions.onFacetClick({
    facetId,
    facetValueId: valueId,
    type: 'valueId',
    checked,
    facetIndex: 0,
  });

  // 2. Update URL (auto-resets page)
  if (router.isReady) {
    if (checked) {
      await searchUrlManager.addFacet(router, facetId, valueId);
    } else {
      await searchUrlManager.removeFacet(router, facetId, valueId);
    }
  }
};
```

### Pagination

```typescript
const handlePageChange = async (page: number) => {
  // 1. Update SDK
  actions.onPageNumberChange({ page });

  // 2. Update URL (no auto-reset)
  if (router.isReady) {
    await searchUrlManager.setPage(router, page);
  }
};
```

## Critical Rules

### ✅ Always Check router.isReady

```typescript
if (!router.isReady) return;
await searchUrlManager.setSearchTerm(router, term);
```

### ✅ Use Shallow Routing

```typescript
router.push(
  { pathname, query },
  undefined,
  { shallow: true, scroll: false } // CRITICAL
);
```

### ✅ Initialize Once

```typescript
useEffect(() => {
  if (!router.isReady) return;
  searchUrlManager.initialize(router, callbacks);
}, [router.isReady]); // ONLY on router.isReady change
```

### ✅ Sync on URL Changes

```typescript
useEffect(() => {
  if (!router.isReady) return;
  searchUrlManager.syncFromUrl(router);
}, [router.query, router.isReady]); // Listen to query changes
```

## Common Pitfalls

### ❌ Not Checking router.isReady

```typescript
// WRONG - router.query is empty
const term = router.query.q;

// CORRECT
if (router.isReady) {
  const term = router.query.q;
}
```

### ❌ Missing Shallow Routing

```typescript
// WRONG - Full page reload
router.push({ pathname, query });

// CORRECT - No reload
router.push({ pathname, query }, undefined, { shallow: true });
```

### ❌ Manual Pagination Reset

```typescript
// WRONG - Don't manually reset
actions.onPageNumberChange({ page: 1 });
await searchUrlManager.setSearchTerm(router, term);

// CORRECT - Auto-resets
await searchUrlManager.setSearchTerm(router, term);
```

## Complete Template

See `templates/SearchUrlManager.ts` for full implementation with:
- Singleton pattern
- State interfaces
- All core methods
- Queue system
- Debouncing
- Auto-reset logic
- URL parsing/building
- State application

## Testing Checklist

- [ ] URL updates on search
- [ ] URL updates on facet changes
- [ ] URL updates on pagination
- [ ] Browser back button works
- [ ] Browser forward button works
- [ ] Page refresh maintains state
- [ ] Shared URLs work
- [ ] Pagination resets on search
- [ ] Pagination resets on facet changes
- [ ] Pagination does NOT reset on page change

---

**Key Takeaway:** SearchUrlManager is the single source of truth for URL ↔ state synchronization. Auto-resets pagination when needed, queues updates, debounces rapid changes.
