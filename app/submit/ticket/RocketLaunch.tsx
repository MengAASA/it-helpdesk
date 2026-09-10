"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion } from "framer-motion";
import { Building2 } from "lucide-react";

export type RocketOrigin = { x: number; y: number; width: number; height: number };

const FLIGHT_DURATION = 3.2;
const FLIGHT_EASE: [number, number, number, number] = [0.45, 0.05, 0.55, 0.95];
const SHRINK_START = 0.88;
const REVEAL_DURATION = 0.3;
const TARGET_SIZE = 36;
const TARGET_OFFSET = 18;
const ROCKET_W = 34;
const ROCKET_H = 58;

export default function RocketLaunch({
  team,
  originRect,
  onComplete,
}: {
  team: string;
  originRect: RocketOrigin | null;
  onComplete: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [delivered, setDelivered] = useState(false);
  const [viewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const pathRef = useRef<SVGPathElement>(null);

  const flight = useMemo(() => {
    if (!originRect) return null;

    // Anchored to the button's bottom edge (not its center) so the rocket's flame
    // sits right at the button and it visually lifts off from behind/under it,
    // rather than appearing to pop up from the middle of the button.
    const start = { x: originRect.x + originRect.width / 2, y: originRect.y + originRect.height };
    const end = {
      x: viewport.width - TARGET_OFFSET - TARGET_SIZE / 2,
      y: TARGET_OFFSET + TARGET_SIZE / 2,
    };
    const loopCenter = { x: viewport.width * 0.5, y: viewport.height * 0.42 };
    // Bigger loop = lower angular velocity for the same travel speed along the
    // path (the rocket doesn't have to whip around as fast to cover the circle
    // in the same time), which is what actually reads as "smoother" — a tight
    // loop forces a sharp, fast turn no matter how well-sampled the curve is.
    const r = 92;
    // The entry/exit swoosh handles below were hand-tuned around the old r=52
    // loop; scale them with the radius so the approach curves stay proportional
    // to the bigger loop instead of looking pinched relative to it.
    const k = r / 52;
    // Where the path crosses itself, as an angle around the loop rather than a
    // fixed compass point — tilts the whole loop so it leans into the diagonal
    // bottom-left → top-right flow, like a hand-drawn lasso loop, instead of
    // crossing itself on a perfectly upright vertical axis.
    const crossAngle = (200 * Math.PI) / 180;
    const tangent = { x: -Math.sin(crossAngle), y: Math.cos(crossAngle) };
    const crossPoint = {
      x: loopCenter.x + r * Math.cos(crossAngle),
      y: loopCenter.y + r * Math.sin(crossAngle),
    };
    const oppositePoint = {
      x: loopCenter.x - r * Math.cos(crossAngle),
      y: loopCenter.y - r * Math.sin(crossAngle),
    };
    const departControl = { x: loopCenter.x + 40 * k, y: Math.min(loopCenter.y - r, end.y) - 40 * k };

    // Real SVG geometry (cubic curves + true circular arcs) — the rocket follows
    // this exact curve every frame via getPointAtLength, so its motion is as
    // smooth as the curve itself, not a straight-line hop between sample points.
    // The loop is exactly one 360° circle: two semicircle arcs between two
    // diametrically-opposite points (crossPoint <-> oppositePoint), entering and
    // exiting at crossPoint.
    // At crossPoint, the circle's own tangent (the direction Arc 1 departs in, and
    // the direction Arc 2 arrives in) is exactly `tangent` above. So the adjoining
    // cubic handles below sit directly along that same tangent line through
    // crossPoint, not offset at some other angle, so direction of travel matches
    // the circle's tangent exactly at the seam instead of kinking into it.
    const d = [
      `M ${start.x} ${start.y}`,
      `C ${start.x} ${start.y - 90 * k}, ${crossPoint.x - tangent.x * 100 * k} ${crossPoint.y - tangent.y * 100 * k}, ${crossPoint.x} ${crossPoint.y}`,
      `A ${r} ${r} 0 1 1 ${oppositePoint.x} ${oppositePoint.y}`,
      `A ${r} ${r} 0 1 1 ${crossPoint.x} ${crossPoint.y}`,
      `C ${crossPoint.x + tangent.x * 80 * k} ${crossPoint.y + tangent.y * 80 * k}, ${departControl.x} ${departControl.y}, ${end.x} ${end.y}`,
    ].join(" ");

    return { d, start, end };
  }, [originRect, viewport]);

  const x = useMotionValue(flight?.start.x ?? 0);
  const y = useMotionValue(flight?.start.y ?? 0);
  const rotate = useMotionValue(0);
  // Starts small and faint, as if still tucked behind the button, then grows to
  // full size right as flight begins — see the REVEAL_DURATION ramp below.
  const scale = useMotionValue(0.25);
  const opacity = useMotionValue(0.3);

  const skip = reduceMotion || !flight;

  useEffect(() => {
    if (skip) onComplete();
  }, [skip, onComplete]);

  useLayoutEffect(() => {
    if (skip || !flight) return;
    const pathEl = pathRef.current;
    if (!pathEl) return;

    const totalLength = pathEl.getTotalLength();

    // Grow out from behind the button rather than popping to full size instantly.
    // The flight path's own easing starts slow, so this overlaps a near-stationary
    // moment in the path rather than fighting the launch motion.
    const reveal = animate(0, 1, {
      duration: REVEAL_DURATION,
      ease: "easeOut",
      onUpdate: (t) => {
        scale.set(0.25 + 0.75 * t);
        opacity.set(0.3 + 0.7 * t);
      },
    });

    const controls = animate(0, totalLength, {
      duration: FLIGHT_DURATION,
      ease: FLIGHT_EASE,
      onUpdate: (latest) => {
        const progress = latest / totalLength;
        const point = pathEl.getPointAtLength(latest);
        const ahead = pathEl.getPointAtLength(Math.min(latest + 1, totalLength));
        const behind = pathEl.getPointAtLength(Math.max(latest - 1, 0));

        x.set(point.x);
        y.set(point.y);
        rotate.set((Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180) / Math.PI + 90);

        if (progress > SHRINK_START) {
          const t = (progress - SHRINK_START) / (1 - SHRINK_START);
          scale.set(1 - 0.6 * t);
          opacity.set(1 - t);
        }
      },
      onComplete: () => {
        setDelivered(true);
        window.setTimeout(onComplete, 550);
      },
    });

    return () => {
      controls.stop();
      reveal.stop();
    };
  }, [skip, flight, onComplete, pathRef, x, y, rotate, scale, opacity]);

  if (reduceMotion || !flight) return null;

  return (
    <div className="fixed inset-0 z-50">
      <motion.div
        className="absolute inset-0 bg-white/35 backdrop-blur-[3px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
      />

      <motion.p
        className="absolute left-1/2 top-[18px] -translate-x-1/2 whitespace-nowrap text-[11px] font-medium text-muted"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: FLIGHT_DURATION + 0.4, times: [0, 0.12, 0.82, 1] }}
      >
        Delivering your ticket to {team}…
      </motion.p>

      <svg className="pointer-events-none absolute inset-0" width={viewport.width} height={viewport.height}>
        <motion.path
          ref={pathRef}
          d={flight.d}
          fill="none"
          stroke="var(--color-blue)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray="1 8"
          initial={{ pathLength: 0, opacity: 0.55 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: FLIGHT_DURATION, ease: FLIGHT_EASE }}
        />
      </svg>

      <motion.div className="pointer-events-none absolute left-0 top-0 z-20" style={{ x, y }}>
        <motion.div
          style={{ rotate, scale, opacity, marginLeft: -ROCKET_W / 2, marginTop: -ROCKET_H / 2 }}
          className="drop-shadow-[0_4px_10px_rgba(15,23,42,0.45)]"
        >
          <RocketGlyph />
        </motion.div>
      </motion.div>

      <div
        className="fixed flex flex-col items-center gap-[3px]"
        style={{ right: TARGET_OFFSET, top: TARGET_OFFSET }}
      >
        <motion.span
          animate={delivered ? { scale: [1, 1.4, 1] } : {}}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`flex items-center justify-center rounded-full border shadow-[0_4px_12px_rgba(15,23,42,0.12)] transition-colors duration-300 ${
            delivered
              ? "border-[color:var(--color-emerald)]/40 bg-[color:var(--color-emerald-light)] text-[color:var(--color-emerald-text)]"
              : "border-card-border bg-white text-primary"
          }`}
          style={{ width: TARGET_SIZE, height: TARGET_SIZE }}
        >
          <Building2 size={16} strokeWidth={2} />
        </motion.span>
        <span className="rounded-full bg-ink/80 px-[6px] py-[1.5px] text-[7.5px] font-semibold uppercase tracking-[0.1em] text-paper">
          IT Dept
        </span>
      </div>
    </div>
  );
}

function RocketGlyph() {
  return (
    <svg width={ROCKET_W} height={ROCKET_H} viewBox="0 0 54 92" fill="none">
      <motion.path
        d="M20 66 C20 66 27 88 27 88 C27 88 34 66 34 66 Z"
        fill="var(--color-amber-solid)"
        animate={{ scaleY: [1, 1.3, 0.85, 1.15, 1], opacity: [0.85, 1, 0.8, 1, 0.85] }}
        transition={{ duration: 0.26, repeat: Infinity }}
        style={{ transformOrigin: "27px 66px" }}
      />
      <path
        d="M14 58 L2 78 L14 74 Z"
        fill="var(--color-blue-text)"
        stroke="var(--color-ink)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M40 58 L52 78 L40 74 Z"
        fill="var(--color-blue-text)"
        stroke="var(--color-ink)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M27 4 C40 16 42 40 40 58 L14 58 C12 40 14 16 27 4 Z"
        fill="white"
        stroke="var(--color-ink)"
        strokeWidth="3"
      />
      <path d="M27 4 C31 9 34 15 35 22 L19 22 C20 15 23 9 27 4 Z" fill="var(--color-rose)" stroke="var(--color-ink)" strokeWidth="1.5" />
      <circle cx="27" cy="32" r="7" fill="var(--color-blue-light)" stroke="var(--color-blue-text)" strokeWidth="2.5" />
    </svg>
  );
}
