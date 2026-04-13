# Facets Implementation Guide

> **Text-Based Encoding**: This codebase uses `facetValueText` + `type: 'text'` for facet filtering, NOT `facetValueId` + `type: 'valueId'`. The SDK resolves text values to IDs internally. All examples below reflect this.

## Facet Data Structure

```typescript
interface Facet {
  name: string;           // Facet ID (e.g., 'category')
  type: 'valueId' | 'text';
  value: FacetValue[];
}

interface FacetValue {
  id: string;            // Internal identifier
  text: string;          // Display label — also used as the filter value in this codebase
  count: number;         // Number of results
}
```

## Critical Rules

1. **Use `facetValue.text`** for URL state and SDK filtering (`type: 'text'`). The `facetValue.id` is not used in this codebase's current encoding strategy.
2. **Clear-and-reapply strategy**: After any facet change, clear SDK filters via `actions.onClearFilters()`, re-apply keyphrase, then re-apply all remaining facets from `searchUrlManager.getCurrentState().facets`.
3. **All facet operations go through `searchUrlManager`** first (URL is source of truth), then SDK state is rebuilt from it.

## Pattern 1: Checkbox Facets (Multiple Selection)

Most common pattern. Full example — other patterns only show the differences.

```typescript
'use client';

import { useSearchResults } from '@sitecore-search/react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { searchUrlManager } from '@/atoms/search/utils/searchUrlManager';

const CategoryFacets = () => {
  const { queryResult, actions } = useSearchResults();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const categoryFacet = queryResult.data?.facet?.find(f => f.name === 'category');
  const facetValues = categoryFacet?.value || [];

  const selectedValues = useMemo(() => {
    const facetsParam = searchParams.get('facets');
    if (!facetsParam) return [];
    try {
      const params = new URLSearchParams(facetsParam);
      return Array.from(params.entries())
        .filter(([id]) => id === 'category')
        .map(([, value]) => value);
    } catch {
      return [];
    }
  }, [searchParams]);

  const handleFacetClick = async (facetValueText: string, checked: boolean) => {
    // 1. Update URL via searchUrlManager (source of truth)
    if (checked) {
      await searchUrlManager.addFacet(router, pathname, searchParams, 'category', facetValueText);
    } else {
      await searchUrlManager.removeFacet(router, pathname, searchParams, 'category', facetValueText);
    }

    // 2. Clear SDK state
    actions.onClearFilters();

    // 3. Re-apply keyphrase from URL state
    const term = searchUrlManager.getCurrentState().searchTerm || '';
    if (term) {
      actions.onKeyphraseChange({ keyphrase: term });
    }

    // 4. Re-apply all remaining facets from URL state using text-based type
    const remainingFacets = searchUrlManager.getCurrentState().facets || {};
    Object.entries(remainingFacets).forEach(([fId, textValues]) => {
      textValues.forEach((fText) => {
        actions.onFacetClick({
          facetId: fId,
          facetValueText: fText,
          checked: true,
          type: 'text',
          facetIndex: 0,
        });
      });
    });
  };

  return (
    <div className="facet-group">
      <h4>Category</h4>
      {facetValues.map((fv) => (
        <label key={fv.id}>
          <input
            type="checkbox"
            checked={selectedValues.includes(fv.text)}
            onChange={(e) => handleFacetClick(fv.text, e.target.checked)}
          />
          {fv.text} ({fv.count})
        </label>
      ))}
    </div>
  );
};
```

## Pattern 2: Radio Button Facets (Single Selection)

Same as Pattern 1 except:
- Track `selectedValue` (single string, not array) from URL
- On select: deselect previous value first (`removeFacet`), then select new (`addFacet`), then clear-and-reapply
- Use `<input type="radio">` with `checked={selectedValue === fv.text}`

## Pattern 3: Dropdown Facets

Same as Pattern 2 (single selection) except:
- Use `<select>` with `<option>` elements
- Include `<option value="">All</option>` for deselection
- `onChange` handler clears previous and sets new in one flow

## Pattern 4: Button Group Facets

Same as Pattern 1 (multi-select toggle) except:
- Use `<button>` with active class toggle
- `onClick` toggles: if selected -> deselect, else -> select

## Pattern 5: Fixed Facet Contract (Persistent Disabled Categories)

Use when Sitecore Search omits empty facets from the response, but the UI must keep specific facet categories visible in a fixed order.

```typescript
type DisplayFacet = {
  name: string;
  label: string;
  values: FacetValue[];
  isDisabled: boolean;
};

const FACET_CONFIG = [
  { name: 'category', label: 'Category' },
  { name: 'location', label: 'Location' },
  { name: 'type', label: 'Type' },
] as const;

const buildDisplayFacets = (facets: Facet[] = []): DisplayFacet[] => {
  const facetsByName = new Map(facets.map((facet) => [facet.name, facet]));

  return FACET_CONFIG.map((config) => {
    const facet = facetsByName.get(config.name);
    const values = (facet?.value || []).filter((value) => value.count > 0);

    return {
      name: config.name,
      label: config.label,
      values,
      isDisabled: values.length === 0,
    };
  });
};
```

Render with `aria-disabled` and disabled inputs for empty categories. Do NOT client-side filter results to fake the backend state.

## Helpers

### Get Selected Facet Values from URL

```typescript
const useSelectedFacetValues = (facetId: string): string[] => {
  const searchParams = useSearchParams();
  return useMemo(() => {
    const facetsParam = searchParams.get('facets');
    if (!facetsParam) return [];
    try {
      const params = new URLSearchParams(facetsParam);
      return Array.from(params.entries())
        .filter(([id]) => id === facetId)
        .map(([, value]) => value);
    } catch {
      return [];
    }
  }, [searchParams, facetId]);
};
```

### Get Facet Index

```typescript
const getFacetIndex = (facets: Facet[], facetId: string): number => {
  const index = facets.findIndex((facet) => facet.name === facetId);
  return index >= 0 ? index : 0;
};
```

## Clear All Filters

Must clear all state layers:
```typescript
const handleClearAll = async () => {
  await searchUrlManager.clearAllFilters(router, pathname, searchParams);
  // searchUrlManager callbacks handle SDK clearing, keyphrase reset, etc.
};
```

## UI Best Practices

1. Show counts: `({fv.count})`
2. Disable empty facets; use Pattern 5 if empty categories must stay visible
3. Collapse facet groups (accordion) to save space
4. Always provide "Clear all" button
5. Mobile: use drawer/modal for facets

## Complete Template

See `templates/SearchWithFacets.tsx` for full implementation.
