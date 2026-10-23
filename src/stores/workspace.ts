import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface WorkspaceState {
  currentClassId: string | null;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  saveStatus: "idle" | "saving" | "saved" | "error";
  setCurrentClassId: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSaveStatus: (status: WorkspaceState["saveStatus"]) => void;
}

export const useWorkspace = create<WorkspaceState>()(
  persist(
    (set) => ({
      currentClassId: null,
      sidebarOpen: false,
      sidebarCollapsed: false,
      saveStatus: "idle",
      setCurrentClassId: (id) => set({ currentClassId: id }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setSaveStatus: (status) => set({ saveStatus: status }),
    }),
    {
      // 持久化到 localStorage 的 key；变更持久化形态时需增加 version/migrate
      name: "workspace",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ currentClassId: s.currentClassId }),
    },
  ),
);
