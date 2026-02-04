# Figma Extraction Template

Copy and fill this template during Phase 1 extraction.

---

## Component: [Name]

**Source:** Figma node `[node-id]`
**Breakpoint:** [Desktop 1440 / Tablet 768 / Mobile 375]
**Extracted:** [Date]

---

## Typography

| Element | Font Family | Size | Weight | Line-height | Letter-spacing | Transform |
|---------|-------------|------|--------|-------------|----------------|-----------|
| [Heading] | [Primary/Secondary/Serif] | [X]px | [400/500/600] | [X]% | [X]px or — | [uppercase/none] |
| [Body] | | | | | | |
| [Button] | | | | | | |
| [Caption] | | | | | | |

---

## Spacing

| Property | Value |
|----------|-------|
| Padding top | [X]px |
| Padding right | [X]px |
| Padding bottom | [X]px |
| Padding left | [X]px |
| Gap | [X]px |
| Margin top | [X]px or — |
| Margin bottom | [X]px or — |

---

## Colors

| Property | Figma Token | Hex (if no token) |
|----------|-------------|-------------------|
| Text primary | [type/type-primary] | |
| Text secondary | [type/type-secondary] | |
| Background | [surface/surface-primary] | |
| Border | [stroke/stroke-primary] | |

---

## Icons

| Icon Name | Width | Height | Color |
|-----------|-------|--------|-------|
| [IconName] | [X]px | [X]px | [token/currentColor] |

---

## Layout

| Property | Value |
|----------|-------|
| Direction | [row/column] |
| Align items | [start/center/end/stretch] |
| Justify content | [start/center/end/between/around] |
| Width sizing | [hug/fill/fixed Xpx] |
| Height sizing | [hug/fill/fixed Xpx] |
| Wrap | [wrap/nowrap] |

---

## Other Properties

| Property | Value |
|----------|-------|
| Border radius | [X]px |
| Border width | [X]px |
| Box shadow | [none/values] |
| Opacity | [100%/X%] |

---

## Notes

- [Any special considerations]
- [Designer notes]
- [Responsive behavior notes]

---

## Token Mapping (Phase 2)

Fill after extraction:

### Typography Mapping
| Extracted | Mapped Class | Match? |
|-----------|--------------|--------|
| [Xpx/weight/lh] | `text-[class]` | ✅/⚠️ |

### Spacing Mapping
| Extracted | Mapped Token | Match? |
|-----------|--------------|--------|
| [X]px | `[token]` | ✅/⚠️ |

### Color Mapping
| Extracted | Mapped Class | Match? |
|-----------|--------------|--------|
| [token/hex] | `[class]` | ✅/⚠️ |

### Flags
- ⚠️ [Any mismatches or items needing designer review]
