# Sitecore Search Skill Evaluations

Test scenarios to validate skill effectiveness across models.

## Evaluation 1: Facet Anti-Pattern Detection

**Query:** "Review this search code and tell me if there are any issues"

**Files:**
```typescript
// bad-facets.tsx
const handleFacetClick = (facet) => {
  actions.onFacetClick({
    facetId: 'category',
    facetValueId: facet.text,  // BUG
    checked: true,
  });
};
```

**Expected Behavior:**
- ✅ Identifies using `facet.text` instead of `facet.id`
- ✅ Identifies missing required parameters (type, facetIndex)
- ✅ References ANTI-PATTERNS.md #1 and #2
- ✅ Suggests running validation script
- ✅ Provides corrected code

**Model-Specific:**
- Haiku: Should catch bug, may need ANTI-PATTERNS.md reference
- Sonnet: Should catch both issues immediately
- Opus: Should provide detailed explanation without over-explaining

---

## Evaluation 2: Implementation from Scratch

**Query:** "Help me implement Sitecore Search in my Next.js app"

**Files:** None (new implementation)

**Expected Behavior:**
- ✅ Loads QUICK-START.md
- ✅ Asks about existing SearchProvider
- ✅ Provides step-by-step setup
- ✅ References templates for SearchProvider, SearchUrlManager
- ✅ Mentions validation script for final check

**Model-Specific:**
- Haiku: Should follow QUICK-START.md steps sequentially
- Sonnet: Should adapt steps based on user responses
- Opus: Should provide context and alternatives when appropriate

---

## Evaluation 3: URL Sync Debugging

**Query:** "My search works but the URL doesn't update and back button is broken"

**Files:**
```typescript
// broken-url.tsx
const handleSearch = (term) => {
  actions.onKeyphraseChange({ keyphrase: term });
  // Missing searchUrlManager call
};
```

**Expected Behavior:**
- ✅ Diagnoses missing URL synchronization
- ✅ References ANTI-PATTERNS.md #3
- ✅ References TROUBLESHOOTING.md "URL doesn't update"
- ✅ Checks for router.isReady usage
- ✅ Provides fix with searchUrlManager.setSearchTerm()
- ✅ Mentions syncFromUrl for back button

**Model-Specific:**
- Haiku: Should identify missing searchUrlManager call
- Sonnet: Should provide complete solution with both issues
- Opus: Should explain why URL sync matters for shareability

---

## Evaluation 4: Facets Not Filtering

**Query:** "I implemented facets but they don't filter the results"

**Files:**
```typescript
// not-filtering.tsx
actions.onFacetClick({
  facetId: 'category',
  facetValueId: facetValue.text,  // BUG
  type: 'valueId',
  checked: true,
  facetIndex: 0,
});
```

**Expected Behavior:**
- ✅ Immediately identifies `facetValue.text` vs `.id` issue
- ✅ References ANTI-PATTERNS.md #1 (most common bug)
- ✅ Suggests validation script
- ✅ Provides corrected code
- ✅ Optionally checks for URL sync

**Model-Specific:**
- All models: Should catch this bug consistently (90% of facet issues)

---

## Evaluation 5: SearchUrlManager Implementation

**Query:** "I need to implement URL state synchronization for my search widget"

**Files:** Existing search widget without URL sync

**Expected Behavior:**
- ✅ Loads SEARCHURLMANAGER.md
- ✅ References template: templates/SearchUrlManager.ts
- ✅ Explains singleton pattern
- ✅ Shows initialize, setSearchTerm, addFacet methods
- ✅ Explains auto-reset pagination behavior
- ✅ Shows useEffect patterns for initialization and sync

**Model-Specific:**
- Haiku: Should reference template and key methods
- Sonnet: Should provide implementation guidance with examples
- Opus: Should explain architecture decisions

---

## Evaluation 6: Code Review

**Query:** "Please review my search implementation for best practices"

**Files:**
```typescript
// mixed-issues.tsx
const SearchWidget = () => {
  const { actions } = useSearchResults();

  // Issue 1: Uncontrolled input
  <input onChange={(e) => actions.onKeyphraseChange({ keyphrase: e.target.value })} />

  // Issue 2: Client-side filtering
  const filtered = content.filter(item => selectedFacets.includes(item.category));

  // Issue 3: Manual pagination reset
  actions.onPageNumberChange({ page: 1 });
  await searchUrlManager.setSearchTerm(router, term);
};
```

**Expected Behavior:**
- ✅ Runs validation script or manual check
- ✅ Identifies multiple anti-patterns (#4, #6, #7)
- ✅ Prioritizes by severity (client-side filtering is critical)
- ✅ Provides fixes for all issues
- ✅ References ANTI-PATTERNS.md sections

**Model-Specific:**
- Haiku: Should catch major issues (2-3)
- Sonnet: Should catch all issues with priorities
- Opus: Should explain impact of each anti-pattern

---

## Evaluation 7: Pagination Issue

**Query:** "When I search for something while on page 5, it stays on page 5 and shows wrong results"

**Files:** Search widget with pagination

**Expected Behavior:**
- ✅ Diagnoses missing auto-reset pagination
- ✅ Checks if using searchUrlManager correctly
- ✅ References SEARCHURLMANAGER.md auto-reset behavior
- ✅ Verifies methods that auto-reset vs don't reset
- ✅ Ensures not manually resetting pagination

**Model-Specific:**
- Haiku: Should identify auto-reset issue
- Sonnet: Should verify searchUrlManager usage
- Opus: Should explain why auto-reset is necessary

---

## Evaluation 8: Template Request

**Query:** "Can you give me a complete search widget with facets?"

**Files:** None

**Expected Behavior:**
- ✅ References templates/SearchWithFacets.tsx
- ✅ May read and provide the template
- ✅ Explains key parts (widget HOC, useSearchResults, facet handling)
- ✅ Mentions validation script for testing
- ✅ Points to FACETS.md for variations

**Model-Specific:**
- Haiku: Should provide template directly
- Sonnet: Should provide template with brief explanation
- Opus: Should explain template choices

---

## Success Criteria

**Skill is effective if:**
1. Catches `facetValue.text` bug >90% of the time
2. Loads appropriate file for task (QUICK-START for setup, TROUBLESHOOTING for bugs)
3. References validation script for code reviews
4. Provides one-level-deep file references only
5. Doesn't over-explain concepts Claude already knows
6. Adapts detail level based on query complexity

## Testing Protocol

1. **Test with all three models:** Haiku, Sonnet, Opus
2. **Measure:**
   - Bug detection rate (especially facetValue.text)
   - Appropriate file loading
   - Solution accuracy
   - Token efficiency (not loading unnecessary files)
3. **Iterate based on:**
   - Missed detections
   - Over/under explanation
   - Wrong file references
   - Unnecessary context loading

---

**Use these evaluations to:**
- Validate skill effectiveness
- Identify weak areas
- Test after updates
- Compare model performance
- Ensure consistent behavior
