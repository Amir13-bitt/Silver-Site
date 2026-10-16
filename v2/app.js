/* v2 behaviour: language, intro, Motion reveals and scroll scenes, shop. */
(function () {
  const M = window.Motion || {};
  const { animate, scroll, inView, stagger } = M;
  const hasMotion = typeof animate === "function";
  const root = document.documentElement;
  const body = document.body;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const mobile = matchMedia("(max-width: 760px)");
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const EXPO = [0.16, 1, 0.3, 1];
  const products = window.PRODUCTS || [];
  const motionOK = hasMotion && !reduced;
  if (motionOK) root.classList.add("js-motion");

  /* ---------- Language ---------- */
  let lang = "fa";
  try { lang = localStorage.getItem("fm-lang") || "fa"; } catch (e) {}
  const dict = () => window.I18N[lang] || {};
  const num = (n) => (lang === "fa" ? n.toLocaleString("fa-IR") : n.toLocaleString("en-US"));
  const digits = (s) => (lang === "fa" ? String(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]) : String(s));
  const t = (key, n) => { const s = dict()[key] || key; return n == null ? s : s.replace("{n}", num(n)); };

  // Persian letters must stay joined, so Persian splits into words; English into letters.
  function splitHero(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = lang === "fa"
      ? words.map((w) => `<span class="split-w">${w}</span>`).join(" ")
      : words.map((w) => `<span class="split-w" style="white-space:nowrap">${[...w].map((c) => `<span class="split-c">${c}</span>`).join("")}</span>`).join(" ");
  }
  function splitWords(el) {
    el.innerHTML = el.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(" ");
  }

  function setLang(next, animateHero) {
    lang = next;
    root.lang = lang;
    root.dir = lang === "fa" ? "rtl" : "ltr";
    document.title = t("meta.title");
    $$("[data-i18n]").forEach((el) => { const v = dict()[el.dataset.i18n]; if (v != null) el.innerHTML = v; });
    $$("[data-split]").forEach(splitHero);
    $$(".scrub-words").forEach(splitWords);
    $$(".step__num").forEach((el, i) => (el.textContent = digits(String(i + 1).padStart(2, "0"))));
    $$(".ccard__index").forEach((el, i) => (el.textContent = digits(String(i + 1).padStart(2, "0"))));
    $(".craft__digit").textContent = digits(String(activeStep + 1).padStart(2, "0"));
    $$(".count").forEach((el) => { if (el.dataset.done) el.textContent = num(+el.dataset.to); });
    $(".pmodal__close").setAttribute("aria-label", t("shop.close"));
    try { localStorage.setItem("fm-lang", lang); } catch (e) {}
    Shop.render(false);
    measure();
    if (animateHero) heroIn(0);
  }
  $(".lang").addEventListener("click", () => setLang(lang === "fa" ? "en" : "fa", true));

  /* ---------- Intro ---------- */
  function runIntro() {
    const intro = $(".intro");
    const done = () => { intro.remove(); body.classList.remove("is-loading"); heroIn(0.1); };
    if (!motionOK) { done(); return; }
    const count = $(".intro__count");
    animate($(".intro__mark circle"), { strokeDashoffset: [315, 0] }, { duration: 1.4, ease: EXPO });
    animate(0, 100, { duration: 1.4, ease: [0.4, 0, 0.2, 1], onUpdate: (v) => (count.textContent = Math.round(v)) })
      .then(() => {
        animate($(".intro__mark"), { opacity: 0, transform: "scale(.9)" }, { duration: 0.4 });
        return animate($$(".intro__panels i"), { transform: ["translateY(0%)", "translateY(-101%)"] },
          { duration: 1, delay: stagger(0.07, { from: "center" }), ease: [0.76, 0, 0.24, 1] });
      })
      .then(done, done);
    setTimeout(() => { if (document.contains(intro)) done(); }, 5000);
  }

  function heroIn(delay) {
    if (!motionOK) return;
    const bits = $$(".hero .split-c").length ? $$(".hero .split-c") : $$(".hero .split-w");
    animate(bits, {
      opacity: [0, 1],
      transform: ["translateY(70%) rotate(8deg)", "translateY(0%) rotate(0deg)"],
      filter: ["blur(14px)", "blur(0px)"],
    }, { duration: 1.3, delay: stagger(lang === "fa" ? 0.18 : 0.045, { startDelay: delay }), ease: EXPO });
    animate($$(".hero__eyebrow, .hero__lede, .hero__cta, .hero__badge, .hero__scroll"),
      { opacity: [0, 1], transform: ["translateY(30px)", "translateY(0px)"] },
      { duration: 1.1, delay: stagger(0.1, { startDelay: delay + 0.45 }), ease: EXPO });
  }

  /* ---------- Cursor ---------- */
  if (finePointer && !reduced) {
    const cur = $(".cursor"), dot = $(".cursor__dot"), ring = $(".cursor__ring"), label = $(".cursor__label");
    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;
    addEventListener("pointermove", (e) => { x = e.clientX; y = e.clientY; cur.classList.add("is-on"); }, { passive: true });
    document.addEventListener("pointerleave", () => cur.classList.remove("is-on"));
    (function loop() {
      rx += (x - rx) * 0.16; ry += (y - ry) * 0.16;
      dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      requestAnimationFrame(loop);
    })();
    document.addEventListener("pointerover", (e) => {
      const el = e.target.closest("a, button, [data-cursor]");
      cur.classList.toggle("is-hover", !!el);
      const kind = el && el.dataset.cursor;
      cur.classList.toggle("is-label", !!kind);
      if (kind) label.textContent = t("cursor." + kind);
    });
  }

  /* ---------- Magnetic buttons ---------- */
  if (finePointer && motionOK) {
    document.addEventListener("pointermove", (e) => {
      const el = e.target.closest(".magnetic");
      if (!el) return;
      const r = el.getBoundingClientRect();
      animate(el, { x: (e.clientX - r.left - r.width / 2) * 0.3, y: (e.clientY - r.top - r.height / 2) * 0.4 },
        { type: "spring", stiffness: 260, damping: 18 });
    });
    $$(".magnetic").forEach((el) => el.addEventListener("pointerleave", () =>
      animate(el, { x: 0, y: 0 }, { type: "spring", stiffness: 300, damping: 12 })));
  }

  /* ---------- Nav: sliding pill, hide on scroll down ---------- */
  const nav = $(".nav");
  const links = $(".nav__links");
  const pill = $(".nav__pill");
  if (hasMotion) {
    $$(".nav__links a").forEach((a) => a.addEventListener("pointerenter", () => {
      $$(".nav__links a").forEach((o) => o.classList.toggle("is-pill", o === a));
      const lr = links.getBoundingClientRect(), r = a.getBoundingClientRect();
      animate(pill, { x: r.left - lr.left, width: r.width, opacity: 1 }, { type: "spring", stiffness: 420, damping: 34 });
    }));
    links.addEventListener("pointerleave", () => {
      $$(".nav__links a").forEach((o) => o.classList.remove("is-pill"));
      animate(pill, { opacity: 0 }, { duration: 0.25 });
    });
  }
  const burger = $(".nav__burger");
  burger.addEventListener("click", () => {
    const open = body.classList.toggle("menu-open");
    burger.setAttribute("aria-expanded", open);
    $(".menu").setAttribute("aria-hidden", !open);
    if (open && motionOK) animate($$(".menu a"), { opacity: [0, 1], transform: ["translateY(40px)", "translateY(0px)"] },
      { duration: 0.8, delay: stagger(0.06, { startDelay: 0.2 }), ease: EXPO });
  });
  $$(".menu a").forEach((a) => a.addEventListener("click", () => {
    body.classList.remove("menu-open");
    burger.setAttribute("aria-expanded", false);
    $(".menu").setAttribute("aria-hidden", true);
  }));

  /* ---------- Scroll scenes ---------- */
  const col = $(".collections");
  const track = $(".collections__track");
  let dist = 0;
  function measure() {
    if (mobile.matches) { col.style.height = ""; dist = 0; track.style.transform = ""; return; }
    dist = Math.max(0, track.scrollWidth - innerWidth);
    col.style.height = dist + innerHeight + "px";
  }

  let lastY = scrollY, velocity = 0;
  addEventListener("scroll", () => {
    const y = scrollY;
    nav.classList.toggle("is-scrolled", y > 40);
    nav.classList.toggle("is-hidden", y > lastY && y > innerHeight * 0.9 && !body.classList.contains("menu-open"));
    velocity += (y - lastY);
    lastY = y;
  }, { passive: true });

  // Crossing bands drift on their own and speed up with the scroll.
  const bands = $$(".band__track").map((el, i) => ({ el, x: 0, dir: i ? 1 : -1 }));
  (function drift() {
    velocity *= 0.9;
    const boost = clamp(Math.abs(velocity) * 0.08, 0, 14);
    bands.forEach((b) => {
      const w = b.el.firstElementChild ? b.el.firstElementChild.offsetWidth : 0;
      if (!w) return;
      b.x += b.dir * (reduced ? 0 : 0.6 + boost) * (velocity < 0 ? -1 : 1);
      b.x = ((b.x % w) + w) % w;
      b.el.style.transform = `translate3d(${-b.x}px, 0, 0)`;
    });
    requestAnimationFrame(drift);
  })();

  if (typeof scroll === "function") {
    const bar = $(".progress");
    scroll((p) => (bar.style.transform = `scaleX(${p})`));

    const heroInner = $(".hero__inner");
    scroll((p) => {
      if (window.Ring) window.Ring.setScroll(p);
      heroInner.style.transform = `translate3d(0, ${-p * 140}px, 0)`;
      heroInner.style.opacity = String(clamp(1 - p * 1.4, 0, 1));
    }, { target: $(".hero"), offset: ["start start", "end start"] });

    const floats = $(".story__floats");
    scroll((p) => {
      $$("img", floats).forEach((img, i) => {
        const s = [-160, 120, -90][i] || 0, r = [-12, 10, 6][i] || 0;
        img.style.transform = `translate3d(0, ${(p - 0.5) * s}px, 0) rotate(${(p - 0.5) * r}deg)`;
      });
    }, { target: $(".story"), offset: ["start end", "end start"] });

    $$(".scrub-words").forEach((el) => scroll((p) => {
      const words = el.querySelectorAll(".w");
      const on = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle("on", i < on));
    }, { target: el, offset: ["start 85%", "end 50%"] }));

    const cbar = $(".collections__progress i");
    const cards = $$(".ccard");
    scroll((p) => {
      if (mobile.matches || !dist) return;
      const dir = root.dir === "rtl" ? 1 : -1;
      track.style.transform = `translate3d(${dir * p * dist}px, 0, 0)`;
      cbar.style.transform = `scaleX(${p})`;
      cards.forEach((c) => {
        const r = c.getBoundingClientRect();
        const d = clamp((r.left + r.width / 2 - innerWidth / 2) / innerWidth, -1, 1);
        c.style.transform = `rotateY(${-d * 28}deg) translateZ(${-Math.abs(d) * 160}px)`;
      });
    }, { target: col, offset: ["start start", "end end"] });

    const big = $$(".footer__big span");
    scroll((p) => {
      big[0].style.transform = `translate3d(${(1 - p) * -18}%, 0, 0)`;
      big[1].style.transform = `translate3d(${(1 - p) * 18}%, 0, 0)`;
    }, { target: $(".footer"), offset: ["start end", "end end"] });
  }

  /* ---------- In-view reveals ---------- */
  function countUp(el) {
    const to = +el.dataset.to;
    if (!motionOK) { el.textContent = num(to); el.dataset.done = "1"; return; }
    animate(0, to, { duration: 2.2, ease: EXPO, onUpdate: (v) => (el.textContent = num(Math.round(v))) })
      .then(() => (el.dataset.done = "1"));
  }
  if (typeof inView === "function") {
    inView(".rise", (el) => {
      if (motionOK) animate(el, { opacity: [0, 1], transform: ["translateY(50px)", "translateY(0px)"] }, { duration: 1.1, ease: EXPO });
    }, { amount: 0.2 });
    inView(".count", (el) => countUp(el), { amount: 0.6 });
    inView(".contact__title", (el) => {
      if (motionOK) animate($$(".contact__line", el), { opacity: [0, 1], transform: ["translateY(60%) scale(.96)", "translateY(0%) scale(1)"], filter: ["blur(16px)", "blur(0px)"] },
        { duration: 1.3, delay: stagger(0.15), ease: EXPO });
    }, { amount: 0.4 });
    inView(".title", (el) => {
      if (motionOK) animate(el, { opacity: [0, 1], transform: ["translateY(40px)", "translateY(0px)"], filter: ["blur(10px)", "blur(0px)"] }, { duration: 1.1, ease: EXPO });
    }, { amount: 0.5 });
  } else {
    $$(".count").forEach(countUp);
  }

  // Craft: the step in the middle of the screen lights up and rolls the big number.
  let activeStep = 0;
  const digit = $(".craft__digit");
  const steps = $$(".step");
  steps[0].classList.add("is-active");
  if (typeof inView === "function") {
    steps.forEach((step, i) => inView(step, () => {
      if (i === activeStep) return;
      const down = i > activeStep;
      activeStep = i;
      steps.forEach((s, j) => s.classList.toggle("is-active", j === i));
      const label = digits(String(i + 1).padStart(2, "0"));
      if (!motionOK) { digit.textContent = label; return; }
      animate(digit, { transform: `translateY(${down ? -100 : 100}%)`, opacity: 0 }, { duration: 0.25, ease: [0.7, 0, 0.84, 0] })
        .then(() => {
          digit.textContent = label;
          animate(digit, { transform: [`translateY(${down ? 100 : -100}%)`, "translateY(0%)"], opacity: [0, 1] }, { duration: 0.6, ease: EXPO });
        });
    }, { margin: "-45% 0px -45% 0px" }));
  }

  /* ---------- Shop ---------- */
  const Shop = (function () {
    const CATEGORY_ORDER = ["earrings", "necklaces", "rings", "brooches"];
    const COLLECTIONS = { "flower-power": "FLOWER POWER", chaos: "CHAOS", tasyan: "TASYAN" };
    const state = { category: "all", collection: "all" };
    const asset = (u) => encodeURI(/^https?:/.test(u) ? u : "../" + u);
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const img = (u, alt, cls = "") => `<img class="${cls}" src="${esc(asset(u))}" alt="${esc(alt)}" loading="lazy" decoding="async" onerror="this.parentElement.classList.add('is-broken');this.remove()">`;
    const price = (irr) => `${num(Math.round(irr / 10))} ${t("shop.currency")}`;
    const meta = (p) => [t("cat." + p.category)].concat(p.collection ? [`<span lang="en">${COLLECTIONS[p.collection]}</span>`] : []).join(" · ");
    const grid = $(".grid");
    let gridSeen = false;

    function counts(dim, other) {
      const c = {};
      products.forEach((p) => {
        if (state[other] !== "all" && p[other] !== state[other]) return;
        if (p[dim]) c[p[dim]] = (c[p[dim]] || 0) + 1;
      });
      return c;
    }

    function placePill(group, animated) {
      let pillEl = $(".chips__pill", group);
      if (!pillEl) { pillEl = document.createElement("i"); pillEl.className = "chips__pill"; group.prepend(pillEl); }
      const on = $(".chip.is-on", group);
      if (!on) return;
      const box = { x: on.offsetLeft, y: on.offsetTop, width: on.offsetWidth, height: on.offsetHeight };
      if (hasMotion) animate(pillEl, box, animated && motionOK ? { type: "spring", stiffness: 380, damping: 32 } : { duration: 0 });
      else Object.assign(pillEl.style, { transform: `translate(${box.x}px, ${box.y}px)`, width: box.width + "px", height: box.height + "px" });
    }

    function renderChips(animated) {
      const cat = counts("category", "collection");
      const colc = counts("collection", "category");
      const chip = (dim, value, label, n) =>
        `<button type="button" class="chip${state[dim] === value ? " is-on" : ""}" data-value="${value}" aria-pressed="${state[dim] === value}"${n === 0 ? " disabled" : ""}>${label}${n != null ? ` <small>${num(n)}</small>` : ""}</button>`;
      const groups = {
        category: chip("category", "all", t("shop.all")) + CATEGORY_ORDER.map((k) => chip("category", k, t("cat." + k), cat[k] || 0)).join(""),
        collection: chip("collection", "all", t("shop.all")) + Object.keys(COLLECTIONS).map((k) => chip("collection", k, `<span lang="en">${COLLECTIONS[k]}</span>`, colc[k] || 0)).join(""),
      };
      $$(".chips").forEach((g) => {
        const old = $(".chips__pill", g);
        g.innerHTML = groups[g.dataset.filter];
        if (old) g.prepend(old);
        placePill(g, animated);
      });
    }

    function animateCards() {
      if (!motionOK) return;
      animate($$(".pcard", grid), {
        opacity: [0, 1], transform: ["translateY(40px) scale(.94)", "translateY(0px) scale(1)"], filter: ["blur(10px)", "blur(0px)"],
      }, { duration: 0.9, delay: stagger(0.05), ease: EXPO });
    }

    function renderGrid(animated) {
      const list = products.filter((p) =>
        (state.category === "all" || p.category === state.category) &&
        (state.collection === "all" || p.collection === state.collection));
      $(".shop__count").textContent = t("shop.count", list.length);
      if (!list.length) {
        grid.innerHTML = `<div class="grid__empty"><p>${t("shop.empty")}</p><button type="button" class="btn btn--glass" data-reset>${t("shop.reset")}</button></div>`;
        return;
      }
      grid.innerHTML = list.map((p) => {
        const name = p.name[lang] || p.name.fa;
        const [a, b] = p.images;
        return `<button type="button" class="pcard${p.available ? "" : " is-out"}${p.cutout ? " pcard--cutout" : ""}" data-handle="${esc(p.handle)}" data-cursor="view">
          <span class="pcard__media${a ? "" : " is-broken"}">${a ? img(a, name) : ""}${b ? img(b, "", "pcard__img--alt") : ""}${p.available ? "" : `<span class="badge">${t("shop.soldout")}</span>`}</span>
          <span class="pcard__meta">${meta(p)}</span>
          <span class="pcard__name">${esc(name)}</span>
          <span class="pcard__price">${price(p.price)}</span>
        </button>`;
      }).join("");
      if (!gridSeen && motionOK) $$(".pcard", grid).forEach((c) => (c.style.opacity = "0"));
      else if (animated) animateCards();
    }

    function renderCollections() {
      $$(".ccard[data-collection]").forEach((card) => {
        const key = card.dataset.collection;
        if (key === "all") return;
        const items = products.filter((p) => p.collection === key);
        $(".ccard__num", card).textContent = items.length ? t("col.count", items.length) : "";
        const art = $(".ccard__art", card);
        const withPhoto = items.find((p) => p.cutout) || items.find((p) => p.images.length);
        if (withPhoto && !$("img", art)) {
          art.classList.add("has-photo");
          art.insertAdjacentHTML("beforeend", img(withPhoto.images[0], ""));
        }
      });
      const floats = $(".story__floats");
      if (!floats.children.length) {
        const picks = products.filter((p) => p.cutout).slice(0, 6).filter((_, i) => i % 2 === 0).slice(0, 3);
        floats.innerHTML = picks.map((p) => `<img src="${esc(asset(p.images[0]))}" alt="" loading="lazy" decoding="async">`).join("");
      }
    }

    function render(animated) {
      renderChips(animated);
      renderGrid(animated);
      renderCollections();
      if (current && dialog.open) fill();
      const c = $("[data-products-count]");
      if (c) c.dataset.to = products.length;
    }

    $$(".chips").forEach((g) => g.addEventListener("click", (e) => {
      const b = e.target.closest(".chip");
      if (!b || b.disabled) return;
      state[g.dataset.filter] = b.dataset.value;
      render(true);
    }));
    grid.addEventListener("click", (e) => {
      if (e.target.closest("[data-reset]")) { state.category = state.collection = "all"; return render(true); }
      const card = e.target.closest(".pcard");
      if (card) open(card);
    });
    grid.addEventListener("pointermove", (e) => {
      const card = e.target.closest(".pcard");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", e.clientX - r.left + "px");
      card.style.setProperty("--my", e.clientY - r.top + "px");
    });
    if (typeof inView === "function") inView(grid, () => { if (!gridSeen) { gridSeen = true; animateCards(); } }, { amount: 0.05 });
    else gridSeen = true;
    document.addEventListener("click", (e) => {
      const link = e.target.closest("[data-collection]");
      if (!link) return;
      state.collection = link.dataset.collection;
      state.category = "all";
      render(true);
    });

    // Product dialog grows out of the card that was clicked.
    const dialog = $(".pmodal");
    const cardBox = $(".pmodal__card");
    let current = null;
    function fill() {
      const p = current;
      const name = p.name[lang] || p.name.fa;
      $(".pmodal__meta").innerHTML = meta(p);
      $(".pmodal__title").textContent = name;
      $(".pmodal__price").textContent = price(p.price);
      $(".pmodal__stock").textContent = p.available ? "" : t("shop.soldout");
      $(".pmodal__desc").textContent = p.desc[lang] || p.desc.fa;
      $(".pmodal__order").hidden = !p.available;
      dialog.classList.toggle("pmodal--cutout", !!p.cutout);
      show(0);
      $(".pmodal__thumbs").innerHTML = p.images.length > 1
        ? p.images.map((u, i) => `<button type="button" data-img="${i}" class="${i ? "" : "is-on"}">${img(u, "")}</button>`).join("")
        : "";
    }
    function show(i) {
      const main = $(".pmodal__main");
      main.className = "pmodal__main";
      main.innerHTML = current.images[i] ? img(current.images[i], current.name[lang] || current.name.fa) : "";
      $$(".pmodal__thumbs button").forEach((b) => b.classList.toggle("is-on", +b.dataset.img === i));
      if (motionOK) animate($("img", main) || main, { opacity: [0, 1], transform: ["scale(1.06)", "scale(1)"] }, { duration: 0.7, ease: EXPO });
    }
    function open(card) {
      current = products.find((p) => p.handle === card.dataset.handle);
      if (!current) return;
      fill();
      if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open", "");
      if (!motionOK) return;
      const from = card.getBoundingClientRect(), to = cardBox.getBoundingClientRect();
      const dx = from.left + from.width / 2 - (to.left + to.width / 2);
      const dy = from.top + from.height / 2 - (to.top + to.height / 2);
      const s = from.width / to.width;
      animate(cardBox, { transform: [`translate(${dx}px, ${dy}px) scale(${s})`, "translate(0px, 0px) scale(1)"], opacity: [0, 1] },
        { type: "spring", stiffness: 210, damping: 26 });
      animate($$(".pmodal__info > *"), { opacity: [0, 1], transform: ["translateY(24px)", "translateY(0px)"] },
        { duration: 0.8, delay: stagger(0.06, { startDelay: 0.15 }), ease: EXPO });
    }
    function close() {
      if (!motionOK) return dialog.close();
      animate(cardBox, { opacity: 0, transform: "translateY(30px) scale(.96)" }, { duration: 0.3, ease: [0.4, 0, 1, 1] })
        .then(() => { dialog.close(); cardBox.style.transform = ""; cardBox.style.opacity = ""; });
    }
    $(".pmodal__thumbs").addEventListener("click", (e) => { const b = e.target.closest("[data-img]"); if (b) show(+b.dataset.img); });
    $(".pmodal__close").addEventListener("click", close);
    dialog.addEventListener("click", (e) => { if (e.target === dialog) close(); });
    dialog.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
    $(".pmodal__order").addEventListener("click", () => dialog.close());
    addEventListener("resize", () => $$(".chips").forEach((g) => placePill(g, false)));

    return { render };
  })();

  /* ---------- Boot ---------- */
  $(".year").textContent = new Date().getFullYear();
  addEventListener("resize", measure);
  setLang(lang, false);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); Shop.render(false); });
  runIntro();
})();
