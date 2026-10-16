import { create } from 'zustand';

/** Results collected by the device lab, copied as one JSON report. */
interface LabReport {
  results: Record<string, unknown>;
  record: (key: string, value: unknown) => void;
}

export const useLabReport = create<LabReport>((set) => ({
  results: {},
  record: (key, value) => set((s) => ({ results: { ...s.results, [key]: value } })),
}));
