(() => {
  const field = document.getElementById("field");
  const chart = document.getElementById("quest-chart");
  if (!field || !chart) return;

  const fieldCtx = field.getContext("2d");
  const chartCtx = chart.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let particles = [];
  let mouse = { x: null, y: null };
  let t = 0;
  let chartProgress = 0;

  function lyrePoint(u, v) {
    const arm = Math.pow(Math.abs(u - 0.5) * 2, 1.35);
    const x = 0.5 + (u - 0.5) * (0.42 + v * 0.28);
    const y = 0.12 + arm * 0.1 + v * 0.7;
    return { x, y };
  }

  function mapLyre(p) {
    const cx = width * 0.68;
    const cy = height * 0.38;
    const scale = Math.min(width, height) * 0.42;
    return {
      x: cx + (p.x - 0.5) * scale,
      y: cy + (p.y - 0.5) * scale * 1.15,
    };
  }

  function seedParticles() {
    const count = Math.floor(Math.min(160, (width * height) / 10000));
    particles = [];
    const lyreCount = Math.floor(count * 0.42);

    for (let i = 0; i < lyreCount; i++) {
      const u = Math.random();
      const v = Math.random();
      // Bias toward frame + strings
      const alongString = Math.random() < 0.35;
      const su = alongString ? 0.2 + Math.floor(Math.random() * 5) * 0.15 + (Math.random() - 0.5) * 0.02 : u;
      const sv = alongString ? Math.random() * 0.85 : v;
      const p = mapLyre(lyrePoint(su, sv));
      particles.push({
        x: p.x + (Math.random() - 0.5) * 8,
        y: p.y + (Math.random() - 0.5) * 8,
        homeX: p.x,
        homeY: p.y,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: Math.random() * 1.7 + 0.6,
        hue: Math.random() > 0.9 ? 28 : 198 + Math.random() * 18,
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
        vx: (Math.random() - 0.5) * 0.32,
        vy: (Math.random() - 0.5) * 0.32,
        r: Math.random() * 1.6 + 0.5,
        hue: Math.random() > 0.85 ? 170 : 198 + Math.random() * 20,
        phase: Math.random() * Math.PI * 2,
        anchored: false,
      });
    }
  }

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

  function drawField() {
    fieldCtx.clearRect(0, 0, width, height);

    // Soft waveform ribbons
    for (let band = 0; band < 3; band++) {
      const yBase = height * (0.62 + band * 0.08);
      fieldCtx.beginPath();
      for (let x = 0; x <= width; x += 10) {
        const y =
          yBase +
          Math.sin(x * 0.007 + t * 0.016 + band * 1.3) * (14 + band * 5) +
          Math.sin(x * 0.018 - t * 0.01 + band) * (6 + band * 2);
        if (x === 0) fieldCtx.moveTo(x, y);
        else fieldCtx.lineTo(x, y);
      }
      fieldCtx.strokeStyle =
        band === 2 ? "rgba(61, 184, 168, 0.14)" : `rgba(47, 154, 217, ${0.1 + band * 0.035})`;
      fieldCtx.lineWidth = 1.3;
      fieldCtx.stroke();
    }

    // Links
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        const max = a.anchored && b.anchored ? 70 : 110;
        if (dist < max) {
          const alpha = (1 - dist / max) * (a.anchored && b.anchored ? 0.28 : 0.16);
          fieldCtx.strokeStyle = `rgba(42, 143, 212, ${alpha})`;
          fieldCtx.lineWidth = 1;
          fieldCtx.beginPath();
          fieldCtx.moveTo(a.x, a.y);
          fieldCtx.lineTo(b.x, b.y);
          fieldCtx.stroke();
        }
      }
    }

    particles.forEach((p) => {
      p.x += p.vx + Math.sin(t * 0.01 + p.phase) * 0.07;
      p.y += p.vy + Math.cos(t * 0.008 + p.phase) * 0.07;

      if (p.anchored && p.homeX != null) {
        p.x += (p.homeX - p.x) * 0.02;
        p.y += (p.homeY - p.y) * 0.02;
      }

      if (mouse.x != null) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 150 && dist > 0.1) {
          p.x += (dx / dist) * 0.4;
          p.y += (dy / dist) * 0.4;
        }
      }

      if (!p.anchored) {
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;
      }

      const pulse = 0.55 + Math.sin(t * 0.03 + p.phase) * 0.28;
      fieldCtx.beginPath();
      fieldCtx.arc(p.x, p.y, p.r * pulse, 0, Math.PI * 2);
      if (p.hue < 40) {
        fieldCtx.fillStyle = `rgba(232, 163, 60, ${0.5 * pulse})`;
      } else if (p.hue < 180) {
        fieldCtx.fillStyle = `rgba(61, 184, 168, ${0.45 * pulse})`;
      } else {
        fieldCtx.fillStyle = `rgba(42, 143, 212, ${0.42 * pulse})`;
      }
      fieldCtx.fill();
    });
  }

  function sampleSeries(kind, i, n) {
    const x = i / (n - 1);
    if (kind === "hours") {
      return (
        0.28 +
        0.22 * Math.sin(x * Math.PI * 1.7 + 0.2) +
        0.18 * Math.sin(x * Math.PI * 3.1 + 1.1) +
        0.12 * x
      );
    }
    return (
      0.22 +
      0.2 * Math.sin(x * Math.PI * 2.2 + 0.6) +
      0.16 * Math.sin(x * Math.PI * 4.4 + 2.1) +
      0.18 * Math.pow(x, 1.2)
    );
  }

  function drawChart() {
    const w = chart.width;
    const h = chart.height;
    const pad = { t: 24, r: 18, b: 28, l: 18 };
    const plotW = w - pad.l - pad.r;
    const plotH = h - pad.t - pad.b;
    chartCtx.clearRect(0, 0, w, h);

    // Grid
    chartCtx.strokeStyle = "rgba(42, 143, 212, 0.1)";
    chartCtx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const y = pad.t + (plotH / 3) * i;
      chartCtx.beginPath();
      chartCtx.moveTo(pad.l, y);
      chartCtx.lineTo(w - pad.r, y);
      chartCtx.stroke();
    }

    const n = 48;
    const visible = Math.max(2, Math.floor(n * chartProgress));

    function drawSeries(kind, color, fill) {
      chartCtx.beginPath();
      for (let i = 0; i < visible; i++) {
        const x = pad.l + (plotW * i) / (n - 1);
        const y = pad.t + plotH * (1 - sampleSeries(kind, i, n));
        if (i === 0) chartCtx.moveTo(x, y);
        else chartCtx.lineTo(x, y);
      }
      chartCtx.strokeStyle = color;
      chartCtx.lineWidth = 2.2;
      chartCtx.stroke();

      if (fill && visible > 1) {
        const lastX = pad.l + (plotW * (visible - 1)) / (n - 1);
        chartCtx.lineTo(lastX, pad.t + plotH);
        chartCtx.lineTo(pad.l, pad.t + plotH);
        chartCtx.closePath();
        chartCtx.fillStyle = fill;
        chartCtx.fill();
      }
    }

    drawSeries("hours", "rgba(26, 122, 184, 0.9)", "rgba(47, 154, 217, 0.08)");
    drawSeries("questions", "rgba(61, 184, 168, 0.95)", null);

    // Live tip dots
    if (visible > 1) {
      const i = visible - 1;
      const x = pad.l + (plotW * i) / (n - 1);
      [
        ["hours", "rgba(26, 122, 184, 1)"],
        ["questions", "rgba(61, 184, 168, 1)"],
      ].forEach(([kind, color]) => {
        const y = pad.t + plotH * (1 - sampleSeries(kind, i, n));
        chartCtx.beginPath();
        chartCtx.arc(x, y, 3.2, 0, Math.PI * 2);
        chartCtx.fillStyle = color;
        chartCtx.fill();
      });
    }
  }

  function frame() {
    t += 1;
    if (chartProgress < 1) {
      chartProgress = Math.min(1, chartProgress + (reduceMotion ? 1 : 0.008));
    } else if (!reduceMotion) {
      // Gentle live drift on the trailing edge by advancing a phase
      chartProgress = 1;
    }
    drawField();
    drawChart();
    requestAnimationFrame(frame);
  }

  function observeReveal() {
    const nodes = document.querySelectorAll(".live-panel, .help-list li");
    if (!("IntersectionObserver" in window)) {
      nodes.forEach((n) => n.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            if (entry.target.classList.contains("live-panel") && chartProgress < 0.2) {
              chartProgress = 0.05;
            }
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18 }
    );
    nodes.forEach((n) => io.observe(n));
  }

  function setupNav() {
    const toggle = document.querySelector(".nav-toggle");
    const nav = document.querySelector(".nav");
    if (!toggle || !nav) return;

    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      document.body.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("open");
        document.body.classList.remove("nav-open");
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
      const subject = encodeURIComponent(`Orpheon quest from ${name}`);
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
  chartProgress = reduceMotion ? 1 : 0;
  drawChart();
  if (reduceMotion) {
    drawField();
  } else {
    frame();
  }
})();
