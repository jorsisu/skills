# Critical Anti-Patterns

**MUST AVOID** patterns that cause bugs in Sitecore Search implementations. Documented from real production issues.

> **These are the #1 source of bugs.** Review before coding.

## Table of Contents

1. [Using Wrong Facet Property for Your Encoding Type](#anti-pattern-1-using-wrong-facet-property-for-your-encoding-type) - VERY HIGH
2. [Missing Required onFacetClick Parameters](#anti-pattern-2-missing-required-onfacetclick-parameters) - HIGH
3. [Skipping URL Synchronization](#anti-pattern-3-skipping-url-synchronization) - HIGH
4. [Client-Side Filtering of Results](#anti-pattern-4-client-side-filtering-of-results) - MEDIUM
5. [Multiple widget() Wrappers for Same rfkId](#anti-pattern-5-multiple-widget-wrappers-for-same-rfkid) - MEDIUM
6. [Uncontrolled Search Inputs](#anti-pattern-6-uncontrolled-search-inputs) - MEDIUM
7. [Manual Pagination Reset](#anti-pattern-7-manual-pagination-reset) - LOW
8. [Using Pages Router Instead of App Router](#anti-pattern-8-using-pages-router-instead-of-app-router) - LOW
9. [Incomplete Clear Filters Implementation](#anti-pattern-9-incomplete-clear-filters-implementation) - LOW
10. [Triggering Full Navigation on Search URL Updates](#anti-pattern-10-triggering-full-navigation-on-search-url-updates) - LOW
11. [Conditional Mount/Unmount of Widget Sections](#anti-pattern-11-conditional-mountunmount-of-widget-sections) - VERY HIGH

---

## Validation

Run automated check:
```bash
bash scripts/validate-search-code.sh <your-file.tsx>
```

---

## Anti-Pattern #1: Using Wrong Facet Property for Your Encoding Type

**Bug frequency:** VERY HIGH (40% of all issues)

The codebase currently uses **text-based encoding** (`facetValueText` + `type: 'text'`). The critical rule is: match the property to your encoding type. Using `.id` with `type: 'text'` or `.text` with `type: 'valueId'` causes silent filtering failures.

### WRONG

```typescript
// Text-based encoding but passing .id
actions.onFacetClick({
  facetId: 'category',
  facetValueText: facetValue.id,  // BUG: .id doesn't match text encoding
  type: 'text',
  checked: true,
  facetIndex: 0,
});

// ID-based encoding but passing .text
actions.onFacetClick({
  facetId: 'category',
  facetValueId: facetValue.text,  // BUG: .text doesn't match valueId encoding
  type: 'valueId',
  checked: true,
  facetIndex: 0,
});
```

### CORRECT

```typescript
// Current codebase: text-based encoding
actions.onFacetClick({
  facetId: 'category',
  facetValueText: facetValue.text,  // .text for text encoding
  type: 'text',
  checked: true,
  facetIndex: 0,
});

// If using ID-based encoding (Sitecore recommended):
actions.onFacetClick({
  facetId: 'category',
  facetValueId: facetValue.id,  // .id for valueId encoding
  type: 'valueId',
  checked: true,
  facetIndex: 0,
});
```

### Why This Matters

- `facetValue.text` = Display label ("Pediatric Care")
- `facetValue.id` = API identifier ("pediatric_care")
- Mismatching property and type causes facets to **fail silently** (no error, just doesn't filter)
- The `type` field tells the SDK how to interpret the value — it must match
- See `searchUrlManager.ts` header comments for switching between encodings

### How to Fix

```typescript
const facet = queryResult.data?.facet?.find(f => f.name === 'category');
const facetValues = facet?.value || [];

// Current codebase pattern (text-based):
facetValues.map((fv) => (
  <Checkbox
    key={fv.id}
    onChange={() => onFacetClick({
      facetId: 'category',
      facetValueText: fv.text,  // Pass .text for URL + SDK
      checked: true,
    })}
  >
    {fv.text}
  </Checkbox>
));
```

### Detection

```bash
# Check for mismatched property/type combinations
grep -n "facetValueId.*\.text\|facetValueText.*\.id" file.tsx
# Should return nothing
```

---

## Anti-Pattern #2: Missing Required onFacetClick Parameters

**Bug frequency:** HIGH (25% of issues)

### WRONG

```typescript
actions.onFacetClick({
  facetId: 'category',
  facetValueText: valueText,
  checked: true,
  // Missing: type, facetIndex
});
```

### CORRECT

```typescript
actions.onFacetClick({
  facetId: 'category',
  facetValueText: valueText,
  type: 'text',       // REQUIRED
  checked: true,
  facetIndex: 0,       // REQUIRED
});
```

### Required Parameters

| Parameter | Type | Purpose | Common Value |
|-----------|------|---------|--------------|
| `facetId` | string | Facet identifier | 'category', 'location' |
| `facetValueText` | string | **Text-based** facet value | 'News', 'Chicago' |
| `facetValueId` | string | **ID-based** facet value (alternative) | 'news', 'chicago' |
| `type` | 'text' \| 'valueId' | Must match which property you use | 'text' (current codebase) |
| `checked` | boolean | Select/deselect | true/false |
| `facetIndex` | number | Position in array | 0, 1, 2... |

### Detection

```typescript
// All 5 must be present (facetValueText OR facetValueId, plus type, checked, facetIndex)
const required = ['facetId', 'type', 'checked', 'facetIndex'];
// Plus one of: facetValueText, facetValueId
```

---

## Anti-Pattern #3: Skipping URL Synchronization

**Bug frequency:** HIGH (20% of issues)

### WRONG - Only Updates SDK

```typescript
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

const handleSearch = (term: string) => {
  // Only updates Sitecore Search SDK
  actions.onKeyphraseChange({ keyphrase: term });

  // Missing URL update - can't share/bookmark results
};
```

### CORRECT - Updates Both SDK and URL

```typescript
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

const router = useRouter();
const pathname = usePathname();
const searchParams = useSearchParams();

const handleSearch = async (term: string) => {
  // 1. Update SDK
  actions.onKeyphraseChange({ keyphrase: term });

  // 2. Update URL for shareability
  await searchUrlManager.setSearchTerm(router, pathname, searchParams, term);
};
```

### Impact

**Without URL sync:**
- Users can't share search results
- Browser back button breaks
- Page refresh loses filters
- Bookmarks don't work

**With URL sync:**
- Shareable links with filters
- Browser navigation works
- State persists on refresh
- Bookmarkable searches

### Detection

```bash
# After actions.onKeyphraseChange, must have searchUrlManager call
grep -A5 "onKeyphraseChange" file.tsx | grep "searchUrlManager"
```

---

## Anti-Pattern #4: Client-Side Filtering of Results

**Bug frequency:** MEDIUM (15% of issues)

### WRONG - Manual Filtering

```typescript
const { queryResult } = useSearchResults();
const content = queryResult.data?.content || [];

// BAD: Filtering results client-side
const filteredContent = content.filter(item =>
  selectedFacets.includes(item.category)
);

return filteredContent.map(item => <ResultCard {...item} />);
```

### CORRECT - Server-Side Filtering

```typescript
const { queryResult } = useSearchResults();
const content = queryResult.data?.content || [];
const limit = queryResult.data?.limit || 24;

// GOOD: Use results exactly as returned from API
const items = content.slice(0, limit);

return items.map(item => <ResultCard {...item} />);
```

### Why This Matters

- Sitecore Search API handles filtering server-side
- `queryResult.data.content` already filtered
- Client-side filtering breaks pagination
- Client-side filtering shows wrong total counts

### Correct Pattern

```typescript
// Let SDK handle filtering via actions
actions.onFacetClick({ /* ... */ });  // API filters server-side
// Results automatically update
```

### Mitigation: When Client-Side Filtering Is Unavoidable

Sometimes client-side filtering is necessary (e.g., `hasVisibleKeyphraseMatch` hides results where the search term doesn't appear in any rendered field). When this exists, three things break:

**1. False no-results / pagination dead-end:**

```typescript
// API page 1 returns 16 items, client filter shows 0
// page 3 still contains real visible hits

// WRONG — treat current visible page as exhaustion
const isNoResults = !isLoading && visibleResults.length === 0;
hasMore={
  accumulatedResults.length < totalItems &&
  visibleResults.length >= accumulatedResults.length
}
// This can hide pagination and show empty state too early

// CORRECT — backend exhaustion stays tied to fetched/raw totals
const hasMoreResults = accumulatedResults.length < totalItems;
const isAutoLoadingMore =
  !isLoading &&
  visibleResults.length === 0 &&
  accumulatedResults.length > 0 &&
  hasMoreResults;

const isNoResults =
  !isLoading && !isAutoLoadingMore && visibleResults.length === 0;

<ResultsList
  results={visibleResults}
  isLoading={isLoading || isAutoLoadingMore}
  hasMore={hasMoreResults}
/>
```

**2. Facet counts reflect API totals, not visible results:**

```typescript
// WRONG — uses API facet counts directly
const allCount = baselineTotalItems ?? totalItems;
// Shows "All (22)" when only 1 result is visible

// CORRECT — recompute from visible results when filtering is active
const isClientFiltering = visibleResults.length < accumulatedResults.length;

const allCount = isClientFiltering
  ? visibleResults.length
  : (baselineTotalItems ?? totalItems);

// Recount facet options from visibleResults, remove facets with 0 visible
const adjustedOptions = rawFilterOptions
  .map((opt) => ({ ...opt, count: visibleCountsByType.get(opt.label) || 0 }))
  .filter((opt) => opt.count > 0);
```

**3. Debugging stops too early:**

- Wrong conclusion: "page is not indexed"
- Actual issue: current page is all false positives, later offsets contain valid hits

Check later offsets in the Sitecore Search payload before concluding the document is missing.

**Key principle:** When client-side filtering exists, use `visibleResults` for visible counts and facet display. Use backend totals/raw fetched counts for pagination exhaustion. Never infer "no results" from the current visible page alone.

### Detection

```bash
grep -n "\.filter(" file.tsx | grep "content"
# Should only filter facet UI, not results
```

---

## Anti-Pattern #5: Multiple widget() Wrappers for Same rfkId

**Bug frequency:** MEDIUM (10% of issues)

### WRONG - Multiple Instances

```typescript
// File: SearchInput.tsx
export default widget(SearchInput, WidgetDataType.SEARCH_RESULTS, 'content');

// File: SearchResults.tsx
export default widget(SearchResults, WidgetDataType.SEARCH_RESULTS, 'content');

// File: SearchPage.tsx
<SearchInput />   {/* Creates widget instance #1 */}
<SearchResults /> {/* Creates widget instance #2 - CONFLICT! */}
```

### CORRECT - Single Widget Instance

```typescript
// File: SearchWidget.tsx
const SearchWidget = () => {
  return (
    <>
      <SearchInputComponent />
      <SearchResultsComponent />
    </>
  );
};

export default widget(SearchWidget, WidgetDataType.SEARCH_RESULTS, 'content');

// File: SearchPage.tsx
<SearchWidget />  {/* Single widget instance */}
```

### Impact

Multiple widget instances cause:
- State conflicts between components
- Duplicate API calls
- Facet selections not applying
- Unpredictable behavior

### Detection

```bash
# Count widget() wrappers with same rfkId
grep -r "widget.*SEARCH_RESULTS.*content" | wc -l
# Should be 1 per search experience
```

---

## Anti-Pattern #6: Uncontrolled Search Inputs

**Bug frequency:** MEDIUM (8% of issues)

### WRONG - Immediate Search on Type

```typescript
<input
  onChange={(e) => {
    actions.onKeyphraseChange({ keyphrase: e.target.value });
  }}
  placeholder="Search..."
/>
```

### CORRECT - Controlled Input with Submit

```typescript
const [searchTerm, setSearchTerm] = useState('');

<form onSubmit={(e) => {
  e.preventDefault();
  actions.onKeyphraseChange({ keyphrase: searchTerm });
}}>
  <input
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    placeholder="Search..."
  />
  <button type="submit">Search</button>
</form>
```

### Why Submit-Only?

**Immediate search problems:**
- Typing "care" triggers searches for "c", "ca", "car", "care"
- Excessive API calls (performance/cost)
- Poor UX (results flicker while typing)
- Incomplete queries get searched

**Submit-only benefits:**
- User controls when to search
- Single API call per search
- Better performance
- Clear user intent

---

## Anti-Pattern #7: Manual Pagination Reset

**Bug frequency:** LOW (5% of issues)

### WRONG - Manual Reset

```typescript
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

const handleFacetClick = async (facetId: string, valueText: string) => {
  // Manually resetting pagination
  actions.onPageNumberChange({ page: 1 });

  actions.onFacetClick({ facetId, facetValueText: valueText, /* ... */ });
  await searchUrlManager.addFacet(router, pathname, searchParams, facetId, valueText);
};
```

### CORRECT - Automatic Reset

```typescript
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

const handleFacetClick = async (facetId: string, valueText: string) => {
  actions.onFacetClick({ facetId, facetValueText: valueText, /* ... */ });

  // SearchUrlManager auto-resets pagination
  await searchUrlManager.addFacet(router, pathname, searchParams, facetId, valueText);
};
```

### SearchUrlManager Auto-Resets

Methods that auto-reset pagination to page 1:
- `setSearchTerm(router, pathname, searchParams, term)`
- `addFacet(router, pathname, searchParams, ...)` / `removeFacet(router, pathname, searchParams, ...)`
- `clearAllFilters(router, pathname, searchParams)`
- `clearFacets(router, pathname, searchParams)`

Don't manually call `onPageNumberChange({ page: 1 })` - it's automatic.

---

## Anti-Pattern #8: Using Pages Router Instead of App Router

**Bug frequency:** LOW (3% of issues)

This codebase uses Next.js App Router. All search components must use `next/navigation`, not `next/router`.

### WRONG - Pages Router Imports and Patterns

```typescript
import { useRouter } from 'next/router';  // BUG: Pages Router

const router = useRouter();

// BUG: router.query doesn't exist in App Router
const searchTerm = router.query.q as string;

// BUG: router.isReady doesn't exist in App Router
useEffect(() => {
  if (!router.isReady) return;
  const initialState = searchUrlManager.initialize(router, callbacks);
}, [router.isReady]);

// BUG: Pages Router push signature
router.push(
  { pathname: '/search', query: { q: term } },
  undefined,
  { shallow: true }
);
```

### CORRECT - App Router Imports and Patterns

```typescript
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

const router = useRouter();
const searchParams = useSearchParams();
const pathname = usePathname();

// Read query params from useSearchParams()
const searchTerm = searchParams.get('q') || '';

// No isReady guard needed — searchParams is always available in App Router
useEffect(() => {
  const initialState = searchUrlManager.initialize(searchParams, {
    onKeyphraseChange: ({ keyphrase }) => {
      actions.onKeyphraseChange({ keyphrase });
    },
    onFacetClick: (payload) => {
      actions.onFacetClick(payload);
    },
    // ...
  });
}, [searchParams]);

// App Router push — string URL, options object
router.push(`${pathname}?q=${encodeURIComponent(term)}`, { scroll: false });
```

### Key Differences

| Pages Router | App Router |
|-------------|------------|
| `import { useRouter } from 'next/router'` | `import { useRouter, useSearchParams, usePathname } from 'next/navigation'` |
| `router.query.q` | `searchParams.get('q')` |
| `router.isReady` guard required | Always ready, no guard needed |
| `router.push(urlObj, as, { shallow: true })` | `router.push(urlString, { scroll: false })` |
| `router.pathname` | `usePathname()` |

### Why It Matters

- `next/router` is the Pages Router — it does not work in App Router components
- `router.isReady` does not exist on the App Router's `useRouter()`
- `router.query` does not exist — use `useSearchParams()` instead
- `searchUrlManager` methods accept `(router, pathname, searchParams, ...)` — all three are separate hooks

### Detection

```bash
# Should return nothing in search components
grep -rn "from 'next/router'\|from \"next/router\"" src/
grep -rn "router\.isReady\|router\.query" src/
```

---

## Anti-Pattern #9: Incomplete Clear Filters Implementation

**Bug frequency:** LOW (2% of issues)

### WRONG - Only Clears Local State

```typescript
const handleClearFilters = () => {
  setLocalFilters({});  // Only clears component state
};
```

### CORRECT - Clear All Layers

```typescript
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

const handleClearFilters = async () => {
  // 1. Clear SDK state (handled by searchUrlManager callback)
  // 2. Clear URL state
  await searchUrlManager.clearAllFilters(router, pathname, searchParams);

  // 3. Clear local UI state
  setSearchTerm('');
  setLocalFilters({});
};
```

### Three Layers of State

1. **Sitecore Search SDK** - via `actions.onClearFilters()`
2. **URL** - via `searchUrlManager.clearAllFilters(router, pathname, searchParams)`
3. **Local Components** - via local React state setters

All three MUST be cleared for complete reset. The `searchUrlManager.clearAllFilters` callback triggers SDK clearing automatically (see `useSiteSearch` initialization).

---

## Anti-Pattern #10: Triggering Full Navigation on Search URL Updates

**Bug frequency:** LOW (2% of issues)

### WRONG - Full Page Navigation

```typescript
import { useRouter } from 'next/navigation';

// Forces server-side re-render and scroll to top
router.push(`${pathname}?q=${searchTerm}`);
```

### CORRECT - Client Navigation Without Scroll

```typescript
import { useRouter } from 'next/navigation';

// App Router client navigation is already "shallow" by default
// (no server re-fetch for same route). Just disable scroll reset.
router.push(`${pathname}?q=${searchTerm}`, { scroll: false });
```

### Why This Matters

In App Router, `router.push` for the same route segment is already a client-side transition (no `shallow: true` needed like Pages Router). The key is passing `{ scroll: false }` to prevent scroll-to-top on every filter/search change.

**Without `{ scroll: false }`:**
- Page scrolls to top on every filter change
- Jarring UX, user loses their place

**With `{ scroll: false }`:**
- No scroll reset
- Smooth filter/search experience
- Component state preserved

### How SearchUrlManager Handles This

The `searchUrlManager.updateUrl()` method already uses `router.push(newUrl, { scroll: false })` internally. If you bypass the manager and call `router.push` directly, always include `{ scroll: false }`.

---

## Anti-Pattern #11: Conditional Mount/Unmount of Widget Sections

**Bug frequency:** VERY HIGH (causes cascading issues)

### WRONG - Conditional Rendering (Mount/Unmount)

```typescript
const showLatestArticles = !hasSearchTerm && !hasActiveFacets;

return (
  <div>
    {showLatestArticles && (
      <div id="portal-target" />  {/* Mounts/unmounts */}
    )}
    {!showLatestArticles && (
      <div>
        <SearchResults />          {/* Mounts/unmounts */}
      </div>
    )}
  </div>
);
```

### CORRECT - CSS Toggle (Always Mounted)

```typescript
const showLatestArticles = !hasSearchTerm && !hasActiveFacets;

return (
  <div>
    <div className={showLatestArticles ? "" : "hidden"}>
      <div id="portal-target" />  {/* Always in DOM */}
    </div>
    <div className={showLatestArticles ? "hidden" : ""}>
      <SearchResults />            {/* Always in DOM */}
    </div>
  </div>
);
```

### Why This Matters

Conditional mount/unmount of sections inside a search widget causes:
- **MutationObserver thrashing** — portals watching for DOM targets fire repeatedly
- **Widget state loss** — Sitecore Search SDK re-initializes on remount, losing accumulated results, facet selections, and pagination
- **Fresh API calls every cycle** — each mount triggers a new search request, even when returning to a previously loaded state (e.g., clearing search -> articles reappear with a loading flash)

### Use `hidden` Not `invisible`

- `hidden` (`display:none`) — removes from layout flow, no blank space
- `invisible` (`visibility:hidden`) — element still takes up space
- When two sections occupy the same visual slot, use `hidden` so only the active one takes space

### When This Applies

Any time two mutually exclusive sections share a visual slot inside a search widget:
- Portal targets for nested widgets (e.g., LatestArticles inside ProfessionalsSearch)
- Default content vs. search results
- Empty states vs. loaded states that contain widget context

### Detection

```bash
# Look for conditional rendering of portal targets or result sections
grep -n "&&.*portal\|&&.*results\|&&.*<div.*id=" file.tsx
# Should use className with hidden instead
```

---

## Quick Reference: Code Review Checklist

Before pushing code, verify:

- [ ] Facet property matches encoding type (`.text` for `type: 'text'`, `.id` for `type: 'valueId'`) (#1)
- [ ] All required `onFacetClick` parameters present (`facetId`, value, `type`, `checked`, `facetIndex`) (#2)
- [ ] URL updates after SDK updates via `searchUrlManager` (#3)
- [ ] NO client-side filtering of `content` (#4)
- [ ] Single `widget()` wrapper per search (#5)
- [ ] Controlled inputs with form submission (#6)
- [ ] NO manual pagination resets (#7)
- [ ] Using `next/navigation` NOT `next/router`; no `router.isReady` or `router.query` (#8)
- [ ] `clearAllFilters` clears all 3 state layers (#9)
- [ ] `{ scroll: false }` on all search URL updates (#10)
- [ ] NO conditional mount/unmount of widget sections — use CSS `hidden` toggle (#11)

## Automated Validation

Run the validation script:
```bash
bash scripts/validate-search-code.sh src/components/search/MyWidget.tsx
```

**Output example:**
```
OK  No mismatched facet property/type
OK  All onFacetClick calls have required parameters
OK  URL sync after SDK updates
OK  No client-side filtering of content
OK  Single widget() wrapper
WARN  Uncontrolled input detected (line 45)
OK  No manual pagination resets
OK  No Pages Router imports (next/router, router.isReady, router.query)
OK  Clear filters implementation complete
OK  scroll: false on router.push calls

Score: 9/10 - Review warnings before deploying
```

---

**Remember:** Top 3 anti-patterns (#1, #2, #3) account for 85% of bugs. Focus on those first.
