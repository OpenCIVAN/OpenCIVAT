// src/components/Icon.jsx
import React from 'react';
import { getIcon } from '../icons/IconLibrary';

export function Icon({ name, size = 24, color = 'currentColor', ...props }) {
  const LucideIcon = getIcon(name);

  if (!LucideIcon) return null;

  return <LucideIcon size={size} color={color} {...props} />;
}
