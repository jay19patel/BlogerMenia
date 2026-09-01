"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { contactPayloadSchema, type ContactPayload } from "@/lib/api/schemas";
import { applyServerErrors } from "@/lib/forms";
import { apiFetch } from "@/lib/query/fetcher";
import { urls } from "@/lib/urls";

/**
 * `blog.forms.ContactForm` as rendered by `blog/contact.html`.
 *
 * The field classes come straight from the Django widget `attrs`. On success it
 * redirects to `?success=1`, exactly as `ContactView.get_success_url` does.
 */

const FIELD_CLASS =
  "w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3.5 text-sm text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-colors";

const FIELDS = [
  { name: "name", label: "Name", placeholder: "Your Name", type: "text", maxLength: 100 },
  { name: "email", label: "Email", placeholder: "your@email.com", type: "email" },
  { name: "subject", label: "Subject", placeholder: "How can we help?", type: "text", maxLength: 200 },
] as const;

export function ContactForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ContactPayload>({
    resolver: zodResolver(contactPayloadSchema),
    defaultValues: { name: "", email: "", subject: "", message: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await apiFetch("/api/contact/", { method: "POST", body: JSON.stringify(values) });
      router.push(`${urls.contact()}?success=1`);
    } catch (error) {
      applyServerErrors(error, setError, "message");
    }
  });

  return (
    <form className="space-y-6" onSubmit={onSubmit} noValidate>
      {FIELDS.map((field) => (
        <div key={field.name}>
          <label htmlFor={`id_${field.name}`} className="block text-sm font-semibold text-slate-700 mb-2">
            {field.label}
          </label>
          <input
            id={`id_${field.name}`}
            type={field.type}
            maxLength={"maxLength" in field ? field.maxLength : undefined}
            placeholder={field.placeholder}
            className={FIELD_CLASS}
            aria-invalid={Boolean(errors[field.name])}
            {...register(field.name)}
          />
          {errors[field.name] && <p className="mt-2 text-sm text-red-500">{errors[field.name]?.message}</p>}
        </div>
      ))}

      <div>
        <label htmlFor="id_message" className="block text-sm font-semibold text-slate-700 mb-2">
          Message
        </label>
        <textarea
          id="id_message"
          rows={5}
          placeholder="Write your message here..."
          className={FIELD_CLASS}
          aria-invalid={Boolean(errors.message)}
          {...register("message")}
        />
        {errors.message && <p className="mt-2 text-sm text-red-500">{errors.message.message}</p>}
      </div>

      <div className="pt-4 border-t border-slate-100">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto inline-flex justify-center items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm px-8 py-3 rounded-xl transition-colors shadow-xs shadow-brand-500/30 disabled:opacity-70"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-send">
            <line x1="22" x2="11" y1="2" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
          {isSubmitting ? "Sending…" : "Send Message"}
        </button>
      </div>
    </form>
  );
}
