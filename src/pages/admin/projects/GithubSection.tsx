import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Select from "../../../components/ui/Select";
import Field from "../../../components/admin/ui/Field";
import Check from "../../../components/admin/Check";
import { githubApi, type GithubRepo } from "../../../lib/adminApi";

interface Props {
    repo: string;
    workingOn: boolean;
    error?: string;
    onRepo: (v: string) => void;
    onWorkingOn: (v: boolean) => void;
}

type State = { configured: boolean; repos: GithubRepo[] } | "error" | null;

const REPO_RE = /^[\w.-]+\/[\w.-]+$/;

export default function GithubSection({ repo, workingOn, error, onRepo, onWorkingOn }: Props) {
    const { t, i18n } = useTranslation();
    const [state, setState] = useState<State>(null);

    useEffect(() => {
        let alive = true;
        githubApi.repos().then((r) => alive && setState(r)).catch(() => alive && setState("error"));
        return () => { alive = false; };
    }, []);

    const options = useMemo(() => {
        if (!state || state === "error") return [];
        const fmt = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" });
        const opts = state.repos.map((r) => ({
            value: r.fullName,
            label: `${r.fullName} · ${t(r.private ? "adminProjects.github.private" : "adminProjects.github.public")} · ${
                r.pushedAt ? t("adminProjects.github.lastPush", { date: fmt.format(new Date(r.pushedAt)) }) : t("adminProjects.github.noPush")}`,
        }));
        if (repo && !opts.some((o) => o.value === repo)) opts.unshift({ value: repo, label: repo });
        return opts;
    }, [state, repo, t, i18n.language]);

    const manual = state === "error" || (state !== null && !state.configured);

    return (
        <div className="space-y-4">
            {state === null && <p className="text-sm text-muted" role="status">{t("adminProjects.editor.loading")}</p>}
            {state === "error" && <p className="text-sm font-bold text-ink" role="status">{t("adminProjects.github.loadError")}</p>}
            {state !== null && state !== "error" && !state.configured && (
                <p className="dither border-2 border-dashed border-ink p-3 text-sm font-bold text-ink" role="status">{t("adminProjects.github.notConfigured")}</p>
            )}
            {manual ? (
                <Field
                    label={t("adminProjects.github.manual")}
                    value={repo}
                    onChange={onRepo}
                    placeholder="owner/repo"
                    hint={t("adminProjects.github.manualHint")}
                    error={error ?? (repo && !REPO_RE.test(repo) ? t("adminProjects.github.manualInvalid") : undefined)}
                />
            ) : state !== null && (
                <div className="space-y-1">
                    <Select
                        label={t("adminProjects.github.repo")}
                        options={options}
                        value={repo}
                        onChange={(v: string) => onRepo(v)}
                        placeholder={t("adminProjects.github.placeholder")}
                        searchPlaceholder={t("adminProjects.github.search")}
                        searchable
                        clearable
                    />
                    {error && <p role="alert" className="text-sm font-extrabold text-ink">{error}</p>}
                </div>
            )}
            <div className="flex items-start gap-3">
                <Check checked={workingOn} onChange={onWorkingOn} label={t("adminProjects.github.workingOn")} />
                <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-extrabold text-ink">{t("adminProjects.github.workingOn")}</p>
                    <p className="text-xs text-muted">{t(workingOn && !repo ? "adminProjects.github.needsRepo" : "adminProjects.github.workingOnHint")}</p>
                </div>
            </div>
            <p className="text-xs text-muted">{t("adminProjects.github.privacy")}</p>
        </div>
    );
}
