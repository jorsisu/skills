/**
 * SearchUrlManager Singleton Template
 * 
 * Ready-to-use SearchUrlManager for URL state synchronization.
 * Copy this file to: src/atoms/search/utils/searchUrlManager.ts
 * 
 * Key Features:
 * - Singleton pattern for consistent state management
 * - Queue system prevents race conditions
 * - Debouncing (100ms) for smooth URL updates
 * - Browser back/forward support
 * - Auto-resets pagination on search/facet changes
 */

import { NextRouter } from 'next/router';

// Queue system to prevent race conditions
let urlUpdateQueue: Promise<void> = Promise.resolve();

// Debounce system for rapid URL updates
let urlUpdateTimeout: NodeJS.Timeout | null = null;
const URL_UPDATE_DEBOUNCE_MS = 100;

// Search state interface
interface SearchState {
  searchTerm?: string;
  page?: number;
  tab?: string;
  facets?: Record<string, string[]>; // facetId -> array of selected values
}

// Callbacks for notifying components of state changes
interface SearchStateCallbacks {
  onKeyphraseChange?: ({ keyphrase }: { keyphrase: string }) => void;
  onPageNumberChange?: ({ page }: { page: number }) => void;
  onFacetClick?: (payload: {
    facetId: string;
    facetValueId: string;
    checked: boolean;
    type: 'valueId';
    facetIndex: number;
  }) => void;
  onClearFilters?: () => void;
  setSearchTerm?: (term: string) => void;
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
   * Initialize URL manager with router and callbacks
   * Call this once in useEffect when router.isReady
   */
  initialize(router: NextRouter, callbacks: SearchStateCallbacks): SearchState {
    this.callbacks = callbacks;

    if (!router.isReady) {
      return {};
    }

    this.currentState = this.parseUrlState(router);
    this.applyStateToComponents();

    return this.currentState;
  }

  /**
   * Parse URL into search state
   */
  private parseUrlState(router: NextRouter): SearchState {
    const state: SearchState = {};

    // Parse search term
    const searchTerm = (router.query.q as string) || '';
    if (searchTerm) state.searchTerm = searchTerm;

    // Parse page number
    const pageParam = router.query.page as string;
    if (pageParam) {
      const page = parseInt(pageParam, 10);
      if (!isNaN(page) && page > 0) state.page = page;
    }

    // Parse tab
    const tabParam = router.query.tab as string;
    if (tabParam) state.tab = tabParam;

    // Parse facets
    const facetsParam = router.query.facets as string;
    if (facetsParam) {
      state.facets = {};
      const facetParams = new URLSearchParams(facetsParam);

      Array.from(facetParams.entries()).forEach(([facetId, value]) => {
        if (!state.facets![facetId]) state.facets![facetId] = [];
        state.facets![facetId].push(value);
      });
    }

    return state;
  }

  /**
   * Apply current state to SDK components via callbacks
   */
  private applyStateToComponents(): void {
    const { callbacks, currentState } = this;

    if (currentState.searchTerm) {
      callbacks.setSearchTerm?.(currentState.searchTerm);
      callbacks.onKeyphraseChange?.({ keyphrase: currentState.searchTerm });
    }

    if (currentState.page && currentState.page > 1) {
      callbacks.onPageNumberChange?.({ page: currentState.page });
    }

    if (currentState.facets && callbacks.onFacetClick) {
      Object.entries(currentState.facets).forEach(([facetId, values]) => {
        values.forEach((facetValueId) => {
          callbacks.onFacetClick!({
            facetId,
            facetValueId,
            checked: true,
            type: 'valueId',
            facetIndex: 0,
          });
        });
      });
    }
  }

  /**
   * Build URL query from current state
   */
  private buildQueryFromState(): Record<string, string | undefined> {
    const query: Record<string, string | undefined> = {};

    if (this.currentState.searchTerm) {
      query.q = this.currentState.searchTerm;
    }

    if (this.currentState.page && this.currentState.page > 1) {
      query.page = this.currentState.page.toString();
    }

    if (this.currentState.tab && this.currentState.tab !== 'all') {
      query.tab = this.currentState.tab;
    }

    if (this.currentState.facets && Object.keys(this.currentState.facets).length > 0) {
      const facetParams = new URLSearchParams();
      Object.entries(this.currentState.facets).forEach(([facetId, values]) => {
        values.forEach((value) => facetParams.append(facetId, value));
      });
      const facetsString = facetParams.toString();
      if (facetsString) query.facets = facetsString;
    }

    return query;
  }

  /**
   * Update URL with current state (debounced)
   */
  private async updateUrl(router: NextRouter, immediate = false): Promise<void> {
    return new Promise((resolve) => {
      if (urlUpdateTimeout) clearTimeout(urlUpdateTimeout);

      const performUpdate = async () => {
        urlUpdateQueue = urlUpdateQueue.then(async () => {
          const pathname = router.pathname;
          const query = this.buildQueryFromState();

          try {
            await router.push(
              { pathname, query },
              undefined,
              { shallow: true, scroll: false }
            );
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
   * Set search term and update URL (auto-resets page to 1)
   */
  async setSearchTerm(router: NextRouter, term: string): Promise<void> {
    this.currentState.searchTerm = term || undefined;
    this.currentState.page = undefined; // Auto-reset

    this.callbacks.onPageNumberChange?.({ page: 1 });

    await this.updateUrl(router, true);
  }

  /**
   * Set page number and update URL
   */
  async setPage(router: NextRouter, page: number): Promise<void> {
    this.currentState.page = page > 1 ? page : undefined;
    await this.updateUrl(router, true);
  }

  /**
   * Set active tab and update URL (auto-resets page to 1)
   */
  async setTab(router: NextRouter, tab: string): Promise<void> {
    this.currentState.tab = tab !== 'all' ? tab : undefined;
    this.currentState.page = undefined; // Auto-reset

    this.callbacks.onPageNumberChange?.({ page: 1 });

    await this.updateUrl(router, true);
  }

  /**
   * Add facet selection and update URL (auto-resets page to 1)
   */
  async addFacet(router: NextRouter, facetId: string, facetValueId: string): Promise<void> {
    if (!this.currentState.facets) this.currentState.facets = {};
    if (!this.currentState.facets[facetId]) this.currentState.facets[facetId] = [];

    if (!this.currentState.facets[facetId].includes(facetValueId)) {
      this.currentState.facets[facetId].push(facetValueId);
    }

    this.currentState.page = undefined; // Auto-reset
    this.callbacks.onPageNumberChange?.({ page: 1 });

    await this.updateUrl(router, true);
  }

  /**
   * Remove facet selection and update URL (auto-resets page to 1)
   */
  async removeFacet(router: NextRouter, facetId: string, facetValueId: string): Promise<void> {
    if (!this.currentState.facets || !this.currentState.facets[facetId]) return;

    this.currentState.facets[facetId] = this.currentState.facets[facetId].filter(
      (value) => value !== facetValueId
    );

    if (this.currentState.facets[facetId].length === 0) {
      delete this.currentState.facets[facetId];
    }

    if (Object.keys(this.currentState.facets).length === 0) {
      this.currentState.facets = undefined;
    }

    this.currentState.page = undefined; // Auto-reset
    this.callbacks.onPageNumberChange?.({ page: 1 });

    await this.updateUrl(router, true);
  }

  /**
   * Clear all facets and update URL (auto-resets page to 1)
   */
  async clearAllFacets(router: NextRouter): Promise<void> {
    this.currentState.facets = undefined;
    this.currentState.page = undefined; // Auto-reset

    this.callbacks.onPageNumberChange?.({ page: 1 });
    this.callbacks.onClearFilters?.();

    await this.updateUrl(router, true);
  }

  /**
   * Clear all filters (search term + facets) and update URL
   */
  async clearAllFilters(router: NextRouter): Promise<void> {
    this.currentState.searchTerm = undefined;
    this.currentState.facets = undefined;
    this.currentState.tab = undefined;
    this.currentState.page = undefined;

    this.callbacks.onPageNumberChange?.({ page: 1 });
    this.callbacks.onClearFilters?.();

    await this.updateUrl(router, true);
  }

  /**
   * Sync state from URL (for browser back/forward)
   */
  syncFromUrl(router: NextRouter): void {
    if (!router.isReady) return;

    const newState = this.parseUrlState(router);
    const hasChanges = JSON.stringify(newState) !== JSON.stringify(this.currentState);

    if (hasChanges) {
      this.currentState = newState;
      this.applyStateToComponents();
    }
  }

  /**
   * Get current state (readonly copy)
   */
  getCurrentState(): SearchState {
    return { ...this.currentState };
  }
}

// Export singleton instance
export const searchUrlManager = SearchUrlManager.getInstance();
export default searchUrlManager;
