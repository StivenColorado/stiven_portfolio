export type DocBlock = { type: "h1"; text: string } | { type: "h2"; text: string } | { type: "p"; text: string } | { type: "li"; text: string } | { type: "table"; rows: string[][] };

export interface CoverInfo {
    ownerName: string;
    ownerEmail: string;
    ownerPhone: string;
    ownerCity: string;
    clientName: string;
    date: string;
    ref: string;
    subtitle: string;
}
export type ClientStatus = "active" | "archived";
export type DocKind = "services" | "sow" | "sla" | "nda" | "acceptance" | "change_order" | "retainer" | "data_processing";
export type DocStatus = "draft" | "sent" | "client_signed" | "active" | "expired" | "cancelled";
export type ContractLang = "es" | "en";
export type DocType = "CC" | "NIT" | "CE" | "PAS";
export type VarType = "text" | "textarea" | "number" | "money" | "date";

export const DOC_KINDS: DocKind[] = ["services", "sow", "sla", "nda", "acceptance", "change_order", "retainer", "data_processing"];
export const DOC_TYPES: DocType[] = ["CC", "NIT", "CE", "PAS"];
export const DOC_STATUSES: DocStatus[] = ["draft", "sent", "client_signed", "active", "expired", "cancelled"];

export interface Strokes { w: number; h: number; strokes: number[][] }

export interface Signature {
    name: string;
    strokes: Strokes;
    ts: number;
    ip: string | null;
    ua: string | null;
    hash: string;
}

export interface ClientInput {
    name: string;
    legalName: string;
    docType: DocType;
    docNumber: string;
    contactName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    country: string;
    lang: ContractLang;
    notes: string;
    defaults: Record<string, string>;
}

export interface AdminClient extends ClientInput {
    id: number;
    status: ClientStatus;
    createdAt: number;
    updatedAt: number;
    docCounts?: Partial<Record<DocStatus, number>>;
}

export interface TemplateVar {
    key: string;
    label: string;
    type: VarType;
    required?: boolean;
    default?: string;
}

export interface TemplateInput {
    kind: DocKind;
    lang: ContractLang;
    name: string;
    body: string;
    variables: TemplateVar[];
}

export interface ContractTemplate extends TemplateInput {
    id: number;
    seedKey: string | null;
    createdAt: number;
    updatedAt: number;
}

export interface DocVersion {
    id: number;
    version: number;
    rendered: string;
    contentHash: string;
    note: string | null;
    createdAt: number;
}

export interface ContractDoc {
    id: number;
    clientId: number;
    parentId: number | null;
    templateId: number | null;
    kind: DocKind;
    lang: ContractLang;
    title: string;
    status: DocStatus;
    version: number;
    body: string;
    variables: Record<string, string>;
    varDefs?: TemplateVar[];
    rendered?: string;
    cover?: CoverInfo;
    contentHash: string | null;
    sentTo: string | null;
    sentAt: number | null;
    completedAt: number | null;
    expiresAt: string | null;
    remindDays: number;
    remindersSent: number;
    signatures: { owner?: Signature; client?: Signature };
    message?: string;
    versions?: DocVersion[];
    children?: ContractDoc[];
    link?: { expiresAt: number; expired: boolean } | null;
    createdAt: number;
    updatedAt: number;
}

export interface DocInput {
    title: string;
    body: string;
    variables: Record<string, string>;
    remindDays: number;
    expiresAt: string | null;
}

export interface NewDocInput { templateId: number; parentId?: number | null; title?: string }

export interface SendInput {
    email: string;
    expiresInDays: number;
    message?: string;
    remindDays: number;
    signature: Strokes | null;
    useSaved: boolean;
}

export interface OwnerProfile {
    name: string;
    docType: DocType;
    docNumber: string;
    email: string;
    phone: string;
    address: string;
    city: string;
}

export interface SignView {
    status: DocStatus;
    title: string;
    lang: ContractLang;
    kind: DocKind;
    blocks: DocBlock[];
    cover?: CoverInfo;
    clientName: string;
    contactName: string;
    ownerName: string;
    ownerSignature: Strokes | null;
    clientSigned: { name: string; ts: number } | null;
    expiresAt: number | null;
    hash: string;
}

export interface SignResult { ok: boolean; signedAt: number; hash: string }
