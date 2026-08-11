(() => {
  const field = document.getElementById("field");
  const wave = document.getElementById("wave");
  if (!field || !wave) return;

  const fieldCtx = field.getContext("2d");
  const waveCtx = wave.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let particles = [];
  let mouse = { x: null, y: null };
  let raf = 0;
  let t = 0;

  function resizeField() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    field.width = Math.floor(width * dpr);
    field.height = Math.floor(height * dpr);
    field.style.width = `${width}px`;
    field.style.height = `${height}px`;
    fieldCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedParticles();
  }

  function lyrePoint(u, v) {
    // Parametric lyre-ish silhouette (normalized 0..1), mapped later to screen
    const x = 0.5 + (u - 0.5) * (0.55 + v * 0.35);
    const top = Math.pow(Math.abs(u - 0.5) * 2, 1.6) * 0.12;
    const y = 0.18 + top + v * 0.62;
    return { x, y };
  }

  function seedParticles() {
    const count = Math.floor(Math.min(130, (width * height) / 12000));
    particles = [];
    const lyreCount = Math.floor(count * 0.28);
    for (let i = 0; i < lyreCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const p = lyrePoint(u, v);
      particles.push({
        x: width * (0.55 + (p.x - 0.5) * 0.55),
        y: height * (0.18 + p.y * 0.55),
        homeX: width * (0.55 + (p.x - 0.5) * 0.55),
        homeY: height * (0.18 + p.y * 0.55),
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        r: Math.random() * 1.6 + 0.7,
        hue: Math.random() > 0.88 ? 28 : 198 + Math.random() * 20,
        phase: Math.random() * Math.PI * 2,
        anchored: true,
      });
    }
    for (let i = lyreCount; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        homeX: null,
        homeY: null,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.8 + 0.6,
        hue: Math.random() > 0.82 ? 28 : 198 + Math.random() * 20,
        phase: Math.random() * Math.PI * 2,
        anchored: false,
      });
    }
  }

  function drawField() {
    fieldCtx.clearRect(0, 0, width, height);

    // Soft constellation / neural links
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 120) {
          const alpha = (1 - dist / 120) * 0.22;
          fieldCtx.strokeStyle = `rgba(42, 143, 212, ${alpha})`;
          fieldCtx.lineWidth = 1;
          fieldCtx.beginPath();
          fieldCtx.moveTo(a.x, a.y);
          fieldCtx.lineTo(b.x, b.y);
          fieldCtx.stroke();
        }
      }
    }

    // Floating waveform ribbons behind content
    for (let band = 0; band < 3; band++) {
      const yBase = height * (0.28 + band * 0.18);
      fieldCtx.beginPath();
      for (let x = 0; x <= width; x += 8) {
        const y =
          yBase +
          Math.sin(x * 0.008 + t * 0.018 + band * 1.4) * (18 + band * 6) +
          Math.sin(x * 0.021 - t * 0.01 + band) * (8 + band * 3);
        if (x === 0) fieldCtx.moveTo(x, y);
        else fieldCtx.lineTo(x, y);
      }
      fieldCtx.strokeStyle =
        band === 2
          ? `rgba(232, 163, 60, ${0.12 + band * 0.03})`
          : `rgba(94, 184, 232, ${0.1 + band * 0.04})`;
      fieldCtx.lineWidth = 1.4;
      fieldCtx.stroke();
    }

    particles.forEach((p) => {
      p.x += p.vx + Math.sin(t * 0.01 + p.phase) * 0.08;
      p.y += p.vy + Math.cos(t * 0.008 + p.phase) * 0.08;

      if (p.anchored && p.homeX != null) {
        p.x += (p.homeX - p.x) * 0.015;
        p.y += (p.homeY - p.y) * 0.015;
      }

      if (mouse.x != null) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 140) {
          p.x += (dx / dist) * 0.35;
          p.y += (dy / dist) * 0.35;
        }
      }

      if (!p.anchored) {
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;
      }

      const pulse = 0.55 + Math.sin(t * 0.03 + p.phase) * 0.25;
      fieldCtx.beginPath();
      fieldCtx.arc(p.x, p.y, p.r * pulse, 0, Math.PI * 2);
      fieldCtx.fillStyle =
        p.hue < 40
          ? `rgba(232, 163, 60, ${0.55 * pulse})`
          : `rgba(42, 143, 212, ${0.45 * pulse})`;
      fieldCtx.fill();
    });
  }

  function drawWave() {
    const w = wave.width;
    const h = wave.height;
    waveCtx.clearRect(0, 0, w, h);

    const layers = [
      { amp: 22, freq: 0.018, speed: 0.035, color: "rgba(42, 143, 212, 0.55)", width: 2 },
      { amp: 14, freq: 0.028, speed: -0.028, color: "rgba(94, 184, 232, 0.7)", width: 1.6 },
      { amp: 9, freq: 0.042, speed: 0.045, color: "rgba(232, 163, 60, 0.55)", width: 1.4 },
    ];

    layers.forEach((layer, i) => {
      waveCtx.beginPath();
      for (let x = 0; x <= w; x++) {
        const y =
          h / 2 +
          Math.sin(x * layer.freq + t * layer.speed + i) * layer.amp +
          Math.sin(x * layer.freq * 0.45 - t * 0.02) * (layer.amp * 0.35);
        if (x === 0) waveCtx.moveTo(x, y);
        else waveCtx.lineTo(x, y);
      }
      waveCtx.strokeStyle = layer.color;
      waveCtx.lineWidth = layer.width;
      waveCtx.stroke();

      // Soft filled under-curve for depth
      if (i === 1) {
        waveCtx.lineTo(w, h);
        waveCtx.lineTo(0, h);
        waveCtx.closePath();
        waveCtx.fillStyle = "rgba(94, 184, 232, 0.08)";
        waveCtx.fill();
      }
    });

    // Speckle data points on center wave
    for (let x = 12; x < w; x += 18) {
      const y =
        h / 2 +
        Math.sin(x * 0.028 + t * -0.028 + 1) * 14 +
        Math.sin(x * 0.012 - t * 0.02) * 5;
      waveCtx.beginPath();
      waveCtx.arc(x, y, 1.6, 0, Math.PI * 2);
      waveCtx.fillStyle = x % 54 === 12 ? "rgba(232, 163, 60, 0.85)" : "rgba(42, 143, 212, 0.75)";
      waveCtx.fill();
    }
  }

  function frame() {
    t += 1;
    drawField();
    drawWave();
    raf = requestAnimationFrame(frame);
  }

  function observeReveal() {
    const nodes = document.querySelectorAll(".work-list li, .person");
    if (!("IntersectionObserver" in window)) {
      nodes.forEach((n) => n.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    nodes.forEach((n) => io.observe(n));
  }

  function setupNav() {
    const toggle = document.querySelector(".nav-toggle");
    const nav = document.querySelector(".nav");
    if (!toggle || !nav) return;

    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
      });
    });
  }

  function setupForm() {
    const form = document.querySelector(".contact-form");
    if (!form) return;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const name = String(data.get("name") || "").trim();
      const email = String(data.get("email") || "").trim();
      const body = String(data.get("body") || "").trim();
      const subject = encodeURIComponent(`Orpheon inquiry from ${name}`);
      const message = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${body}`);
      window.location.href = `mailto:hello@orpheon.dev?subject=${subject}&body=${message}`;
    });
  }

  window.addEventListener("resize", resizeField);
  window.addEventListener(
    "pointermove",
    (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    },
    { passive: true }
  );
  window.addEventListener(
    "pointerleave",
    () => {
      mouse.x = null;
      mouse.y = null;
    },
    { passive: true }
  );

  resizeField();
  observeReveal();
  setupNav();
  setupForm();

  if (reduceMotion) {
    drawField();
    drawWave();
  } else {
    frame();
  }
})();
