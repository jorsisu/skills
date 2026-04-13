# Troubleshooting Guide

Issue -> solution mappings for common Sitecore Search problems.

## Table of Contents

- [Quick Diagnosis](#quick-diagnosis)
- [Issue #1: Back Button Doesn't Work](#issue-1-back-button-doesnt-work)
- [Issue #2: No Results Appearing](#issue-2-no-results-appearing)
- [Issue #3: "Search configuration missing" Error](#issue-3-search-configuration-missing-error)
- [Issue #4: Widget Not Rendering](#issue-4-widget-not-rendering)
- [Issue #5: TypeScript Errors](#issue-5-typescript-errors)
- [Issue #7: API Returns Hits But UI Shows No Results Or Too Few](#issue-7-api-returns-hits-but-ui-shows-no-results-or-too-few)
- [Issue #8: Facet Counts Don't Match Visible Results](#issue-8-facet-counts-dont-match-visible-results)
- [Debugging Tools](#debugging-tools)

## Quick Diagnosis

- **Facets not working?** -> See `ANTI-PATTERNS.md` #1-2
- **URL not updating?** -> See `ANTI-PATTERNS.md` #3, #8
- **Back button broken?** -> #1 below
- **No results?** -> #2-3 below, or #7 if payload has hits
- **Widget not rendering?** -> #4 below
- **TypeScript errors?** -> #5 below
- **Clear filters incomplete?** -> See `ANTI-PATTERNS.md` #9
- **Page doesn't reset after search?** -> See `ANTI-PATTERNS.md` #7
- **Load More shows with few/no visible results?** -> #7 below
- **Facet counts don't match visible results?** -> #8 below

---

## Issue #1: Back Button Doesn't Work

**Symptoms:** Browser back/forward doesn't restore previous search. URL changes but results don't.

**Solution:** Add sync effect listening to `searchParams` from `next/navigation`:
```typescript
import { useSearchParams } from 'next/navigation';

const searchParams = useSearchParams();

useEffect(() => {
  searchUrlManager.syncFromUrl(searchParams);
}, [searchParams]);
```

`searchParams` is a reactive value in App Router — it updates automatically on back/forward navigation.

---

## Issue #2: No Results Appearing

**Symptoms:** Widget renders but results empty. No console errors.

**Diagnosis:**
```typescript
console.log('Customer key:', process.env.NEXT_PUBLIC_SEARCH_CUSTOMER_KEY);
console.log('API key exists:', !!process.env.NEXT_PUBLIC_SEARCH_API_KEY);
console.log('Query result:', queryResult.data);
```

**Solutions:**
1. **Missing env vars** — check `.env.local` has all 3 variables, restart dev server
2. **Content not indexed** — verify in Sitecore Search dashboard, trigger re-index
3. **SearchProvider missing** — ensure `<WidgetsProvider>` wraps the component tree

---

## Issue #3: "Search configuration missing" Error

**Fix:**
1. Check `.env.local` has `NEXT_PUBLIC_SEARCH_CUSTOMER_KEY`, `NEXT_PUBLIC_SEARCH_API_KEY`, `NEXT_PUBLIC_SEARCH_ENV`
2. Restart dev server after adding/changing env vars
3. Verify variable names match exactly

---

## Issue #4: Widget Not Rendering

**Symptoms:** Component doesn't appear, no errors.

**Check:**
1. `widget()` HOC wraps component export
2. `WidgetDataType.SEARCH_RESULTS` specified correctly
3. `<WidgetsProvider>` in component tree
4. `widgetRef` attached to container div

```typescript
const MyWidget = () => {
  const { widgetRef, actions, queryResult } = useSearchResults();
  return <div ref={widgetRef}>{/* content */}</div>;
};

export default widget(MyWidget, WidgetDataType.SEARCH_RESULTS, 'content');
```

---

## Issue #5: TypeScript Errors

**Symptoms:** `Property 'content' does not exist`, `Type 'unknown' is not assignable`

**Fix:**
```typescript
interface SearchItem {
  id: string;
  title?: string;
  description?: string;
  url?: string;
  [key: string]: any;
}

const results = (queryResult.data?.content as SearchItem[]) || [];
```

---

## Issue #7: API Returns Hits But UI Shows No Results Or Too Few

**Symptoms:** Search API/network payload returns results, but UI shows empty state or only a subset. This often happens when a client-side filter (e.g., `hasVisibleKeyphraseMatch`) hides the current batch, while later offsets still contain real visible hits.

**Cause:** UI treats `visibleResults.length === 0` as if backend results are exhausted. That is wrong when:
- current fetched batch is all false positives
- later offsets still contain visible matches
- `hasMore` or no-results state is tied to `visibleResults`

**Fix:** Separate visible UI state from backend exhaustion state.
```typescript
const hasMoreResults = accumulatedResults.length < totalItems;
const isAutoLoadingMore =
  !isLoading &&
  keyphrase.trim().length >= 3 &&
  visibleResults.length === 0 &&
  accumulatedResults.length > 0 &&
  hasMoreResults;

useEffect(() => {
  if (!isAutoLoadingMore) return;
  void onLoadMore();
}, [isAutoLoadingMore, onLoadMore]);

const isNoResults =
  !isLoading && !isAutoLoadingMore && visibleResults.length === 0;

<ResultsList
  results={visibleResults}
  isLoading={isLoading || isAutoLoadingMore}
  hasMore={hasMoreResults}
/>
```

**Debug check:** In DevTools Network, inspect later offsets before concluding "not indexed." A valid result can exist on page 3+ even if page 1 is fully hidden client-side.

See `ANTI-PATTERNS.md` #4 Mitigation and `LOAD-MORE-PAGINATION.md` Pitfall #6.

---

## Issue #8: Facet Counts Don't Match Visible Results

**Symptoms:** Sidebar shows "All (22), Professionals (9)..." but only 1 result is visible. Facet counts reflect API totals, not what the user sees.

**Cause:** Facet counts come from API response or `accumulatedResults`, not `visibleResults`. When client-side filtering hides results, counts become misleading.

**Fix:** When `visibleResults.length < accumulatedResults.length`, recompute facet counts from `visibleResults` and remove facets with 0 visible results. Do not reuse that visible count logic for `hasMore` or no-results exhaustion. See `ANTI-PATTERNS.md` #4 Mitigation.

---

## Debugging Tools

**Console logging:**
```typescript
console.log('Facets:', queryResult.data?.facet);
console.log('URL state:', searchUrlManager.getCurrentState());
console.log('Search term:', searchParams.get('q'));
console.log('Page:', searchParams.get('p'));
console.log('Facets param:', searchParams.get('facets'));
```

**Validation script:**
```bash
bash scripts/validate-search-code.sh src/components/MyWidget.tsx
```

**Network tab:** DevTools -> Network -> XHR -> look for Sitecore Search API calls, check status and response.

---

Most common issues are anti-patterns #1-3. See `ANTI-PATTERNS.md` for full list and fixes.
