/**
 * Search Widget with Facets Template (App Router)
 *
 * Complete search widget with facet filtering.
 * Demonstrates proper facet implementation with URL sync.
 *
 * Features:
 * - Search input with form submission
 * - Checkbox facet filters with clear-and-reapply strategy
 * - Fixed Facet Contract (facet categories remain visible even when empty)
 * - Clear all filters
 * - Results list
 * - Pagination
 * - Full URL synchronization via SearchUrlManager
 *
 * IMPORTANT: Facet clicks use the clear-and-reapply strategy from useSiteSearch.
 * The URL is the source of truth. On each facet change:
 *   1. Update URL state via searchUrlManager
 *   2. Clear SDK filters: actions.onClearFilters()
 *   3. Re-apply keyphrase
 *   4. Re-apply remaining facets from searchUrlManager state using type: 'text'
 */

'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { widget, useSearchResults } from '@sitecore-search/react';
import { WidgetDataType, SearchResponseFacet } from '@sitecore-search/data';
import { searchUrlManager } from '@/atoms/search/utils/searchUrlManager';

interface SearchItem {
  id: string;
  title?: string;
  description?: string;
  url?: string;
  category?: string;
  type?: string;
}

interface DisplayFacet {
  name: string;
  label: string;
  values: SearchResponseFacet['value'];
  isDisabled: boolean;
}

// Fixed Facet Contract (Pattern 5): Facet categories remain visible
// even when Sitecore Search omits empty facets from the response.
const FIXED_FACET_CONFIG = [
  { name: 'category', label: 'Category' },
  { name: 'type', label: 'Type' },
] as const;

const buildDisplayFacets = (
  facets: SearchResponseFacet[] = [],
): DisplayFacet[] => {
  const facetsByName = new Map(facets.map((facet) => [facet.name, facet]));

  return FIXED_FACET_CONFIG.map((config) => {
    const facet = facetsByName.get(config.name);
    const values = (facet?.value || []).filter((value) => value.count > 0);

    return {
      name: config.name,
      label: config.label,
      values,
      isDisabled: values.length === 0,
    };
  });
};

const SearchWithFacetsWidget = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const initializedRef = useRef(false);

  const { widgetRef, actions, queryResult } = useSearchResults<SearchItem>();

  const [searchInputValue, setSearchInputValue] = useState(
    searchParams.get('q') || ''
  );
  const [currentPage, setCurrentPage] = useState(1);

  // Initialize SearchUrlManager on mount
  useEffect(() => {
    if (initializedRef.current) return;

    const initialState = searchUrlManager.initialize(searchParams, {
      onKeyphraseChange: ({ keyphrase }) => {
        actions.onKeyphraseChange({ keyphrase });
        setSearchInputValue(keyphrase);
      },
      onPageNumberChange: ({ page }) => {
        setCurrentPage(page);
        actions.onPageNumberChange({ page });
      },
      onFacetClick: (payload) => actions.onFacetClick(payload),
      onClearFilters: () => {
        actions.onClearFilters();
        actions.onKeyphraseChange({ keyphrase: '' });
        setSearchInputValue('');
        setCurrentPage(1);
      },
      onClearFacets: () => {
        // Clear SDK filters but preserve keyphrase
        const term = searchUrlManager.getCurrentState().searchTerm || '';
        actions.onClearFilters();
        if (term) {
          actions.onKeyphraseChange({ keyphrase: term });
        }
        setCurrentPage(1);
        actions.onPageNumberChange({ page: 1 });
      },
    });

    if (initialState.searchTerm) {
      setSearchInputValue(initialState.searchTerm);
    }
    if (initialState.page) {
      setCurrentPage(initialState.page);
    }

    initializedRef.current = true;
  }, [searchParams, actions]);

  // Sync on URL changes (back/forward navigation)
  useEffect(() => {
    if (initializedRef.current) {
      searchUrlManager.syncFromUrl(searchParams);
    }
  }, [searchParams]);

  // Handle search
  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      actions.onKeyphraseChange({ keyphrase: searchInputValue });
      actions.onPageNumberChange({ page: 1 });
      setCurrentPage(1);

      await searchUrlManager.setSearchTerm(
        router,
        pathname,
        searchParams,
        searchInputValue
      );
    },
    [actions, router, pathname, searchParams, searchInputValue]
  );

  // Handle facet selection using clear-and-reapply strategy
  const handleFacetClick = useCallback(
    async (facetId: string, facetValueText: string, checked: boolean) => {
      // 1. Update URL state (source of truth)
      if (checked) {
        await searchUrlManager.addFacet(
          router,
          pathname,
          searchParams,
          facetId,
          facetValueText
        );
      } else {
        await searchUrlManager.removeFacet(
          router,
          pathname,
          searchParams,
          facetId,
          facetValueText
        );
      }

      // 2. Clear SDK filters
      const term = searchUrlManager.getCurrentState().searchTerm || '';
      actions.onClearFilters();

      // 3. Re-apply keyphrase
      if (term) {
        actions.onKeyphraseChange({ keyphrase: term });
      }

      // 4. Re-apply remaining facets from URL state using text-based type
      const remainingFacets = searchUrlManager.getCurrentState().facets || {};
      Object.entries(remainingFacets).forEach(([fId, textValues]) => {
        textValues.forEach((fText) => {
          actions.onFacetClick({
            facetId: fId,
            facetValueText: fText,
            checked: true,
            type: 'text',
            facetIndex: 0,
          });
        });
      });

      // 5. Reset pagination
      setCurrentPage(1);
      actions.onPageNumberChange({ page: 1 });
    },
    [actions, router, pathname, searchParams]
  );

  // Clear all filters
  const handleClearAll = useCallback(async () => {
    await searchUrlManager.clearAllFilters(router, pathname, searchParams);
  }, [router, pathname, searchParams]);

  // Handle pagination
  const handlePageChange = useCallback(
    async (page: number) => {
      setCurrentPage(page);
      actions.onPageNumberChange({ page });
      await searchUrlManager.setPage(router, pathname, searchParams, page);
    },
    [actions, router, pathname, searchParams]
  );

  // Get selected facet values from URL search params
  const getSelectedFacetValues = useCallback(
    (facetId: string): string[] => {
      const facetsParam = searchParams.get('facets');
      if (!facetsParam) return [];

      try {
        const params = new URLSearchParams(facetsParam);
        return Array.from(params.entries())
          .filter(([id]) => id === facetId)
          .map(([, value]) => value);
      } catch {
        return [];
      }
    },
    [searchParams]
  );

  // Build display facets from API response
  const displayFacets = useMemo(
    () => buildDisplayFacets(queryResult.data?.facet || []),
    [queryResult.data?.facet],
  );

  // Get results
  const results = (queryResult.data?.content as SearchItem[]) || [];
  const totalResults = queryResult.data?.total_item || 0;
  const limit = queryResult.data?.limit || 24;
  const offset = queryResult.data?.offset || 0;
  const totalPages = Math.ceil(totalResults / limit);

  return (
    <div ref={widgetRef} className="search-widget-with-facets">
      {/* Search Form */}
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={searchInputValue}
          onChange={(e) => setSearchInputValue(e.target.value)}
          placeholder="Search..."
        />
        <button type="submit">Search</button>
      </form>

      <div className="search-layout">
        {/* Facets Sidebar */}
        <aside className="facets-sidebar">
          <div className="facets-header">
            <h3>Filters</h3>
            <button onClick={handleClearAll} className="clear-all-button">
              Clear All
            </button>
          </div>

          {displayFacets.map((facet) => (
            <div
              key={facet.name}
              className={facet.isDisabled ? 'facet-group facet-group-disabled' : 'facet-group'}
              aria-disabled={facet.isDisabled}
            >
              <h4>{facet.label}</h4>
              {facet.values.length > 0 ? (
                facet.values.map((facetValue) => {
                  const selectedValues = getSelectedFacetValues(facet.name);
                  const isSelected = selectedValues.includes(facetValue.text);

                  return (
                    <label key={facetValue.id} className="facet-checkbox">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) =>
                          handleFacetClick(facet.name, facetValue.text, e.target.checked)
                        }
                        disabled={facet.isDisabled}
                      />
                      <span>
                        {facetValue.text} ({facetValue.count})
                      </span>
                    </label>
                  );
                })
              ) : (
                <p>No options available</p>
              )}
            </div>
          ))}
        </aside>

        {/* Results Area */}
        <main className="results-area">
          {/* Summary */}
          {totalResults > 0 && (
            <p className="results-summary">
              {offset + 1}-{Math.min(offset + results.length, totalResults)} of {totalResults}{' '}
              results
            </p>
          )}

          {/* Results */}
          {results.length > 0 ? (
            <ul className="results-list">
              {results.map((item) => (
                <li key={item.id}>
                  <h3>{item.title || 'Untitled'}</h3>
                  {item.description && <p>{item.description}</p>}
                  {item.url && <a href={item.url}>Read more</a>}
                </li>
              ))}
            </ul>
          ) : (
            <p>No results found</p>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default widget(SearchWithFacetsWidget, WidgetDataType.SEARCH_RESULTS, 'content');
