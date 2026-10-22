import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import {
  Bell,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  Settings,
  LogOut,
  UserRound,
} from "lucide-react";

const DASHBOARD_TITLE = "Employer Dashboard";

export  const DashboardTitle = () => {
  const wrapRef = useRef(null);
  const lettersRef = useRef(null);
  const lineRef = useRef(null);
  const iconRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.15 });

      tl.fromTo(
        iconRef.current,
        { opacity: 0, scale: 0.6, rotate: -20 },
        { opacity: 1, scale: 1, rotate: 0, duration: 0.5, ease: "back.out(1.7)" },
      )
        .fromTo(
          lettersRef.current.children,
          { opacity: 0, y: 10, filter: "blur(4px)" },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.4,
            ease: "power2.out",
            stagger: 0.035,
          },
          "-=0.25",
        )
        .fromTo(
          lineRef.current,
          { scaleX: 0 },
          { scaleX: 1, duration: 0.6, ease: "power2.inOut" },
          "-=0.2",
        );
    }, wrapRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={wrapRef}
      className="pointer-events-none absolute left-[40%] top-1/2 hidden -translate-x-1/2 -translate-y-1/2 flex-col items-center sm:flex"
    >
      <div className="flex items-center gap-2">
        <h2
          ref={lettersRef}
          className="m-0 text-[22px] font-extrabold tracking-tight text-[#2c6b8a] sm:text-[26px]"
          aria-label={DASHBOARD_TITLE}
        >
          {DASHBOARD_TITLE.split("").map((char, i) => (
            <span key={i} className="inline-block" aria-hidden="true">
              {char === " " ? "\u00A0" : char}
            </span>
          ))}
        </h2>
      </div>

     
    </div>
  );
};