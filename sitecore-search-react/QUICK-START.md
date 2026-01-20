# Quick Start Guide - Sitecore Search

Step-by-step guide to implement your first Sitecore Search widget in a Next.js project.

## Prerequisites

- Next.js 15+ application
- React 18+
- TypeScript configured
- Node.js 18+ and npm/yarn

## Step 1: Install Packages (2 min)

```bash
npm install @sitecore-search/react @sitecore-search/ui @sitecore-search/data
```

**Package purposes:**
- `@sitecore-search/react` - Core React SDK with hooks
- `@sitecore-search/ui` - Pre-built UI components
- `@sitecore-search/data` - Data types and utilities

## Step 2: Get API Credentials (3 min)

From Sitecore Search dashboard:

1. Navigate to **Administration** → **API Keys**
2. Copy:
   - **Customer Key** (public identifier)
   - **API Key** (authentication key)
   - **Environment** (`prod` or `staging`)

## Step 3: Configure Environment Variables (2 min)

Create or update `.env.local`:

```bash
# Sitecore Search Credentials
NEXT_PUBLIC_SEARCH_CUSTOMER_KEY=your_customer_key_here
NEXT_PUBLIC_SEARCH_API_KEY=your_api_key_here
NEXT_PUBLIC_SEARCH_ENV=prod
```

⚠️ **All three required.** Missing credentials = silent failures.

**Don't forget:**
```bash
# Restart dev server to load new variables
npm run dev
```

## Step 4: Create SearchProvider (5 min)

**File:** `src/lib/search/providers/SearchProvider.tsx`

```typescript
import React from 'react';
import { PageController, WidgetsProvider } from '@sitecore-search/react';
import { Environment } from '@sitecore-search/data';

interface SearchProviderProps {
  children: React.ReactNode;
}

const SearchProvider = ({ children }: SearchProviderProps) => {
  const context = PageController.getContext();

  // Set page context with current URI
  context.setPage({
    ...context.getPage(),
    uri: typeof window !== 'undefined' ? window.location.pathname : '',
  });

  // Set locale (required by Sitecore Search API)
  context.setLocale({
    country: 'us',
    language: 'en',
  });

  const env = process.env.NEXT_PUBLIC_SEARCH_ENV as Environment;
  const customerKey = process.env.NEXT_PUBLIC_SEARCH_CUSTOMER_KEY;
  const apiKey = process.env.NEXT_PUBLIC_SEARCH_API_KEY;

  if (!customerKey || !apiKey) {
    console.error('❌ Search configuration missing required parameters');
    return <>{children}</>;
  }

  return (
    <WidgetsProvider env={env} customerKey={customerKey} apiKey={apiKey}>
      {children}
    </WidgetsProvider>
  );
};

export default SearchProvider;
```

**Template:** `templates/SearchProvider.tsx`

## Step 5: Add Provider to App (2 min)

**File:** `src/pages/_app.tsx`

```typescript
import type { AppProps } from 'next/app';
import SearchProvider from '@/lib/search/providers/SearchProvider';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SearchProvider>
      <Component {...pageProps} />
    </SearchProvider>
  );
}
```

**Verify:** Check console for "Search configuration missing" errors.

## Step 6: Create SearchUrlManager Singleton (15 min)

**File:** `src/atoms/search/utils/searchUrlManager.ts`

**Full implementation:** See `templates/SearchUrlManager.ts`

**Key features:**
- Singleton pattern for global state
- URL parsing and building
- Auto-reset pagination on search/facet changes
- Queue system for async updates
- Debouncing (100ms)

**Detailed guide:** `SEARCHURLMANAGER.md`

## Step 7: Create Basic Search Widget (15 min)

**File:** `src/components/search/SimpleSearchWidget.tsx`

```typescript
import { widget, useSearchResults } from '@sitecore-search/react';
import { WidgetDataType } from '@sitecore-search/data';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { searchUrlManager } from '@/atoms/search/utils/searchUrlManager';

const SimpleSearch = () => {
  const router = useRouter();
  const { widgetRef, actions, queryResult } = useSearchResults();
  const [searchTerm, setSearchTerm] = useState('');

  // Initialize from URL on mount
  useEffect(() => {
    if (!router.isReady) return;

    const initialState = searchUrlManager.initialize(router, {
      onKeyphraseChange: ({ keyphrase }) => {
        actions.onKeyphraseChange({ keyphrase });
        setSearchTerm(keyphrase);
      },
      onPageNumberChange: ({ page }) => actions.onPageNumberChange({ page }),
      setSearchTerm: (term) => setSearchTerm(term),
    });

    if (initialState.searchTerm) {
      setSearchTerm(initialState.searchTerm);
    }
  }, [router.isReady]);

  // Sync on URL change (back/forward button)
  useEffect(() => {
    if (!router.isReady) return;
    searchUrlManager.syncFromUrl(router);
  }, [router.query, router.isReady]);

  // Search submission
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Update SDK
    actions.onKeyphraseChange({ keyphrase: searchTerm });

    // 2. Update URL
    if (router.isReady) {
      await searchUrlManager.setSearchTerm(router, searchTerm);
    }
  };

  const results = (queryResult.data?.content as any[]) || [];
  const totalResults = queryResult.data?.total_item || 0;

  return (
    <div ref={widgetRef} className="search-widget">
      {/* Search Input */}
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search..."
        />
        <button type="submit">Search</button>
      </form>

      {/* Results Summary */}
      {totalResults > 0 && <p>Found {totalResults} results</p>}

      {/* Results List */}
      <ul className="results-list">
        {results.map((item) => (
          <li key={item.id}>
            <h3>{item.title || 'Untitled'}</h3>
            {item.description && <p>{item.description}</p>}
            {item.url && <a href={item.url}>Read more</a>}
          </li>
        ))}
      </ul>

      {/* Empty State */}
      {totalResults === 0 && searchTerm && (
        <p>No results found for "{searchTerm}"</p>
      )}
    </div>
  );
};

// CRITICAL: Wrap with widget() HOC
export default widget(SimpleSearch, WidgetDataType.SEARCH_RESULTS, 'content');
```

**Template:** `templates/BasicSearchWidget.tsx`

## Step 8: Use Widget in Page (3 min)

**File:** `src/pages/search.tsx`

```typescript
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

## Step 9: Test Your Implementation (5 min)

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Navigate to:** `http://localhost:3000/search`

3. **Test checklist:**
   - [ ] Search input accepts text
   - [ ] Form submission triggers search
   - [ ] Results display correctly
   - [ ] URL updates with `?q=searchterm`
   - [ ] Browser back button works
   - [ ] Page refresh preserves search term
   - [ ] Shared URL works in new tab

## Troubleshooting

### No Results Appearing

**Check:**
1. API credentials correct in `.env.local`
2. Dev server restarted after adding env vars
3. Network tab shows successful API responses (200 status)
4. Content is indexed in Sitecore Search dashboard

### TypeScript Errors

Add type definitions:
```typescript
interface SearchItem {
  id: string;
  title?: string;
  description?: string;
  url?: string;
  [key: string]: any;
}

const results = (queryResult.data?.content as SearchItem[]) || [];
```

### Widget Not Rendering

**Verify:**
1. `widget()` HOC wraps component
2. `WidgetDataType.SEARCH_RESULTS` specified
3. SearchProvider in component tree
4. No console errors

### "Search configuration missing"

**Fix:**
1. Check `.env.local` has all 3 variables
2. Restart dev server
3. Verify variable names match exactly

## Next Steps

Now that you have basic search working:

1. **Add URL Synchronization** → Already done! ✅
2. **Add Facets/Filters** → See `FACETS.md`
3. **Add Pagination** → See `REFERENCE.md` "Pagination"
4. **Custom Hooks** → See `templates/CustomSearchHook.ts`
5. **Review Anti-Patterns** → See `ANTI-PATTERNS.md` ⚠️

## Verification Checklist

Before proceeding:
- [ ] Packages installed
- [ ] Environment variables set
- [ ] SearchProvider wraps app
- [ ] SearchUrlManager singleton created
- [ ] Basic widget renders
- [ ] Search returns results
- [ ] URL updates on search
- [ ] Back button works
- [ ] No console errors

✅ **All checked?** You're ready for `FACETS.md`

## Implementation Time

- **Minimum:** ~30 min (basic search only)
- **Recommended:** ~1 hour (with testing and troubleshooting)

---

**Questions?** See `TROUBLESHOOTING.md` for common issues.
