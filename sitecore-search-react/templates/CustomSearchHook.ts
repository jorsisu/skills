/**
 * Custom Search Hook Template
 * 
 * Template for creating domain-specific search controller hooks.
 * Encapsulates search logic, URL synchronization, and state management.
 * 
 * Usage: Adapt this template for your specific search needs.
 * Example: useProductSearchController, useBlogSearchController, etc.
 */

import { useCallback, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useSearchResults, SearchResponseFacet } from '@sitecore-search/react';
import { searchUrlManager } from '@/atoms/search/utils/searchUrlManager';

// Define your controller parameters
export interface CustomSearchControllerParams {
  onSearchActivated?: () => void;
  onClearFilters?: () => void;
  itemsPerPage?: number;
  sourceIds?: string[]; // Optional: Sitecore Search source IDs
  mainFacetId?: string; // Your primary facet
}

// Define what your hook returns
export interface CustomSearchController {
  widgetRef: ReturnType<typeof useSearchResults>['widgetRef'];
  searchInputValue: string;
  setSearchInputValue: (value: string) => void;
  submitSearch: (term?: string) => Promise<void>;
  facetOptions: Array<{ id: string; text: string; count: number }>;
  handleFacetSelection: (facetId: string, facetValueId: string, checked: boolean) => Promise<void>;
  getSelectedFacetValues: (facetId: string) => string[];
  clearAll: () => Promise<void>;
  results: any[];
  totalResults: number;
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
}

// Utility: Get facet index
const getFacetIndex = (facets: SearchResponseFacet[], facetId: string): number => {
  const index = facets.findIndex((facet) => facet.name === facetId);
  return index >= 0 ? index : 0;
};

// Utility: Get selected facet values from URL
const getFacetSelectionsFromUrl = (
  router: ReturnType<typeof useRouter>,
  facetId: string
): string[] => {
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

export const useCustomSearchController = ({
  onSearchActivated,
  onClearFilters,
  itemsPerPage = 24,
  sourceIds,
  mainFacetId = 'category', // Default facet ID
}: CustomSearchControllerParams = {}): CustomSearchController => {
  const router = useRouter();

  // Build search query configuration
  const buildQuery = useCallback(
    (searchQuery) => {
      const request = searchQuery.getRequest();

      // Set sources if provided
      if (sourceIds && sourceIds.length > 0) {
        request.setSources(sourceIds);
      }

      // Set items per page
      if (itemsPerPage) {
        request.setSearchLimit(itemsPerPage);
      }

      // Optional: Set facet sort order
      request.setSearchFacetSort({
        name: 'text',
        order: 'asc',
      });

      return request;
    },
    [itemsPerPage, sourceIds]
  );

  // Initialize search widget
  const { widgetRef, actions, queryResult } = useSearchResults({
    query: buildQuery,
  });

  const [searchInputValue, setSearchInputValue] = useState('');

  // Get facets from results
  const facets = useMemo(() => queryResult.data?.facet ?? [], [queryResult.data?.facet]);
  
  const mainFacet = useMemo(
    () => facets.find((facet) => facet.name === mainFacetId),
    [facets, mainFacetId]
  );

  // Initialize from URL on mount
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
      onClearFilters: () => {
        actions.onClearFilters();
        actions.onKeyphraseChange({ keyphrase: '' });
        setSearchInputValue('');
        onClearFilters?.();
      },
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

  // Submit search
  const submitSearch = useCallback(
    async (term?: string) => {
      const keyphrase = term ?? searchInputValue;
      
      // Update SDK
      actions.onKeyphraseChange({ keyphrase });

      // Update URL (auto-resets pagination)
      if (router.isReady) {
        await searchUrlManager.setSearchTerm(router, keyphrase);
      }

      // Notify callback
      if (keyphrase.trim().length > 0) {
        onSearchActivated?.();
      }
    },
    [actions, onSearchActivated, router, searchInputValue]
  );

  // Handle facet selection
  const handleFacetSelection = useCallback(
    async (facetId: string, facetValueId: string, checked: boolean) => {
      if (!router.isReady) return;

      const facetIndex = getFacetIndex(facets, facetId);

      // Update SDK - CRITICAL: Use facetValue.id NOT facetValue.text
      actions.onFacetClick({
        facetId,
        facetValueId, // Must be .id from facetValue
        type: 'valueId',
        checked,
        facetIndex,
      });

      // Update URL (auto-resets pagination)
      if (checked) {
        await searchUrlManager.addFacet(router, facetId, facetValueId);
      } else {
        await searchUrlManager.removeFacet(router, facetId, facetValueId);
      }

      // Notify callback
      onSearchActivated?.();
    },
    [actions, facets, onSearchActivated, router]
  );

  // Get selected facet values
  const getSelectedFacetValues = useCallback(
    (facetId: string) => {
      // Try SearchUrlManager state first
      const stateSelections = searchUrlManager.getCurrentState().facets?.[facetId];
      if (Array.isArray(stateSelections) && stateSelections.length > 0) {
        return [...stateSelections];
      }

      // Fallback to URL parsing
      return getFacetSelectionsFromUrl(router, facetId);
    },
    [router]
  );

  // Clear all filters
  const clearAll = useCallback(async () => {
    // Clear SDK
    actions.onClearFilters();
    actions.onKeyphraseChange({ keyphrase: '' });
    
    // Clear local state
    setSearchInputValue('');

    // Clear URL
    if (router.isReady) {
      await searchUrlManager.clearAllFilters(router);
    }

    // Notify callback
    onClearFilters?.();
  }, [actions, onClearFilters, router]);

  // Extract results data
  const results = (queryResult.data?.content as any[]) || [];
  const totalResults = queryResult.data?.total_item || 0;
  const limit = queryResult.data?.limit || itemsPerPage;
  const offset = queryResult.data?.offset || 0;
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(totalResults / limit);

  // Return controller API
  return {
    widgetRef,
    searchInputValue,
    setSearchInputValue,
    submitSearch,
    facetOptions: mainFacet?.value || [],
    handleFacetSelection,
    getSelectedFacetValues,
    clearAll,
    results,
    totalResults,
    currentPage,
    totalPages,
    isLoading: queryResult.isLoading,
  };
};

export default useCustomSearchController;
