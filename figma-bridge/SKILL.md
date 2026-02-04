---
name: figma-bridge
description: Automates Figma → Code workflow using MCP. Extracts design data, maps to project tokens, suggests implementation. Invoke with /figma-bridge [node-id].
version: 1.0.0
last_updated: 2025-02-04
---

# Figma Bridge

Automates the 4-phase Figma → Code workflow using Figma MCP tools. Enforces project design system tokens instead of copying pixels blindly.

## When to Invoke

**Trigger keywords:**
- "figma" + "implement" or "build" or "code"
- "convert design" or "design to code"
- "from figma" or "figma component"
- `/figma-bridge` (explicit invocation)

**Invocation patterns:**
```bash
# With node ID
/figma-bridge 123:456

# With Figma URL (extracts node-id automatically)
/figma-bridge https://figma.com/design/xxx?node-id=123-456

# Current selection (no argument)
/figma-bridge
```

## Prerequisites

**CRITICAL**: Before starting, verify Figma MCP is available.

1. Figma Desktop app must be running
2. MCP connection must be active
3. If unavailable: HARD STOP - workflow cannot proceed

Test with: `mcp__figma-desktop__get_design_context`

## Quick Decision Tree

### 🚀 **Implementing from Scratch?**
→ Run full workflow (Phases 1-4)
→ See `WORKFLOW.md` for detailed steps

### 🔍 **Need Token Mapping Only?**
→ Skip to Phase 2
→ Reference token tables in `.claude/rules/figma-mcp.md`

### 🐛 **Design Doesn't Match Code?**
→ Run Phase 4 validation
→ See `TROUBLESHOOTING.md` for common issues

### 📋 **Just Need Extraction Template?**
→ See `templates/extraction-template.md`

---

## Workflow Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: EXTRACT  →  PHASE 2: MAP  →  PHASE 3: BUILD  →  PHASE 4: VALIDATE │
│     (MCP)              (Tokens)         (Code)            (Checklist)        │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Phase 1: Extract (Automated)
**MCP Tool:** `mcp__figma-desktop__get_design_context`

1. Get node ID from argument or current selection
2. Call MCP to extract design properties
3. Parse: typography, colors, spacing, icons, layout
4. Output filled extraction template

### Phase 2: Map (Assisted)
**Reference:** `.claude/rules/figma-mcp.md` token tables

1. Match extracted values to project tokens
2. Typography: `text-h*`, `text-p*`, `text-c*`, `text-b*`
3. Spacing: `gap-*`, `p-*`, `pt-section-*`, `pb-section-*`
4. Colors: `text-type-*`, `bg-surface-*`, `border-stroke-*`
5. Flag mismatches for designer review

### Phase 3: Build (Guided)
**Priority order:** Project tokens → Standard Tailwind → Arbitrary values

1. Generate JSX with mapped tokens
2. Apply layout structure (`block-module-wrapper`, `layout-grid`)
3. Use semantic HTML elements
4. Pass exact `size` prop to icons

### Phase 4: Validate (Checklist)
**Output:** Filled validation checklist

1. Compare extracted vs implemented values
2. Verify all properties match
3. Check responsive behavior
4. Flag any deviations

---

## MCP Tools Used

| Tool | Purpose |
|------|---------|
| `mcp__figma-desktop__get_design_context` | Primary extraction (typography, colors, spacing, layout) |
| `mcp__figma-desktop__get_variable_defs` | Token/variable definitions from design system |
| `mcp__figma-desktop__get_screenshot` | Visual reference for complex components |

---

## Token Quick Reference

**Full tables:** `.claude/rules/figma-mcp.md`

### Typography (common)
| Figma | Class | Properties |
|-------|-------|------------|
| 56px heading | `text-h1` | 500 weight, 105% line-height |
| 24px heading | `text-h4` | 500 weight, 115% line-height |
| 21px body | `text-p1` | 400 weight, 130% line-height, -0.13px spacing |
| 18px body | `text-p2` | 400 weight, 140% line-height |
| 18px button | `text-b1` | 500 weight, 120% line-height |

### Spacing (common)
| Figma px | Token |
|----------|-------|
| 8px | `xxs` |
| 12px | `xs` |
| 16px | `s` |
| 20px | `m` |
| 24px | `lg` |
| 40px | `2xl` |
| 56px | `3xl` |

### Colors
| Figma | Class |
|-------|-------|
| type/primary | `text-type-primary` |
| type/secondary | `text-type-secondary` |
| surface/primary | `bg-surface-primary` |
| surface/secondary | `bg-surface-secondary` |
| stroke/primary | `border-stroke-primary` |

---

## Critical Rules

### 1. Never Use Raw Tailwind Typography
```tsx
// ❌ text-5xl, text-base, font-bold
// ✅ text-h1, text-p2, text-b1
```

### 2. Never Use Hardcoded Colors
```tsx
// ❌ #0F172A, bg-gray-100, border-[#ccc]
// ✅ text-type-primary, bg-surface-secondary
```

### 3. Never Use Raw Spacing When Token Exists
```tsx
// ❌ gap-6, p-4, mb-8
// ✅ gap-lg, p-s, mb-xxs
```

### 4. Always Check Icon Size in Figma
```tsx
// ❌ <Icon /> (assumes 24px)
// ✅ <Icon size={20} /> (matches Figma 20x20px)
```

### 5. Verify ALL Typography Properties
```tsx
// Font size alone is NOT enough
// Must match: size + weight + line-height + letter-spacing
```

---

## File References

| File | Purpose |
|------|---------|
| `WORKFLOW.md` | Detailed 4-phase instructions |
| `TROUBLESHOOTING.md` | Common issues + solutions |
| `templates/extraction-template.md` | Phase 1 output format |
| `evaluations.md` | Test scenarios for validation |
| `.claude/rules/figma-mcp.md` | Complete token lookup tables |

---

## Success Criteria

Implementation is correct when:
- ✅ All typography uses `text-*` project classes
- ✅ All colors use `text-type-*`, `bg-surface-*`, `border-stroke-*`
- ✅ All spacing uses project tokens (`gap-*`, `p-*`)
- ✅ Icons have explicit `size` prop matching Figma
- ✅ No hardcoded hex values
- ✅ No arbitrary values when token exists
- ✅ Responsive behavior verified at breakpoints
