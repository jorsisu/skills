/**
 * Custom Search Hook Template (App Router)
 *
 * Template for creating domain-specific search controller hooks.
 * Follows patterns from useSiteSearch.ts: initializedRef guard,
 * SearchUrlManager with (router, pathname, searchParams) signatures,
 * clear-and-reapply facet strategy, and onClearFacets callback.
 *
 * Usage: Adapt for your specific search needs.
 * Example: useProductSearch, useBlogSearch, useProfessionalSearch, etc.
 */

'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useSearchResults } from '@sitecore-search/react';
import type { SearchResultsWidgetQuery } from '@sitecore-search/react';
import { searchUrlManager } from '@/atoms/search/utils/searchUrlManager';

// Define your controller parameters
export interface CustomSearchParams {
  itemsPerPage?: number;
  onSearchActivated?: () => void;
}

export const useCustomSearch = ({
  itemsPerPage = 24,
  onSearchActivated,
}: CustomSearchParams = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const initializedRef = useRef(false);

  // Local state
  const [searchInputValue, setSearchInputValue] = useState(
    searchParams.get('q') || ''
  );
  const [currentKeyphrase, setCurrentKeyphrase] = useState(
    searchParams.get('q') || ''
  );
  const [currentPage, setCurrentPage] = useState(1);

  // Query function for Sitecore Search SDK
  const queryFunction = (query: SearchResultsWidgetQuery) => {
    const request = query.getRequest();
    request.setSearchLimit(itemsPerPage);
    // Add custom filters, sources, facet sort, etc. here
    return request;
  };

  const { widgetRef, actions, queryResult } = useSearchResults({
    query: queryFunction,
    state: {
      keyphrase: currentKeyphrase,
    },
  });

  const selectedFacets = searchUrlManager.getCurrentState().facets || {};

  // Initialize SearchUrlManager on mount (runs once via initializedRef)
  useEffect(() => {
    if (initializedRef.current) return;

    const initialState = searchUrlManager.initialize(searchParams, {
      onKeyphraseChange: ({ keyphrase }) => {
        setCurrentKeyphrase(keyphrase);
        setSearchInputValue(keyphrase);
        actions.onKeyphraseChange({ keyphrase });
      },
      onPageNumberChange: ({ page }) => {
        setCurrentPage(page);
        actions.onPageNumberChange({ page });
      },
      onFacetClick: (payload) => {
        actions.onFacetClick(payload);
      },
      onClearFilters: () => {
        actions.onClearFilters();
        actions.onKeyphraseChange({ keyphrase: '' });
        setCurrentKeyphrase('');
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

    // Apply initial state from URL
    if (initialState.searchTerm) {
      setCurrentKeyphrase(initialState.searchTerm);
      setSearchInputValue(initialState.searchTerm);
    }
    if (initialState.page) {
      setCurrentPage(initialState.page);
    }

    initializedRef.current = true;
  }, [searchParams, actions]);

  // Sync from URL on changes (back/forward navigation)
  useEffect(() => {
    if (initializedRef.current) {
      searchUrlManager.syncFromUrl(searchParams);
    }
  }, [searchParams]);

  // Handler: Submit Search
  const onSearchSubmit = useCallback(
    async (term: string) => {
      setCurrentKeyphrase(term);
      setCurrentPage(1);

      // Update SDK
      actions.onKeyphraseChange({ keyphrase: term });
      actions.onPageNumberChange({ page: 1 });

      // Update URL (auto-resets pagination)
      await searchUrlManager.setSearchTerm(router, pathname, searchParams, term);

      if (term.trim().length > 0) {
        onSearchActivated?.();
      }
    },
    [actions, router, pathname, searchParams, onSearchActivated]
  );

  // Handler: Facet Click (clear-and-reapply strategy)
  // URL is source of truth. SDK is rebuilt from it on each change.
  const onFacetClick = useCallback(
    async ({
      facetId,
      facetValueText,
      checked,
    }: {
      facetId: string;
      facetValueText: string;
      checked: boolean;
    }) => {
      // 1. Update URL state (source of truth)
      if (checked) {
        await searchUrlManager.addFacet(
          router, pathname, searchParams,
          facetId, facetValueText
        );
      } else {
        await searchUrlManager.removeFacet(
          router, pathname, searchParams,
          facetId, facetValueText
        );
      }

      // 2. Clear SDK filters and re-apply from URL state
      const term = searchUrlManager.getCurrentState().searchTerm || '';
      actions.onClearFilters();

      if (term) {
        actions.onKeyphraseChange({ keyphrase: term });
      }

      // 3. Re-apply remaining facets using consistent text-based type
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

      // 4. Reset pagination
      setCurrentPage(1);
      actions.onPageNumberChange({ page: 1 });
    },
    [actions, router, pathname, searchParams]
  );

  // Handler: Clear All Facets
  const onClearFacets = useCallback(async () => {
    await searchUrlManager.clearFacets(router, pathname, searchParams);
  }, [router, pathname, searchParams]);

  // Handler: Clear All Filters (search + facets)
  const onClearAllFilters = useCallback(async () => {
    await searchUrlManager.clearAllFilters(router, pathname, searchParams);
  }, [router, pathname, searchParams]);

  // Handler: Load More / Pagination
  const onLoadMore = useCallback(async () => {
    const newPage = currentPage + 1;
    setCurrentPage(newPage);
    actions.onPageNumberChange({ page: newPage });
    await searchUrlManager.setPage(router, pathname, searchParams, newPage);
  }, [actions, currentPage, router, pathname, searchParams]);

  return {
    widgetRef,
    results: queryResult.data?.content ?? [],
    totalItems: queryResult.data?.total_item ?? 0,
    facets: queryResult.data?.facet ?? [],
    selectedFacets,
    isLoading: queryResult.isLoading,
    page: currentPage,
    keyphrase: currentKeyphrase,
    searchInputValue,
    setSearchInputValue,
    onSearchSubmit,
    onFacetClick,
    onClearFacets,
    onClearAllFilters,
    onLoadMore,
  };
};

export default useCustomSearch;
