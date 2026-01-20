# Troubleshooting Guide

Issue → Solution mappings for common Sitecore Search problems.

## Quick Diagnosis

**Facets not working?** → Check #1-2 below
**URL not updating?** → Check #3-4 below
**Back button broken?** → Check #5 below
**No results?** → Check #6-7 below

---

## Issue #1: Facets Don't Filter Results

### Symptoms
- Clicking facets doesn't filter results
- Results stay the same regardless of selection
- No errors in console

### Diagnosis
```typescript
// Check 1: Using .id or .text?
console.log('Facet value:', facetValue.id); // Should see: "news", "events"
console.log('Facet value:', facetValue.text); // Should see: "News", "Events"

// Check 2: What's being passed?
actions.onFacetClick({
  facetValueId: facetValue.id  // Is this .id or .text?
});
```

### Solutions

**Solution 1: Using .text instead of .id** (90% of cases)
```typescript
// ❌ WRONG
facetValueId: facetValue.text

// ✅ FIX
facetValueId: facetValue.id
```

**Solution 2: Missing required parameters**
```typescript
// ❌ WRONG
actions.onFacetClick({ facetId, facetValueId, checked });

// ✅ FIX
actions.onFacetClick({
  facetId,
  facetValueId,
  type: 'valueId',  // Add this
  checked,
  facetIndex: 0,    // Add this
});
```

**Solution 3: Missing URL sync**
```typescript
// ❌ WRONG - Only updates SDK
actions.onFacetClick({ ... });

// ✅ FIX - Update both SDK and URL
actions.onFacetClick({ ... });
if (router.isReady) {
  await searchUrlManager.addFacet(router, facetId, valueId);
}
```

---

## Issue #2: Missing Required onFacetClick Parameters

### Symptoms
- Facet clicks don't work
- No console errors
- SDK silently ignores facet updates

### Diagnosis
```typescript
// Check: Count parameters
actions.onFacetClick({
  facetId,         // 1
  facetValueId,    // 2
  type,            // 3 - Missing?
  checked,         // 4
  facetIndex,      // 5 - Missing?
});
```

### Solution
```typescript
// Add ALL 5 required parameters
const facetIndex = queryResult.data?.facet?.findIndex(f => f.name === facetId) || 0;

actions.onFacetClick({
  facetId: 'category',
  facetValueId: facetValue.id,
  type: 'valueId',           // REQUIRED
  checked: true,
  facetIndex,                // REQUIRED
});
```

---

## Issue #3: URL Doesn't Update

### Symptoms
- Search/facets work but URL stays same
- Can't share links
- Back button doesn't work
- Page refresh loses state

### Diagnosis
```typescript
// Check 1: Router ready?
console.log('Router ready:', router.isReady);  // Must be true

// Check 2: SearchUrlManager called?
const handleSearch = async (term) => {
  actions.onKeyphraseChange({ keyphrase: term });
  // Is there a searchUrlManager call here?
};

// Check 3: Shallow routing enabled?
router.push({ ... }, undefined, { shallow: true }); // Must have shallow: true
```

### Solutions

**Solution 1: Router not ready**
```typescript
// ❌ WRONG
await searchUrlManager.setSearchTerm(router, term);

// ✅ FIX
if (router.isReady) {
  await searchUrlManager.setSearchTerm(router, term);
}
```

**Solution 2: Missing searchUrlManager call**
```typescript
// ❌ WRONG - Only SDK update
actions.onKeyphraseChange({ keyphrase: term });

// ✅ FIX - Update both
actions.onKeyphraseChange({ keyphrase: term });
if (router.isReady) {
  await searchUrlManager.setSearchTerm(router, term);
}
```

**Solution 3: Missing shallow routing**
```typescript
// ❌ WRONG - Full page reload
router.push({ pathname, query });

// ✅ FIX - Shallow routing
router.push({ pathname, query }, undefined, { shallow: true });
```

---

## Issue #4: router.query is Empty

### Symptoms
- `router.query` returns `{}`
- URL parsing fails
- Can't read search term from URL

### Diagnosis
```typescript
// Check: isReady flag
console.log('Router ready:', router.isReady);
console.log('Router query:', router.query);
```

### Solution
```typescript
// ❌ WRONG - Access query immediately
const searchTerm = router.query.q;

// ✅ FIX - Check isReady first
useEffect(() => {
  if (!router.isReady) return;

  const searchTerm = router.query.q;
  // Now safe to use
}, [router.isReady]);
```

---

## Issue #5: Back Button Doesn't Work

### Symptoms
- Browser back button doesn't restore previous search
- Forward button doesn't work
- URL changes but results don't

### Diagnosis
```typescript
// Check: Syncing on URL change?
useEffect(() => {
  // Is there searchUrlManager.syncFromUrl() here?
}, [router.query]);
```

### Solution
```typescript
// Add sync effect
useEffect(() => {
  if (!router.isReady) return;

  searchUrlManager.syncFromUrl(router);
}, [router.query, router.isReady]);
```

---

## Issue #6: No Results Appearing

### Symptoms
- Widget renders but no results
- No errors in console
- Search seems to work but results empty

### Diagnosis
```typescript
// Check 1: API credentials
console.log('Customer key:', process.env.NEXT_PUBLIC_SEARCH_CUSTOMER_KEY);
console.log('API key exists:', !!process.env.NEXT_PUBLIC_SEARCH_API_KEY);

// Check 2: Results data
console.log('Query result:', queryResult.data);
console.log('Content:', queryResult.data?.content);
console.log('Total:', queryResult.data?.total_item);

// Check 3: Network tab
// Look for API calls to Sitecore Search
// Check response status (should be 200)
```

### Solutions

**Solution 1: Missing environment variables**
```bash
# Check .env.local exists
ls -la .env.local

# Verify all 3 variables set
cat .env.local | grep SEARCH

# Restart dev server
npm run dev
```

**Solution 2: Content not indexed**
- Go to Sitecore Search dashboard
- Check content is indexed
- Verify search source is configured
- Trigger re-index if needed

**Solution 3: SearchProvider not wrapping app**
```typescript
// Check _app.tsx has SearchProvider
export default function App({ Component, pageProps }: AppProps) {
  return (
    <SearchProvider>  {/* Must wrap here */}
      <Component {...pageProps} />
    </SearchProvider>
  );
}
```

---

## Issue #7: Widget Not Rendering

### Symptoms
- Component doesn't appear
- No errors
- Page is blank where widget should be

### Diagnosis
```typescript
// Check 1: widget() HOC used?
export default widget(MyComponent, ...); // Is this present?

// Check 2: Correct widget type?
widget(Component, WidgetDataType.SEARCH_RESULTS, 'content');

// Check 3: SearchProvider in tree?
// Is <SearchProvider> wrapping the app?
```

### Solution
```typescript
// Ensure widget() HOC wraps component
const MySearchWidget = () => {
  const { widgetRef, actions, queryResult } = useSearchResults();
  return <div ref={widgetRef}>{/* content */}</div>;
};

// CRITICAL: Export with widget() wrapper
export default widget(
  MySearchWidget,
  WidgetDataType.SEARCH_RESULTS,
  'content'
);
```

---

## Issue #8: TypeScript Errors

### Symptoms
- Type errors in IDE
- `Property 'content' does not exist`
- `Type 'unknown' is not assignable`

### Solution
```typescript
// Add type definitions
interface SearchItem {
  id: string;
  title?: string;
  description?: string;
  url?: string;
  [key: string]: any;  // For dynamic Sitecore fields
}

// Use types
const results = (queryResult.data?.content as SearchItem[]) || [];
```

---

## Issue #9: Results Not Filtering

### Symptoms
- Results show all content
- Facets don't filter
- Filters appear selected but results unchanged

### Diagnosis
```typescript
// Check: Client-side filtering?
const filtered = content.filter(item => ...); // This is wrong
```

### Solution
```typescript
// ❌ WRONG - Client-side filtering
const filtered = content.filter(item => selectedFacets.includes(item.category));

// ✅ CORRECT - Let SDK filter server-side
actions.onFacetClick({ ... });  // SDK handles filtering
const items = queryResult.data?.content || [];  // Use as-is
```

---

## Issue #10: Clear Filters Doesn't Work

### Symptoms
- Clear button doesn't clear filters
- Some filters remain
- URL still has query params

### Solution
```typescript
// Must clear all 3 state layers
const handleClearFilters = async () => {
  // 1. SDK state
  actions.onClearFilters();
  actions.onKeyphraseChange({ keyphrase: '' });

  // 2. URL state
  if (router.isReady) {
    await searchUrlManager.clearAllFilters(router);
  }

  // 3. Local component state
  setSearchTerm('');
  setLocalFilters({});
};
```

---

## Issue #11: Pagination Not Working

### Symptoms
- Clicking page numbers doesn't change results
- URL doesn't update with page number
- Always shows first page

### Solution
```typescript
const handlePageChange = async (page: number) => {
  // 1. Update SDK
  actions.onPageNumberChange({ page });

  // 2. Update URL
  if (router.isReady) {
    await searchUrlManager.setPage(router, page);
  }
};
```

---

## Issue #12: Page Doesn't Reset After Search

### Symptoms
- Searching while on page 5 stays on page 5
- New search shows wrong results
- Pagination out of sync

### Solution
```typescript
// SearchUrlManager should auto-reset pagination
// If not working, check:

// 1. Using correct method?
await searchUrlManager.setSearchTerm(router, term);  // This auto-resets

// 2. Not manually setting page?
// Remove this:
actions.onPageNumberChange({ page: 1 });  // SearchUrlManager does this

// SearchUrlManager handles auto-reset for:
// - setSearchTerm()
// - addFacet()
// - removeFacet()
// - setTab()
```

---

## Debugging Tools

### Console Logging

```typescript
// Log facet structure
console.log('Facets:', queryResult.data?.facet);
queryResult.data?.facet?.forEach(f => {
  console.log(`${f.name}:`, f.value.map(v => ({ id: v.id, text: v.text })));
});

// Log URL state
console.log('URL state:', searchUrlManager.getCurrentState());

// Log router state
console.log('Router ready:', router.isReady);
console.log('Router query:', router.query);
```

### Validation Script

```bash
# Run automated checks
bash scripts/validate-search-code.sh src/components/MyWidget.tsx
```

### Network Tab

- Open browser DevTools → Network
- Filter: "XHR"
- Look for calls to Sitecore Search API
- Check request parameters
- Check response status and data

---

## Getting Help

1. **Run validation script:** `bash scripts/validate-search-code.sh`
2. **Check anti-patterns:** Read `ANTI-PATTERNS.md`
3. **Review implementation:** Read `QUICK-START.md`
4. **Check templates:** See `templates/` directory

---

**Most Common Issues:**
1. Using `facetValue.text` instead of `.id` (40%)
2. Missing `onFacetClick` parameters (25%)
3. Missing URL synchronization (20%)

Fix these 3 and you'll solve 85% of problems.
