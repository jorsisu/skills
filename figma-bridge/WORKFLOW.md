# Figma Bridge Workflow

Detailed instructions for each phase of the Figma → Code workflow.

---

## Contents

- [Phase 1: Extract (Automated)](#phase-1-extract-automated)
  - [Get Node ID](#step-11-get-node-id)
  - [Call MCP Extraction](#step-12-call-mcp-extraction)
  - [Parse Response](#step-13-parse-response)
  - [Output Template](#step-14-output-extraction-template)
- [Phase 2: Map (Assisted)](#phase-2-map-assisted)
  - [Map Typography](#step-21-map-typography)
  - [Map Spacing](#step-22-map-spacing)
  - [Map Colors](#step-23-map-colors)
  - [Map Icons](#step-24-map-icons)
  - [Output Mapping](#step-25-output-token-mapping)
- [Phase 3: Build (Guided)](#phase-3-build-guided)
  - [Structure](#step-31-determine-structure)
  - [Apply Classes](#step-32-apply-classes-priority-order)
  - [Generate JSX](#step-33-generate-jsx)
  - [Semantic HTML](#step-34-semantic-html-considerations)
- [Phase 4: Validate (Checklist)](#phase-4-validate-checklist)
  - [Typography](#step-41-typography-validation)
  - [Spacing](#step-42-spacing-validation)
  - [Colors](#step-43-color-validation)
  - [Icons](#step-44-icon-validation)
  - [Layout](#step-45-layout-validation)
  - [Final Checklist](#step-46-final-checklist)

---

## Phase 1: Extract (Automated)

### Step 1.1: Get Node ID

**From argument:**
```bash
/figma-bridge 123:456
```

**From URL (extract node-id param):**
```bash
# URL: https://figma.com/design/xxx?node-id=123-456
# Extracted: 123:456 (replace hyphen with colon)
```

**From current selection:**
```bash
/figma-bridge
# Uses currently selected node in Figma
```

### Step 1.2: Call MCP Extraction

```typescript
// Primary extraction
mcp__figma-desktop__get_design_context({
  nodeId: "123:456",
  clientLanguages: "typescript",
  clientFrameworks: "react,nextjs"
})

// Optional: Get variable definitions
mcp__figma-desktop__get_variable_defs({
  nodeId: "123:456"
})

// Optional: Get screenshot for reference
mcp__figma-desktop__get_screenshot({
  nodeId: "123:456"
})
```

### Step 1.3: Parse Response

Extract these properties from MCP response:

**Typography:**
- Font family (Primary/Secondary/Serif)
- Font size (px)
- Font weight (400/500/600)
- Line height (% or px)
- Letter spacing (px)
- Text transform (uppercase/none)

**Spacing:**
- Padding (top, right, bottom, left)
- Gap (between children)
- Margin (if applicable)

**Colors:**
- Text color (token or hex)
- Background color (token or hex)
- Border color (token or hex)

**Icons:**
- Icon name
- Width (px)
- Height (px)

**Layout:**
- Direction (row/column)
- Alignment (items, justify)
- Sizing (hug/fill/fixed)

### Step 1.4: Output Extraction Template

```markdown
## Component: [Name from Figma]
**Source:** Figma node `[node-id]`

### Typography
| Element | Font | Size | Weight | Line-height | Letter-spacing |
|---------|------|------|--------|-------------|----------------|
| Heading | Primary | 24px | 500 | 115% | — |
| Body | Primary | 18px | 400 | 140% | — |

### Spacing
| Property | Value |
|----------|-------|
| Padding top | 56px |
| Padding right | 20px |
| Padding bottom | 40px |
| Padding left | 20px |
| Gap | 20px |

### Colors
| Property | Value |
|----------|-------|
| Text | type/type-primary |
| Background | surface/surface-primary |
| Border | stroke/stroke-secondary |

### Icons
| Icon | Size |
|------|------|
| ArrowForward | 20x20px |

### Layout
| Property | Value |
|----------|-------|
| Direction | column |
| Align items | flex-start |
| Justify | flex-start |
| Sizing | fill width, hug height |
```

---

## Phase 2: Map (Assisted)

### Step 2.1: Map Typography

Reference: `.claude/rules/figma-mcp.md` → Section 2.1

**Process:**
1. Match font size + weight + line-height combination
2. Find closest `text-*` class
3. Check if font family matches class default
4. Add font override if needed (`font-sans`, `font-heading`, `font-serif`)

**Example:**
```
Extracted: 24px, 500 weight, 115% line-height
→ Matches: text-h4 (21px→24px responsive, 500, 115%)
→ Default font: font-heading
→ Output: className="text-h4"
```

**Mismatch handling:**
- If properties don't match exactly, note deviation
- Check if value matches at different breakpoint
- Flag for designer review if significant

### Step 2.2: Map Spacing

Reference: `.claude/rules/figma-mcp.md` → Section 2.2

**Lookup table:**
| Figma px | Token |
|----------|-------|
| 4px | `xxxs` |
| 8px | `xxs` |
| 12px | `xs` |
| 16px | `s` |
| 20px | `m` |
| 24px | `lg` |
| 28-32px | `xl` |
| 40px | `2xl` |
| 56px | `3xl` |
| 80px | `4xl` |

**Section padding (responsive):**
- Use `pt-section-top-*` and `pb-section-bottom-*` for section-level padding
- These values change per breakpoint

**Example:**
```
Extracted: padding-top 56px, gap 20px
→ pt-section-top-xl (56px), gap-m (20px)
```

### Step 2.3: Map Colors

Reference: `.claude/rules/figma-mcp.md` → Section 2.3

**Lookup:**
| Figma Token | Class |
|-------------|-------|
| type/type-primary | `text-type-primary` |
| type/type-secondary | `text-type-secondary` |
| type/type-tertiary | `text-type-tertiary` |
| surface/surface-primary | `bg-surface-primary` |
| surface/surface-secondary | `bg-surface-secondary` |
| stroke/stroke-primary | `border-stroke-primary` |
| stroke/stroke-secondary | `border-stroke-secondary` |

**If hex value found:**
- Cross-reference with design system tokens
- Ask designer to confirm intended token
- Never use hex directly

### Step 2.4: Map Icons

Reference: `.claude/rules/figma-mcp.md` → Section 2.4

**Process:**
1. Note exact pixel dimensions from Figma
2. Default icon size is 24px
3. Always pass `size` prop if not 24px

**Example:**
```
Extracted: ArrowForward 20x20px
→ <ArrowForward size={20} />
```

### Step 2.5: Output Token Mapping

```markdown
## Token Mapping

### Typography
| Extracted | Mapped | Notes |
|-----------|--------|-------|
| 24px/500/115% | `text-h4` | Exact match |
| 18px/400/140% | `text-p2` | Exact match |

### Spacing
| Extracted | Mapped | Notes |
|-----------|--------|-------|
| pt 56px | `pt-section-top-xl` | Section padding |
| gap 20px | `gap-m` | Base token |
| px 20px | `px-m` | Base token |

### Colors
| Extracted | Mapped |
|-----------|--------|
| type/type-primary | `text-type-primary` |
| surface/surface-primary | `bg-surface-primary` |

### Icons
| Extracted | Mapped |
|-----------|--------|
| ArrowForward 20px | `<ArrowForward size={20} />` |

### Flags
- ⚠️ None
```

---

## Phase 3: Build (Guided)

### Step 3.1: Determine Structure

**Section-level component:**
```tsx
<section data-theme="light" className="block-module-wrapper">
  <div className="block-module-container">
    <div className="layout-grid">
      {/* content */}
    </div>
  </div>
</section>
```

**Inline component:**
```tsx
<div className="flex gap-m">
  {/* content */}
</div>
```

### Step 3.2: Apply Classes (Priority Order)

1. **Project typography** (`text-h1`, `text-p2`, `text-c1`)
2. **Project spacing** (`gap-m`, `p-lg`, `pt-section-top-xl`)
3. **Project colors** (`text-type-primary`, `bg-surface-secondary`)
4. **Standard Tailwind** (`flex`, `grid`, `items-center`)
5. **Arbitrary values** (only if no token matches)

### Step 3.3: Generate JSX

```tsx
// Component: Hero Section
// Source: Figma node 123:456

export function HeroSection() {
  return (
    <section data-theme="light" className="block-module-wrapper">
      <div className="block-module-container">
        <div className="flex flex-col gap-m pt-section-top-xl pb-section-bottom-l">
          <h1 className="text-h4 text-type-primary">
            Heading Text
          </h1>
          <p className="text-p2 text-type-secondary">
            Body text goes here
          </p>
          <button className="flex items-center gap-xxs text-b1 text-type-primary">
            Learn More
            <ArrowForward size={20} />
          </button>
        </div>
      </div>
    </section>
  );
}
```

### Step 3.4: Semantic HTML Considerations

- Use appropriate tags (`<h1>-<h6>`, `<p>`, `<button>`, `<a>`)
- Add ARIA attributes where needed
- Ensure keyboard accessibility
- Don't use Figma layer names as component names

---

## Phase 4: Validate (Checklist)

### Step 4.1: Typography Validation

| Property | Figma | Implemented | Match |
|----------|-------|-------------|-------|
| Font family | Primary | `font-sans` (default) | ✅ |
| Font size | 24px | `text-h4` (24px at lg:) | ✅ |
| Font weight | 500 | `text-h4` (500) | ✅ |
| Line height | 115% | `text-h4` (115%) | ✅ |
| Letter spacing | — | `text-h4` (none) | ✅ |
| Text transform | none | none | ✅ |

### Step 4.2: Spacing Validation

| Property | Figma | Implemented | Match |
|----------|-------|-------------|-------|
| Padding top | 56px | `pt-section-top-xl` | ✅ |
| Padding bottom | 40px | `pb-section-bottom-l` | ✅ |
| Gap | 20px | `gap-m` | ✅ |

### Step 4.3: Color Validation

| Property | Figma | Implemented | Match |
|----------|-------|-------------|-------|
| Text | type/primary | `text-type-primary` | ✅ |
| Background | surface/primary | `bg-surface-primary` | ✅ |

### Step 4.4: Icon Validation

| Icon | Figma Size | Implemented | Match |
|------|-----------|-------------|-------|
| ArrowForward | 20x20px | `size={20}` | ✅ |

### Step 4.5: Layout Validation

| Property | Figma | Implemented | Match |
|----------|-------|-------------|-------|
| Direction | column | `flex-col` | ✅ |
| Align | start | `items-start` | ✅ |
| Justify | start | default | ✅ |

### Step 4.6: Final Checklist

- [ ] All typography uses `text-*` classes
- [ ] All spacing uses project tokens
- [ ] All colors use project tokens
- [ ] No hardcoded hex values
- [ ] No arbitrary values where token exists
- [ ] Icons have explicit size
- [ ] Semantic HTML used
- [ ] Responsive behavior verified

---

## Workflow Summary

```
1. EXTRACT
   └─ Call MCP → Parse response → Output template

2. MAP
   └─ Reference token tables → Match values → Flag mismatches

3. BUILD
   └─ Generate JSX → Apply class priority → Use semantic HTML

4. VALIDATE
   └─ Compare values → Fill checklist → Confirm matches
```
