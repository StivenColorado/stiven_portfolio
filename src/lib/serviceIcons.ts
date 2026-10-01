import { Bot, Briefcase, Cloud, Code2, Compass, Cpu, Database, Globe, LineChart, Lock, Rocket, Server, ShieldCheck, Smartphone, Sparkles, Workflow } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const SERVICE_ICONS = {
    Compass, Code2, Bot, ShieldCheck, Sparkles, Briefcase, Server, Database,
    Smartphone, Cloud, Cpu, Rocket, Workflow, LineChart, Lock, Globe,
} as const satisfies Record<string, LucideIcon>;

export type ServiceIconName = keyof typeof SERVICE_ICONS;

export const SERVICE_ICON_NAMES = Object.keys(SERVICE_ICONS) as ServiceIconName[];

export const getServiceIcon = (name: string): LucideIcon =>
    (SERVICE_ICONS as Record<string, LucideIcon>)[name] ?? Code2;
