// src/ui/react/store/toastStore.js
import { create } from "zustand";

let toastId = 0;

export const useToastStore = create((set, get) => ({
  toasts: [],

  addToast: ({ type = "info", message, duration = 4000 }) => {
    const id = ++toastId;
    const toast = { id, type, message, duration };

    set((state) => ({ toasts: [...state.toasts, toast] }));

    // Auto-remove after duration (unless duration is 0 for persistent)
    if (duration > 0) {
      setTimeout(() => get().removeToast(id), duration);
    }

    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearAll: () => set({ toasts: [] }),
}));

// Convenience functions for direct import
export const toast = {
  info: (message, duration) =>
    useToastStore.getState().addToast({ type: "info", message, duration }),
  success: (message, duration) =>
    useToastStore.getState().addToast({ type: "success", message, duration }),
  warning: (message, duration) =>
    useToastStore.getState().addToast({ type: "warning", message, duration }),
  error: (message, duration) =>
    useToastStore.getState().addToast({ type: "error", message, duration }),
};
