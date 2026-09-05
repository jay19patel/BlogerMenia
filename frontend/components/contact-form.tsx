"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { contactPayloadSchema, type ContactPayload } from "@/lib/api/schemas";
import { applyServerErrors } from "@/lib/forms";
import { apiFetch } from "@/lib/query/fetcher";
import { urls } from "@/lib/urls";
import { FormInput, FormTextArea } from "@/components/form-fields";
import { useMessages } from "@/components/messages-provider";

/**
 * `blog.forms.ContactForm` as rendered by `blog/contact.html`.
 */

const FIELDS = [
  { name: "name", label: "Name", placeholder: "Your Name", type: "text", maxLength: 100 },
  { name: "email", label: "Email", placeholder: "your@email.com", type: "email" },
  { name: "subject", label: "Subject", placeholder: "How can we help?", type: "text", maxLength: 200 },
] as const;

export function ContactForm({ initialSuccess = false }: { initialSuccess?: boolean }) {
  const router = useRouter();
  const { addMessage } = useMessages();
  const [isSuccess, setIsSuccess] = useState(initialSuccess);
  const [rootError, setRootError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setError,
    reset,
    formState: { isSubmitting },
  } = useForm<ContactPayload>({
    resolver: zodResolver(contactPayloadSchema),
    defaultValues: { name: "", email: "", subject: "", message: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setRootError(null);
    try {
      await apiFetch("/api/contact/", { method: "POST", body: JSON.stringify(values) });
      setIsSuccess(true);
      reset();
      addMessage("Thank you! Your message has been sent successfully.", "success");
      router.replace(`${urls.contact()}?success=1`);
    } catch (error) {
      applyServerErrors(error, setError, "message");
      const message = error instanceof Error ? error.message : "Failed to send message. Please try again.";
      setRootError(message);
      addMessage(message, "error");
    }
  });

  if (isSuccess) {
    return (
      <div className="py-8 text-center space-y-5 animate-in fade-in zoom-in-95 duration-300">
        <div className="w-16 h-16 rounded-2xl bg-linear-to-tr from-brand-600 to-purple-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-brand-500/30 ring-8 ring-brand-50">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>

        <div>
          <h3 className="text-2xl font-bold text-slate-900">Message sent successfully!</h3>
          <p className="text-slate-500 text-base mt-2 max-w-sm mx-auto leading-relaxed">
            Thank you for reaching out. We have received your message and our team will get back to you shortly.
          </p>
        </div>

        <div className="pt-4">
          <button
            type="button"
            onClick={() => {
              setIsSuccess(false);
              reset();
              router.replace(urls.contact());
            }}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-brand-600 bg-brand-50 hover:bg-brand-100/80 border border-brand-200 transition-all cursor-pointer hover:shadow-xs"
          >
            <span>Send another message</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={onSubmit} noValidate>
      {rootError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 mt-0.5 text-red-500"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{rootError}</span>
        </div>
      )}

      {FIELDS.map((field) => (
        <FormInput
          key={field.name}
          control={control}
          name={field.name}
          id={`id_${field.name}`}
          type={field.type}
          label={field.label}
          placeholder={field.placeholder}
          maxLength={"maxLength" in field ? field.maxLength : undefined}
        />
      ))}

      <FormTextArea
        control={control}
        name="message"
        id="id_message"
        rows={5}
        label="Message"
        placeholder="Write your message here..."
      />

      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
        <button
          type="submit"
          disabled={isSubmitting}
          className="group relative inline-flex flex-row items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl font-semibold text-sm text-white shadow-lg shadow-brand-500/25 bg-linear-to-r from-brand-600 via-indigo-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 active:scale-[0.99] hover:shadow-xl hover:shadow-brand-500/35 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:pointer-events-none transition-all duration-200 cursor-pointer w-full sm:w-auto whitespace-nowrap"
        >
          {isSubmitting ? (
            <span className="inline-flex flex-row items-center gap-2 whitespace-nowrap">
              <svg
                className="animate-spin h-4 w-4 text-white shrink-0"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Sending…</span>
            </span>
          ) : (
            <span className="inline-flex flex-row items-center gap-2 whitespace-nowrap">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              <span>Send Message</span>
            </span>
          )}
        </button>
      </div>
    </form>
  );
}
