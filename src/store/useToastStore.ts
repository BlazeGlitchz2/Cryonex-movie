import { create } from "zustand";

export interface Toast {
  id: number;
  title: string;
  tone: "info" | "success";
}

interface ToastInput {
  title: string;
  tone?: "info" | "success";
}

interface ToastState {
  toasts: Toast[];
  pushToast: (toast: ToastInput) => void;
}

// module counter so ids keep incrementing across store lifetimes
let nextToastId = 1;
const TOAST_LIFETIME_MS = 2800;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  pushToast: ({ title, tone = "info" }) => {
    const id = nextToastId;
    nextToastId += 1;
    set((state) => ({ toasts: [...state.toasts, { id, title, tone }] }));
    window.setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((toast) => toast.id !== id),
      }));
    }, TOAST_LIFETIME_MS);
  },
}));
