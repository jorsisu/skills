---
name: sitecore-search-react
description: Implements Sitecore Search in Next.js App Router with facets, URL synchronization, and SearchUrlManager singleton. Detects anti-patterns like using facetValue.text instead of .id. Use when user mentions Sitecore Search, facets not filtering, search widgets, SearchUrlManager, URL state management, facetValue (.id vs .text), search widget implementation or debugging, back button broken, load more pagination, false no-results states, or code review for search implementations.
---

# Sitecore Search Expert

Next.js App Router patterns for Sitecore Search with `next/navigation`.

## Decision Tree

**Implementing from scratch?** Read `QUICK-START.md`

**Debugging?**
- Facets not filtering → `ANTI-PATTERNS.md` #1-2
- Facet categories disappear when empty → `FACETS.md` "Pattern 5: Fixed Facet Contract"
- URL not updating → `ANTI-PATTERNS.md` #3
- Back button broken → `TROUBLESHOOTING.md`
- Load more duplicates / wrong count → `LOAD-MORE-PAGINATION.md`
- API returns hits but UI shows none / too few → `TROUBLESHOOTING.md` #7 + `LOAD-MORE-PAGINATION.md`
- Any issue → `TROUBLESHOOTING.md` first

**Code review?** `ANTI-PATTERNS.md` + run `scripts/validate-search-code.sh`

**Need a component?**
- SearchProvider → `templates/SearchProvider.tsx`
- SearchUrlManager → `SEARCHURLMANAGER.md` + `templates/SearchUrlManager.ts`
- Basic widget → `templates/BasicSearchWidget.tsx`
- Widget with facets → `templates/SearchWithFacets.tsx`
- Custom hook → `templates/CustomSearchHook.ts`
- Load more → `LOAD-MORE-PAGINATION.md`

**Need API reference?** `REFERENCE.md`

## Critical Rules

### 1. Facet values: use `.id` for valueId type, `.text` for text type
```typescript
// Current codebase uses text-based encoding:
actions.onFacetClick({
  facetId, facetValueText: fv.text, type: 'text', checked, facetIndex
});
// If using valueId-based:
// facetValueId: fv.id, type: 'valueId'
```

### 2. All required `onFacetClick` parameters
```typescript
actions.onFacetClick({
  facetId, facetValueText, type: 'text', checked, facetIndex
});
```

### 3. Always sync SDK + URL
```typescript
actions.onKeyphraseChange({ keyphrase: term });
await searchUrlManager.setSearchTerm(router, pathname, searchParams, term);
```

### 4. Use clear-and-reapply for facet changes
After URL update, clear SDK filters and re-apply all facets from `searchUrlManager.getCurrentState()`. See `FACETS.md`.

### 5. Mixed-size load more needs explicit offset math
If `initialPageSize !== loadMorePageSize`, do not use `page * currentLimit` — see `LOAD-MORE-PAGINATION.md`.

### 6. Client-side visibility filtering must not imply backend exhaustion
If current fetched results are hidden by a client-side filter like `hasVisibleKeyphraseMatch`, do not show no-results or disable pagination until backend results are exhausted.

### 7. No conditional mount/unmount of widget sections
Use CSS `hidden` toggle, not conditional rendering, for mutually exclusive sections inside a search widget. See `ANTI-PATTERNS.md` #11.

## Implementation Workflow

1. **Setup** — packages, env vars, SearchProvider → `QUICK-START.md`
2. **SearchUrlManager** — App Router singleton with queue/debounce → `SEARCHURLMANAGER.md`
3. **Basic widget** — useSearchResults + controlled input + widget() HOC → `templates/BasicSearchWidget.tsx`
4. **Facets** — extract data, render UI, clear-and-reapply, sync URL → `FACETS.md`
5. **Pagination** — offsets, mixed-size load-more → `LOAD-MORE-PAGINATION.md`
6. **Validate** — `scripts/validate-search-code.sh`

## File Reference

| Task | Primary File | Supporting |
|------|-------------|------------|
| Setup from scratch | `QUICK-START.md` | `templates/SearchProvider.tsx` |
| URL sync | `SEARCHURLMANAGER.md` | `templates/SearchUrlManager.ts` |
| Facets | `FACETS.md` | `templates/SearchWithFacets.tsx` |
| Debug facets | `ANTI-PATTERNS.md` #1-2 | `scripts/validate-search-code.sh` |
| Debug URL | `ANTI-PATTERNS.md` #3 | `TROUBLESHOOTING.md` |
| Code review | `ANTI-PATTERNS.md` | `scripts/validate-search-code.sh` |
| TypeScript types | `REFERENCE.md` | — |
| Custom hook | `templates/CustomSearchHook.ts` | — |
| Load more | `LOAD-MORE-PAGINATION.md` | — |

## Validation

Run: `bash scripts/validate-search-code.sh <file.tsx>`

Top 5 bugs (90% of issues):
1. Using wrong facet value property for facet type
2. Missing required `onFacetClick` parameters
3. Skipping URL synchronization
4. Using Pages Router (`next/router`) instead of App Router (`next/navigation`)
5. Conditional mount/unmount of widget sections instead of CSS toggle

Full list + checklist: `ANTI-PATTERNS.md`
