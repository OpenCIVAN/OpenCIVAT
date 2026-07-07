// SnapshotPickerModal: opens on cia:show-snapshot-picker, lists snapshots,
// restore/delete route to ViewConfigurationManager.
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Atom/molecule barrels pull iconComponents.js (JSX in a .js file) which the
// vitest transform can't parse — mock them like other modal/organism tests do.
vi.mock('@UI/react/components/atoms', () => ({
    Icon: ({ name }) => <span data-icon={name} />,
    IconButton: ({ icon, onClick, tooltip }) => (
        <button aria-label={tooltip || icon} onClick={onClick} />
    ),
}));
vi.mock('@UI/react/components/molecules', () => ({
    LabeledButton: ({ label, onClick }) => (
        <button onClick={onClick}>{label}</button>
    ),
}));
vi.mock('@UI/react/components/molecules/EmptyState', () => ({
    EmptyState: ({ title }) => <div>{title}</div>,
}));
vi.mock('@UI/react/components/modals/Modal', () => ({
    Modal: ({ children }) => <div role="dialog">{children}</div>,
    ModalHeader: ({ title }) => <h2>{title}</h2>,
    ModalContent: ({ children }) => <div>{children}</div>,
    ModalFooter: ({ children }) => <div>{children}</div>,
}));

const mockToast = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
vi.mock('@UI/react/store/toastStore.js', () => ({
    get toast() {
        return mockToast;
    },
}));

const mockManager = {
    getView: vi.fn(),
    restoreSnapshot: vi.fn(),
    deleteSnapshot: vi.fn(),
};
vi.mock('@Init/appInitializer.js', () => ({
    getViewConfigurationManager: vi.fn(() => mockManager),
}));

import { SnapshotPickerModal } from './SnapshotPickerModal.jsx';

function makeView(snapshots) {
    return { id: 'view-1', name: 'Lungs', snapshots };
}

const SNAPSHOTS = [
    {
        id: 'snap-1',
        name: 'Session Jul 6',
        createdByName: 'Alice',
        createdAt: Date.now(),
        isAutoSave: false,
        metadata: {},
    },
    {
        id: 'snap-2',
        name: 'VR checkpoint',
        createdByName: 'Bob',
        createdAt: Date.now() - 60000,
        isAutoSave: false,
        metadata: { isVRSnapshot: true },
    },
];

function openFor(viewId = 'view-1') {
    act(() => {
        window.dispatchEvent(
            new CustomEvent('cia:show-snapshot-picker', { detail: { viewId } })
        );
    });
}

describe('SnapshotPickerModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockManager.getView.mockReturnValue(makeView(SNAPSHOTS));
    });

    it('renders nothing until the picker event fires', () => {
        render(<SnapshotPickerModal />);
        expect(screen.queryByText(/Saved states/)).toBeNull();
    });

    it('opens on cia:show-snapshot-picker and lists snapshots newest-first with authors', () => {
        render(<SnapshotPickerModal />);
        openFor();

        expect(screen.getByText(/Saved states — Lungs/)).toBeTruthy();
        // Reversed order: snap-2 (older in array order? we reverse array) —
        // array [snap-1, snap-2] reversed → snap-2 first
        const items = screen.getAllByRole('listitem');
        expect(items[0].textContent).toContain('VR checkpoint');
        expect(items[0].textContent).toContain('Bob');
        expect(items[1].textContent).toContain('Session Jul 6');
        expect(screen.getByText('VR')).toBeTruthy();
    });

    it('restore calls the manager and closes', () => {
        render(<SnapshotPickerModal />);
        openFor();

        fireEvent.click(screen.getAllByText('Restore')[0]);
        expect(mockManager.restoreSnapshot).toHaveBeenCalledWith('view-1', 'snap-2');
        expect(mockToast.success).toHaveBeenCalled();
        expect(screen.queryByText(/Saved states/)).toBeNull();
    });

    it('restore failure keeps the modal open and shows an error toast', () => {
        mockManager.restoreSnapshot.mockImplementation(() => {
            throw new Error('Snapshot not found');
        });
        render(<SnapshotPickerModal />);
        openFor();

        fireEvent.click(screen.getAllByText('Restore')[0]);
        expect(mockToast.error).toHaveBeenCalled();
        expect(screen.getByText(/Saved states/)).toBeTruthy();
    });

    it('delete calls the manager and refreshes the list', () => {
        render(<SnapshotPickerModal />);
        openFor();

        mockManager.getView.mockReturnValue(makeView([SNAPSHOTS[0]]));
        const deleteButtons = screen.getAllByRole('button', { name: /delete snapshot/i });
        fireEvent.click(deleteButtons[0]);

        expect(mockManager.deleteSnapshot).toHaveBeenCalledWith('view-1', 'snap-2');
        expect(screen.getAllByRole('listitem').length).toBe(1);
    });

    it('shows an empty state when the view has no snapshots', () => {
        mockManager.getView.mockReturnValue(makeView([]));
        render(<SnapshotPickerModal />);
        openFor();

        expect(screen.getByText('No saved states')).toBeTruthy();
    });
});
