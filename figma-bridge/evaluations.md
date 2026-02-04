# Figma Bridge Evaluations

Test scenarios to validate skill effectiveness across different models.

---

## Evaluation 1: Basic Component Extraction

**Scenario:** User provides a Figma node ID for a simple button component.

```json
{
  "skills": ["figma-bridge"],
  "query": "Implement this Figma button: node 123:456",
  "expected_behavior": [
    "Calls mcp__figma-desktop__get_design_context with nodeId 123:456",
    "Extracts typography, spacing, colors, and icon properties",
    "Outputs filled extraction template with all values",
    "Maps values to project tokens (text-b1, gap-xxs, etc.)",
    "Generates JSX using only project tokens, no hardcoded values",
    "Includes validation checklist comparing extracted vs implemented"
  ]
}
```

---

## Evaluation 2: Token Mismatch Handling

**Scenario:** Figma design uses a spacing value (22px) that doesn't exactly match any token.

```json
{
  "skills": ["figma-bridge"],
  "query": "Implement this card component from Figma node 456:789",
  "expected_behavior": [
    "Extracts the 22px spacing value",
    "Recognizes 22px doesn't match exactly (20px=m, 24px=lg)",
    "Suggests closest token (gap-lg for 24px) with note",
    "Flags mismatch for designer review",
    "Does NOT use arbitrary value gap-[22px] without explanation"
  ]
}
```

---

## Evaluation 3: Typography Validation

**Scenario:** User asks to implement a heading that looks like text-h3 but has wrong line-height.

```json
{
  "skills": ["figma-bridge"],
  "query": "Convert this Figma heading to code",
  "expected_behavior": [
    "Extracts ALL typography properties (size, weight, line-height, letter-spacing)",
    "Compares against text-h3 requirements (32px, 500, 115%)",
    "Identifies line-height mismatch if present",
    "Does NOT assume text-h3 based on font-size alone",
    "Flags for designer review if properties don't match any class"
  ]
}
```

---

## Evaluation 4: MCP Unavailable

**Scenario:** User invokes skill but Figma MCP is not connected.

```json
{
  "skills": ["figma-bridge"],
  "query": "/figma-bridge 123:456",
  "context": "Figma Desktop not running, MCP unavailable",
  "expected_behavior": [
    "Attempts to call mcp__figma-desktop__get_design_context",
    "Recognizes MCP connection failure",
    "HARD STOPS the workflow",
    "Provides troubleshooting steps (restart Figma, check MCP plugin)",
    "Does NOT attempt to proceed without extraction data"
  ]
}
```

---

## Evaluation 5: URL to Node ID Extraction

**Scenario:** User provides a Figma URL instead of node ID.

```json
{
  "skills": ["figma-bridge"],
  "query": "/figma-bridge https://figma.com/design/abc123?node-id=789-012",
  "expected_behavior": [
    "Parses URL to extract node-id parameter",
    "Converts 789-012 (hyphen) to 789:012 (colon)",
    "Calls MCP with correct nodeId format",
    "Proceeds with normal workflow"
  ]
}
```

---

## Evaluation 6: Icon Size Verification

**Scenario:** Figma shows a 20px icon but user might assume default 24px.

```json
{
  "skills": ["figma-bridge"],
  "query": "Implement this nav item with icon from Figma",
  "expected_behavior": [
    "Extracts exact icon dimensions from Figma (20x20px)",
    "Generates code with explicit size prop: <Icon size={20} />",
    "Does NOT use <Icon /> without size (which defaults to 24px)",
    "Includes icon size in validation checklist"
  ]
}
```

---

## Evaluation 7: Color Token Enforcement

**Scenario:** Figma shows a hex color that should map to a token.

```json
{
  "skills": ["figma-bridge"],
  "query": "Convert this Figma component with #0F172A text color",
  "expected_behavior": [
    "Recognizes hex value in extraction",
    "Cross-references with project color tokens",
    "Maps to text-type-primary (if matching)",
    "Does NOT output text-[#0F172A] in final code",
    "If no match, flags for designer to confirm intended token"
  ]
}
```

---

## Evaluation 8: Complete Workflow Execution

**Scenario:** User requests full implementation of a complex component.

```json
{
  "skills": ["figma-bridge"],
  "query": "Implement the hero section from Figma node 111:222, full workflow",
  "expected_behavior": [
    "Phase 1: Extracts ALL properties using MCP",
    "Phase 1: Outputs complete extraction template",
    "Phase 2: Maps each value to project tokens",
    "Phase 2: Flags any mismatches",
    "Phase 3: Generates JSX with proper structure",
    "Phase 3: Uses semantic HTML elements",
    "Phase 4: Provides filled validation checklist",
    "No hardcoded colors, no arbitrary spacing where tokens exist"
  ]
}
```

---

## Model-Specific Notes

### Claude Haiku
- May need more explicit guidance on token lookup tables
- Verify it follows WORKFLOW.md steps in order
- Check it doesn't skip validation phase

### Claude Sonnet
- Should handle all scenarios without extra prompting
- Verify token mapping accuracy
- Check mismatch flagging works correctly

### Claude Opus
- Should recognize patterns without over-explanation
- May proactively identify design system inconsistencies
- Verify it doesn't add unnecessary complexity

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Correct MCP tool usage | 100% |
| Token mapping accuracy | >95% |
| Mismatch flagging | 100% when value differs >4px |
| No hardcoded colors | 100% |
| No arbitrary spacing (when token exists) | 100% |
| Validation checklist completion | 100% |
