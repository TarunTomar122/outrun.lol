// Finish-line tape that snaps in the middle, then confetti. Call on a verified submit.
export function celebrate() {
  if (typeof window === "undefined") return;
  fireConfetti();
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const overlay = document.createElement("div");
  overlay.className = "finish-overlay";
  const label = "FINISH · ".repeat(12);
  overlay.innerHTML = `<div class="finish-band"><div class="finish-tape finish-tape-left"><span>${label}</span></div><div class="finish-tape finish-tape-right"><span>${label}</span></div></div>`;
  document.body.appendChild(overlay);
  setTimeout(() => overlay.remove(), 3100);
}

// ponytail: ~40-line canvas burst instead of a confetti dependency. Bump particleCount or add origins if you want it wilder.
export function fireConfetti() {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999";
  const dpr = window.devicePixelRatio || 1;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  const colors = ["#ed755a", "#f8b3a4", "#00a83b", "#ffd166", "#4d9fff", "#c77dff", "#ffffff"];
  // Two side cannons firing inward + up, party-popper style.
  const parts = Array.from({ length: 220 }, (_, i) => {
    const left = i % 2 === 0;
    const angle = (left ? -60 : -120) * (Math.PI / 180) + (Math.random() - 0.5) * 0.9;
    const speed = 11 + Math.random() * 11;
    return {
      x: left ? 0 : innerWidth,
      y: innerHeight * 0.72,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 5 + Math.random() * 7,
      color: colors[(Math.random() * colors.length) | 0],
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.35,
      life: 0,
    };
  });

  const gravity = 0.13, drag = 0.992, maxLife = 320;
  function frame() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    let alive = false;
    for (const p of parts) {
      p.life++;
      p.vx *= drag; p.vy = p.vy * drag + gravity;
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      const alpha = Math.max(0, 1 - p.life / maxLife);
      if (alpha <= 0 || p.y > innerHeight + 30) continue;
      alive = true;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.55);
      ctx.restore();
    }
    if (alive) requestAnimationFrame(frame);
    else canvas.remove();
  }
  requestAnimationFrame(frame);
}
