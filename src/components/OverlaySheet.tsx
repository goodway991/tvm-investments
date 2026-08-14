"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

function useLockBody(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const html = document.documentElement;
    const { body } = document;
    const prevHtmlOverflow = html.style.overflow;
    const prevHtmlOverscroll = html.style.overscrollBehavior;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyOverscroll = body.style.overscrollBehavior;

    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      html.style.overscrollBehavior = prevHtmlOverscroll;
      body.style.overflow = prevBodyOverflow;
      body.style.overscrollBehavior = prevBodyOverscroll;
    };
  }, [locked]);
}

export function OverlaySheet({
  labelledBy,
  onClose,
  header,
  footer,
  children,
  variant = "screen",
  zIndexClass = "z-[100]",
  closeOnBackdrop = true,
}: {
  labelledBy: string;
  onClose?: () => void;
  header: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  variant?: "screen" | "card";
  zIndexClass?: string;
  closeOnBackdrop?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [labelledBy, mounted]);

  useLockBody(mounted);

  useEffect(() => {
    if (!onClose) return;
    const close = onClose;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted || typeof document === "undefined") return null;

  const sheet =
    variant === "screen" ? (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`fixed inset-0 ${zIndexClass} flex flex-col overflow-hidden bg-surface`}
        style={{ inset: 0, width: "100%", height: "100svh", maxHeight: "100svh" }}
      >
        <div className="shrink-0 border-b border-ink/[0.08] bg-surface px-4 py-3 sm:px-6">
          {header}
        </div>
        <div
          ref={scrollRef}
          className="sheet-scroll min-h-0 flex-1 overflow-y-scroll px-4 py-5 sm:px-6"
        >
          <div className="mx-auto w-full max-w-3xl pb-10">{children}</div>
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-ink/[0.08] bg-surface px-4 py-3 sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    ) : (
      <div
        className={`fixed inset-0 ${zIndexClass} overflow-y-auto overscroll-contain p-4 sm:p-6`}
        style={{ inset: 0, width: "100%", height: "100svh", maxHeight: "100svh" }}
      >
        {onClose && closeOnBackdrop ? (
          <button
            type="button"
            className="fixed inset-0 bg-ink/20"
            aria-label="Close"
            onClick={onClose}
          />
        ) : (
          <div className="fixed inset-0 bg-ink/20" />
        )}
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          className="glass-strong relative z-10 mx-auto w-full max-w-[920px] rounded-[28px]"
        >
          <div className="px-5 pt-5 sm:px-8 sm:pt-7">{header}</div>
          <div ref={scrollRef} className="px-5 py-5 sm:px-8">
            {children}
          </div>
          {footer ? (
            <div className="px-5 pb-5 sm:px-8 sm:pb-7">{footer}</div>
          ) : null}
        </div>
      </div>
    );

  return createPortal(sheet, document.documentElement);
}
