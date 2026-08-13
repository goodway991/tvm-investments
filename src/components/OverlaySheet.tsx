"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

function useLockBody(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const html = document.documentElement;
    const { body } = document;
    const scrollY = window.scrollY;
    const prevHtmlOverflow = html.style.overflow;
    const prevBody = body.style.cssText;

    html.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.cssText = prevBody;
      window.scrollTo(0, scrollY);
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
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;

  const sheet =
    variant === "screen" ? (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`fixed inset-0 ${zIndexClass} flex h-dvh max-h-dvh flex-col bg-[#f7f8fc]`}
        style={{ height: "100dvh" }}
      >
        <div className="shrink-0 border-b border-ink/[0.08] bg-[#f7f8fc]/95 px-4 py-3 sm:px-6">
          {header}
        </div>
        <div
          ref={scrollRef}
          className="sheet-scroll min-h-0 flex-1 overflow-y-scroll px-4 py-5 sm:px-6"
        >
          <div className="mx-auto w-full max-w-3xl pb-10">{children}</div>
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-ink/[0.08] bg-[#f7f8fc]/95 px-4 py-3 sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    ) : (
      <div
        className={`fixed inset-0 ${zIndexClass} flex h-dvh max-h-dvh items-center justify-center p-4`}
        style={{ height: "100dvh" }}
      >
        {onClose && closeOnBackdrop ? (
          <button
            type="button"
            className="absolute inset-0 bg-ink/20"
            aria-label="Close"
            onClick={onClose}
          />
        ) : (
          <div className="absolute inset-0 bg-ink/20" />
        )}
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          className="glass-strong relative z-10 flex h-[min(90dvh,880px)] w-[min(920px,100%)] flex-col overflow-hidden rounded-[28px]"
        >
          <div className="shrink-0 px-5 pt-5 sm:px-8 sm:pt-7">{header}</div>
          <div
            ref={scrollRef}
            className="sheet-scroll min-h-0 flex-1 overflow-y-scroll px-5 py-5 sm:px-8"
          >
            {children}
          </div>
          {footer ? (
            <div className="shrink-0 px-5 pb-5 sm:px-8 sm:pb-7">{footer}</div>
          ) : null}
        </div>
      </div>
    );

  return createPortal(sheet, document.body);
}
