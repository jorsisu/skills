# Quick Start — Sitecore Search (App Router)

## Contents
- [Install Packages](#step-1-install-packages)
- [Environment Variables](#step-2-environment-variables)
- [SearchProvider](#step-3-create-searchprovider)
- [Add Provider to Layout](#step-4-add-provider-to-layout)
- [SearchUrlManager Singleton](#step-5-create-searchurlmanager-singleton)
- [Basic Search Widget](#step-6-create-basic-search-widget)
- [Use Widget](#step-7-use-widget-in-page)
- [Test](#step-8-test)
- [Next Steps](#next-steps)

## Step 1: Install Packages

```bash
npm install @sitecore-search/react @sitecore-search/ui @sitecore-search/data
```

## Step 2: Environment Variables

`.env.local`:
```bash
NEXT_PUBLIC_SEARCH_CUSTOMER_KEY=your_customer_key_here
NEXT_PUBLIC_SEARCH_API_KEY=your_api_key_here
NEXT_PUBLIC_SEARCH_ENV=prod
```

All three required. Restart dev server after changes.

## Step 3: Create SearchProvider

**Template:** `templates/SearchProvider.tsx`
**Target:** `src/lib/search/providers/SearchProvider.tsx`

## Step 4: Add Provider to Layout

App Router uses layout files, not `_app.tsx`:

```typescript
// src/app/layout.tsx (or appropriate layout)
import SearchProvider from '@/lib/search/providers/SearchProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <SearchProvider>
          {children}
        </SearchProvider>
      </body>
    </html>
  );
}
```

## Step 5: Create SearchUrlManager Singleton

**Full implementation:** `templates/SearchUrlManager.ts`
**Target:** `src/atoms/search/utils/searchUrlManager.ts`
**Detailed guide:** `SEARCHURLMANAGER.md`

Key features: singleton, URL parsing, queue system, debouncing, auto-reset pagination.

## Step 6: Create Basic Search Widget

**Full implementation:** `templates/BasicSearchWidget.tsx`
**Target:** `src/components/search/SimpleSearchWidget.tsx`

Core pattern:
```typescript
'use client';

import { widget, useSearchResults } from '@sitecore-search/react';
import { WidgetDataType } from '@sitecore-search/data';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { searchUrlManager } from '@/atoms/search/utils/searchUrlManager';

const SimpleSearch = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { widgetRef, actions, queryResult } = useSearchResults();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const initializedRef = useRef(false);

  // Initialize from URL on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const initialState = searchUrlManager.initialize(searchParams, {
      onKeyphraseChange: ({ keyphrase }) => {
        actions.onKeyphraseChange({ keyphrase });
        setSearchTerm(keyphrase);
      },
      onPageNumberChange: ({ page }) => actions.onPageNumberChange({ page }),
    });

    if (initialState.searchTerm) setSearchTerm(initialState.searchTerm);
  }, [searchParams, actions]);

  // Sync on URL change (back/forward)
  useEffect(() => {
    if (initializedRef.current) searchUrlManager.syncFromUrl(searchParams);
  }, [searchParams]);

  // Search submission
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    actions.onKeyphraseChange({ keyphrase: searchTerm });
    await searchUrlManager.setSearchTerm(router, pathname, searchParams, searchTerm);
  };

  // ... render search form and results
  return <div ref={widgetRef}>{/* ... */}</div>;
};

export default widget(SimpleSearch, WidgetDataType.SEARCH_RESULTS, 'content');
```

## Step 7: Use Widget in Page

```typescript
// src/app/search/page.tsx
import SimpleSearchWidget from '@/components/search/SimpleSearchWidget';

export default function SearchPage() {
  return (
    <div>
      <h1>Site Search</h1>
      <SimpleSearchWidget />
    </div>
  );
}
```

## Step 8: Test

Checklist:
- [ ] Search input accepts text and form submits
- [ ] Results display correctly
- [ ] URL updates with `?q=searchterm`
- [ ] Browser back button works
- [ ] Page refresh preserves search term
- [ ] Shared URL works in new tab
- [ ] No console errors

## Next Steps

1. **Add Facets/Filters** → `FACETS.md`
2. **Add Load More Pagination** → `LOAD-MORE-PAGINATION.md`
3. **Custom Hooks** → `templates/CustomSearchHook.ts`
4. **Review Anti-Patterns** → `ANTI-PATTERNS.md`

## Troubleshooting

- **No results?** Check env vars, restart dev server, verify content indexed in Sitecore Search dashboard
- **Widget not rendering?** Verify `widget()` HOC wraps export, SearchProvider in component tree, `widgetRef` attached
- **TypeScript errors?** Add `SearchItem` interface, cast `queryResult.data?.content as SearchItem[]`

Full troubleshooting: `TROUBLESHOOTING.md`
