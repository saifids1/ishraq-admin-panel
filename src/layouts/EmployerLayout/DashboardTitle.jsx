import { useEffect, useRef } from "react";
import gsap from "gsap";

const DASHBOARD_TITLE = "Employer Dashboard";

export const DashboardTitle = () => {
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
    // Mobile: sits in the normal flow next to the menu button.
    // Desktop (md+): absolutely centered in the header, as before.
    <div
      ref={wrapRef}
      className="pointer-events-none flex min-w-0 items-center
        md:absolute md:left-[40%] md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2"
    >
      <h2
        ref={lettersRef}
        className="m-0 truncate whitespace-nowrap text-[17px] font-extrabold tracking-tight
          text-[#2c6b8a] sm:text-[22px] lg:text-[26px]"
        aria-label={DASHBOARD_TITLE}
      >
        {DASHBOARD_TITLE.split("").map((char, i) => (
          <span key={i} className="inline-block" aria-hidden="true">
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
      </h2>
    </div>
  );
};