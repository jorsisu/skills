/**
 * SearchProvider Template
 *
 * Ready-to-use SearchProvider component for Next.js applications.
 * Copy this file to: src/lib/search/providers/SearchProvider.tsx
 *
 * Features:
 * - WidgetsProvider wrapper from Sitecore Search SDK
 * - Page context configuration
 * - Locale setup (multi-language support)
 * - Environment variable validation
 * - Error handling for missing credentials
 */

import React, { useMemo } from 'react';
import { PageController, WidgetsProvider } from '@sitecore-search/react';
import { Environment } from '@sitecore-search/data';

interface SearchProviderProps {
  children: React.ReactNode;
  config?: {
    env?: Environment;
    customerKey?: string;
    apiKey?: string;
  };
}

const SearchProvider = ({ children, config }: SearchProviderProps) => {
  const context = PageController.getContext();

  // Set page context with current URI
  // This helps Sitecore Search track which pages searches occur on
  context.setPage({
    ...context.getPage(),
    uri: typeof window !== 'undefined' ? window.location.pathname : '',
    custom: {
      ...context.getPage()?.custom,
      environment: process.env.NEXT_PUBLIC_SEARCH_ENVIRONMENT || 'prod',
    },
  });

  // Locale configuration for multi-language support
  // Adjust these mappings based on your site's languages
  const localeOptions = {
    en: {
      country: 'us',
      language: 'en',
    },
    es: {
      country: 'us',
      language: 'es',
    },
    'fr-ca': {
      country: 'ca',
      language: 'fr',
    },
  };

  // Get current language (adjust based on your i18n setup)
  // This example assumes you have a way to get the current language
  const currentLanguage = 'en'; // Replace with actual language detection

  const locale = localeOptions[currentLanguage as keyof typeof localeOptions];

  // Set locale for Sitecore Search API
  if (locale) {
    context.setLocale(locale);
  } else {
    // Fallback to US English
    context.setLocale({
      country: 'us',
      language: 'en',
    });
  }

  // Memoize configuration to prevent unnecessary re-renders
  const memoizedConfig = useMemo(() => {
    const {
      env = process.env.NEXT_PUBLIC_SEARCH_ENV as Environment,
      customerKey = process.env.NEXT_PUBLIC_SEARCH_CUSTOMER_KEY,
      apiKey = process.env.NEXT_PUBLIC_SEARCH_API_KEY,
    } = config || {};

    return {
      env,
      customerKey,
      apiKey,
    };
  }, [config]);

  // Validate required credentials
  if (!memoizedConfig.customerKey || !memoizedConfig.apiKey) {
    console.error('Search configuration is missing required parameters');
    // Render children but without search functionality
    return <>{children}</>;
  }

  return (
    <WidgetsProvider
      env={memoizedConfig.env}
      customerKey={memoizedConfig.customerKey}
      apiKey={memoizedConfig.apiKey}
    >
      {children}
    </WidgetsProvider>
  );
};

export default SearchProvider;

