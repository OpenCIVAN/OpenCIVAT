// src/ui/react/__mocks__/MockDataProvider.jsx
// React context provider for mock data mode in Storybook
//
// Wrap components in this provider to make hooks return mock data
// instead of trying to fetch from backend.
//
// Usage in stories:
//   import { MockDataProvider } from '@UI/react/__mocks__/MockDataProvider';
//   
//   export const MyStory = {
//     decorators: [(Story) => <MockDataProvider><Story /></MockDataProvider>],
//   };

import React, { createContext, useContext, useMemo } from 'react';

// Import mock hooks
import { useMockProjectFiles } from './hooks/useProjectFiles.mock.js';
import {
    useMockDatasets,
    useMockDatasetActions,
    useMockViewConfigurations
} from './hooks/useDatasets.mock.js';

// =============================================================================
// CONTEXT
// =============================================================================

/**
 * Context for mock data mode
 */
const MockDataContext = createContext({
    isMockMode: false,
    mockHooks: {},
});

/**
 * Hook to check if we're in mock mode
 */
export function useMockDataMode() {
    return useContext(MockDataContext);
}

// =============================================================================
// PROVIDER
// =============================================================================

/**
 * MockDataProvider - Enables mock data mode for child components
 * 
 * When wrapped in this provider, components can use useMockDataMode()
 * to check if they should return mock data.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @param {Object} props.overrides - Optional hook overrides
 */
export function MockDataProvider({ children, overrides = {} }) {
    // Create mock hook instances
    const mockHooks = useMemo(() => ({
        useProjectFiles: useMockProjectFiles,
        useDatasets: useMockDatasets,
        useDatasetActions: useMockDatasetActions,
        useViewConfigurations: useMockViewConfigurations,
        ...overrides,
    }), [overrides]);

    const contextValue = useMemo(() => ({
        isMockMode: true,
        mockHooks,
    }), [mockHooks]);

    return (
        <MockDataContext.Provider value={contextValue}>
            {children}
        </MockDataContext.Provider>
    );
}

// =============================================================================
// STORYBOOK DECORATOR
// =============================================================================

/**
 * Storybook decorator that enables mock data mode
 * 
 * Add to story default export:
 *   decorators: [MockDataDecorator]
 * 
 * Or in .storybook/preview.js for all stories:
 *   decorators: [MockDataDecorator]
 */
export const MockDataDecorator = (Story, context) => {
    return (
        <MockDataProvider>
            <Story />
        </MockDataProvider>
    );
};

// =============================================================================
// HOOK WRAPPER UTILITIES
// =============================================================================

/**
 * Creates a hook that returns mock data when in MockDataProvider
 * 
 * Usage:
 *   const useProjectFiles = createMockableHook(
 *     realUseProjectFiles,
 *     'useProjectFiles'
 *   );
 * 
 * @param {Function} realHook - The real hook implementation
 * @param {string} hookName - Name for looking up mock version
 * @returns {Function} Wrapped hook
 */
export function createMockableHook(realHook, hookName) {
    return function useMockableHook(...args) {
        const { isMockMode, mockHooks } = useMockDataMode();

        // In mock mode, use mock hook if available
        if (isMockMode && mockHooks[hookName]) {
            return mockHooks[hookName](...args);
        }

        // Otherwise use real hook
        return realHook(...args);
    };
}

// =============================================================================
// EXPORTS
// =============================================================================

export { MockDataContext };