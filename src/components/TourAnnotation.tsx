import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import {
  useFloating,
  autoUpdate,
  shift,
  flip,
  arrow,
  offset,
  type Placement,
} from "@floating-ui/react-dom";

export type TourAnnotationProps = {
  target: string;
  label: string;
  text: string;
};

const STATIC_SIDE: Record<string, "top" | "right" | "bottom" | "left"> = {
  top: "bottom",
  right: "left",
  bottom: "top",
  left: "right",
};

export function TourAnnotation({ target, label, text }: TourAnnotationProps) {
  const arrowRef = useRef<HTMLDivElement>(null);
  const [targetEl, setTargetEl] = useState<HTMLElement | null>(null);
  const [hidden, setHidden] = useState(false);

  // Resolve the target element. Re-queries as the DOM changes so annotations
  // appear even when the target renders later (lazy-loaded page sections).
  useLayoutEffect(() => {
    const find = () => document.querySelector<HTMLElement>(target);

    const tryFind = () => {
      const el = find();
      if (el) {
        setTargetEl(el);
        setHidden(false);
        return true;
      }
      setHidden(true);
      return false;
    };

    if (tryFind()) return;

    const observer = new MutationObserver(() => {
      if (tryFind()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [target]);

  const { refs, floatingStyles, placement, middlewareData } = useFloating({
    elements: { reference: targetEl },
    placement: "right-start" as Placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(12),
      flip({ fallbackAxisSideDirection: "start" }),
      shift({ padding: 8 }),
      arrow({ element: arrowRef }),
    ],
  });

  if (hidden || !targetEl) return null;

  const arrowX = middlewareData.arrow?.x;
  const arrowY = middlewareData.arrow?.y;
  const side = placement.split("-")[0] as keyof typeof STATIC_SIDE;
  const staticSide = STATIC_SIDE[side];
  const arrowStyle: CSSProperties = {
    position: "absolute",
    left: arrowX != null ? `${arrowX}px` : undefined,
    top: arrowY != null ? `${arrowY}px` : undefined,
    right: undefined,
    bottom: undefined,
  };
  arrowStyle[staticSide] = "-4px";

  return (
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      className="z-[70] pointer-events-none"
      role="tooltip"
    >
      <div
        ref={arrowRef}
        style={arrowStyle}
        className="w-2.5 h-2.5 bg-[var(--card)] border border-[var(--primary)] rotate-45"
      />
      <div
        className="bg-[var(--card)] border border-[var(--primary)] rounded-lg p-3 shadow-lg"
        style={{
          maxWidth: "240px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
          borderRight: side === "left" ? undefined : "3px solid var(--primary)",
        }}
      >
        <div className="text-xs font-bold text-[var(--primary)] mb-1">
          {label}
        </div>
        <p className="text-[11px] text-[var(--foreground)] leading-relaxed">
          {text}
        </p>
      </div>
    </div>
  );
}
