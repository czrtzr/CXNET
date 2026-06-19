"use client";

import { useEffect, useRef } from "react";

// A drifting constellation drawn on a canvas: warm engraving-toned nodes linked
// by hairlines when they near each other, with a faint pull toward the pointer.
// Themed in brass, leather, and a rare oxblood node so it reads as CXNET rather
// than a generic particle demo. Deterministic enough to feel calm, cheap enough
// to stay at 60fps: node count scales with area and is capped, and the loop
// pauses when the tab is hidden. Under reduced motion it paints one still frame.
export function ParticleField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    // Locals with non-null types so the nested draw loop keeps them narrowed.
    const canvas = cv;
    const c = ctx;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const LINK = 132;

    type P = { x: number; y: number; vx: number; vy: number; r: number; color: string };
    let w = 0;
    let h = 0;
    let particles: P[] = [];
    let raf = 0;
    const pointer = { x: -9999, y: -9999 };
    // Intro ramp: the field fades and grows into place on load, then drifts.
    let startTime = 0;
    let intro = reduce ? 1 : 0;

    function makeParticle(): P {
      const roll = Math.random();
      const color =
        roll < 0.1 ? "#9b2230" : roll < 0.55 ? "#b08d57" : "#7a5234";
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.5 + 0.5,
        color,
      };
    }

    function resize() {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(90, Math.max(28, Math.floor((w * h) / 15000)));
      particles = Array.from({ length: count }, makeParticle);
    }

    function draw() {
      c.clearRect(0, 0, w, h);

      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < LINK) {
            let op = (1 - d / LINK) * 0.16 * intro;
            // Links near the cursor catch a little more light.
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2;
            const pd = Math.hypot(pointer.x - mx, pointer.y - my);
            if (pd < 120) op += (1 - pd / 120) * 0.24 * intro;
            c.strokeStyle = `rgba(176,141,87,${op})`;
            c.lineWidth = 0.6;
            c.beginPath();
            c.moveTo(a.x, a.y);
            c.lineTo(b.x, b.y);
            c.stroke();
          }
        }
      }

      for (const p of particles) {
        c.beginPath();
        c.arc(p.x, p.y, p.r * (0.45 + 0.55 * intro), 0, Math.PI * 2);
        c.fillStyle = p.color;
        c.globalAlpha = 0.72 * intro;
        c.fill();
      }
      c.globalAlpha = 1;
    }

    function step() {
      if (!startTime) startTime = performance.now();
      const t = Math.min(1, (performance.now() - startTime) / 1500);
      intro = 1 - Math.pow(1 - t, 3); // ease out

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        const dx = pointer.x - p.x;
        const dy = pointer.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d < 130 && d > 0.01) {
          const pull = (130 - d) * 0.00018;
          p.x += dx * pull;
          p.y += dy * pull;
        }
      }
      draw();
      raf = requestAnimationFrame(step);
    }

    resize();
    if (reduce) {
      draw();
    } else {
      raf = requestAnimationFrame(step);
    }

    const onResize = () => resize();
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
    };
    const onLeave = () => {
      pointer.x = -9999;
      pointer.y = -9999;
    };
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduce) raf = requestAnimationFrame(step);
    };

    window.addEventListener("resize", onResize);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden />;
}
