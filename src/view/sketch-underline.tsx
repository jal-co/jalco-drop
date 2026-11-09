function SketchFilter({ id, seed }: { id: string; seed: number }) {
  return (
    <filter id={id} filterUnits="userSpaceOnUse" x="-20" y="-20" width="240" height="60">
      <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves={2} seed={seed} result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.9" xChannelSelector="R" yChannelSelector="G" />
    </filter>
  );
}

export function SketchUnderline({ text }: { text: string }) {
  return (
    <span className="sketch-underline">
      <span className="sketch-underline__text">{text}</span>
      <svg aria-hidden="true" className="sketch-underline__rule" viewBox="0 0 200 20" preserveAspectRatio="none" fill="none">
        <SketchFilter id="su-0" seed={5} />
        <SketchFilter id="su-1" seed={17} />
        <path d="M3,12 C46,7 112,5 197,8" pathLength={1} stroke="currentColor" strokeLinecap="round" filter="url(#su-0)" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 2, animationDelay: "300ms", animationDuration: "404ms" }} />
        <path d="M24,15 C70,11 128,10 182,12" pathLength={1} stroke="currentColor" strokeLinecap="round" opacity={0.55} filter="url(#su-1)" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 1.3, animationDelay: "631ms", animationDuration: "331ms" }} />
      </svg>
    </span>
  );
}
