---
name: sitecore-search
description: Implements Sitecore Search in Next.js with facets, URL synchronization, and SearchUrlManager singleton. Detects anti-patterns like using facetValue.text instead of .id. Use when user mentions Sitecore Search, facets not filtering, search widgets, SearchUrlManager, or URL state management.
version: 1.0.0
last_updated: 2024-12-03
source: Shriners XMCloud Next.js v15.3.1
---

# Sitecore Search Expert

Production-tested patterns for implementing Sitecore Search in Next.js with proper URL synchronization, facet handling, and anti-pattern prevention.

## When to Invoke

**Trigger keywords:**
- "Sitecore Search" (implementation, setup, configuration)
- "facets" or "filters" (not filtering, not working)
- "SearchUrlManager" (singleton, URL sync)
- "search widget" (implementation, debugging)
- "URL state" (synchronization, back button, shareability)
- "facetValue" (using .id vs .text)
- Code review for search implementations

## Quick Decision Tree

### 🚀 **Implementing from Scratch?**
→ Read `QUICK-START.md` for step-by-step setup

### 🐛 **Debugging Issues?**
- **Facets not filtering** → Read `ANTI-PATTERNS.md` #1-2
- **URL not updating** → Read `ANTI-PATTERNS.md` #3, #8
- **Back button broken** → Read `TROUBLESHOOTING.md` "Back button"
- **Results not appearing** → Read `TROUBLESHOOTING.md` "No results"
- **Any search issue** → Read `TROUBLESHOOTING.md` first

### 🔍 **Code Review?**
→ Read `ANTI-PATTERNS.md` + run `scripts/validate-search-code.sh`

### 🏗️ **Need Specific Component?**
- SearchProvider → `templates/SearchProvider.tsx`
- SearchUrlManager → `SEARCHURLMANAGER.md` + `templates/SearchUrlManager.ts`
- Basic widget → `templates/BasicSearchWidget.tsx`
- Widget with facets → `templates/SearchWithFacets.tsx`
- Custom hook → `templates/CustomSearchHook.ts`
- Load more pagination → `LOAD-MORE-PAGINATION.md`

### 📚 **Need Reference?**
→ Read `REFERENCE.md` for TypeScript interfaces and API signatures

## Critical Rules

### 1. Use `facetValue.id` NOT `.text`
```typescript
// ❌ facetValueId: facetValue.text
// ✅ facetValueId: facetValue.id
```

### 2. All 5 `onFacetClick` Parameters Required
```typescript
actions.onFacetClick({
  facetId, facetValueId, type: 'valueId', checked, facetIndex
});
```

### 3. Sync SDK → URL
```typescript
actions.onKeyphraseChange({ keyphrase: term });
if (router.isReady) await searchUrlManager.setSearchTerm(router, term);
```

## Implementation Workflow

1. **Setup** - Install packages, env vars, SearchProvider → `QUICK-START.md`
2. **SearchUrlManager** - Create singleton with queue/debounce → `SEARCHURLMANAGER.md`
3. **Basic Widget** - useSearchResults + controlled input + widget() HOC → `templates/BasicSearchWidget.tsx`
4. **Add Facets** - Extract data, render UI, use `.id`, sync URL → `FACETS.md`
5. **Pagination** - Calculate pages, handlePageChange, auto-reset verifies
6. **Validate** - Run `scripts/validate-search-code.sh`, test checklist

## Common Tasks & File References

| Task | Primary File | Supporting Files |
|------|--------------|------------------|
| Setup from scratch | `QUICK-START.md` | `templates/SearchProvider.tsx` |
| Implement URL sync | `SEARCHURLMANAGER.md` | `templates/SearchUrlManager.ts` |
| Add facets | `FACETS.md` | `templates/SearchWithFacets.tsx` |
| Debug facet issues | `ANTI-PATTERNS.md` #1-2 | `scripts/validate-search-code.sh` |
| Fix URL sync | `ANTI-PATTERNS.md` #3, #8 | `TROUBLESHOOTING.md` |
| Code review | `ANTI-PATTERNS.md` (all 10) | `scripts/validate-search-code.sh` |
| TypeScript types | `REFERENCE.md` | - |
| Custom search hook | `templates/CustomSearchHook.ts` | - |

## Anti-Pattern Quick Reference

**Run validation:** `bash scripts/validate-search-code.sh <file.tsx>`

**Top 5 bugs** (90% of issues):
1. ❌ Using `facetValue.text` instead of `.id`
2. ❌ Missing required `onFacetClick` parameters
3. ❌ Skipping URL synchronization
4. ❌ Not checking `router.isReady`
5. ❌ Client-side filtering of results

**Full list:** `ANTI-PATTERNS.md`

## SearchUrlManager Auto-Behaviors

**These methods auto-reset pagination to page 1:**
- `setSearchTerm(router, term)`
- `addFacet(router, facetId, valueId)`
- `removeFacet(router, facetId, valueId)`
- `setTab(router, tabId)`
- `clearAllFacets(router)`
- `clearAllFilters(router)`

**This method does NOT reset:**
- `setPage(router, page)` - Only updates page number

Don't manually reset pagination - SearchUrlManager handles it automatically.

## Load More / Cumulative Results Pattern

**Implementation Strategy:**
1.  **State**: Maintain `accumulatedResults` state in the widget.
2.  **Effect**: Update state in `useEffect` when `results` change.
3.  **Append**: If `offset > previousOffset`, append new results (`[...prev, ...new]`).
4.  **Reset**: If `offset === 0`, replace results (`[...new]`).
5.  **Deduplicate**: Use `new Set(prev.map(i => i.id))` to prevent duplicates.

**Critical: Preventing Infinite Loops**
When resetting to page 1 (facet change), React can cycle infinitely if not guarded.
```typescript
// ✅ Correct Guard Pattern
if (offset === 0 && previousOffsetRef.current !== 0) {
   // Only reset when GOING TO page 1 from another page
   setAccumulatedResults(results);
} else if (offset === 0 && results.length !== prevLenRef.current) {
   // Or if content changed while staying on page 1
   setAccumulatedResults(results);
}
```

**Deep Linking Support (Page > 1)**
When a user lands on `?p=3`:
1.  **Initial Load**: Set `limit = 3 * itemsPerPage` to fetch pages 1-3 at once.
2.  **Subsequent**: On next "Load More", switch back to `limit = itemsPerPage`.

**Display Component**
Use a specialized summary component that understands the difference:
-   **Standard**: "Showing 21-30 of 100"
-   **Cumulative**: "Showing 1-30 of 100" (Pass `accumulatedCount` prop)


**Facets not filtering?**
```typescript
// Check 1: Using .id?
console.log('Facet value:', facetValue.id); // Should use this

// Check 2: All 5 params?
actions.onFacetClick({
  facetId, facetValueId, type, checked, facetIndex // All present?
});

// Check 3: URL updating?
console.log('URL facets:', router.query.facets);
```

**URL not updating?**
```typescript
// Check 1: Router ready?
console.log('Router ready:', router.isReady); // Must be true

// Check 2: SearchUrlManager called?
await searchUrlManager.setSearchTerm(router, term); // After actions

// Check 3: Shallow routing?
router.push({ ... }, undefined, { shallow: true }); // Required
```

**Back button broken?**
```typescript
// Check: Syncing on URL change?
useEffect(() => {
  if (!router.isReady) return;
  searchUrlManager.syncFromUrl(router);
}, [router.query, router.isReady]); // Must listen to router.query
```

## File Organization Reference

```
~/.claude/skills/sitecore-search/
├── SKILL.md                    # This file - Start here
├── QUICK-START.md              # Step-by-step setup guide
├── SEARCHURLMANAGER.md         # URL sync implementation
├── FACETS.md                   # Facet pattern library
├── ANTI-PATTERNS.md            # 10 critical anti-patterns
├── TROUBLESHOOTING.md          # Issue → solution mappings
├── REFERENCE.md                # TypeScript interfaces & APIs
├── templates/
│   ├── SearchProvider.tsx      # Provider setup
│   ├── SearchUrlManager.ts     # Singleton implementation
│   ├── BasicSearchWidget.tsx   # Simple search widget
│   ├── SearchWithFacets.tsx    # Widget with facets
│   └── CustomSearchHook.ts     # Custom hook pattern
└── scripts/
    └── validate-search-code.sh # Anti-pattern checker
```

## Success Criteria

Implementation is correct when:
- ✅ Search returns results
- ✅ Facets filter (using `facetValue.id`)
- ✅ Pagination works and auto-resets
- ✅ URL updates on all state changes
- ✅ Browser back/forward works
- ✅ Page refresh maintains state
- ✅ Shareable URLs work
- ✅ No console errors
- ✅ No client-side filtering
- ✅ Clear filters resets all 3 layers

**Validation:** Run `scripts/validate-search-code.sh` - should pass all checks.

## Next Steps

1. **First time implementing?** → Read `QUICK-START.md`
2. **Have an issue?** → Read `TROUBLESHOOTING.md`
3. **Need code review?** → Read `ANTI-PATTERNS.md`
4. **Need a template?** → Check `templates/` directory
5. **Need reference?** → Read `REFERENCE.md`

---

**Remember:** The 3 critical rules prevent 80% of bugs. Use `facetValue.id`, include all 5 parameters, sync SDK → URL.
