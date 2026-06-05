import React, { memo } from 'react';

export const CompanionPanel = memo(function CompanionPanel({
  isOpen,
  activeTab,
  onTabChange,
  views,
  datasets,
  onViewClick,
  onDatasetClick,
  sizeMode,
}) {
  if (!isOpen) return null;

  return (
    <div className="companion-panel">
      <p>CompanionPanel — not yet implemented</p>
    </div>
  );
});
