import { create } from "zustand";
import type { TripSuggestionResult } from "../services/tripAI";
import type { LiveDealResult } from "../services/searchApi";

interface PlanningState {
  query: string;
  result: TripSuggestionResult | null;
  createdTrips: Record<string, string>;
  tripStartDates: Record<string, string>;
  routeDeals: Record<string, LiveDealResult>;
  routeDealsLive: Record<string, boolean>;
  dealsLoading: Record<string, boolean>;
  budgetStyle: string | null;
  customBudget: string;
  startDate: string;
  endDate: string;
  intensity: "relaxed" | "balanced" | "packed" | null;
  showConstraints: boolean;
}

interface PlanningActions {
  setQuery: (query: string) => void;
  setResult: (result: TripSuggestionResult | null) => void;
  setCreatedTrips: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
  setTripStartDates: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
  setRouteDeals: (fn: (prev: Record<string, LiveDealResult>) => Record<string, LiveDealResult>) => void;
  setRouteDealsLive: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
  setDealsLoading: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
  setBudgetStyle: (style: string | null) => void;
  setCustomBudget: (val: string) => void;
  setStartDate: (val: string) => void;
  setEndDate: (val: string) => void;
  setIntensity: (val: "relaxed" | "balanced" | "packed" | null) => void;
  setShowConstraints: (val: boolean) => void;
  resetPlanning: () => void;
}

const initialState: PlanningState = {
  query: "",
  result: null,
  createdTrips: {},
  tripStartDates: {},
  routeDeals: {},
  routeDealsLive: {},
  dealsLoading: {},
  budgetStyle: null,
  customBudget: "",
  startDate: "",
  endDate: "",
  intensity: null,
  showConstraints: true,
};

export const usePlanningStore = create<PlanningState & PlanningActions>((set) => ({
  ...initialState,

  setQuery: (query) => set({ query }),
  setResult: (result) => set({ result }),
  setCreatedTrips: (fn) => set((s) => ({ createdTrips: fn(s.createdTrips) })),
  setTripStartDates: (fn) => set((s) => ({ tripStartDates: fn(s.tripStartDates) })),
  setRouteDeals: (fn) => set((s) => ({ routeDeals: fn(s.routeDeals) })),
  setRouteDealsLive: (fn) => set((s) => ({ routeDealsLive: fn(s.routeDealsLive) })),
  setDealsLoading: (fn) => set((s) => ({ dealsLoading: fn(s.dealsLoading) })),
  setBudgetStyle: (style) => set({ budgetStyle: style }),
  setCustomBudget: (val) => set({ customBudget: val }),
  setStartDate: (val) => set({ startDate: val }),
  setEndDate: (val) => set({ endDate: val }),
  setIntensity: (val) => set({ intensity: val }),
  setShowConstraints: (val) => set({ showConstraints: val }),
  resetPlanning: () => set(initialState),
}));
