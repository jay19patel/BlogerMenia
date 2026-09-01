"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * `django.contrib.messages` plus the toast markup from `base.html`.
 *
 * Messages are raised by the same actions that raised them in Django — sharing
 * to LinkedIn, submitting the contact form, deleting a post — and fade out
 * after five seconds exactly as the original inline script does.
 */

export type MessageTag = "success" | "error" | "warning" | "info";

interface Message {
  id: number;
  text: string;
  tag: MessageTag;
}

interface MessagesValue {
  addMessage: (text: string, tag?: MessageTag) => void;
}

const MessagesContext = createContext<MessagesValue | null>(null);

const AUTO_DISMISS_MS = 5000;
const FADE_MS = 300;

const BORDER_CLASSES: Record<MessageTag, string> = {
  error: "border-rose-100 shadow-rose-100/50",
  success: "border-emerald-100 shadow-emerald-100/50",
  warning: "border-amber-100 shadow-amber-100/50",
  info: "border-blue-100 shadow-blue-100/50",
};

function MessageIcon({ tag }: { tag: MessageTag }) {
  const common = { fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2 } as const;
  if (tag === "error") {
    return (
      <svg className="w-5 h-5 text-rose-500" {...common}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  if (tag === "success") {
    return (
      <svg className="w-5 h-5 text-emerald-500" {...common}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  if (tag === "warning") {
    return (
      <svg className="w-5 h-5 text-amber-500" {...common}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5 text-blue-500" {...common}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function Toast({ message, onDismiss }: { message: Message; onDismiss: (id: number) => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const fade = window.setTimeout(() => setLeaving(true), AUTO_DISMISS_MS);
    const remove = window.setTimeout(() => onDismiss(message.id), AUTO_DISMISS_MS + FADE_MS);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(remove);
    };
  }, [message.id, onDismiss]);

  const dismiss = () => {
    setLeaving(true);
    window.setTimeout(() => onDismiss(message.id), FADE_MS);
  };

  return (
    <div
      role="alert"
      style={leaving ? { opacity: 0, transform: "translateY(-10px)" } : undefined}
      className={`toast-message flex items-start p-4 rounded-xl shadow-xl border bg-white pointer-events-auto transform transition-all duration-300 translate-y-0 opacity-100 w-full sm:w-[350px] ${BORDER_CLASSES[message.tag]}`}
    >
      <div className="shrink-0 mt-0.5">
        <MessageIcon tag={message.tag} />
      </div>

      <div className="ml-3 w-0 flex-1 pt-0.5">
        <p className="text-sm font-semibold text-slate-800">{message.text}</p>
      </div>

      <div className="ml-4 flex shrink-0">
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex rounded-md bg-white text-slate-400 hover:text-slate-500 focus:outline-hidden transition-colors"
        >
          <span className="sr-only">Close</span>
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" clipRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function MessagesProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const nextId = useRef(1);

  const addMessage = useCallback((text: string, tag: MessageTag = "info") => {
    setMessages((current) => [...current, { id: nextId.current++, text, tag }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setMessages((current) => current.filter((message) => message.id !== id));
  }, []);

  const value = useMemo(() => ({ addMessage }), [addMessage]);

  return (
    <MessagesContext.Provider value={value}>
      {messages.length > 0 && (
        <div className="fixed top-5 right-5 z-100 flex flex-col gap-3 max-w-md w-full sm:w-auto items-end pointer-events-none">
          {messages.map((message) => (
            <Toast key={message.id} message={message} onDismiss={dismiss} />
          ))}
        </div>
      )}
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages(): MessagesValue {
  const context = useContext(MessagesContext);
  if (!context) throw new Error("useMessages must be used inside a <MessagesProvider>");
  return context;
}
