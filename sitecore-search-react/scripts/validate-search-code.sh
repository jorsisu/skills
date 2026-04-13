#!/bin/bash
# Sitecore Search Code Validator
# Checks for common anti-patterns in search implementation (App Router)

FILE="${1}"
SCORE=0
MAX_SCORE=11

if [ -z "$FILE" ]; then
  echo "Usage: bash validate-search-code.sh <file.tsx>"
  exit 1
fi

if [ ! -f "$FILE" ]; then
  echo "Error: File not found: $FILE"
  exit 1
fi

echo "Validating Sitecore Search implementation: $FILE"
echo ""

# Check #1: facetValue.text misuse in facetValueId
echo -n "1. Checking for facetValue.text usage... "
if grep -q "facetValueId.*\.text" "$FILE"; then
  echo "FAIL"
  echo "   Found facetValue.text - use facetValue.id or facetValue.text with type: 'text'"
  grep -n "facetValueId.*\.text" "$FILE" | head -3
else
  echo "PASS"
  SCORE=$((SCORE + 1))
fi

# Check #2: onFacetClick parameters
echo -n "2. Checking onFacetClick parameters... "
if grep -q "onFacetClick" "$FILE"; then
  if grep -A10 "onFacetClick" "$FILE" | grep -q "type:" && grep -A10 "onFacetClick" "$FILE" | grep -q "facetIndex:"; then
    echo "PASS"
    SCORE=$((SCORE + 1))
  else
    echo "FAIL"
    echo "   Missing required parameters (type or facetIndex)"
  fi
else
  echo "SKIP (no facets)"
  SCORE=$((SCORE + 1))
fi

# Check #3: URL synchronization
echo -n "3. Checking URL synchronization... "
if grep -q "onKeyphraseChange\|onFacetClick" "$FILE"; then
  if grep -q "searchUrlManager" "$FILE"; then
    echo "PASS"
    SCORE=$((SCORE + 1))
  else
    echo "FAIL"
    echo "   Found SDK actions but no searchUrlManager calls"
  fi
else
  echo "SKIP (no search actions)"
  SCORE=$((SCORE + 1))
fi

# Check #4: Client-side filtering
echo -n "4. Checking for client-side filtering... "
if grep "queryResult\.data\.content" "$FILE" | grep -q "\.filter("; then
  echo "FAIL"
  echo "   Found client-side filtering of content array"
  grep -n "\.filter(" "$FILE" | grep "content" | head -3
else
  echo "PASS"
  SCORE=$((SCORE + 1))
fi

# Check #5: Single widget wrapper
echo -n "5. Checking widget() wrapper count... "
WIDGET_COUNT=$(grep -c "export default widget(" "$FILE" 2>/dev/null)
WIDGET_COUNT=${WIDGET_COUNT:-0}
if [ "$WIDGET_COUNT" -eq 1 ]; then
  echo "PASS"
  SCORE=$((SCORE + 1))
elif [ "$WIDGET_COUNT" -eq 0 ]; then
  echo "SKIP (no widget wrapper)"
  SCORE=$((SCORE + 1))
else
  echo "FAIL"
  echo "   Found $WIDGET_COUNT widget() wrappers - should be 1"
fi

# Check #6: Controlled inputs
echo -n "6. Checking for uncontrolled inputs... "
if grep -q "onChange.*onKeyphraseChange" "$FILE"; then
  echo "WARNING"
  echo "   Found onChange calling onKeyphraseChange directly"
  echo "   Consider using form submission instead"
else
  echo "PASS"
  SCORE=$((SCORE + 1))
fi

# Check #7: Manual pagination reset
echo -n "7. Checking for manual pagination resets... "
if grep -B5 "setSearchTerm\|addFacet" "$FILE" | grep -q "onPageNumberChange.*page.*1"; then
  echo "WARNING"
  echo "   Found manual pagination reset - SearchUrlManager does this automatically"
else
  echo "PASS"
  SCORE=$((SCORE + 1))
fi

# Check #8: App Router imports
echo -n "8. Checking router imports... "
if grep -q "from ['\"]next/router['\"]" "$FILE"; then
  echo "FAIL"
  echo "   Using Pages Router (next/router) - must use next/navigation for App Router"
else
  echo "PASS"
  SCORE=$((SCORE + 1))
fi

# Check #9: Clear filters implementation
echo -n "9. Checking clear filters implementation... "
if grep -q "clearFilters\|clearAll\|clearFacets" "$FILE"; then
  CLEAR_IMPL=$(grep -A20 "clearFilters\|clearAll\|clearFacets" "$FILE")
  CLEAR_CHECKS=0
  echo "$CLEAR_IMPL" | grep -q "onClearFilters\|onClearFacets" && CLEAR_CHECKS=$((CLEAR_CHECKS + 1))
  echo "$CLEAR_IMPL" | grep -q "searchUrlManager.*clear" && CLEAR_CHECKS=$((CLEAR_CHECKS + 1))
  echo "$CLEAR_IMPL" | grep -q "setState\|setSearch\|setCurrent" && CLEAR_CHECKS=$((CLEAR_CHECKS + 1))

  if [ $CLEAR_CHECKS -ge 2 ]; then
    echo "PASS"
    SCORE=$((SCORE + 1))
  else
    echo "WARNING"
    echo "   Clear filters may not clear all state layers"
  fi
else
  echo "SKIP (no clear filters)"
  SCORE=$((SCORE + 1))
fi

# Check #10: scroll: false on router.push
echo -n "10. Checking scroll behavior on navigation... "
if grep -q "router\.push" "$FILE"; then
  if grep "router\.push" "$FILE" | grep -q "scroll.*false\|{ scroll: false }"; then
    echo "PASS"
    SCORE=$((SCORE + 1))
  else
    echo "FAIL"
    echo "   router.push without { scroll: false }"
  fi
else
  echo "SKIP (no router.push)"
  SCORE=$((SCORE + 1))
fi

# Check #11: Conditional mount/unmount of widget sections
echo -n "11. Checking for conditional mount/unmount... "
if grep -q "&&.*portal\|&&.*id=\"portal" "$FILE"; then
  echo "FAIL"
  echo "   Found conditional rendering of portal targets"
  echo "   Use CSS hidden toggle instead of mount/unmount"
  grep -n "&&.*portal\|&&.*id=\"portal" "$FILE" | head -3
else
  echo "PASS"
  SCORE=$((SCORE + 1))
fi

# Summary
echo ""
echo "Score: $SCORE/$MAX_SCORE"

if [ $SCORE -eq $MAX_SCORE ]; then
  echo "Perfect! All checks passed."
  exit 0
elif [ $SCORE -ge 9 ]; then
  echo "Good. Review warnings before deploying."
  exit 0
elif [ $SCORE -ge 7 ]; then
  echo "Fair. Fix failures before deploying."
  exit 1
else
  echo "Poor. Multiple issues found. Review anti-patterns."
  exit 1
fi
