/* Shop: renders window.PRODUCTS with two filters (category × collection),
   fills the collection cards, and opens a product dialog. */
(function () {
  const products = window.PRODUCTS || [];
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  const CATEGORY_ORDER = ["earrings", "necklaces", "rings", "brooches"];
  const COLLECTIONS = { "flower-power": "FLOWER POWER", chaos: "CHAOS", tasyan: "TASYAN" };

  const state = { category: "all", collection: "all", lang: "fa" };
  const t = (key, n) => {
    const s = (window.I18N[state.lang] || {})[key] || key;
    return n == null ? s : s.replace("{n}", num(n));
  };
  const num = (n) => (state.lang === "fa" ? n.toLocaleString("fa-IR") : n.toLocaleString("en-US"));
  const price = (irr) => `${num(Math.round(irr / 10))} ${t("shop.currency")}`;
  const src = (url) => encodeURI(url);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // Shown when a product has no photo, or its photo fails to load.
  const PLACEHOLDER = `<svg class="ph" viewBox="0 0 300 300" aria-hidden="true">
    <circle cx="150" cy="150" r="120" fill="rgba(255,255,255,.03)"/>
    <ellipse cx="150" cy="160" rx="64" ry="64" fill="none" stroke="url(#silver)" stroke-width="10"/>
    <circle class="sparkle" cx="150" cy="96" r="12" fill="url(#stone)"/></svg>`;

  function imgTag(url, alt, cls = "") {
    return `<img class="${cls}" src="${esc(src(url))}" alt="${esc(alt)}" loading="lazy" decoding="async" onerror="this.closest('[data-media]')?.classList.add('is-broken');this.remove()">`;
  }

  function stockLabel(p) {
    if (p.stock === 0) return `<span class="badge badge--out">${t("shop.soldout")}</span>`;
    if (p.stock === 1) return `<span class="badge">${t("shop.last")}</span>`;
    return "";
  }

  function metaLine(p) {
    const parts = [t("cat." + p.category)];
    if (p.collection) parts.push(`<span lang="en">${COLLECTIONS[p.collection]}</span>`);
    return parts.join(" · ");
  }

  /* ---------- Filters ---------- */
  function counts(dim, otherDim) {
    const c = {};
    products.forEach((p) => {
      if (state[otherDim] !== "all" && p[otherDim] !== state[otherDim]) return;
      if (p[dim]) c[p[dim]] = (c[p[dim]] || 0) + 1;
    });
    return c;
  }

  function renderChips() {
    const cat = counts("category", "collection");
    const col = counts("collection", "category");
    const chip = (dim, value, label, n) => `<button type="button" class="chip${state[dim] === value ? " is-on" : ""}" data-value="${value}" aria-pressed="${state[dim] === value}"${n === 0 ? " disabled" : ""}>${label}${n != null ? ` <small>${num(n)}</small>` : ""}</button>`;

    $('[data-filter="category"]').innerHTML =
      chip("category", "all", t("shop.all")) +
      CATEGORY_ORDER.map((k) => chip("category", k, t("cat." + k), cat[k] || 0)).join("");
    $('[data-filter="collection"]').innerHTML =
      chip("collection", "all", t("shop.all")) +
      Object.keys(COLLECTIONS).map((k) => chip("collection", k, `<span lang="en">${COLLECTIONS[k]}</span>`, col[k] || 0)).join("");
  }

  $$(".chips").forEach((group) => {
    group.addEventListener("click", (e) => {
      const b = e.target.closest(".chip");
      if (!b || b.disabled) return;
      state[group.dataset.filter] = b.dataset.value;
      render();
    });
  });

  /* ---------- Grid ---------- */
  function renderGrid() {
    const list = products.filter(
      (p) => (state.category === "all" || p.category === state.category) &&
             (state.collection === "all" || p.collection === state.collection)
    );
    $(".shop__count").textContent = t("shop.count", list.length);
    const grid = $(".grid");
    if (!list.length) {
      grid.innerHTML = `<div class="grid__empty"><p>${t("shop.empty")}</p><button type="button" class="btn btn--ghost" data-reset>${t("shop.reset")}</button></div>`;
      return;
    }
    grid.innerHTML = list.map((p, i) => {
      const name = p.name[state.lang] || p.name.fa;
      const [a, b] = p.images;
      return `<button type="button" class="pcard${p.stock === 0 ? " is-out" : ""}" data-handle="${esc(p.handle)}" data-cursor="view" style="--i:${i}">
        <span class="pcard__media${a ? "" : " is-broken"}" data-media>
          ${PLACEHOLDER}
          ${a ? imgTag(a, name, "pcard__img") : ""}
          ${b ? imgTag(b, "", "pcard__img pcard__img--alt") : ""}
          ${stockLabel(p)}
        </span>
        <span class="pcard__meta">${metaLine(p)}</span>
        <span class="pcard__name">${esc(name)}</span>
        <span class="pcard__price">${price(p.price)}</span>
      </button>`;
    }).join("");
  }

  $(".grid").addEventListener("click", (e) => {
    if (e.target.closest("[data-reset]")) {
      state.category = state.collection = "all";
      return render();
    }
    const card = e.target.closest(".pcard");
    if (card) openProduct(card.dataset.handle);
  });

  /* ---------- Collection cards ---------- */
  function renderCollections() {
    $$(".card--collection").forEach((card, i) => {
      const key = card.dataset.collection;
      const items = products.filter((p) => p.collection === key);
      card.querySelector(".card__num").textContent = items.length ? t("col.count", items.length) : "";
      const withPhoto = items.find((p) => p.images.length);
      const art = card.querySelector(".card__art");
      if (withPhoto && !art.querySelector("img")) {
        art.setAttribute("data-media", "");
        art.insertAdjacentHTML("beforeend", imgTag(withPhoto.images[0], "", "card__photo"));
      }
    });
  }

  document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-collection]");
    if (!link) return;
    state.collection = link.dataset.collection;
    state.category = "all";
    render();
  });

  /* ---------- Product dialog ---------- */
  const dialog = $(".pmodal");
  let current = null;

  function openProduct(handle) {
    current = products.find((p) => p.handle === handle);
    if (!current) return;
    fillDialog();
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function fillDialog() {
    const p = current;
    const name = p.name[state.lang] || p.name.fa;
    $(".pmodal__meta").innerHTML = metaLine(p);
    $(".pmodal__title").textContent = name;
    $(".pmodal__price").textContent = price(p.price);
    $(".pmodal__stock").textContent =
      p.stock === 0 ? t("shop.soldout") : p.stock === 1 ? t("shop.last") : p.stock ? t("shop.instock", p.stock) : "";
    $(".pmodal__desc").textContent = p.desc[state.lang] || p.desc.fa;
    $(".pmodal__order").hidden = p.stock === 0;
    showImage(0);
    $(".pmodal__thumbs").innerHTML = p.images.length > 1
      ? p.images.map((u, i) => `<button type="button" data-img="${i}" class="${i ? "" : "is-on"}" data-media>${imgTag(u, "")}</button>`).join("")
      : "";
  }

  function showImage(i) {
    const url = current.images[i];
    const main = $(".pmodal__main");
    main.className = "pmodal__main" + (url ? "" : " is-broken");
    main.setAttribute("data-media", "");
    main.innerHTML = PLACEHOLDER + (url ? imgTag(url, current.name[state.lang] || current.name.fa) : "");
    $$(".pmodal__thumbs button").forEach((b) => b.classList.toggle("is-on", +b.dataset.img === i));
  }

  $(".pmodal__thumbs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-img]");
    if (b) showImage(+b.dataset.img);
  });
  $(".pmodal__close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
  $(".pmodal__order").addEventListener("click", () => dialog.close());

  /* ---------- Render ---------- */
  function render() {
    renderChips();
    renderGrid();
    renderCollections();
    if (current && dialog.open) fillDialog();
    $(".pmodal__close").setAttribute("aria-label", t("shop.close"));
    const count = $("[data-products-count]");
    if (count) count.dataset.to = products.length;
  }

  window.Shop = {
    setLang(lang) { state.lang = lang; render(); },
  };
})();
