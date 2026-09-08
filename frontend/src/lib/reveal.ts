"use client";
import { useEffect } from "react";

/**
 * Scroll-reveal driver.
 *
 * Every element carrying [data-reveal] is observed by ONE shared
 * IntersectionObserver and gets `.is-visible` the first time it enters the
 * viewport, then stops being observed. The actual animation lives in CSS
 * (globals.css) and only touches opacity/transform, so it runs on the
 * compositor and never triggers layout.
 *
 * Why not a scroll listener: scroll handlers fire dozens of times per second
 * and reading element positions forces synchronous layout. IntersectionObserver
 * does the same job off the main thread.
 *
 * Respects prefers-reduced-motion: when the user asks for less motion we simply
 * mark everything visible immediately and never animate.
 */
export function useReveal(deps: unknown[] = []) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-visible)")
    );
    if (nodes.length === 0) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      nodes.forEach((n) => n.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target); // reveal once, then forget
        }
      },
      {
        // Start slightly before the element is fully on screen so the motion
        // finishes as it settles into view rather than after.
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.12,
      }
    );

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Publishes the vertical scroll offset as a CSS variable (--scroll) on <html>,
 * batched into requestAnimationFrame. Lets CSS drive parallax without any
 * per-frame React re-render.
 */
export function useScrollProgress() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        document.documentElement.style.setProperty("--scroll", String(window.scrollY));
        frame = 0;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
}
