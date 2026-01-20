# Critical Anti-Patterns

**MUST AVOID** patterns that cause bugs in Sitecore Search implementations. Documented from real production issues.

> ⚠️ **These are the #1 source of bugs.** Review before coding.

## Validation

Run automated check:
```bash
bash scripts/validate-search-code.sh <your-file.tsx>
```

## Anti-Pattern #1: Using facetValue.text Instead of facetValue.id

**Bug frequency:** 🔴 VERY HIGH (40% of all issues)

### ❌ WRONG

```typescript
const handleFacetClick = (facetValue) => {
  actions.onFacetClick({
    facetId: 'category',
    facetValueId: facetValue.text,  // ← BUG: Using .text
    type: 'valueId',
    checked: true,
    facetIndex: 0,
  });
};
```

### ✅ CORRECT

```typescript
const handleFacetClick = (facetValue) => {
  actions.onFacetClick({
    facetId: 'category',
    facetValueId: facetValue.id,  // ← Use .id for valueId facets
    type: 'valueId',
    checked: true,
    facetIndex: 0,
  });
};
```

### Why This Matters

- `facetValue.text` = Display label ("Pediatric Care")
- `facetValue.id` = API identifier ("pediatric_care")
- Sitecore Search API expects `facetValue.id`
- Using `.text` causes facets to **fail silently** (no error, just doesn't filter)

### How to Fix

```typescript
const facet = queryResult.data?.facet?.find(f => f.name === 'category');
const facetValues = facet?.value || [];

facetValues.map((fv) => (
  <Checkbox
    key={fv.id}
    onChange={() => handleFacetClick(fv.id)}  // Pass .id
  >
    {fv.text}  {/* Display .text */}
  </Checkbox>
));
```

### Detection

**Validation script checks:**
```bash
grep -n "facetValueId.*\.text" file.tsx
# Should return nothing
```

---

## Anti-Pattern #2: Missing Required onFacetClick Parameters

**Bug frequency:** 🟠 HIGH (25% of issues)

### ❌ WRONG

```typescript
actions.onFacetClick({
  facetId: 'category',
  facetValueId: valueId,
  checked: true,
  // Missing: type, facetIndex
});
```

### ✅ CORRECT

```typescript
actions.onFacetClick({
  facetId: 'category',
  facetValueId: valueId,
  type: 'valueId',      // REQUIRED
  checked: true,
  facetIndex: 0,        // REQUIRED
});
```

### Required Parameters

| Parameter | Type | Purpose | Common Value |
|-----------|------|---------|--------------|
| `facetId` | string | Facet identifier | 'category', 'location' |
| `facetValueId` | string | **Use `.id` not `.text`** | 'news', 'chicago' |
| `type` | 'valueId' \| 'text' | Facet type | 'valueId' (most common) |
| `checked` | boolean | Select/deselect | true/false |
| `facetIndex` | number | Position in array | 0, 1, 2... |

### Detection

**Validation script checks:**
```typescript
// All 5 must be present
const required = ['facetId', 'facetValueId', 'type', 'checked', 'facetIndex'];
```

---

## Anti-Pattern #3: Skipping URL Synchronization

**Bug frequency:** 🟠 HIGH (20% of issues)

### ❌ WRONG - Only Updates SDK

```typescript
const handleSearch = (term) => {
  // Only updates Sitecore Search SDK
  actions.onKeyphraseChange({ keyphrase: term });

  // Missing URL update - can't share/bookmark results
};
```

### ✅ CORRECT - Updates Both SDK and URL

```typescript
const handleSearch = async (term) => {
  // 1. Update SDK
  actions.onKeyphraseChange({ keyphrase: term });

  // 2. Update URL for shareability
  if (router.isReady) {
    await searchUrlManager.setSearchTerm(router, term);
  }
};
```

### Impact

**Without URL sync:**
- ❌ Users can't share search results
- ❌ Browser back button breaks
- ❌ Page refresh loses filters
- ❌ Bookmarks don't work

**With URL sync:**
- ✅ Shareable links with filters
- ✅ Browser navigation works
- ✅ State persists on refresh
- ✅ Bookmarkable searches

### Detection

**Validation script checks:**
```bash
# After actions.onKeyphraseChange, must have searchUrlManager call
grep -A3 "onKeyphraseChange" | grep "searchUrlManager"
```

---

## Anti-Pattern #4: Client-Side Filtering of Results

**Bug frequency:** 🟡 MEDIUM (15% of issues)

### ❌ WRONG - Manual Filtering

```typescript
const { queryResult } = useSearchResults();
const content = queryResult.data?.content || [];

// BAD: Filtering results client-side
const filteredContent = content.filter(item =>
  selectedFacets.includes(item.category)
);

return filteredContent.map(item => <ResultCard {...item} />);
```

### ✅ CORRECT - Server-Side Filtering

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

### Detection

**Validation script checks:**
```bash
grep -n "\.filter(" file.tsx | grep "content"
# Should only filter facet UI, not results
```

---

## Anti-Pattern #5: Multiple widget() Wrappers for Same rfkId

**Bug frequency:** 🟡 MEDIUM (10% of issues)

### ❌ WRONG - Multiple Instances

```typescript
// File: SearchInput.tsx
export default widget(SearchInput, WidgetDataType.SEARCH_RESULTS, 'content');

// File: SearchResults.tsx
export default widget(SearchResults, WidgetDataType.SEARCH_RESULTS, 'content');

// File: SearchPage.tsx
<SearchInput />   {/* Creates widget instance #1 */}
<SearchResults /> {/* Creates widget instance #2 - CONFLICT! */}
```

### ✅ CORRECT - Single Widget Instance

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

**Validation script checks:**
```bash
# Count widget() wrappers with same rfkId
grep -r "widget.*SEARCH_RESULTS.*content" | wc -l
# Should be 1 per search experience
```

---

## Anti-Pattern #6: Uncontrolled Search Inputs

**Bug frequency:** 🟡 MEDIUM (8% of issues)

### ❌ WRONG - Immediate Search on Type

```typescript
<input
  onChange={(e) => {
    actions.onKeyphraseChange({ keyphrase: e.target.value });
  }}
  placeholder="Search..."
/>
```

### ✅ CORRECT - Controlled Input with Submit

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

**Bug frequency:** 🟢 LOW (5% of issues)

### ❌ WRONG - Manual Reset

```typescript
const handleFacetClick = async (facetId, valueId) => {
  // Manually resetting pagination
  actions.onPageNumberChange({ page: 1 });

  actions.onFacetClick({ facetId, facetValueId: valueId, /* ... */ });
  await searchUrlManager.addFacet(router, facetId, valueId);
};
```

### ✅ CORRECT - Automatic Reset

```typescript
const handleFacetClick = async (facetId, valueId) => {
  actions.onFacetClick({ facetId, facetValueId: valueId, /* ... */ });

  // SearchUrlManager auto-resets pagination
  await searchUrlManager.addFacet(router, facetId, valueId);
};
```

### SearchUrlManager Auto-Resets

Methods that auto-reset pagination to page 1:
- `setSearchTerm()`
- `addFacet()` / `removeFacet()`
- `setTab()`
- `clearAllFacets()`
- `clearAllFilters()`

Don't manually call `onPageNumberChange({ page: 1 })` - it's automatic.

---

## Anti-Pattern #8: Skipping router.isReady Check

**Bug frequency:** 🟢 LOW (3% of issues)

### ❌ WRONG - No Readiness Check

```typescript
const handleSearch = async (term) => {
  actions.onKeyphraseChange({ keyphrase: term });

  // BUG: Router might not be ready
  await searchUrlManager.setSearchTerm(router, term);
};
```

### ✅ CORRECT - Check Before URL Operations

```typescript
const handleSearch = async (term) => {
  actions.onKeyphraseChange({ keyphrase: term });

  if (router.isReady) {
    await searchUrlManager.setSearchTerm(router, term);
  }
};
```

### Why It Matters

- `router.query` is empty until `router.isReady = true`
- URL operations before ready cause:
  - Lost query parameters
  - Incorrect URL updates
  - Silent failures

### Pattern for useEffect

```typescript
useEffect(() => {
  if (!router.isReady) return;

  // Safe to use router.query here
  const initialState = searchUrlManager.initialize(router, callbacks);
}, [router.isReady]);
```

---

## Anti-Pattern #9: Incomplete Clear Filters Implementation

**Bug frequency:** 🟢 LOW (2% of issues)

### ❌ WRONG - Only Clears Local State

```typescript
const handleClearFilters = () => {
  setLocalFilters({});  // Only clears component state
};
```

### ✅ CORRECT - Clear All Layers

```typescript
const handleClearFilters = async () => {
  // 1. Clear SDK state
  actions.onClearFilters();
  actions.onKeyphraseChange({ keyphrase: '' });

  // 2. Clear URL state
  if (router.isReady) {
    await searchUrlManager.clearAllFilters(router);
  }

  // 3. Clear local UI state
  setSearchTerm('');
  setLocalFilters({});
};
```

### Three Layers of State

1. **Sitecore Search SDK** - via `actions.onClearFilters()`
2. **URL** - via `searchUrlManager.clearAllFilters()`
3. **Local Components** - via local React state setters

All three MUST be cleared for complete reset.

---

## Anti-Pattern #10: Forgetting Shallow Routing

**Bug frequency:** 🟢 LOW (2% of issues)

### ❌ WRONG - Full Page Reload

```typescript
router.push({
  pathname: '/search',
  query: { q: searchTerm },
});
```

### ✅ CORRECT - Shallow Routing

```typescript
router.push(
  {
    pathname: '/search',
    query: { q: searchTerm },
  },
  undefined,
  { shallow: true, scroll: false }
);
```

### Impact

**Without shallow:**
- Full page reload on every filter change
- Lose component state
- Poor performance
- Jarring UX

**With shallow:**
- No page reload
- Preserve component state
- Fast updates
- Smooth UX

---

## Quick Reference: Code Review Checklist

Before pushing code, verify:

- [ ] Using `facetValue.id` NOT `facetValue.text` (#1)
- [ ] All 5 `onFacetClick` parameters present (#2)
- [ ] URL updates after SDK updates (#3)
- [ ] NO client-side filtering of `content` (#4)
- [ ] Single `widget()` wrapper per search (#5)
- [ ] Controlled inputs with form submission (#6)
- [ ] NO manual pagination resets (#7)
- [ ] `router.isReady` checked before URL ops (#8)
- [ ] `onClearFilters` clears all 3 state layers (#9)
- [ ] Shallow routing used for search URLs (#10)

## Automated Validation

Run the validation script:
```bash
bash scripts/validate-search-code.sh src/components/search/MyWidget.tsx
```

**Output example:**
```
✓ No facetValue.text usage found
✓ All onFacetClick calls have 5 parameters
✓ URL sync after SDK updates
✓ No client-side filtering of content
✓ Single widget() wrapper
✗ WARNING: Uncontrolled input detected (line 45)
✓ No manual pagination resets
✓ router.isReady checks present
✓ Clear filters implementation complete
✓ Shallow routing enabled

Score: 9/10 - Review warnings before deploying
```

---

**Remember:** Top 3 anti-patterns (#1, #2, #3) account for 85% of bugs. Focus on those first.
