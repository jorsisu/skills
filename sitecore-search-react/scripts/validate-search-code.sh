#!/bin/bash
# Sitecore Search Code Validator
# Checks for common anti-patterns in search implementation

set -e

FILE="${1}"
SCORE=0
MAX_SCORE=10

if [ -z "$FILE" ]; then
  echo "Usage: bash validate-search-code.sh <file.tsx>"
  exit 1
fi

if [ ! -f "$FILE" ]; then
  echo "Error: File not found: $FILE"
  exit 1
fi

echo "🔍 Validating Sitecore Search implementation: $FILE"
echo ""

# Check #1: facetValue.text usage
echo -n "1. Checking for facetValue.text usage... "
if grep -q "facetValueId.*\.text" "$FILE"; then
  echo "❌ FAIL"
  echo "   Found facetValue.text - MUST use facetValue.id"
  grep -n "facetValueId.*\.text" "$FILE" | head -3
else
  echo "✅ PASS"
  ((SCORE++))
fi

# Check #2: onFacetClick parameters
echo -n "2. Checking onFacetClick parameters... "
if grep -q "onFacetClick" "$FILE"; then
  # Check if type and facetIndex are present
  if grep -A10 "onFacetClick" "$FILE" | grep -q "type:" && grep -A10 "onFacetClick" "$FILE" | grep -q "facetIndex:"; then
    echo "✅ PASS"
    ((SCORE++))
  else
    echo "❌ FAIL"
    echo "   Missing required parameters (type or facetIndex)"
  fi
else
  echo "⚠️  SKIP (no facets)"
  ((SCORE++))
fi

# Check #3: URL synchronization
echo -n "3. Checking URL synchronization... "
if grep -q "onKeyphraseChange\|onFacetClick" "$FILE"; then
  if grep -q "searchUrlManager" "$FILE"; then
    echo "✅ PASS"
    ((SCORE++))
  else
    echo "❌ FAIL"
    echo "   Found SDK actions but no searchUrlManager calls"
  fi
else
  echo "⚠️  SKIP (no search actions)"
  ((SCORE++))
fi

# Check #4: Client-side filtering
echo -n "4. Checking for client-side filtering... "
if grep "queryResult\.data\.content" "$FILE" | grep -q "\.filter("; then
  echo "❌ FAIL"
  echo "   Found client-side filtering of content array"
  grep -n "\.filter(" "$FILE" | grep "content" | head -3
else
  echo "✅ PASS"
  ((SCORE++))
fi

# Check #5: Single widget wrapper
echo -n "5. Checking widget() wrapper count... "
WIDGET_COUNT=$(grep -c "export default widget(" "$FILE" || echo "0")
if [ "$WIDGET_COUNT" -eq 1 ]; then
  echo "✅ PASS"
  ((SCORE++))
elif [ "$WIDGET_COUNT" -eq 0 ]; then
  echo "⚠️  SKIP (no widget wrapper)"
  ((SCORE++))
else
  echo "❌ FAIL"
  echo "   Found $WIDGET_COUNT widget() wrappers - should be 1"
fi

# Check #6: Controlled inputs
echo -n "6. Checking for uncontrolled inputs... "
if grep -q "onChange.*onKeyphraseChange" "$FILE"; then
  echo "❌ WARNING"
  echo "   Found onChange calling onKeyphraseChange directly"
  echo "   Consider using form submission instead"
else
  echo "✅ PASS"
  ((SCORE++))
fi

# Check #7: Manual pagination reset
echo -n "7. Checking for manual pagination resets... "
if grep -B5 "setSearchTerm\|addFacet" "$FILE" | grep -q "onPageNumberChange.*page.*1"; then
  echo "❌ WARNING"
  echo "   Found manual pagination reset - SearchUrlManager does this automatically"
else
  echo "✅ PASS"
  ((SCORE++))
fi

# Check #8: router.isReady checks
echo -n "8. Checking router.isReady usage... "
if grep -q "searchUrlManager" "$FILE"; then
  if grep -q "router\.isReady" "$FILE"; then
    echo "✅ PASS"
    ((SCORE++))
  else
    echo "❌ FAIL"
    echo "   Using searchUrlManager without router.isReady checks"
  fi
else
  echo "⚠️  SKIP (no searchUrlManager)"
  ((SCORE++))
fi

# Check #9: Clear filters implementation
echo -n "9. Checking clear filters implementation... "
if grep -q "clearFilters\|clearAll" "$FILE"; then
  CLEAR_CHECKS=0
  grep -A20 "clearFilters\|clearAll" "$FILE" > /tmp/clear_impl.txt
  grep -q "onClearFilters" /tmp/clear_impl.txt && ((CLEAR_CHECKS++))
  grep -q "searchUrlManager.*clear" /tmp/clear_impl.txt && ((CLEAR_CHECKS++))
  grep -q "setState\|setSearch" /tmp/clear_impl.txt && ((CLEAR_CHECKS++))

  if [ $CLEAR_CHECKS -ge 2 ]; then
    echo "✅ PASS"
    ((SCORE++))
  else
    echo "❌ WARNING"
    echo "   Clear filters may not clear all 3 state layers"
  fi
else
  echo "⚠️  SKIP (no clear filters)"
  ((SCORE++))
fi

# Check #10: Shallow routing
echo -n "10. Checking shallow routing... "
if grep -q "router\.push" "$FILE"; then
  if grep "router\.push" "$FILE" | grep -q "shallow.*true"; then
    echo "✅ PASS"
    ((SCORE++))
  else
    echo "❌ FAIL"
    echo "   router.push without shallow: true"
  fi
else
  echo "⚠️  SKIP (no router.push)"
  ((SCORE++))
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Score: $SCORE/$MAX_SCORE"

if [ $SCORE -eq $MAX_SCORE ]; then
  echo "🎉 Perfect! All checks passed."
  exit 0
elif [ $SCORE -ge 8 ]; then
  echo "✅ Good! Review warnings before deploying."
  exit 0
elif [ $SCORE -ge 6 ]; then
  echo "⚠️  Fair. Fix failures before deploying."
  exit 1
else
  echo "❌ Poor. Multiple issues found. Review anti-patterns."
  exit 1
fi
