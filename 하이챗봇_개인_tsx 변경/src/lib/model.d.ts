export interface DocumentInfo { id: string; name: string; method: string; issuer: string }
export interface Upload { name: string; type: string; url: string | null; sample: boolean; sampleVariant: string | null }
export interface State { businessType: string; purpose: string; fetched: boolean; upload: Upload | null; checked: boolean; corrected: boolean; staffRequested: boolean; receipt: { id: string; date: string } | null }
export type Action = { type: "conditions"; value: Partial<Pick<State, "businessType" | "purpose">> } | { type: "upload"; value: Upload } | { type: "submit"; value: NonNullable<State["receipt"]> } | { type: "fetch" | "delete" | "check" | "recheck" | "request" | "reset" };
export const DOCUMENTS: DocumentInfo[];
export const SAMPLE_FILES: { id: string; name: string; description: string }[];
export const INITIAL_STATE: State;
export function reducer(state: State, action: Action): State;
export function isCorrectedSample(upload: Upload | null): boolean;
export function canSubmit(state: State): boolean;
export function getResults(state: State): (DocumentInfo & { status: "staff" | "pass" | "fix" })[];
export function validateFile(file: File | null): string;
export function formatDate(date: Date | number): string;
