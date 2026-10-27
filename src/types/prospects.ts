export const PROSPECT_STATUSES = ["new", "contacted", "replied", "meeting", "proposal", "won", "lost"] as const;
export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];

export interface ProspectInput {
    business: string;
    owner: string;
    phones: string[];
    emails: string[];
    websites: string[];
    source: string;
}

export interface Prospect extends ProspectInput {
    id: number;
    status: ProspectStatus;
    lastContactAt: number | null;
    createdAt: number;
    updatedAt: number;
    noteCount: number;
}

export interface ProspectNote { id: number; text: string; ts: number }
