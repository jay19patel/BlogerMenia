"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { Button } from "@/components/base/buttons/button";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";

import "@excalidraw/excalidraw/index.css";

/**
 * The "Excalidraw Studio" modal from `blog/blog_form.html`.
 *
 * The Django page pulls React 18 and the Excalidraw UMD bundle off a CDN and
 * shows the editor in a hand-rolled overlay `div`. Here Excalidraw is a real
 * dependency, loaded on demand so it stays out of the initial bundle, and the
 * overlay is Untitled UI's React Aria modal — which brings the focus trap,
 * Escape handling, scroll locking and `aria-modal` the original never had.
 */

const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((module) => module.Excalidraw),
  { ssr: false },
);

export interface ExcalidrawSceneData {
  elements: readonly unknown[];
  appState: Record<string, unknown>;
  svgData: string;
}

export function ExcalidrawModal({
  initialElements,
  initialAppState,
  onCancel,
  onSave,
}: {
  initialElements: readonly unknown[];
  initialAppState: Record<string, unknown>;
  onCancel: () => void;
  onSave: (scene: ExcalidrawSceneData) => void;
}) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const api = apiRef.current;
    if (!api) {
      onCancel();
      return;
    }

    setSaving(true);
    try {
      const { exportToSvg } = await import("@excalidraw/excalidraw");
      const elements = api.getSceneElements();
      const appState = api.getAppState();
      const files = api.getFiles();

      const svgElement = await exportToSvg({ elements, appState, files });

      onSave({
        elements,
        appState: { viewBackgroundColor: appState.viewBackgroundColor },
        svgData: svgElement.outerHTML,
      });
    } catch (error) {
      console.error("Failed to export Excalidraw SVG:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalOverlay
      isOpen
      isDismissable={false}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      className="fixed inset-0 z-50 flex bg-slate-900/80 p-2 backdrop-blur-xs sm:p-6"
    >
      <Modal className="h-full w-full rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <Dialog aria-label="Excalidraw Studio" className="flex h-full w-full flex-col overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-3.5">
            <div className="flex items-center gap-2.5">
              <span className="text-xl" aria-hidden="true">
                🎨
              </span>
              <div>
                <h3 className="text-base leading-none font-bold text-slate-900">Excalidraw Studio</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Draw architectural diagrams, flowcharts, or sketches
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" color="tertiary" onClick={onCancel}>
                Cancel
              </Button>
              <Button size="sm" color="primary" isDisabled={saving} isLoading={saving} onClick={save}>
                Save &amp; Insert Diagram
              </Button>
            </div>
          </div>
          <div className="relative w-full flex-1 bg-slate-100">
            <Excalidraw
              excalidrawAPI={(api) => {
                apiRef.current = api;
              }}
              initialData={{
                // The stored scene comes back from our own fixture/editor state.
                elements: initialElements as never,
                appState: { viewBackgroundColor: "#ffffff", ...initialAppState },
              }}
            />
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
