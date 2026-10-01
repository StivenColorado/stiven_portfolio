import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

/**
 * Formulario de contacto con Web3Forms (https://web3forms.com).
 * - Es gratis (250 envíos/mes) y NO requiere backend propio.
 * - El destinatario (tu correo) se define al crear la access key en web3forms.com.
 * - El visitante escribe su correo de origen; Web3Forms lo pone como "reply-to",
 *   así que al responder le contestas directamente a esa persona.
 *
 * Configura la key en un archivo `.env`:  VITE_WEB3FORMS_KEY=xxxxxxxx
 */

const ACCESS_KEY = import.meta.env.VITE_WEB3FORMS_KEY as string | undefined;

type Status = "idle" | "sending" | "success" | "error";

const ContactForm: React.FC = () => {
    const { t } = useTranslation();
    const [status, setStatus] = useState<Status>("idle");
    const [errorMsg, setErrorMsg] = useState("");

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!ACCESS_KEY) {
            setStatus("error");
            setErrorMsg(t("contact.missingKey"));
            return;
        }

        setStatus("sending");
        setErrorMsg("");

        const form = e.currentTarget;
        const formData = new FormData(form);
        formData.append("access_key", ACCESS_KEY);
        formData.append("subject", "Nuevo mensaje desde tu Portafolio");
        formData.append("from_name", "Portafolio Stiven Colorado");

        try {
            const res = await fetch("https://api.web3forms.com/submit", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (data.success) {
                setStatus("success");
                form.reset();
            } else {
                setStatus("error");
                setErrorMsg(data.message || t("contact.failed"));
            }
        } catch {
            setStatus("error");
            setErrorMsg(t("contact.network"));
        }
    };

    const inputBase = "field";
    const labelBase = "mb-1.5 block font-mono text-xs font-bold uppercase tracking-widest text-ink";

    if (status === "success") {
        return (
            <div role="status" className="flex flex-col items-center justify-center gap-3 p-4 text-center">
                <CheckCircle2 className="h-12 w-12" strokeWidth={2.5} aria-hidden="true" />
                <h3 className="text-2xl text-ink">{t("contact.sentTitle")}</h3>
                <p className="text-muted">{t("contact.sentText")}</p>
                <button
                    type="button"
                    onClick={() => setStatus("idle")}
                    className="mt-2 text-sm underline underline-offset-4 hover:bg-ink hover:text-paper"
                >
                    {t("contact.another")}
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4" aria-describedby={status === "error" ? "cf-error" : undefined}>
            <input type="checkbox" name="botcheck" className="hidden" tabIndex={-1} autoComplete="off" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="cf-name" className={labelBase}>{t("contact.name")}</label>
                    <input
                        id="cf-name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        required
                        aria-describedby={status === "error" ? "cf-error" : undefined}
                        placeholder={t("contact.namePh")}
                        className={inputBase}
                    />
                </div>
                <div>
                    <label htmlFor="cf-email" className={labelBase}>{t("contact.email")}</label>
                    <input
                        id="cf-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        required
                        aria-describedby={status === "error" ? "cf-error" : undefined}
                        placeholder={t("contact.emailPh")}
                        className={inputBase}
                    />
                </div>
            </div>

            <div>
                <label htmlFor="cf-message" className={labelBase}>{t("contact.message")}</label>
                <textarea
                    id="cf-message"
                    name="message"
                    autoComplete="off"
                    required
                    aria-describedby={status === "error" ? "cf-error" : undefined}
                    rows={5}
                    placeholder={t("contact.messagePh")}
                    className={`${inputBase} resize-y`}
                />
            </div>

            {status === "error" && (
                <p id="cf-error" role="alert" className="flex items-start gap-2 border-2 border-ink bg-paper p-2 text-sm text-ink">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {errorMsg}
                </p>
            )}

            <button
                type="submit"
                disabled={status === "sending"}
                className="btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
                {status === "sending" ? (
                    <>
                        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> {t("contact.sending")}
                    </>
                ) : (
                    <>
                        <Send className="h-5 w-5" aria-hidden="true" /> {t("contact.send")}
                    </>
                )}
            </button>
        </form>
    );
};

export default ContactForm;
