/**
 * SearchProvider Template
 *
 * Wraps the app with Sitecore Search's WidgetsProvider.
 * Copy to: src/lib/search/providers/SearchProvider.tsx
 *
 * TODO: Adjust locale mapping for your site's languages.
 * TODO: Set environment variables in .env.local before use.
 */

'use client';

import React from 'react';
import { PageController, WidgetsProvider } from '@sitecore-search/react';
import { Environment } from '@sitecore-search/data';

interface SearchProviderProps {
  children: React.ReactNode;
}

const SearchProvider = ({ children }: SearchProviderProps) => {
  const context = PageController.getContext();

  // Set page context for analytics
  context.setPage({
    ...context.getPage(),
    uri: typeof window !== 'undefined' ? window.location.pathname : '',
  });

  // TODO: Map to your site's locale detection
  context.setLocale({ country: 'us', language: 'en' });

  const env = process.env.NEXT_PUBLIC_SEARCH_ENV as Environment;
  const customerKey = process.env.NEXT_PUBLIC_SEARCH_CUSTOMER_KEY;
  const apiKey = process.env.NEXT_PUBLIC_SEARCH_API_KEY;

  if (!customerKey || !apiKey) {
    console.error('Search configuration missing required parameters');
    return <>{children}</>;
  }

  return (
    <WidgetsProvider env={env} customerKey={customerKey} apiKey={apiKey}>
      {children}
    </WidgetsProvider>
  );
};

export default SearchProvider;
