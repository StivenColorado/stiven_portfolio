import React, { useState } from "react";
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
    const [status, setStatus] = useState<Status>("idle");
    const [errorMsg, setErrorMsg] = useState("");

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!ACCESS_KEY) {
            setStatus("error");
            setErrorMsg(
                "Falta configurar VITE_WEB3FORMS_KEY. Crea una key gratis en web3forms.com y agrégala al archivo .env."
            );
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
                setErrorMsg(data.message || "No se pudo enviar el mensaje. Intenta de nuevo.");
            }
        } catch {
            setStatus("error");
            setErrorMsg("Error de red. Revisa tu conexión e intenta de nuevo.");
        }
    };

    const inputBase =
        "w-full rounded-lg px-4 py-3 outline-none transition-colors " +
        "bg-black/5 dark:bg-white/5 " +
        "border border-zinc-300 dark:border-white/10 " +
        "text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 " +
        "focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-2 focus:ring-zinc-900/15 dark:focus:ring-zinc-100/20";

    if (status === "success") {
        return (
            <div className="flex flex-col items-center justify-center gap-3 rounded-md border-2 border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-900 p-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-zinc-900 dark:text-zinc-100" />
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-white">
                    ¡Mensaje enviado!
                </h3>
                <p className="text-zinc-600 dark:text-zinc-300">
                    Gracias por escribir. Te responderé lo antes posible.
                </p>
                <button
                    onClick={() => setStatus("idle")}
                    className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:underline"
                >
                    Enviar otro mensaje
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Honeypot anti-spam (Web3Forms lo ignora si está vacío) */}
            <input type="checkbox" name="botcheck" className="hidden" tabIndex={-1} autoComplete="off" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="cf-name" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Nombre
                    </label>
                    <input
                        id="cf-name"
                        name="name"
                        type="text"
                        required
                        placeholder="Tu nombre"
                        className={inputBase}
                    />
                </div>
                <div>
                    <label htmlFor="cf-email" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Tu correo
                    </label>
                    <input
                        id="cf-email"
                        name="email"
                        type="email"
                        required
                        placeholder="tucorreo@ejemplo.com"
                        className={inputBase}
                    />
                </div>
            </div>

            <div>
                <label htmlFor="cf-message" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Mensaje
                </label>
                <textarea
                    id="cf-message"
                    name="message"
                    required
                    rows={5}
                    placeholder="Cuéntame en qué puedo ayudarte..."
                    className={`${inputBase} resize-y`}
                />
            </div>

            {status === "error" && (
                <p className="flex items-start gap-2 text-sm text-red-500">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {errorMsg}
                </p>
            )}

            <button
                type="submit"
                disabled={status === "sending"}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md
                           border-2 border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 px-6 py-3 font-semibold text-white dark:text-zinc-900
                           transition-all duration-200 hover:bg-transparent hover:text-zinc-900 dark:hover:bg-transparent dark:hover:text-zinc-100
                           disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
                {status === "sending" ? (
                    <>
                        <Loader2 className="h-5 w-5 animate-spin" /> Enviando...
                    </>
                ) : (
                    <>
                        <Send className="h-5 w-5" /> Enviar mensaje
                    </>
                )}
            </button>
        </form>
    );
};

export default ContactForm;
