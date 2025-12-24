/**
 * Mode Context - Provides desktop/VR mode awareness to adaptive components
 */
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { sizing, iconWeight, getTokens } from './tokens';

const ModeContext = createContext(null);

export const ModeProvider = ({ children, defaultMode = 'desktop' }) => {
    const [mode, setMode] = useState(defaultMode);

    const toggleMode = useCallback(() => {
        setMode(prev => prev === 'desktop' ? 'vr' : 'desktop');
    }, []);

    const tokens = useMemo(() => getTokens(mode), [mode]);

    const value = useMemo(() => ({
        mode,
        setMode,
        toggleMode,
        tokens,
        isVR: mode === 'vr',
        isDesktop: mode === 'desktop',
    }), [mode, toggleMode, tokens]);

    return (
        <ModeContext.Provider value={value}>
            {children}
        </ModeContext.Provider>
    );
};

export const useMode = () => {
    const context = useContext(ModeContext);
    if (!context) {
        // Fallback for components used outside provider
        return {
            mode: 'desktop',
            tokens: getTokens('desktop'),
            isVR: false,
            isDesktop: true,
            setMode: () => { },
            toggleMode: () => { },
        };
    }
    return context;
};

export default ModeContext;