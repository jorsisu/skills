/**
 * SearchUrlManager Singleton Template (App Router)
 *
 * Ready-to-use SearchUrlManager for URL state synchronization.
 * Copy this file to: src/atoms/search/utils/searchUrlManager.ts
 *
 * Key Features:
 * - Singleton pattern for consistent state management
 * - Queue system prevents race conditions
 * - Debouncing (100ms) for smooth URL updates
 * - Browser back/forward support via syncFromUrl
 * - Auto-resets pagination on search/facet changes
 * - Preserves non-search URL params during updates
 *
 * FACET ENCODING STRATEGY: TEXT-BASED (Human-Readable URLs)
 * ============================================================
 *
 * Current Implementation:
 * - Stores facet TEXT values in URLs (e.g., ?facets=locations:Chicago)
 * - Pros: Human-readable, easier to debug/share
 * - Cons: URLs break if facet text changes
 *
 * TO SWITCH TO ID-BASED ENCODING (Recommended by Sitecore):
 * --------------------------------------------------------
 * 1. In applyStateToComponents():
 *    - Change: facetValueText → facetValueId
 *    - Change: type: 'text' → type: 'valueId'
 * 2. In addFacet() / removeFacet() signatures:
 *    - Rename: facetValueText → facetValueId
 * 3. In SearchStateCallbacks.onFacetClick:
 *    - Make facetValueId required, facetValueText optional (or remove it)
 * 4. In your hook (e.g., useSiteSearch.ts):
 *    - Pass facetValueId instead of facetValueText to SearchUrlManager
 * 5. In FacetList component:
 *    - Remove facetValueText from onFacetClick call
 */

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { ReadonlyURLSearchParams } from 'next/navigation';

// Queue system to prevent race conditions during URL updates
let urlUpdateQueue: Promise<void> = Promise.resolve();

// Debounce system for rapid URL updates
let urlUpdateTimeout: NodeJS.Timeout | null = null;
const URL_UPDATE_DEBOUNCE_MS = 100;

// Search state interface
interface SearchState {
  searchTerm?: string;
  page?: number;
  facets?: Record<string, string[]>; // facetId -> array of selected values
}

// Callbacks for notifying components of state changes
interface SearchStateCallbacks {
  onKeyphraseChange?: ({ keyphrase }: { keyphrase: string }) => void;
  onPageNumberChange?: ({ page }: { page: number }) => void;
  onFacetClick?: (payload: {
    facetId: string;
    facetValueText?: string; // Text-based facets (current)
    facetValueId?: string; // ID-based facets (for migration)
    checked: boolean;
    type: 'text' | 'valueId';
    facetIndex: number;
  }) => void;
  onClearFilters?: () => void;
  onClearFacets?: () => void;
}

class SearchUrlManager {
  private static instance: SearchUrlManager;
  private currentState: SearchState = {};
  private callbacks: SearchStateCallbacks = {};

  private constructor() {}

  static getInstance(): SearchUrlManager {
    if (!SearchUrlManager.instance) {
      SearchUrlManager.instance = new SearchUrlManager();
    }
    return SearchUrlManager.instance;
  }

  /**
   * Initialize with searchParams and callbacks.
   * Call once in useEffect when component mounts.
   */
  initialize(searchParams: ReadonlyURLSearchParams, callbacks: SearchStateCallbacks): SearchState {
    this.callbacks = callbacks;
    this.currentState = this.parseUrlState(searchParams);
    this.applyStateToComponents();
    return this.currentState;
  }

  /**
   * Parse URL search params into search state.
   *
   * URL params: q (search term), p (page number), facets (encoded facet string)
   */
  private parseUrlState(searchParams: ReadonlyURLSearchParams): SearchState {
    const state: SearchState = {};

    const searchTerm = searchParams.get('q') || '';
    if (searchTerm) state.searchTerm = searchTerm;

    const pageParam = searchParams.get('p');
    if (pageParam) {
      const page = parseInt(pageParam, 10);
      if (!isNaN(page) && page > 0) state.page = page;
    }

    const facetsParam = searchParams.get('facets');
    if (facetsParam) {
      state.facets = {};
      const facetParams = new URLSearchParams(facetsParam);
      Array.from(facetParams.entries()).forEach(([facetId, text]) => {
        if (!state.facets![facetId]) state.facets![facetId] = [];
        state.facets![facetId].push(text);
      });
    }

    return state;
  }

  /**
   * Apply current state to SDK components via callbacks.
   *
   * TEXT-BASED: Uses facetValueText + type: 'text'
   * TO SWITCH TO ID-BASED: Change facetValueText → facetValueId, type: 'text' → 'valueId'
   */
  private applyStateToComponents(): void {
    const { callbacks, currentState } = this;

    if (currentState.searchTerm) {
      callbacks.onKeyphraseChange?.({ keyphrase: currentState.searchTerm });
    }

    if (currentState.page && currentState.page > 1) {
      callbacks.onPageNumberChange?.({ page: currentState.page });
    }

    if (currentState.facets && callbacks.onFacetClick) {
      Object.entries(currentState.facets).forEach(([facetId, textValues]) => {
        textValues.forEach((facetValueText) => {
          callbacks.onFacetClick!({
            facetId,
            facetValueText,
            checked: true,
            type: 'text',
            facetIndex: 0,
          });
        });
      });
    }
  }

  /**
   * Build URL query parameters from current state.
   */
  private buildQueryFromState(): URLSearchParams {
    const params = new URLSearchParams();

    if (this.currentState.searchTerm) {
      params.set('q', this.currentState.searchTerm);
    }

    if (this.currentState.page && this.currentState.page > 1) {
      params.set('p', this.currentState.page.toString());
    }

    if (this.currentState.facets && Object.keys(this.currentState.facets).length > 0) {
      const facetParams = new URLSearchParams();
      Object.entries(this.currentState.facets).forEach(([facetId, values]) => {
        values.forEach((value) => facetParams.append(facetId, value));
      });
      const facetsString = facetParams.toString();
      if (facetsString) params.set('facets', facetsString);
    }

    return params;
  }

  /**
   * Core URL update with debouncing, queue management, and non-search param preservation.
   */
  private async updateUrl(
    router: AppRouterInstance,
    pathname: string,
    searchParams: ReadonlyURLSearchParams,
    immediate = false
  ): Promise<void> {
    return new Promise((resolve) => {
      if (urlUpdateTimeout) clearTimeout(urlUpdateTimeout);

      const performUpdate = async () => {
        urlUpdateQueue = urlUpdateQueue.then(async () => {
          const stateParams = this.buildQueryFromState();

          // Preserve non-search params from current URL
          const preservedParams = new URLSearchParams();
          searchParams.forEach((value, key) => {
            if (!['q', 'p', 'facets'].includes(key)) {
              preservedParams.set(key, value);
            }
          });

          // Merge state params into preserved params
          stateParams.forEach((value, key) => {
            preservedParams.set(key, value);
          });

          const queryString = preservedParams.toString();
          const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

          try {
            router.push(newUrl, { scroll: false });
            resolve();
          } catch (error) {
            console.error('Error updating URL', error);
            resolve();
          }
        });

        return urlUpdateQueue;
      };

      if (immediate) {
        performUpdate();
      } else {
        urlUpdateTimeout = setTimeout(() => {
          performUpdate();
          urlUpdateTimeout = null;
        }, URL_UPDATE_DEBOUNCE_MS);
      }
    });
  }

  /**
   * Set search term and update URL.
   * Auto-resets page and clears facets.
   */
  async setSearchTerm(
    router: AppRouterInstance,
    pathname: string,
    searchParams: ReadonlyURLSearchParams,
    term: string
  ): Promise<void> {
    this.currentState.searchTerm = term || undefined;
    this.currentState.page = undefined;
    this.currentState.facets = undefined;

    this.callbacks.onPageNumberChange?.({ page: 1 });
    this.callbacks.onClearFacets?.();

    await this.updateUrl(router, pathname, searchParams, true);
  }

  /**
   * Set page number and update URL.
   * Preserves existing search term and facets from URL if internal state is empty.
   */
  async setPage(
    router: AppRouterInstance,
    pathname: string,
    searchParams: ReadonlyURLSearchParams,
    page: number
  ): Promise<void> {
    // Hydrate from URL if internal state is stale
    if (!this.currentState.searchTerm && !this.currentState.facets) {
      const urlState = this.parseUrlState(searchParams);
      this.currentState.searchTerm = urlState.searchTerm;
      this.currentState.facets = urlState.facets;
    }

    this.currentState.page = page > 1 ? page : undefined;
    await this.updateUrl(router, pathname, searchParams, true);
  }

  /**
   * Add a facet selection and update URL. Auto-resets page.
   *
   * @param options.allowMultiSelectWithinCategory - If true, multiple values per facet category.
   *   Default (false) replaces previous value in same category.
   */
  async addFacet(
    router: AppRouterInstance,
    pathname: string,
    searchParams: ReadonlyURLSearchParams,
    facetId: string,
    facetValueText: string,
    options?: { allowMultiSelectWithinCategory?: boolean }
  ): Promise<void> {
    // Hydrate from URL if internal state is stale
    if (!this.currentState.searchTerm && !this.currentState.facets) {
      const urlState = this.parseUrlState(searchParams);
      this.currentState.searchTerm = urlState.searchTerm;
    }

    if (!this.currentState.facets) this.currentState.facets = {};
    if (!this.currentState.facets[facetId]) this.currentState.facets[facetId] = [];

    if (options?.allowMultiSelectWithinCategory) {
      if (!this.currentState.facets[facetId].includes(facetValueText)) {
        this.currentState.facets[facetId].push(facetValueText);
      }
    } else {
      // Single selection per category (default for listings)
      this.currentState.facets[facetId] = [facetValueText];
    }

    this.currentState.page = undefined;
    this.callbacks.onPageNumberChange?.({ page: 1 });

    await this.updateUrl(router, pathname, searchParams, true);
  }

  /**
   * Remove a facet selection and update URL. Auto-resets page.
   */
  async removeFacet(
    router: AppRouterInstance,
    pathname: string,
    searchParams: ReadonlyURLSearchParams,
    facetId: string,
    facetValueText: string
  ): Promise<void> {
    // Hydrate from URL if internal state is stale
    if (!this.currentState.searchTerm && !this.currentState.facets) {
      const urlState = this.parseUrlState(searchParams);
      this.currentState.searchTerm = urlState.searchTerm;
      this.currentState.facets = urlState.facets;
    }

    if (!this.currentState.facets || !this.currentState.facets[facetId]) return;

    this.currentState.facets[facetId] = this.currentState.facets[facetId].filter(
      (value) => value !== facetValueText
    );

    if (this.currentState.facets[facetId].length === 0) {
      delete this.currentState.facets[facetId];
    }

    if (Object.keys(this.currentState.facets).length === 0) {
      this.currentState.facets = undefined;
    }

    this.currentState.page = undefined;
    this.callbacks.onPageNumberChange?.({ page: 1 });

    await this.updateUrl(router, pathname, searchParams, true);
  }

  /**
   * Clear all filters (search term + facets + page) and update URL.
   */
  async clearAllFilters(
    router: AppRouterInstance,
    pathname: string,
    searchParams: ReadonlyURLSearchParams
  ): Promise<void> {
    this.currentState.searchTerm = undefined;
    this.currentState.facets = undefined;
    this.currentState.page = undefined;

    this.callbacks.onPageNumberChange?.({ page: 1 });
    this.callbacks.onClearFilters?.();

    await this.updateUrl(router, pathname, searchParams, true);
  }

  /**
   * Clear only facet filters (preserves search term) and update URL.
   */
  async clearFacets(
    router: AppRouterInstance,
    pathname: string,
    searchParams: ReadonlyURLSearchParams
  ): Promise<void> {
    this.currentState.facets = undefined;
    this.currentState.page = undefined;

    this.callbacks.onPageNumberChange?.({ page: 1 });
    this.callbacks.onClearFacets?.();

    await this.updateUrl(router, pathname, searchParams, true);
  }

  /**
   * Sync component state from URL (for browser back/forward navigation).
   * Clears facets in SDK before re-applying if facets changed.
   */
  syncFromUrl(searchParams: ReadonlyURLSearchParams): void {
    const newState = this.parseUrlState(searchParams);
    const hasChanges = JSON.stringify(newState) !== JSON.stringify(this.currentState);

    if (hasChanges) {
      const facetsChanged =
        JSON.stringify(newState.facets || {}) !== JSON.stringify(this.currentState.facets || {});
      this.currentState = newState;

      if (facetsChanged) {
        this.callbacks.onClearFacets?.();
      }

      this.applyStateToComponents();
    }
  }

  /**
   * Get current search state (readonly copy).
   */
  getCurrentState(): SearchState {
    return { ...this.currentState };
  }
}

// Export singleton instance
export const searchUrlManager = SearchUrlManager.getInstance();
