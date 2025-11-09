// src/icons/IconLibrary.jsx
import * as LucideIcons from "lucide-react";

export const Icons = {
  cursorOn: LucideIcons.Eye,
  cursorOff: LucideIcons.EyeOff
  // Add more icons here as needed
};

// Optional: helper function for dynamic access
export function getIcon(name) {
  return Icons[name] || null;
}