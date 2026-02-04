# Figma Bridge Troubleshooting

Common issues and solutions when using the Figma Bridge workflow.

---

## MCP Issues

### "Figma MCP not available"

**Symptoms:**
- MCP tool calls fail
- Connection timeout
- "Server not found" errors

**Solutions:**
1. Ensure Figma Desktop is running
2. Check Figma MCP plugin is installed and enabled
3. Restart Figma Desktop
4. Check `.claude/settings.local.json` has MCP permissions:
   ```json
   "permissions": {
     "allow": [
       "mcp__figma-desktop__get_design_context",
       "mcp__figma-desktop__get_screenshot",
       "mcp__figma-desktop__get_metadata",
       "mcp__figma-desktop__get_variable_defs"
     ]
   }
   ```

**HARD STOP:** Cannot proceed without MCP connection.

---

### "No node selected"

**Symptoms:**
- Empty response from MCP
- "Node not found" error

**Solutions:**
1. Select a node/frame in Figma before invoking
2. Or provide node ID explicitly: `/figma-bridge 123:456`
3. Get node ID from Figma URL:
   ```
   URL: https://figma.com/design/xxx?node-id=123-456
   Node ID: 123:456 (replace hyphen with colon)
   ```

---

### "Invalid node ID format"

**Symptoms:**
- MCP returns error
- "Cannot find node" message

**Solutions:**
- Node ID format: `123:456` (numbers separated by colon)
- From URL: `node-id=123-456` → `123:456` (hyphen to colon)
- Ensure node exists in the current file

---

## Token Mapping Issues

### "Can't find matching text class"

**Symptoms:**
- Extracted typography doesn't match any `text-*` class
- Multiple properties mismatch

**Solutions:**
1. Extract ALL properties (not just font size):
   - Size, weight, line-height, letter-spacing
2. Check responsive values:
   - `text-h1` is 30px on mobile, 56px on desktop
   - Value may match at different breakpoint
3. Verify font family:
   - Headings default to `font-heading`
   - Paragraphs default to `font-sans`

**If no match exists:**
- Use closest class + document deviation
- Flag for designer review
- Consider if design uses non-standard values

---

### "Spacing token doesn't match exactly"

**Symptoms:**
- Figma shows 22px, nearest token is 20px or 24px

**Solutions:**
1. Check if token is responsive (value changes per breakpoint)
2. Use closest token if within 2-4px for consistency
3. Document deviation in PR if using arbitrary value:
   ```tsx
   // Figma: 22px, using closest token 24px (lg)
   className="gap-lg"

   // Or if intentional deviation:
   // Figma: 22px (intentional, per designer)
   className="gap-[22px]"
   ```

---

### "Color doesn't match any token"

**Symptoms:**
- Figma shows hex value instead of token
- Slightly different shade than expected

**Solutions:**
1. Designer may have used local override
2. Cross-reference with design system tokens
3. Ask designer: "Which token should this be?"
4. Never use hex directly:
   ```tsx
   // ❌ text-[#0F172A]
   // ✅ text-type-primary (after confirming with designer)
   ```

---

### "Icon size doesn't have a standard token"

**Symptoms:**
- Figma shows 18px or 28px icon
- Not in standard 16/20/24/32 sizes

**Solutions:**
- Icons accept any numeric `size` prop:
  ```tsx
  <Icon size={18} />  // Valid
  <Icon size={28} />  // Valid
  ```
- Always use exact Figma pixel value
- No need for arbitrary Tailwind values for icons

---

## Build Issues

### "Generated code doesn't match design"

**Symptoms:**
- Visual differences between Figma and implementation
- Spacing looks off
- Typography doesn't match

**Solutions:**
1. Re-run Phase 1 extraction (values may have been misread)
2. Check breakpoint (viewing mobile vs desktop?)
3. Verify responsive token values in `.claude/rules/figma-mcp.md`
4. Run Phase 4 validation checklist
5. Compare specific properties:
   ```typescript
   // In browser DevTools, check computed styles:
   // - font-size, font-weight, line-height
   // - padding, margin, gap
   // - color values
   ```

---

### "Arbitrary values appearing in code"

**Symptoms:**
- Code has `gap-[22px]` or `p-[18px]`
- Want to use tokens instead

**Solutions:**
1. Check token tables in `.claude/rules/figma-mcp.md`
2. Map to closest token if within 2-4px:
   ```tsx
   // gap-[22px] → gap-lg (24px)
   // p-[18px] → p-s (16px) or p-m (20px)
   ```
3. If value is intentionally non-standard:
   - Document with comment
   - Flag for designer review

---

### "Layout doesn't match Auto Layout"

**Symptoms:**
- Flex direction wrong
- Alignment off
- Sizing behavior different

**Solutions:**
1. Map Figma Auto Layout → CSS:
   | Figma | CSS |
   |-------|-----|
   | Horizontal | `flex-row` |
   | Vertical | `flex-col` |
   | Align: Top/Left | `items-start` |
   | Align: Center | `items-center` |
   | Align: Bottom/Right | `items-end` |
   | Justify: Start | default |
   | Justify: Center | `justify-center` |
   | Justify: End | `justify-end` |
   | Justify: Space Between | `justify-between` |
   | Hug | `w-fit` / `h-fit` |
   | Fill | `w-full` / `h-full` / `flex-1` |
   | Fixed | `w-[Xpx]` / `h-[Xpx]` |

---

## Validation Issues

### "Phase 4 checklist shows mismatches"

**Symptoms:**
- One or more properties don't match

**Solutions:**
1. Identify which property doesn't match
2. Re-check Phase 2 mapping
3. Update code to match correct token
4. If intentional deviation:
   - Document reason in code comment
   - Note in PR description

---

### "Responsive behavior doesn't match"

**Symptoms:**
- Looks correct on desktop, wrong on mobile
- Or vice versa

**Solutions:**
1. Project tokens are responsive by default
2. Check token values at each breakpoint in `.claude/rules/figma-mcp.md`
3. Figma may show only one breakpoint - clarify with designer
4. Use breakpoint prefixes if needed:
   ```tsx
   className="text-h3 lg:text-h2"  // Different sizes per breakpoint
   ```

---

## Quick Fixes Reference

| Problem | Quick Fix |
|---------|-----------|
| MCP not working | Restart Figma Desktop |
| No node selected | Add node ID to command |
| Text class mismatch | Check all 4 properties |
| Spacing off by 2-4px | Use closest token |
| Unknown hex color | Ask designer for token |
| Icon size non-standard | Use exact `size={X}` |
| Layout wrong | Check Auto Layout mapping |
| Responsive mismatch | Verify breakpoint values |

---

## When to HARD STOP

**Do not proceed if:**
1. ❌ Figma MCP is unavailable
2. ❌ Node cannot be found
3. ❌ Designer hasn't finalized design
4. ❌ Multiple significant token mismatches (needs design review)

**Escalate to designer if:**
- Multiple colors don't match tokens
- Spacing is consistently off by >4px
- Typography doesn't match any class
- Design seems to use non-system values
