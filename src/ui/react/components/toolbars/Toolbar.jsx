// Add windowId prop
export function Toolbar({ windowId, onToolSelect }) {
    // Store active tool per window
    const activeTool = useAppStore(state => state.windowTools[windowId])

    return (
        <div className="toolbar" data-window={windowId}>
            {/* Tools affect only this window */}
        </div>
    )
}