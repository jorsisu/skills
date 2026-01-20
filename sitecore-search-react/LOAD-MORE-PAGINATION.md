# Load More Pagination (Cumulative Results)

Alternative to traditional pagination that shows cumulative results with a "Load More" button.

## When to Use

Use load more pagination when:
- **Mobile-first design** - Better UX than numbered pages on small screens
- **Infinite scroll alternative** - User-controlled loading
- **Cumulative context** - Users need to see all previous results
- **Social media patterns** - Common in feeds and listings

**Don't use when:**
- Users need to jump to specific pages
- Users need to bookmark specific page positions

## Quick Implementation

### 1. Create SearchLoadMore Component

```typescript
// src/atoms/search/components/searchLoadMore/SearchLoadMore.tsx
import { JSX, useEffect, useRef, useState } from 'react';
import { useSearchResults } from '@sitecore-search/react';
import { useRouter } from 'next/router';

export type SearchLoadMoreProps = {
  itemsPerPage?: number;
  showLoadMore?: boolean;
  loadMoreButtonLabel?: string;
  scrollOffset?: number;
};

const SearchLoadMore = ({
  itemsPerPage = 10,
  showLoadMore = true,
  loadMoreButtonLabel = 'Load More',
  scrollOffset = 120,
}: SearchLoadMoreProps): JSX.Element | null => {
  const { actions, queryResult } = useSearchResults();
  const router = useRouter();
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const previousPageRef = useRef<number>(1);
  const hasInitializedRef = useRef(false);

  const pageFromUrl = parseInt((router.query.page as string) || '1', 10);
  const currentPage = Math.max(1, pageFromUrl);
  const totalItems = queryResult.data?.total_item ?? 0;
  const currentOffset = (currentPage - 1) * itemsPerPage;
  const hasNextPage = currentOffset + itemsPerPage < totalItems;

  // Initialize SDK once
  useEffect(() => {
    if (!hasInitializedRef.current && router.isReady) {
      hasInitializedRef.current = true;
      actions.onResultsPerPageChange({ numItems: itemsPerPage });
      actions.onPageNumberChange({ page: currentPage });
    }
  }, [router.isReady, currentPage, itemsPerPage, actions]);

  // Auto-scroll to first new result after loading more
  useEffect(() => {
    if (
      currentPage > previousPageRef.current &&
      !queryResult.isLoading &&
      hasInitializedRef.current
    ) {
      const firstNewResultIndex = previousPageRef.current * itemsPerPage;
      setTimeout(() => {
        const el = document.querySelector(`[data-result-index="${firstNewResultIndex}"]`);
        if (el) {
          const top = window.scrollY + el.getBoundingClientRect().top;
          window.scrollTo({ top: top - scrollOffset, behavior: 'smooth' });
        }
        setIsLoadingMore(false);
      }, 300);
    }
    previousPageRef.current = currentPage;
  }, [currentPage, queryResult.isLoading, itemsPerPage]);

  if (!showLoadMore || !hasNextPage || totalItems === 0) return null;

  const handleLoadMore = async () => {
    if (!hasNextPage || isLoadingMore) return;

    setIsLoadingMore(true);
    const nextPage = currentPage + 1;

    // Use traditional pagination (SDK calculates offset automatically)
    actions.onPageNumberChange({ page: nextPage });

    // Update URL
    if (router.isReady) {
      await router.push(
        { pathname: router.asPath.split('?')[0], query: { ...router.query, page: nextPage.toString() } },
        undefined,
        { shallow: true, scroll: false }
      );
    }
  };

  return (
    <div className="search-load-more-container">
      <button
        type="button"
        className="button button--primary"
        onClick={handleLoadMore}
        disabled={isLoadingMore}
        aria-busy={isLoadingMore}
      >
        {isLoadingMore ? 'Loading...' : loadMoreButtonLabel}
      </button>
    </div>
  );
};

export default SearchLoadMore;
```

### 2. Add Result Accumulation in Widget

```typescript
// src/atoms/search/widgets/siteSearch/SiteSearchWidget.tsx
import { useState, useEffect, useRef } from 'react';
import { EntityModel } from '@sitecore-search/react';

const SiteSearchWidgetComponent = ({ /* props */ }) => {
  const { results, offset, /* other hook values */ } = useSiteSearchController({
    /* config */
  });

  // Accumulated results for infinite scroll
  const [accumulatedResults, setAccumulatedResults] = useState<EntityModel[]>([]);
  const previousOffsetRef = useRef<number>(0);
  const previousSearchTermRef = useRef<string>('');

  // Accumulate results as pages load
  useEffect(() => {
    const currentOffset = offset;
    const currentSearchTerm = submittedSearchTerm ?? '';

    // Reset accumulated results if search term changed
    if (currentSearchTerm !== previousSearchTermRef.current) {
      previousSearchTermRef.current = currentSearchTerm;
      previousOffsetRef.current = 0;
      setAccumulatedResults(currentSearchTerm ? results : []);
      return;
    }

    // Append new results if offset increased (pagination)
    if (currentOffset > previousOffsetRef.current && results.length > 0) {
      setAccumulatedResults((prev) => [...prev, ...results]);
      previousOffsetRef.current = currentOffset;
    }
    // Replace results if offset decreased or is same (initial load or filter change)
    else if (currentOffset <= previousOffsetRef.current) {
      setAccumulatedResults(currentSearchTerm ? results : []);
      previousOffsetRef.current = currentOffset;
    }
  }, [submittedSearchTerm, results, offset]);

  return (
    <div>
      <SiteSearchResultsListLoadMore
        itemsPerPage={itemsPerPage}
        results={accumulatedResults} {/* Use accumulated, not raw results */}
        isLoading={isLoading}
        hasResults={accumulatedResults.length > 0}
      />
    </div>
  );
};
```

### 3. Create Results List with data-result-index

```typescript
// src/atoms/search/widgets/siteSearch/SiteSearchResultsListLoadMore.tsx
import SearchLoadMore from 'atoms/search/components/searchLoadMore/SearchLoadMore';

const SiteSearchResultsListLoadMore = ({
  itemsPerPage,
  results,
  isLoading,
  hasResults,
  // ... other props
}) => {
  return (
    <div className="list__list" data-search-results-top="">
      {isLoading ? (
        <div className="list__loading">Loading...</div>
      ) : (
        <ul>
          {hasResults &&
            results.map((item, index) => (
              <li
                key={item.id ?? index}
                className="list__item"
                data-result-index={index} // CRITICAL: For scroll targeting
              >
                {/* Result content */}
              </li>
            ))}
        </ul>
      )}

      <SearchLoadMore itemsPerPage={itemsPerPage} showLoadMore={hasResults} />
    </div>
  );
};
```

## How It Works

### The Challenge

Traditional pagination replaces results:
- Page 1: Shows results 1-10
- Page 2: Shows results 11-20 (replaces previous)

We need cumulative:
- Page 1: Shows results 1-10
- Page 2: Shows results 1-20 (all previous + new)

### The Solution: Widget-Level Accumulation

**Instead of forcing SDK behavior, accumulate at widget level:**

1. **SDK uses traditional pagination:**
   ```typescript
   // Page 1: offset 0, limit 10 → results 1-10
   // Page 2: offset 10, limit 10 → results 11-20
   ```

2. **Widget accumulates by tracking offset:**
   ```typescript
   // Track previous offset to detect pagination
   if (currentOffset > previousOffset && results.length > 0) {
     // Offset increased = pagination forward
     setAccumulatedResults(prev => [...prev, ...results]); // Append
   } else {
     // Offset reset = new search/filter change
     setAccumulatedResults(results); // Replace
   }
   ```

3. **Result:**
   - SDK: Traditional pagination (offset-based)
   - Widget: Cumulative display (append on page change)
   - Simple, supports 10k+ results

## Implementation Flow

### User clicks "Load More"

1. **SearchLoadMore component:**
   ```typescript
   handleLoadMore() {
     setIsLoadingMore(true);
     const nextPage = currentPage + 1;

     // Traditional SDK pagination
     actions.onPageNumberChange({ page: nextPage }); // SDK sets offset = 10

     // Update URL
     router.push({ query: { ...query, page: '2' } });
   }
   ```

2. **SDK fetches:**
   ```
   offset: 10, limit: 10 → results 11-20
   ```

3. **Widget accumulates:**
   ```typescript
   useEffect(() => {
     const currentOffset = offset; // 10

     if (currentOffset > previousOffsetRef.current) { // 10 > 0
       // Append new results
       setAccumulatedResults(prev => [...prev, ...results]); // [1-10] + [11-20] = [1-20]
     }
   }, [offset, results]);
   ```

4. **Display:** Shows results 1-20 cumulative
5. **Scroll:** To result #11 (first new item)

### User changes filter

1. **Widget resets offset:**
   ```typescript
   actions.onFacetClick({ ... });
   // SDK resets to page 1, offset 0
   ```

2. **Widget detects offset reset:**
   ```typescript
   if (currentOffset <= previousOffsetRef.current) { // 0 <= 10
     // Replace accumulated results
     setAccumulatedResults(results); // Reset to new search results
   }
   ```

## Critical Implementation Details

### 1. Track Offset Changes, Not Page Number

```typescript
// ❌ WRONG - Page number doesn't tell you if results changed
const previousPageRef = useRef(1);

// ✅ CORRECT - Offset detects forward pagination vs reset
const previousOffsetRef = useRef(0);

if (currentOffset > previousOffsetRef.current) {
  // Forward pagination → append
} else {
  // Reset or filter change → replace
}
```

### 2. Reset on Search Term Change

```typescript
// Detect new search and reset accumulated results
if (currentSearchTerm !== previousSearchTermRef.current) {
  previousSearchTermRef.current = currentSearchTerm;
  previousOffsetRef.current = 0;
  setAccumulatedResults(currentSearchTerm ? results : []);
  return; // Skip append/replace logic
}
```

### 3. Add data-result-index to Result Items

```typescript
// CRITICAL: Without this, scroll won't work
<li data-result-index={index}>
  {/* content */}
</li>
```

### 4. Calculate First New Result Index Correctly

```typescript
// When going from page 1 to page 2:
const firstNewResultIndex = previousPage * itemsPerPage;
// previousPage = 1, itemsPerPage = 10
// firstNewResultIndex = 10 (11th result, 0-indexed)
```

## Behavior Matrix

| Action | URL | SDK Request | Accumulated Results | Display | Scroll To |
|--------|-----|-------------|---------------------|---------|-----------|
| Initial load | `?q=hospital` | offset: 0, limit: 10 | [1-10] | 1-10 | Top |
| Click "Load More" | `?q=hospital&page=2` | offset: 10, limit: 10 | [1-10] + [11-20] | 1-20 | Result #11 |
| Click "Load More" again | `?q=hospital&page=3` | offset: 20, limit: 10 | [1-20] + [21-30] | 1-30 | Result #21 |
| Change filter | `?q=hospital&facets=...` | offset: 0, limit: 10 | [1-10] (replaced) | 1-10 | Top |
| New search | `?q=doctor` | offset: 0, limit: 10 | [1-10] (replaced) | 1-10 | Top |
| Browser back | `?q=hospital&page=2` | offset: 10, limit: 10 | [1-10] + [11-20] | 1-20 | Result #11 |

## Common Pitfalls

### ❌ Pitfall 1: Not Resetting on Search Change

```typescript
// Missing search term tracking
useEffect(() => {
  if (currentOffset > previousOffsetRef.current) {
    setAccumulatedResults(prev => [...prev, ...results]);
    // BUG: Appends new search results to old search!
  }
}, [offset, results]);
```

**Fix:** Track `previousSearchTermRef` and reset accumulation on change.

### ❌ Pitfall 2: Not Handling Filter Changes

```typescript
// Only checking offset increase
if (currentOffset > previousOffsetRef.current) {
  setAccumulatedResults(prev => [...prev, ...results]);
}
// BUG: Filter change doesn't reset accumulated results
```

**Fix:** Add `else` branch to replace results when offset resets.

### ❌ Pitfall 3: Missing data-result-index

```typescript
<li> {/* Missing data-result-index */}
```

**Fix:** Add `data-result-index={index}` to each result item.

### ❌ Pitfall 4: Scrolling Too Early

```typescript
// DOM hasn't updated yet
scrollToResult(firstNewResultIndex);
```

**Fix:** Use `setTimeout(..., 300)` to wait for DOM update.

### ❌ Pitfall 5: Using Page Number Instead of Offset

```typescript
// Page number can be same while results changed
if (currentPage > previousPage) {
  setAccumulatedResults(prev => [...prev, ...results]);
}
```

**Fix:** Track `offset` from SDK, not URL page param.

## Integration with Existing Components

Works with:
- ✅ Search hooks (`useSiteSearchController`, etc.)
- ✅ Facets and filters (auto-resets accumulated results)
- ✅ Tabs (auto-resets accumulated results)
- ✅ SearchUrlManager (for search term, facets, tabs)
- ✅ Browser back/forward buttons
- ✅ Direct URL access

## Testing Checklist

- [ ] Initial page load shows first 10 results
- [ ] Click "Load More" shows cumulative results (1-20)
- [ ] URL updates to `?page=2`
- [ ] Scrolls to result #11 (first new result)
- [ ] Click "Load More" again shows 1-30 results
- [ ] Direct URL access to `?page=2` loads cumulative 1-20
- [ ] New search resets accumulated results
- [ ] Changing facets resets accumulated results
- [ ] Changing tabs resets accumulated results
- [ ] Browser back button maintains cumulative results
- [ ] No duplicate results in list

## Performance Considerations

**Pros:**
- Simple implementation
- No SDK hacks or overrides
- Works with standard pagination
- Supports 10k+ total results
- Browser-friendly (normal pagination URLs)

**Cons:**
- DOM grows with each load
- More memory usage for accumulated results
- Slightly more re-renders

**Recommendation:** Works well for most use cases. For extremely large result sets (100k+), consider virtual scrolling.

## Related Patterns

- **Traditional Pagination** - Replaces results, numbered pages
- **Infinite Scroll** - Auto-loads on scroll, no user control
- **Virtual Scrolling** - Renders only visible items, handles massive datasets

## References

- Implementation: `headapps/shriners/src/atoms/search/components/searchLoadMore/SearchLoadMore.tsx`
- Example usage: `headapps/shriners/src/atoms/search/widgets/siteSearch/SiteSearchWidget.tsx` (lines 83-111)
- Results list: `headapps/shriners/src/atoms/search/widgets/siteSearch/SiteSearchResultsListLoadMore.tsx`
- Commit: df622d51 "Update Load more search logic to support up to 10000 results"
