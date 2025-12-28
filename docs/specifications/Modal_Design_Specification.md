# Modal Design Specification

**CIA Web - Collaborative Immersive Analytics Platform**

Version 1.0 - December 2024

---

## Document Overview

This specification defines all 21 modals in CIA Web, organized by type and priority. The modal system follows a consistent design pattern with base components for confirmation dialogs, form modals, and informational modals.

---

## Implementation Status Summary

| Modal Group | Count | Status |
|-------------|-------|--------|
| Base Components | 3 | ✅ Implemented |
| Confirmation Dialogs | 10 | 🔄 Partial (using base ConfirmationDialog) |
| Form Modals | 4 | 🔄 Partial (using base FormModal) |
| Informational Modals | 4 | ❌ TODO |
| Picker/Selection Modals | 3 | 🔄 Partial |

---

## ✅ IMPLEMENTED

### Base Modal Components

**All base components have been implemented:**

| Component | File Path | Status |
|-----------|-----------|--------|
| Modal (base) | `src/ui/react/components/modals/Modal/Modal.jsx` | ✅ Complete |
| ConfirmationDialog | `src/ui/react/components/modals/ConfirmationDialog/ConfirmationDialog.jsx` | ✅ Complete |
| FormModal | `src/ui/react/components/modals/FormModal/FormModal.jsx` | ✅ Complete |
| useModal Hook | `src/ui/react/components/modals/Modal/useModal.js` | ✅ Complete |

### Base Modal Features

**Modal.jsx Features:**
- Full accessibility support (role="dialog", aria-modal, aria-labelledby, aria-describedby)
- Focus trapping with Tab/Shift+Tab cycling
- Return focus to trigger element on close
- Auto-focus first interactive element on open
- Escape key closes modal (configurable)
- Click backdrop to close (configurable)
- CSS animations for enter/exit transitions
- Portal rendering at document.body
- Body scroll lock when modal is open
- Three size variants: sm (400px), md (520px), lg (640px)
- Four severity levels: info, warning, danger, success

**ConfirmationDialog.jsx Features:**
- Three severity levels: info, warning, danger
- Type-to-confirm input for dangerous operations
- "Don't ask again" checkbox option
- Item list display for bulk operations
- Enter key disabled by default for danger severity
- Full accessibility support via base Modal

**FormModal.jsx Features:**
- Multiple form field types via FormField component
- Form-level and field-level validation
- Submit button loading state with spinner
- Auto-focus first field on open
- Clear form state on close
- Scroll to first error on validation failure
- Prevent Enter key from closing modal (except from buttons)

### Implemented Picker Modals

| Modal | Location | Status |
|-------|----------|--------|
| CreateRoomModal | `src/ui/react/components/collaboration/PeoplePanel/CreateRoomModal/` | ✅ Complete |
| WorkspacePickerModal | `src/ui/react/components/modals/WorkspacePickerModal/` | ✅ Complete |

---

## ❌ REMAINING TO IMPLEMENT

### Base Modal Patterns

| Property | Value |
|----------|-------|
| Small Width | 400px (confirmations) |
| Medium Width | 520px (forms) |
| Large Width | 640px (pickers/search) |
| Border Radius | 12px |
| Animation | 150ms fade + scale (0.95→1.0) |
| Backdrop | rgba(0,0,0,0.6) + blur(4px) |
| Z-Index | Backdrop: 500, Content: 501 |

### Severity Icons

| Severity | Icon | Color |
|----------|------|-------|
| Info | `Info` | #60a5fa (blue) |
| Warning | `AlertTriangle` | #fbbf24 (amber) |
| Danger | `Trash2` | #f87171 (red) |
| Success | `CheckCircle` | #4ade80 (green) |

### Keyboard Behavior

- **Escape:** Close (same as Cancel)
- **Tab/Shift+Tab:** Navigate (focus trapped)
- **Enter:** Confirm (DISABLED for danger severity - must click)

---

## Group 1: Confirmation Dialogs (10 modals)

Use the base `ConfirmationDialog` component with appropriate severity and content.

| Modal | Severity | Key Feature | Status |
|-------|----------|-------------|--------|
| Delete View | Danger (red) | Moves to Recently Deleted | ❌ TODO |
| Close All Views | Warning (amber) | "Don't ask again" checkbox | ❌ TODO |
| Delete All Views | Danger (red) | Scrollable list of views | ❌ TODO |
| Leave Room | Info (blue) | Only shown when leaving last room | ❌ TODO |
| Delete Recording | Danger (red) | Shows duration/size, compliance note | ❌ TODO |
| Delete Note | Warning (amber) | Three buttons: Cancel/Archive/Delete Permanently | ❌ TODO |
| Clear Chat | Danger (red) | Admin only, audit log retained | ❌ TODO |
| Archive Project | Warning (amber) | Shows impact list (members, datasets, recordings) | ❌ TODO |
| Transfer Ownership | Warning (amber) | Dropdown to select new owner (admins only) | ❌ TODO |
| Delete Project | Danger (MAXIMUM) | Type project name to confirm | ❌ TODO |

### Delete View Confirmation

```jsx
<ConfirmationDialog
  isOpen={isOpen}
  onClose={close}
  title="Delete View?"
  description="This view will be moved to Recently Deleted and can be restored for 30 days."
  severity="danger"
  confirmLabel="Delete View"
  onConfirm={handleDelete}
/>
```

### Close All Views Confirmation

```jsx
<ConfirmationDialog
  isOpen={isOpen}
  onClose={close}
  title="Close All Views?"
  description="This will close all views currently placed on the canvas. Views will move to 'Not Placed' and can be reopened."
  severity="warning"
  confirmLabel="Close All"
  onConfirm={handleCloseAll}
  showCheckbox={true}
  checkboxLabel="Don't ask me again"
  onCheckboxChange={handleDontAsk}
/>
```

### Delete Project Confirmation (Maximum Danger)

```jsx
<ConfirmationDialog
  isOpen={isOpen}
  onClose={close}
  title="Permanently Delete Project?"
  description={`This action cannot be undone. All project data, files, datasets, views, annotations, recordings, and chat history will be permanently deleted.`}
  severity="danger"
  confirmLabel="Delete Forever"
  onConfirm={handleDelete}
  showInput={true}
  inputPlaceholder="Type project name to confirm"
  inputMatchValue={projectName}
/>
```

### Delete Note (Three-Button Pattern)

Special case: Uses three buttons instead of two.

```jsx
<Modal
  isOpen={isOpen}
  onClose={close}
  title="Delete Note?"
  severity="warning"
  footer={
    <>
      <button className="btn btn--secondary" onClick={close}>Cancel</button>
      <button className="btn btn--warning" onClick={handleArchive}>Archive</button>
      <button className="btn btn--danger" onClick={handleDelete}>Delete Permanently</button>
    </>
  }
>
  <p>This note will be permanently deleted. Archive it instead to keep it hidden but restorable.</p>
</Modal>
```

---

## Group 2: Form Modals (4 modals)

Use the base `FormModal` component with appropriate fields.

| Modal | Key Fields | Status |
|-------|------------|--------|
| New Project | Name*, Description, Template dropdown, Visibility radio | ❌ TODO |
| Invite Member | Email tag input, Role dropdown, Personal message | ❌ TODO |
| Share View | Autocomplete search, Permission per person, Current shares list | ❌ TODO |
| Create Room | Already implemented | ✅ Complete |

### New Project Modal

```jsx
<FormModal
  isOpen={isOpen}
  onClose={close}
  title="Create New Project"
  icon="folderPlus"
  submitLabel="Create Project"
  onSubmit={handleCreate}
  isSubmitting={isSubmitting}
>
  <FormField name="name" label="Project Name" required value={name} onChange={setName} />
  <FormField name="description" label="Description" type="textarea" value={desc} onChange={setDesc} />
  <FormField name="template" label="Template" type="select" options={templates} value={template} onChange={setTemplate} />
  <FormField name="visibility" label="Visibility" type="radio" options={visibilityOptions} value={visibility} onChange={setVisibility} />
</FormModal>
```

### Invite Member Modal

```jsx
<FormModal
  isOpen={isOpen}
  onClose={close}
  title="Invite Team Member"
  icon="userPlus"
  submitLabel="Send Invitation"
  onSubmit={handleInvite}
  isSubmitting={isSubmitting}
>
  <FormField name="emails" label="Email Addresses" type="tags" placeholder="Type email and press Enter" value={emails} onChange={setEmails} />
  <FormField name="role" label="Role" type="select" options={roleOptions} value={role} onChange={setRole} />
  <FormField name="message" label="Personal Message (optional)" type="textarea" value={message} onChange={setMessage} />
</FormModal>
```

### Share View Modal

More complex form with current shares list:

```jsx
<FormModal
  isOpen={isOpen}
  onClose={close}
  title="Share View"
  icon="share"
  submitLabel="Update Sharing"
  onSubmit={handleShare}
  isSubmitting={isSubmitting}
>
  <FormField name="search" label="Add People" type="autocomplete" options={teamMembers} value={search} onChange={setSearch} />
  
  {/* Current shares list */}
  <div className="share-list">
    <h4>Currently Shared With</h4>
    {currentShares.map(share => (
      <ShareRow key={share.userId} share={share} onRemove={handleRemove} onPermissionChange={handlePermissionChange} />
    ))}
  </div>
</FormModal>
```

---

## Group 3: Informational Modals (4 modals)

| Modal | Content | Status |
|-------|---------|--------|
| Help Modal | Quick start, shortcuts link, docs, videos, support | ❌ TODO |
| Keyboard Shortcuts | Categorized tabs/accordion, two-column layout | ❌ TODO |
| User Profile | Avatar, role badge, email, activity, quick actions | ❌ TODO |
| Recording Consent | Checklist of what's recorded, Leave/Continue buttons | ❌ TODO |

### Help Modal

```jsx
<Modal
  isOpen={isOpen}
  onClose={close}
  title="Help & Resources"
  icon="helpCircle"
  size="md"
>
  <div className="help-modal">
    <section className="help-modal__quick-start">
      <h3>Quick Start</h3>
      <ul>
        <li>Upload your first dataset</li>
        <li>Create a view from the dataset</li>
        <li>Place views on the canvas</li>
        <li>Invite collaborators</li>
      </ul>
    </section>
    
    <section className="help-modal__links">
      <a href="#" onClick={openShortcuts}>Keyboard Shortcuts</a>
      <a href="https://docs.ciaweb.app">Documentation</a>
      <a href="https://ciaweb.app/tutorials">Video Tutorials</a>
      <a href="mailto:support@ciaweb.app">Contact Support</a>
    </section>
  </div>
</Modal>
```

### Keyboard Shortcuts Modal

Large modal with categorized shortcuts:

```jsx
<Modal
  isOpen={isOpen}
  onClose={close}
  title="Keyboard Shortcuts"
  icon="keyboard"
  size="lg"
>
  <div className="shortcuts-modal">
    <nav className="shortcuts-modal__tabs">
      <button onClick={() => setTab('general')}>General</button>
      <button onClick={() => setTab('canvas')}>Canvas</button>
      <button onClick={() => setTab('tools')}>Tools</button>
      <button onClick={() => setTab('navigation')}>Navigation</button>
    </nav>
    
    <div className="shortcuts-modal__content">
      {shortcuts[activeTab].map(shortcut => (
        <div className="shortcut-row">
          <kbd>{shortcut.keys}</kbd>
          <span>{shortcut.description}</span>
        </div>
      ))}
    </div>
  </div>
</Modal>
```

### Recording Consent Modal (Special Behavior)

**Cannot be dismissed with Escape key.**

```jsx
<Modal
  isOpen={isOpen}
  onClose={close}
  title="Recording in Progress"
  icon="video"
  severity="warning"
  size="sm"
  closeOnEscape={false}
  footer={
    <>
      <button className="btn btn--secondary" onClick={handleLeave}>Leave Session</button>
      <button className="btn btn--primary" onClick={handleContinue}>Continue</button>
    </>
  }
>
  <div className="consent-modal">
    <p>This session is being recorded. The following will be captured:</p>
    <ul className="consent-checklist">
      <li>✓ Screen activity (your views and interactions)</li>
      <li>✓ Voice chat (if enabled)</li>
      <li>✓ Chat messages</li>
      <li>✓ Annotations and changes you make</li>
    </ul>
    <p className="consent-note">Recording started by {recorderName} at {startTime}</p>
  </div>
</Modal>
```

---

## Group 4: Picker/Selection Modals (3 modals)

| Modal | Features | Status |
|-------|----------|--------|
| Merge Conflict Picker | Grid of view cards, radio selection, displaced views options | ❌ TODO |
| Global Search | Cmd+K trigger, filter chips, keyboard navigation, recent searches | ❌ TODO |
| Workspace Picker | Already implemented | ✅ Complete |

### Merge Conflict Picker Modal

```jsx
<Modal
  isOpen={isOpen}
  onClose={close}
  title="Merge Conflict"
  icon="combine"
  size="lg"
  footer={
    <>
      <button className="btn btn--secondary" onClick={close}>Cancel</button>
      <button className="btn btn--primary" onClick={handleMerge} disabled={!selectedView}>
        Merge Cells
      </button>
    </>
  }
>
  <div className="merge-conflict-modal">
    <p>Multiple views exist in the cells you're merging. Select which view to keep:</p>
    
    <div className="merge-conflict-modal__grid">
      {conflictingViews.map(view => (
        <ViewCard
          key={view.id}
          view={view}
          selected={selectedView === view.id}
          onSelect={() => setSelectedView(view.id)}
        />
      ))}
    </div>
    
    <div className="merge-conflict-modal__options">
      <h4>What happens to other views?</h4>
      <RadioGroup value={displacedAction} onChange={setDisplacedAction}>
        <Radio value="close">Move to "Not Placed"</Radio>
        <Radio value="autoflow">Auto-place in next available cells</Radio>
        <Radio value="keepall">Keep All (expand selected, others autoflow)</Radio>
      </RadioGroup>
    </div>
    
    <label className="merge-conflict-modal__remember">
      <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
      Remember my choice for this session
    </label>
  </div>
</Modal>
```

### Global Search Modal (Cmd+K)

```jsx
<Modal
  isOpen={isOpen}
  onClose={close}
  title={null} // No title, search input is the header
  size="lg"
  className="global-search-modal"
>
  <div className="global-search">
    <div className="global-search__header">
      <SearchIcon />
      <input
        ref={searchInputRef}
        type="text"
        placeholder="Search across all projects..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        autoFocus
      />
      <kbd>ESC</kbd>
    </div>
    
    <div className="global-search__filters">
      <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>All</FilterChip>
      <FilterChip active={filter === 'files'} onClick={() => setFilter('files')}>Files</FilterChip>
      <FilterChip active={filter === 'datasets'} onClick={() => setFilter('datasets')}>Datasets</FilterChip>
      <FilterChip active={filter === 'views'} onClick={() => setFilter('views')}>Views</FilterChip>
      <FilterChip active={filter === 'annotations'} onClick={() => setFilter('annotations')}>Annotations</FilterChip>
    </div>
    
    {query ? (
      <div className="global-search__results">
        {results.map((result, index) => (
          <SearchResult
            key={result.id}
            result={result}
            highlighted={highlightedIndex === index}
            onClick={() => handleSelect(result)}
          />
        ))}
      </div>
    ) : (
      <div className="global-search__recent">
        <h4>Recent Searches</h4>
        {recentSearches.map(search => (
          <RecentSearchItem search={search} onClick={() => setQuery(search)} />
        ))}
      </div>
    )}
  </div>
</Modal>
```

---

## Accessibility Requirements

All modals must implement:

1. **Focus Management:**
   - Auto-focus first focusable element on open
   - Trap focus within modal (Tab/Shift+Tab cycle)
   - Return focus to trigger element on close

2. **ARIA Attributes:**
   - `role="dialog"` on modal container
   - `aria-modal="true"`
   - `aria-labelledby` pointing to title
   - `aria-describedby` pointing to description (if present)

3. **Keyboard Navigation:**
   - Escape closes modal (configurable)
   - Tab cycles through focusable elements
   - Enter triggers primary action (disabled for danger)

4. **Screen Reader:**
   - Announce modal title on open
   - Announce when modal closes
   - Descriptive button labels

---

## File Structure

```
src/ui/react/components/modals/
├── Modal/
│   ├── Modal.jsx           ✅ Implemented
│   ├── Modal.scss          ✅ Implemented
│   ├── useModal.js         ✅ Implemented
│   └── index.js
├── ConfirmationDialog/
│   ├── ConfirmationDialog.jsx  ✅ Implemented
│   ├── ConfirmationDialog.scss ✅ Implemented
│   └── index.js
├── FormModal/
│   ├── FormModal.jsx       ✅ Implemented
│   ├── FormModal.scss      ✅ Implemented
│   ├── FormField.jsx       ✅ Implemented
│   └── index.js
├── HelpModal/              ❌ TODO
├── ShortcutsModal/         ❌ TODO
├── ProfileModal/           ❌ TODO
├── GlobalSearchModal/      ❌ TODO
├── MergeConflictModal/     ❌ TODO
└── WorkspacePickerModal/   ✅ Implemented
```

---

*This document serves as the authoritative reference for Modal implementation.*
