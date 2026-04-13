/**
 * Basic Search Widget Template (App Router)
 *
 * Simple search widget with input, results, and pagination.
 * Copy and adapt for your needs.
 *
 * Features:
 * - Controlled search input with form submission
 * - Results list with basic item display
 * - Empty state and loading state
 * - Results summary
 * - Basic pagination
 * - URL state synchronization via SearchUrlManager
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { widget, useSearchResults } from '@sitecore-search/react';
import { WidgetDataType } from '@sitecore-search/data';
import { searchUrlManager } from '@/atoms/search/utils/searchUrlManager';

// Define your search item type
interface SearchItem {
  id: string;
  title?: string;
  description?: string;
  url?: string;
  image_url?: string;
  type?: string;
}

const BasicSearchWidget = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const initializedRef = useRef(false);

  const { widgetRef, actions, queryResult } = useSearchResults<SearchItem>();

  const [searchInputValue, setSearchInputValue] = useState(
    searchParams.get('q') || ''
  );

  // Initialize SearchUrlManager on mount
  useEffect(() => {
    if (initializedRef.current) return;

    const initialState = searchUrlManager.initialize(searchParams, {
      onKeyphraseChange: ({ keyphrase }) => {
        actions.onKeyphraseChange({ keyphrase });
        setSearchInputValue(keyphrase);
      },
      onPageNumberChange: ({ page }) => actions.onPageNumberChange({ page }),
      onClearFilters: () => {
        actions.onClearFilters();
        actions.onKeyphraseChange({ keyphrase: '' });
        setSearchInputValue('');
      },
      onClearFacets: () => {
        const term = searchUrlManager.getCurrentState().searchTerm || '';
        actions.onClearFilters();
        if (term) {
          actions.onKeyphraseChange({ keyphrase: term });
        }
      },
    });

    if (initialState.searchTerm) {
      setSearchInputValue(initialState.searchTerm);
    }

    initializedRef.current = true;
  }, [searchParams, actions]);

  // Sync on URL changes (back/forward navigation)
  useEffect(() => {
    if (initializedRef.current) {
      searchUrlManager.syncFromUrl(searchParams);
    }
  }, [searchParams]);

  // Handle search submission
  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Update SDK
      actions.onKeyphraseChange({ keyphrase: searchInputValue });
      actions.onPageNumberChange({ page: 1 });

      // Update URL
      await searchUrlManager.setSearchTerm(
        router,
        pathname,
        searchParams,
        searchInputValue
      );
    },
    [actions, router, pathname, searchParams, searchInputValue]
  );

  // Handle pagination
  const handlePageChange = useCallback(
    async (page: number) => {
      // Update SDK
      actions.onPageNumberChange({ page });

      // Update URL
      await searchUrlManager.setPage(router, pathname, searchParams, page);
    },
    [actions, router, pathname, searchParams]
  );

  // Get results data
  const results = (queryResult.data?.content as SearchItem[]) || [];
  const totalResults = queryResult.data?.total_item || 0;
  const limit = queryResult.data?.limit || 24;
  const offset = queryResult.data?.offset || 0;
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(totalResults / limit);
  const isLoading = queryResult.isLoading;

  return (
    <div ref={widgetRef} className="search-widget">
      {/* Search Form */}
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          value={searchInputValue}
          onChange={(e) => setSearchInputValue(e.target.value)}
          placeholder="Search..."
          className="search-input"
        />
        <button type="submit" className="search-button">
          Search
        </button>
      </form>

      {/* Loading State */}
      {isLoading && <p>Loading...</p>}

      {/* Results Summary */}
      {!isLoading && totalResults > 0 && (
        <p className="results-summary">
          Showing {offset + 1}-{Math.min(offset + results.length, totalResults)} of {totalResults}{' '}
          results
          {searchInputValue && ` for "${searchInputValue}"`}
        </p>
      )}

      {/* Results List */}
      {!isLoading && results.length > 0 && (
        <ul className="results-list">
          {results.map((item) => (
            <li key={item.id} className="result-item">
              {item.image_url && <img src={item.image_url} alt={item.title || 'Result'} />}
              <div className="result-content">
                <h3>{item.title || 'Untitled'}</h3>
                {item.description && <p>{item.description}</p>}
                {item.type && <span className="result-type">{item.type}</span>}
                {item.url && (
                  <a href={item.url} className="result-link">
                    Read more
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Empty State */}
      {!isLoading && totalResults === 0 && searchInputValue && (
        <div className="empty-state">
          <p>No results found for &ldquo;{searchInputValue}&rdquo;</p>
          <p>Try adjusting your search terms</p>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="pagination-button"
          >
            Previous
          </button>

          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="pagination-button"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

// Export with widget HOC
export default widget(BasicSearchWidget, WidgetDataType.SEARCH_RESULTS, 'content');
