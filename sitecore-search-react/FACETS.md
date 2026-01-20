# Facets Implementation Guide

Complete pattern library for implementing facets (filters) in Sitecore Search widgets.

## What Are Facets?

**Facets** = Filterable attributes that narrow search results. Appear as checkboxes, dropdowns, or buttons.

**Common examples:**
- Category (News, Events, Articles)
- Location (Chicago, Portland, Philadelphia)
- Type (Video, Podcast, Blog Post)
- Date Range (Last Week, Last Month)

## Facet Data Structure

```typescript
interface Facet {
  name: string;           // Facet ID (e.g., 'category')
  type: 'valueId' | 'text';
  value: FacetValue[];
}

interface FacetValue {
  id: string;            // USE THIS for facetValueId
  text: string;          // Display label
  count: number;         // Number of results
}
```

**Example from API:**
```json
{
  "facet": [
    {
      "name": "category",
      "type": "valueId",
      "value": [
        { "id": "news", "text": "News", "count": 42 },
        { "id": "events", "text": "Events", "count": 18 }
      ]
    }
  ]
}
```

## Critical Rules

### Rule #1: Use facetValue.id NOT .text

```typescript
// ❌ WRONG
facetValueId: facetValue.text

// ✅ CORRECT
facetValueId: facetValue.id
```

### Rule #2: All 5 Parameters Required

```typescript
actions.onFacetClick({
  facetId: string,        // REQUIRED
  facetValueId: string,   // REQUIRED - Use .id
  type: 'valueId',        // REQUIRED
  checked: boolean,       // REQUIRED
  facetIndex: number,     // REQUIRED
});
```

### Rule #3: Sync SDK + URL

```typescript
// 1. Update SDK
actions.onFacetClick({ ... });

// 2. Update URL
if (router.isReady) {
  await searchUrlManager.addFacet(router, facetId, valueId);
}
```

## Pattern 1: Checkbox Facets (Multiple Selection)

**Most common pattern** - multiple selections allowed.

```typescript
const CategoryFacets = () => {
  const { queryResult, actions } = useSearchResults();
  const router = useRouter();

  const categoryFacet = queryResult.data?.facet?.find(f => f.name === 'category');
  const facetValues = categoryFacet?.value || [];

  // Get selected values from URL
  const selectedValues = useMemo(() => {
    if (!router.isReady || !router.query.facets) return [];
    const params = new URLSearchParams(router.query.facets as string);
    return Array.from(params.entries())
      .filter(([id]) => id === 'category')
      .map(([, value]) => value);
  }, [router.query.facets, router.isReady]);

  const handleFacetClick = async (facetValueId: string, checked: boolean) => {
    const facetIndex = queryResult.data?.facet?.findIndex(f => f.name === 'category') || 0;

    // 1. Update SDK
    actions.onFacetClick({
      facetId: 'category',
      facetValueId,  // Use .id
      type: 'valueId',
      checked,
      facetIndex,
    });

    // 2. Update URL
    if (router.isReady) {
      if (checked) {
        await searchUrlManager.addFacet(router, 'category', facetValueId);
      } else {
        await searchUrlManager.removeFacet(router, 'category', facetValueId);
      }
    }
  };

  return (
    <div className="facet-group">
      <h4>Category</h4>
      {facetValues.map((fv) => {
        const isSelected = selectedValues.includes(fv.id);

        return (
          <label key={fv.id}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => handleFacetClick(fv.id, e.target.checked)}
            />
            {fv.text} ({fv.count})
          </label>
        );
      })}
    </div>
  );
};
```

## Pattern 2: Radio Button Facets (Single Selection)

**Single selection only** - deselect others when selecting new.

```typescript
const TypeFacets = () => {
  const { queryResult, actions } = useSearchResults();
  const router = useRouter();

  const typeFacet = queryResult.data?.facet?.find(f => f.name === 'type');
  const facetValues = typeFacet?.value || [];

  const selectedValue = useMemo(() => {
    if (!router.isReady || !router.query.facets) return null;
    const params = new URLSearchParams(router.query.facets as string);
    const values = Array.from(params.entries())
      .filter(([id]) => id === 'type')
      .map(([, value]) => value);
    return values[0] || null;
  }, [router.query.facets, router.isReady]);

  const handleSelect = async (facetValueId: string) => {
    const facetIndex = queryResult.data?.facet?.findIndex(f => f.name === 'type') || 0;

    // Deselect current if different
    if (selectedValue && selectedValue !== facetValueId) {
      actions.onFacetClick({
        facetId: 'type',
        facetValueId: selectedValue,
        type: 'valueId',
        checked: false,
        facetIndex,
      });
      if (router.isReady) {
        await searchUrlManager.removeFacet(router, 'type', selectedValue);
      }
    }

    // Select new
    actions.onFacetClick({
      facetId: 'type',
      facetValueId,
      type: 'valueId',
      checked: true,
      facetIndex,
    });

    if (router.isReady) {
      await searchUrlManager.addFacet(router, 'type', facetValueId);
    }
  };

  return (
    <div className="facet-group">
      <h4>Type</h4>
      {facetValues.map((fv) => (
        <label key={fv.id}>
          <input
            type="radio"
            name="type"
            checked={selectedValue === fv.id}
            onChange={() => handleSelect(fv.id)}
          />
          {fv.text} ({fv.count})
        </label>
      ))}
    </div>
  );
};
```

## Pattern 3: Dropdown Facets

**Good for many options** - saves vertical space.

```typescript
const LocationDropdown = () => {
  const { queryResult, actions } = useSearchResults();
  const router = useRouter();

  const locationFacet = queryResult.data?.facet?.find(f => f.name === 'location');
  const facetValues = locationFacet?.value || [];

  const selectedValue = useMemo(() => {
    if (!router.isReady || !router.query.facets) return '';
    const params = new URLSearchParams(router.query.facets as string);
    const values = Array.from(params.entries())
      .filter(([id]) => id === 'location')
      .map(([, value]) => value);
    return values[0] || '';
  }, [router.query.facets, router.isReady]);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    const facetIndex = queryResult.data?.facet?.findIndex(f => f.name === 'location') || 0;

    // Clear previous
    if (selectedValue) {
      actions.onFacetClick({
        facetId: 'location',
        facetValueId: selectedValue,
        type: 'valueId',
        checked: false,
        facetIndex,
      });
      if (router.isReady) {
        await searchUrlManager.removeFacet(router, 'location', selectedValue);
      }
    }

    // Set new
    if (newValue) {
      actions.onFacetClick({
        facetId: 'location',
        facetValueId: newValue,
        type: 'valueId',
        checked: true,
        facetIndex,
      });
      if (router.isReady) {
        await searchUrlManager.addFacet(router, 'location', newValue);
      }
    }
  };

  return (
    <div className="facet-group">
      <label htmlFor="location">Location</label>
      <select id="location" value={selectedValue} onChange={handleChange}>
        <option value="">All Locations</option>
        {facetValues.map((fv) => (
          <option key={fv.id} value={fv.id}>
            {fv.text} ({fv.count})
          </option>
        ))}
      </select>
    </div>
  );
};
```

## Pattern 4: Button Group Facets

**Visual alternative** - good for 3-5 options.

```typescript
const ContentTypeButtons = () => {
  const { queryResult, actions } = useSearchResults();
  const router = useRouter();

  const typeFacet = queryResult.data?.facet?.find(f => f.name === 'content_type');
  const facetValues = typeFacet?.value || [];

  const selectedValues = useMemo(() => {
    if (!router.isReady || !router.query.facets) return [];
    const params = new URLSearchParams(router.query.facets as string);
    return Array.from(params.entries())
      .filter(([id]) => id === 'content_type')
      .map(([, value]) => value);
  }, [router.query.facets, router.isReady]);

  const handleToggle = async (facetValueId: string) => {
    const isSelected = selectedValues.includes(facetValueId);
    const facetIndex = queryResult.data?.facet?.findIndex(f => f.name === 'content_type') || 0;

    actions.onFacetClick({
      facetId: 'content_type',
      facetValueId,
      type: 'valueId',
      checked: !isSelected,
      facetIndex,
    });

    if (router.isReady) {
      if (isSelected) {
        await searchUrlManager.removeFacet(router, 'content_type', facetValueId);
      } else {
        await searchUrlManager.addFacet(router, 'content_type', facetValueId);
      }
    }
  };

  return (
    <div className="facet-group">
      <h4>Content Type</h4>
      <div className="button-group">
        {facetValues.map((fv) => (
          <button
            key={fv.id}
            className={selectedValues.includes(fv.id) ? 'active' : ''}
            onClick={() => handleToggle(fv.id)}
          >
            {fv.text} ({fv.count})
          </button>
        ))}
      </div>
    </div>
  );
};
```

## Helper: Get Selected Facet Values

```typescript
const useSelectedFacetValues = (facetId: string): string[] => {
  const router = useRouter();

  return useMemo(() => {
    if (!router.isReady || !router.query.facets) return [];

    try {
      const params = new URLSearchParams(router.query.facets as string);
      return Array.from(params.entries())
        .filter(([id]) => id === facetId)
        .map(([, value]) => value);
    } catch {
      return [];
    }
  }, [router.query.facets, router.isReady, facetId]);
};

// Usage
const selectedCategories = useSelectedFacetValues('category');
```

## Helper: Get Facet Index

```typescript
const getFacetIndex = (
  facets: SearchResponseFacet[],
  facetId: string
): number => {
  const index = facets.findIndex((facet) => facet.name === facetId);
  return index >= 0 ? index : 0;
};
```

## Clear All Filters

```typescript
const handleClearAll = async () => {
  // 1. Clear SDK state
  actions.onClearFilters();
  actions.onKeyphraseChange({ keyphrase: '' });

  // 2. Clear URL
  if (router.isReady) {
    await searchUrlManager.clearAllFilters(router);
  }

  // 3. Clear local state
  setSearchInput('');
  setLocalFilters({});
};
```

## UI Best Practices

1. **Show counts:** Display `({fv.count})` so users know result quantity
2. **Disable empty:** Disable facets with `count: 0`
3. **Accordion:** Collapse facet groups to save space
4. **Clear all button:** Always provide way to clear all facets
5. **Mobile-friendly:** Use drawer/modal for facets on mobile
6. **Loading states:** Show skeleton/spinner while facets load
7. **Sort by count:** Show popular facets first

## Pre-Selected Facets from URL

When user lands on page with facets in URL, SearchUrlManager automatically applies them:

```typescript
useEffect(() => {
  if (!router.isReady) return;

  const initialState = searchUrlManager.initialize(router, {
    onFacetClick: (payload) => actions.onFacetClick(payload),
    // ... other callbacks
  });

  // initialState.facets contains pre-selected facets from URL
  // SearchUrlManager automatically applies them via onFacetClick callback
}, [router.isReady]);
```

## Common Bugs

### Bug: Facets Don't Filter

**Cause:** Using `facetValue.text` instead of `facetValue.id`

**Fix:** Always use `facetValue.id` as `facetValueId`

### Bug: URL Doesn't Update

**Cause:** Missing `searchUrlManager.addFacet()` call

**Fix:** Call URL manager after SDK update

### Bug: Back Button Breaks

**Cause:** Not syncing from URL on route change

**Fix:** Add `useEffect` with `searchUrlManager.syncFromUrl(router)`

## Complete Template

See `templates/SearchWithFacets.tsx` for full implementation with:
- Multiple facet types
- URL synchronization
- Clear all filters
- Pre-selected from URL
- Responsive UI

---

**Key Takeaway:** Use `facetValue.id`, include all 5 parameters, sync SDK + URL. Pagination auto-resets on facet changes.
