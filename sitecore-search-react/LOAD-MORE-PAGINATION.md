# Load More Pagination (Cumulative Results)

## Contents
- [When to Use](#when-to-use)
- [Critical Warning: Mixed-Size Pagination](#critical-warning)
- [Same-Size Implementation](#same-size-implementation)
- [Widget-Level Accumulation](#widget-level-accumulation)
- [Mixed-Size Pagination](#mixed-size-pagination)
- [Critical Details](#critical-implementation-details)
- [Pitfalls](#common-pitfalls)
- [Testing Checklist](#testing-checklist)

## When to Use

Use load more when:
- Mobile-first design (better UX than numbered pages)
- Cumulative context needed (users need all previous results visible)

Don't use when users need to jump to specific pages or bookmark page positions.

## Critical Warning

The basic `page + itemsPerPage` pattern assumes initial page size == load more page size. If CMS config uses different sizes (e.g., initial=16, loadMore=5), raw SDK page math breaks. See [Mixed-Size Pagination](#mixed-size-pagination).

## Same-Size Implementation

### SearchLoadMore Component

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchResults } from '@sitecore-search/react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { searchUrlManager } from '@/atoms/search/utils/searchUrlManager';

type SearchLoadMoreProps = {
  itemsPerPage?: number;
  showLoadMore?: boolean;
  loadMoreButtonLabel?: string;
};

const SearchLoadMore = ({
  itemsPerPage = 10,
  showLoadMore = true,
  loadMoreButtonLabel = 'Load More',
}: SearchLoadMoreProps) => {
  const { actions, queryResult } = useSearchResults();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const pageFromUrl = parseInt(searchParams.get('p') || '1', 10);
  const currentPage = Math.max(1, pageFromUrl);
  const totalItems = queryResult.data?.total_item ?? 0;
  const currentOffset = (currentPage - 1) * itemsPerPage;
  const hasNextPage = currentOffset + itemsPerPage < totalItems;

  if (!showLoadMore || !hasNextPage || totalItems === 0) return null;

  const handleLoadMore = async () => {
    if (!hasNextPage || isLoadingMore) return;
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;

    actions.onPageNumberChange({ page: nextPage });
    await searchUrlManager.setPage(router, pathname, searchParams, nextPage);
    setIsLoadingMore(false);
  };

  return (
    <button
      type="button"
      onClick={handleLoadMore}
      disabled={isLoadingMore}
      aria-busy={isLoadingMore}
    >
      {isLoadingMore ? 'Loading...' : loadMoreButtonLabel}
    </button>
  );
};
```

### Widget-Level Accumulation

SDK uses traditional pagination (replace). Widget accumulates by tracking offset:

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';
import { EntityModel } from '@sitecore-search/react';

// Inside widget component:
const [accumulatedResults, setAccumulatedResults] = useState<EntityModel[]>([]);
const previousOffsetRef = useRef<number>(0);
const previousSearchTermRef = useRef<string>('');

useEffect(() => {
  const currentOffset = offset;
  const currentSearchTerm = submittedSearchTerm ?? '';

  // Reset on search term change
  if (currentSearchTerm !== previousSearchTermRef.current) {
    previousSearchTermRef.current = currentSearchTerm;
    previousOffsetRef.current = 0;
    setAccumulatedResults(currentSearchTerm ? results : []);
    return;
  }

  // Append on forward pagination
  if (currentOffset > previousOffsetRef.current && results.length > 0) {
    setAccumulatedResults((prev) => [...prev, ...results]);
    previousOffsetRef.current = currentOffset;
  }
  // Replace on reset (filter change, offset decrease)
  else if (currentOffset <= previousOffsetRef.current) {
    setAccumulatedResults(currentSearchTerm ? results : []);
    previousOffsetRef.current = currentOffset;
  }
}, [submittedSearchTerm, results, offset]);
```

Key: use `accumulatedResults` for display, not raw `results`.

### Results List with data-result-index

```typescript
<ul>
  {accumulatedResults.map((item, index) => (
    <li key={item.id ?? index} data-result-index={index}>
      {/* Result content */}
    </li>
  ))}
</ul>
```

`data-result-index` is required for scroll-to-new-results behavior.

## Mixed-Size Pagination

Use when `initialPageSize !== loadMorePageSize` (CMS controls sizes separately).

### URL contract

`p` represents load-more state, not backend page:
- `p=1` or absent = initial batch only
- `p=2` = initial + 1 load-more batch
- `p=3` = initial + 2 load-more batches

Example with initial=16, loadMore=5: p=1→16, p=2→21, p=3→26.

### Request math

Initial load from URL:
```typescript
const visibleCount = initialPageSize + (page - 1) * loadMorePageSize;
request.setSearchLimit(visibleCount);
request.setSearchOffset(0);
```

Subsequent clicks:
```typescript
const nextPage = currentPage + 1;
const nextOffset = initialPageSize + Math.max(0, nextPage - 2) * loadMorePageSize;
request.setSearchLimit(loadMorePageSize);
request.setSearchOffset(nextOffset);
```

### Anti-pattern

```typescript
// WRONG for mixed-size mode
actions.onResultsPerPageChange({ numItems: loadMorePageSize });
actions.onPageNumberChange({ page: currentPage + 1 });
// page 2 with limit 5 = offset 5, but next batch should start at offset 16
```

Set `limit` and `offset` directly on the request for mixed-size mode.

### Minimum test cases

- Initial render shows `initialPageSize`
- First click appends exactly `loadMorePageSize`
- `?p=2` deep link shows `initial + loadMore`
- No duplicates after repeated clicks
- Clear filters resets to initial batch
- Back/forward restores correct visible count

## Critical Implementation Details

### Track Offset, Not Page Number

```typescript
// WRONG - page number doesn't detect reset vs forward
const previousPageRef = useRef(1);

// CORRECT - offset detects forward pagination vs reset
const previousOffsetRef = useRef(0);
if (currentOffset > previousOffsetRef.current) { /* append */ }
else { /* replace */ }
```

### Reset on Search Term Change

Track `previousSearchTermRef` and reset accumulation when it changes. Without this, new search results append to old results.

### Add data-result-index

Without `data-result-index={index}` on each result item, scroll-to-new-results won't work.

## Common Pitfalls

### 1. Not resetting on search change
Missing `previousSearchTermRef` tracking → new results append to old.

### 2. Not handling filter changes
Only checking offset increase → filter change doesn't reset accumulated results. Add `else` branch to replace.

### 3. Client-side filter hides current batch

```typescript
// WRONG — empty visible page = "no results"
const isNoResults = !isLoading && visibleResults.length === 0;

// CORRECT — only no-results when backend exhausted
const hasMoreResults = accumulatedResults.length < totalItems;
const isAutoLoadingMore =
  !isLoading && visibleResults.length === 0 &&
  accumulatedResults.length > 0 && hasMoreResults;

const isNoResults = !isLoading && !isAutoLoadingMore && visibleResults.length === 0;
```

Keep `hasMore={hasMoreResults}` based on raw fetched count, not visible count. See `ANTI-PATTERNS.md` #4 Mitigation.

## Behavior Matrix

| Action | URL | Accumulated | Scroll To |
|--------|-----|-------------|-----------|
| Initial load | `?q=hospital` | [1-10] | Top |
| Load More | `?q=hospital&p=2` | [1-20] | Result #11 |
| Change filter | `?q=hospital&facets=...` | [1-10] replaced | Top |
| New search | `?q=doctor` | [1-10] replaced | Top |
| Browser back | `?q=hospital&p=2` | [1-20] | Result #11 |

## Testing Checklist

- [ ] Initial page load shows first batch
- [ ] Load More shows cumulative results
- [ ] URL updates to `?p=2`
- [ ] Client-side filter doesn't show no-results before backend exhaustion
- [ ] Scrolls to first new result
- [ ] Direct URL access loads cumulative results
- [ ] New search resets accumulated results
- [ ] Changing facets/tabs resets accumulated results
- [ ] Browser back button maintains cumulative results
- [ ] No duplicate results
