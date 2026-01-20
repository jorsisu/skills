/**
 * Search Widget with Facets Template
 *
 * Complete search widget with facet filtering.
 * Demonstrates proper facet implementation with URL sync.
 *
 * Features:
 * - Search input with form submission
 * - Checkbox facet filters
 * - Clear all filters
 * - Results list
 * - Pagination
 * - Full URL synchronization
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
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

const SearchWithFacetsWidget = () => {
  const router = useRouter();
  const { widgetRef, actions, queryResult } = useSearchResults<SearchItem>();

  const [searchInputValue, setSearchInputValue] = useState('');

  // Initialize from URL
  useEffect(() => {
    if (!router.isReady) return;

    const initialState = searchUrlManager.initialize(router, {
      onKeyphraseChange: ({ keyphrase }) => {
        actions.onKeyphraseChange({ keyphrase });
        setSearchInputValue(keyphrase);
      },
      onPageNumberChange: ({ page }) => actions.onPageNumberChange({ page }),
      onFacetClick: (payload) => actions.onFacetClick(payload),
      setSearchTerm: (term) => setSearchInputValue(term),
    });

    if (initialState.searchTerm) {
      setSearchInputValue(initialState.searchTerm);
    }
  }, [router.isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync on URL changes
  useEffect(() => {
    if (!router.isReady) return;
    searchUrlManager.syncFromUrl(router);
  }, [router.query, router.isReady]);

  // Handle search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    actions.onKeyphraseChange({ keyphrase: searchInputValue });

    if (router.isReady) {
      await searchUrlManager.setSearchTerm(router, searchInputValue);
    }
  };

  // Handle facet selection
  const handleFacetClick = async (facetId: string, facetValueId: string, checked: boolean) => {
    const facets = queryResult.data?.facet || [];
    const facetIndex = facets.findIndex((f) => f.name === facetId) || 0;

    // Update SDK - CRITICAL: Use facetValue.id NOT facetValue.text
    actions.onFacetClick({
      facetId,
      facetValueId, // Must be facetValue.id
      type: 'valueId',
      checked,
      facetIndex,
    });

    // Update URL
    if (router.isReady) {
      if (checked) {
        await searchUrlManager.addFacet(router, facetId, facetValueId);
      } else {
        await searchUrlManager.removeFacet(router, facetId, facetValueId);
      }
    }
  };

  // Clear all filters
  const handleClearAll = async () => {
    // Clear SDK
    actions.onClearFilters();
    actions.onKeyphraseChange({ keyphrase: '' });

    // Clear local state
    setSearchInputValue('');

    // Clear URL
    if (router.isReady) {
      await searchUrlManager.clearAllFilters(router);
    }
  };

  // Handle pagination
  const handlePageChange = async (page: number) => {
    actions.onPageNumberChange({ page });

    if (router.isReady) {
      await searchUrlManager.setPage(router, page);
    }
  };

  // Get selected facet values from URL
  const getSelectedFacetValues = (facetId: string): string[] => {
    if (!router.isReady || !router.query.facets) return [];

    try {
      const params = new URLSearchParams(router.query.facets as string);
      return Array.from(params.entries())
        .filter(([id]) => id === facetId)
        .map(([, value]) => value);
    } catch {
      return [];
    }
  };

  // Get facets from API response
  const facets = queryResult.data?.facet || [];
  const categoryFacet = facets.find((f) => f.name === 'category');
  const typeFacet = facets.find((f) => f.name === 'type');

  // Get results
  const results = (queryResult.data?.content as SearchItem[]) || [];
  const totalResults = queryResult.data?.total_item || 0;
  const limit = queryResult.data?.limit || 24;
  const offset = queryResult.data?.offset || 0;
  const currentPage = Math.floor(offset / limit) + 1;
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

          {/* Category Facet */}
          {categoryFacet && categoryFacet.value && categoryFacet.value.length > 0 && (
            <div className="facet-group">
              <h4>Category</h4>
              {categoryFacet.value.map((facetValue) => {
                const selectedValues = getSelectedFacetValues('category');
                const isSelected = selectedValues.includes(facetValue.id);

                return (
                  <label key={facetValue.id} className="facet-checkbox">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) =>
                        handleFacetClick('category', facetValue.id, e.target.checked)
                      }
                    />
                    <span>
                      {facetValue.text} ({facetValue.count})
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          {/* Type Facet */}
          {typeFacet && typeFacet.value && typeFacet.value.length > 0 && (
            <div className="facet-group">
              <h4>Type</h4>
              {typeFacet.value.map((facetValue) => {
                const selectedValues = getSelectedFacetValues('type');
                const isSelected = selectedValues.includes(facetValue.id);

                return (
                  <label key={facetValue.id} className="facet-checkbox">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleFacetClick('type', facetValue.id, e.target.checked)}
                    />
                    <span>
                      {facetValue.text} ({facetValue.count})
                    </span>
                  </label>
                );
              })}
            </div>
          )}
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

