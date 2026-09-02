"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { contactPayloadSchema, type ContactPayload } from "@/lib/api/schemas";
import { applyServerErrors } from "@/lib/forms";
import { apiFetch } from "@/lib/query/fetcher";
import { urls } from "@/lib/urls";
import { FormInput, FormTextArea } from "@/components/form-fields";
import { Button } from "@/components/base/buttons/button";

/**
 * `blog.forms.ContactForm` as rendered by `blog/contact.html`.
 *
 * On success it redirects to `?success=1`, exactly as
 * `ContactView.get_success_url` does.
 */

const FIELDS = [
  { name: "name", label: "Name", placeholder: "Your Name", type: "text", maxLength: 100 },
  { name: "email", label: "Email", placeholder: "your@email.com", type: "email" },
  { name: "subject", label: "Subject", placeholder: "How can we help?", type: "text", maxLength: 200 },
] as const;

export function ContactForm() {
  const router = useRouter();
  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
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

      <div className="pt-4 border-t border-slate-100">
        <Button
          type="submit"
          color="primary"
          size="lg"
          isDisabled={isSubmitting}
          className="w-full sm:w-auto mt-2 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Sending…
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-send mr-2">
                <line x1="22" x2="11" y1="2" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              Send Message
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
