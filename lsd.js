(() => {
  // ====== knobs ======
  const INTENSITY = 1.0;   // 0..1.5 (try 1.25 if you want it brutal)
  const FPS = 60;          // drop to 30 if it stutters

  // Stop any previous run
  if (window.__tripStop) window.__tripStop();

  const root = document.documentElement;

  // Save original styles
  const prev = {
    filter: root.style.filter,
    transform: root.style.transform,
    transformOrigin: root.style.transformOrigin,
    transition: root.style.transition,
  };

  root.style.transformOrigin = "50% 50%";
  root.style.transition = "filter 120ms linear, transform 120ms linear";

  // --- FX layers ---
  const wrap = document.createElement("div");
  wrap.id = "__tripWrap";
  Object.assign(wrap.style, {
    position: "fixed",
    inset: "0",
    pointerEvents: "none",
    zIndex: "2147483647",
    overflow: "hidden",
  });
  document.body.appendChild(wrap);

  // Afterimage smear (very light)
  const smear = document.createElement("div");
  smear.id = "__tripSmear";
  Object.assign(smear.style, {
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
    background: "rgba(0,0,0,0.03)",
    mixBlendMode: "multiply",
    opacity: String(0.35 * INTENSITY),
  });
  wrap.appendChild(smear);

  // Prism fields
  const prism = document.createElement("div");
  prism.id = "__tripPrism";
  Object.assign(prism.style, {
    position: "absolute",
    inset: "-12%",
    pointerEvents: "none",
    mixBlendMode: "screen",
    opacity: String(0.35 * INTENSITY),
    filter: `blur(${3.5 * INTENSITY}px) saturate(${1.9 + 0.8 * INTENSITY})`,
    background:
      "conic-gradient(from 0deg at 50% 50%, rgba(255,0,180,.35), rgba(0,255,240,.25), rgba(255,240,0,.22), rgba(120,0,255,.25), rgba(255,0,180,.35))",
  });
  wrap.appendChild(prism);

  // Kaleidoscope-ish tiled “lens” using repeating gradients + blend
  const lens = document.createElement("div");
  lens.id = "__tripLens";
  Object.assign(lens.style, {
    position: "absolute",
    inset: "-20%",
    pointerEvents: "none",
    opacity: String(0.28 * INTENSITY),
    mixBlendMode: "overlay",
    backgroundImage:
      "repeating-conic-gradient(from 0deg at 50% 50%, rgba(255,255,255,.10) 0 10deg, transparent 10deg 20deg)," +
      "repeating-linear-gradient(45deg, rgba(0,0,0,.10) 0 6px, transparent 6px 18px)",
    filter: `blur(${1.2 * INTENSITY}px)`,
  });
  wrap.appendChild(lens);

  // Grain
  const grain = document.createElement("div");
  grain.id = "__tripGrain";
  Object.assign(grain.style, {
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
    opacity: String(0.10 * INTENSITY),
    mixBlendMode: "overlay",
    backgroundImage:
      "repeating-linear-gradient(0deg, rgba(0,0,0,.10) 0, rgba(0,0,0,.10) 1px, transparent 1px, transparent 3px)," +
      "repeating-linear-gradient(90deg, rgba(255,255,255,.08) 0, rgba(255,255,255,.08) 1px, transparent 1px, transparent 4px)",
    filter: `blur(${0.6 + 1.0 * INTENSITY}px)`,
  });
  wrap.appendChild(grain);

  // Tiny vignette to pull focus
  const vignette = document.createElement("div");
  vignette.id = "__tripVignette";
  Object.assign(vignette.style, {
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
    mixBlendMode: "multiply",
    opacity: String(0.35 * INTENSITY),
    background:
      "radial-gradient(circle at 50% 50%, transparent 45%, rgba(0,0,0,0.20) 75%, rgba(0,0,0,0.35) 100%)",
  });
  wrap.appendChild(vignette);

  // ====== animation ======
  let t0 = performance.now();
  let raf = null;
  let timer = null;

  const frameDelay = Math.max(10, Math.round(1000 / FPS));

  function tick() {
    const t = (performance.now() - t0) / 1000;

    // Body “breathing” + wobble + slight rotation
    const breathe = 1 + (0.018 * INTENSITY) * Math.sin(t * 0.85);
    const wobX = (1.1 * INTENSITY) * Math.sin(t * 1.3) + (0.45 * INTENSITY) * Math.sin(t * 3.1);
    const wobY = (1.0 * INTENSITY) * Math.cos(t * 1.1) + (0.40 * INTENSITY) * Math.cos(t * 2.7);
    const rot = (0.35 * INTENSITY) * Math.sin(t * 0.55);

    // Color + “warpy” blur
    const hue = (55 * INTENSITY) * Math.sin(t * 0.7) + (35 * INTENSITY) * Math.sin(t * 1.35);
    const sat = 1.3 + (1.2 * INTENSITY) * (0.5 + 0.5 * Math.sin(t * 0.9));
    const con = 1.02 + (0.20 * INTENSITY) * (0.5 + 0.5 * Math.cos(t * 0.8));
    const blur = 0.35 + (2.2 * INTENSITY) * (0.5 + 0.5 * Math.sin(t * 1.05));

    // Chromatic split approximation: contrast + hue + saturate + slight blur
    root.style.transform = `translate(${wobX}px, ${wobY}px) scale(${breathe}) rotate(${rot}deg)`;
    root.style.filter = `hue-rotate(${hue}deg) saturate(${sat}) contrast(${con}) blur(${blur}px)`;

    // Prism drift + twist
    prism.style.transform =
      `translate(${Math.sin(t * 0.27) * 50}px, ${Math.cos(t * 0.23) * 45}px)` +
      ` rotate(${t * (12 * INTENSITY)}deg) scale(${1.05 + 0.07 * Math.sin(t * 0.5)})`;

    // Lens “kaleidoscope” swirl
    lens.style.transform =
      `translate(${Math.sin(t * 0.35) * 35}px, ${Math.cos(t * 0.33) * 35}px)` +
      ` rotate(${t * (18 * INTENSITY)}deg)`;

    // Grain shimmer
    grain.style.transform = `translate(${(Math.random() - 0.5) * 2}px, ${(Math.random() - 0.5) * 2}px)`;

    // Smear pulses (afterimage)
    smear.style.opacity = String(0.22 * INTENSITY + 0.18 * INTENSITY * (0.5 + 0.5 * Math.sin(t * 0.9)));

    raf = requestAnimationFrame(tick);
  }

  // Throttle-ish loop
  timer = setInterval(() => {
    if (!raf) raf = requestAnimationFrame(() => { raf = null; tick(); });
  }, frameDelay);

  tick();

  // ====== stop ======
  window.__tripStop = () => {
    try {
      clearInterval(timer);
      cancelAnimationFrame(raf);
      root.style.filter = prev.filter;
      root.style.transform = prev.transform;
      root.style.transformOrigin = prev.transformOrigin;
      root.style.transition = prev.transition;
      wrap.remove();
    } catch {}
    delete window.__tripStop;
    console.log("Trip effect removed.");
  };

  console.log("ULTRA trip active. Run __tripStop() to remove. (INTENSITY/FPS are at top.)");
})();
