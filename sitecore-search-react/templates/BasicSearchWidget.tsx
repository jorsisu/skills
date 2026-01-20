/**
 * Basic Search Widget Template
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
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
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
  const { widgetRef, actions, queryResult } = useSearchResults<SearchItem>();

  const [searchInputValue, setSearchInputValue] = useState('');

  // Initialize from URL on mount
  useEffect(() => {
    if (!router.isReady) return;

    const initialState = searchUrlManager.initialize(router, {
      onKeyphraseChange: ({ keyphrase }) => {
        actions.onKeyphraseChange({ keyphrase });
        setSearchInputValue(keyphrase);
      },
      onPageNumberChange: ({ page }) => actions.onPageNumberChange({ page }),
      setSearchTerm: (term) => setSearchInputValue(term),
    });

    if (initialState.searchTerm) {
      setSearchInputValue(initialState.searchTerm);
    }
  }, [router.isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync on URL changes (back/forward button)
  useEffect(() => {
    if (!router.isReady) return;
    searchUrlManager.syncFromUrl(router);
  }, [router.query, router.isReady]);

  // Handle search submission
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    // Update SDK
    actions.onKeyphraseChange({ keyphrase: searchInputValue });

    // Update URL
    if (router.isReady) {
      await searchUrlManager.setSearchTerm(router, searchInputValue);
    }
  };

  // Handle pagination
  const handlePageChange = async (page: number) => {
    // Update SDK
    actions.onPageNumberChange({ page });

    // Update URL
    if (router.isReady) {
      await searchUrlManager.setPage(router, page);
    }
  };

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
                    Read more →
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
          <p>No results found for "{searchInputValue}"</p>
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

