import { create } from "zustand";
import { api } from "@/lib/api";

export type ProjectSummary = {
  id: string;
  name: string;
  description?: string;
  ownerId?: string;
  createdAt: string;
  updatedAt?: string;
  tickets?: Array<{ id: string; status: string; priority?: string }>;
  members?: Array<{ userId: string; role: string }>;
};

type ProjectsState = {
  projects: ProjectSummary[];
  /** True only during the very first load — used to show skeletons, not spinners. */
  initialLoading: boolean;
  loaded: boolean;
  error: string | null;
  load: (opts?: { force?: boolean }) => Promise<void>;
  /** Local-only mutations so the UI updates instantly without a refetch. */
  upsert: (project: ProjectSummary) => void;
  remove: (id: string) => void;
  reset: () => void;
};

/**
 * Shared cache for the project list.
 *
 * The dashboard, the sidebar and (previously) the notification bell each called
 * GET /projects independently, so opening the dashboard fired the same heavy
 * request three times — and every `project:updated` socket event fired it twice
 * more. They now all read from this one store.
 *
 * `inFlight` collapses concurrent callers onto a single promise, so even if three
 * components mount in the same tick only one HTTP request goes out.
 */
let inFlight: Promise<void> | null = null;

export const useProjects = create<ProjectsState>()((set, get) => ({
  projects: [],
  initialLoading: true,
  loaded: false,
  error: null,

  async load(opts) {
    // Serve from cache unless the caller explicitly wants fresh data.
    if (!opts?.force && get().loaded) return;
    if (inFlight) return inFlight;

    inFlight = (async () => {
      try {
        const { data } = await api.get<ProjectSummary[]>("/projects");
        set({ projects: data, loaded: true, initialLoading: false, error: null });
      } catch (err: any) {
        // Re-throw 401 so callers can redirect; swallow transient network errors
        // rather than blanking a list the user is already looking at.
        set({ initialLoading: false, error: err?.message ?? "Failed to load projects" });
        if (err?.response?.status === 401) throw err;
      } finally {
        inFlight = null;
      }
    })();

    return inFlight;
  },

  upsert(project) {
    set((state) => {
      const idx = state.projects.findIndex((p) => p.id === project.id);
      if (idx === -1) return { projects: [project, ...state.projects] };
      const next = [...state.projects];
      next[idx] = { ...next[idx], ...project };
      return { projects: next };
    });
  },

  remove(id) {
    set((state) => ({ projects: state.projects.filter((p) => p.id !== id) }));
  },

  reset() {
    inFlight = null;
    set({ projects: [], initialLoading: true, loaded: false, error: null });
  },
}));
