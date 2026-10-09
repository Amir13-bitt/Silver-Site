(function () {
  const root = document.documentElement;
  const body = document.body;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- Language ---------- */
  let lang = "fa";
  try { lang = localStorage.getItem("fm-lang") || "fa"; } catch (e) {}

  function splitWords(el) {
    const text = el.textContent.trim();
    el.innerHTML = text.split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(" ");
  }

  function setLang(next) {
    lang = next;
    const dict = window.I18N[lang];
    root.lang = lang;
    root.dir = lang === "fa" ? "rtl" : "ltr";
    document.title = dict["meta.title"];
    $$("[data-i18n]").forEach((el) => {
      const v = dict[el.dataset.i18n];
      if (v != null) el.innerHTML = v;
    });
    $$(".reveal-words").forEach(splitWords);
    $$(".count").forEach((el) => { if (el.dataset.done) el.textContent = fmt(+el.dataset.to); });
    try { localStorage.setItem("fm-lang", lang); } catch (e) {}
    measure();
    onScroll();
  }

  const fmt = (n) => (lang === "fa" ? n.toLocaleString("fa-IR") : String(n));

  $(".lang").addEventListener("click", () => setLang(lang === "fa" ? "en" : "fa"));

  /* ---------- Loader ---------- */
  function runLoader() {
    const countEl = $(".loader__count span");
    const t0 = performance.now();
    const dur = reduced ? 200 : 1600;
    (function tick(now) {
      const p = clamp((now - t0) / dur, 0, 1);
      countEl.textContent = Math.round((1 - Math.pow(1 - p, 3)) * 100);
      if (p < 1) return requestAnimationFrame(tick);
      $(".loader").classList.add("is-done");
      body.classList.remove("is-loading");
      setTimeout(() => body.classList.add("is-ready"), 250);
    })(t0);
  }

  /* ---------- Cursor ---------- */
  if (finePointer && !reduced) {
    const cur = $(".cursor");
    const label = $(".cursor__label");
    let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
    addEventListener("pointermove", (e) => { x = e.clientX; y = e.clientY; cur.classList.add("is-visible"); });
    document.addEventListener("pointerleave", () => cur.classList.remove("is-visible"));
    (function loop() {
      cx += (x - cx) * 0.2; cy += (y - cy) * 0.2;
      cur.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      requestAnimationFrame(loop);
    })();
    document.addEventListener("pointerover", (e) => {
      const t = e.target.closest("a, button, [data-cursor]");
      cur.classList.toggle("is-hover", !!t);
      const kind = t && t.dataset.cursor;
      cur.classList.toggle("is-label", !!kind);
      if (kind) label.textContent = window.I18N[lang]["cursor." + kind] || "";
    });
  }

  /* ---------- Magnetic buttons & tilt cards ---------- */
  if (finePointer && !reduced) {
    $$(".magnetic").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * 0.25}px, ${dy * 0.35}px)`;
      });
      el.addEventListener("pointerleave", () => {
        el.style.transition = "transform .7s cubic-bezier(.16,1,.3,1)";
        el.style.transform = "";
        setTimeout(() => (el.style.transition = ""), 700);
      });
    });

    $$(".tilt").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        el.style.transform = `perspective(900px) rotateY(${(px - 0.5) * 12}deg) rotateX(${(0.5 - py) * 12}deg)`;
        el.style.setProperty("--mx", px * 100 + "%");
        el.style.setProperty("--my", py * 100 + "%");
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }

  /* ---------- Menu ---------- */
  const burger = $(".nav__burger");
  burger.addEventListener("click", () => {
    const open = body.classList.toggle("menu-open");
    burger.setAttribute("aria-expanded", open);
    $(".menu").setAttribute("aria-hidden", !open);
  });
  $$(".menu a").forEach((a) => a.addEventListener("click", () => {
    body.classList.remove("menu-open");
    burger.setAttribute("aria-expanded", false);
    $(".menu").setAttribute("aria-hidden", true);
  }));

  /* ---------- In-view reveals ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add("in");
      if (en.target.classList.contains("count")) countUp(en.target);
      io.unobserve(en.target);
    });
  }, { threshold: 0.2 });
  $$(".fade-up, .contact__title, .count").forEach((el) => io.observe(el));

  function countUp(el) {
    const to = +el.dataset.to;
    const t0 = performance.now();
    const dur = reduced ? 1 : 1800;
    (function tick(now) {
      const p = clamp((now - t0) / dur, 0, 1);
      el.textContent = fmt(Math.round(to * (1 - Math.pow(1 - p, 4))));
      if (p < 1) requestAnimationFrame(tick); else el.dataset.done = "1";
    })(t0);
  }

  /* ---------- Scroll-driven motion ---------- */
  const nav = $(".nav");
  const col = $(".collections");
  const track = $(".collections__track");
  const bar = $(".collections__progress i");
  const craftSteps = $(".craft__steps");
  const craftPath = $(".craft__line path");
  const fill = $(".fill-text");
  const mobile = window.matchMedia("(max-width: 760px)");
  let dist = 0, lastY = 0;

  function measure() {
    if (mobile.matches) { col.style.height = ""; dist = 0; return; }
    dist = Math.max(0, track.scrollWidth - innerWidth);
    col.style.height = dist + innerHeight + "px";
  }

  function onScroll() {
    const y = scrollY;
    const vh = innerHeight;

    nav.classList.toggle("is-scrolled", y > 40);
    nav.classList.toggle("is-hidden", y > lastY && y > vh * 0.8 && !body.classList.contains("menu-open"));
    lastY = y;

    if (!mobile.matches && dist > 0) {
      const r = col.getBoundingClientRect();
      const p = clamp(-r.top / (r.height - vh), 0, 1);
      const dir = root.dir === "rtl" ? 1 : -1;
      track.style.transform = `translate3d(${dir * p * dist}px, 0, 0)`;
      bar.style.transform = `scaleX(${p})`;
    }

    $$(".reveal-words").forEach((el) => {
      const r = el.getBoundingClientRect();
      const p = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.35), 0, 1);
      const words = el.querySelectorAll(".w");
      const on = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle("on", i < on));
    });

    const cr = craftSteps.getBoundingClientRect();
    const cp = clamp((vh * 0.7 - cr.top) / cr.height, 0, 1);
    craftPath.style.strokeDashoffset = 1000 * (1 - cp);

    const fr = fill.getBoundingClientRect();
    const fp = clamp((vh * 0.9 - fr.top) / (fr.height + vh * 0.4), 0, 1);
    fill.style.setProperty("--fill", fp * 100 + "%");
  }

  let ticking = false;
  addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onScroll(); ticking = false; });
  }, { passive: true });
  addEventListener("resize", () => { measure(); onScroll(); });

  $(".year").textContent = new Date().getFullYear();
  setLang(lang);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); onScroll(); });
  runLoader();
})();
