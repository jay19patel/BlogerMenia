"use client";

import type { ComponentProps, ReactNode } from "react";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";

import { Input } from "@/components/base/input/input";
import { TextArea } from "@/components/base/textarea/textarea";

/**
 * The react-hook-form ⇄ React Aria bridge every form in the app goes through.
 *
 * Untitled UI's fields wrap React Aria, which has two conventions that make
 * `{...register(name)}` the wrong way to drive them:
 *
 *   - `onChange` receives the new **value**, not a DOM event. Handing that
 *     straight to react-hook-form's registered handler makes it read
 *     `event.target.name` off a string, which throws on the first keystroke.
 *   - `ref` lands on the field *wrapper*, not the `<input>`, so react-hook-form
 *     never gets the node it needs.
 *
 * `Controller` is the supported way to drive a controlled field, so it lives
 * here once rather than being repeated — or got wrong — in every form.
 */

type BridgeProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  /** Persistent help text, shown under any validation message. */
  hint?: ReactNode;
};

/** Validation message first, then the field's own help text in its own colour. */
function hintFor(error: string | undefined, hint: ReactNode): ReactNode {
  if (!error) return hint;
  if (!hint) return error;
  return (
    <>
      <span className="block">{error}</span>
      <span className="mt-1 block text-slate-400">{hint}</span>
    </>
  );
}

type InputBridgeProps<T extends FieldValues> = BridgeProps<T> &
  Omit<ComponentProps<typeof Input>, "value" | "onChange" | "onBlur" | "name" | "isInvalid" | "hint" | "ref">;

export function FormInput<T extends FieldValues>({ control, name, hint, ...props }: InputBridgeProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Input
          {...props}
          ref={field.ref}
          name={field.name}
          value={field.value ?? ""}
          onChange={field.onChange}
          onBlur={field.onBlur}
          isInvalid={Boolean(fieldState.error)}
          hint={hintFor(fieldState.error?.message, hint)}
        />
      )}
    />
  );
}

type TextAreaBridgeProps<T extends FieldValues> = BridgeProps<T> &
  Omit<ComponentProps<typeof TextArea>, "value" | "onChange" | "onBlur" | "name" | "isInvalid" | "hint" | "ref">;

export function FormTextArea<T extends FieldValues>({ control, name, hint, ...props }: TextAreaBridgeProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextArea
          {...props}
          textAreaRef={field.ref}
          name={field.name}
          value={field.value ?? ""}
          onChange={field.onChange}
          onBlur={field.onBlur}
          isInvalid={Boolean(fieldState.error)}
          hint={hintFor(fieldState.error?.message, hint)}
        />
      )}
    />
  );
}
