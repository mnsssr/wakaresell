const SECTIONS = [
  ["new", "Новинки"],
  ["pods", "Под-системы"],
  ["disposable", "Одноразки"],
  ["liquids", "Жидкости"],
  ["sale", "Скидки"],
];
const TG = "https://t.me/" + CONTACT.tg;
const DEFAULT_DESC =
  "Наличие, вкусы и доставку уточняйте в Telegram @" + CONTACT.tg + "!";
const ARROW =
  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

const $ = (s) => document.querySelector(s);
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
const calm = matchMedia("(prefers-reduced-motion:reduce)").matches;
const byId = (id) => PRODUCTS.find((p) => p.id === id);

function toast(t) {
  const e = $("#toast");
  e.textContent = t;
  e.classList.add("on");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => e.classList.remove("on"), 2600);
}
function discount(p) {
  const o = parseInt(p.old),
    n = parseInt(p.price);
  return o > n ? "−" + Math.round(100 - (n / o) * 100) + "%" : "";
}
function priceHtml(p) {
  return (p.old ? `<s>${esc(p.old)}</s>` : "") + esc(p.price);
}

/* ---------- каталог ---------- */
function card(p, i) {
  const tag = p.sold
    ? '<span class="tag tag--sold">Продано</span>'
    : discount(p)
      ? `<span class="tag">${discount(p)}</span>`
      : "";
  return `<button class="product-link reveal" style="--i:${i % 3}" data-id="${esc(p.id)}">
    <div class="card">
      <div class="card__image"><img src="${esc(p.cover)}" alt="${esc(p.title)}" loading="lazy" onerror="this.hidden=true">${tag}</div>
      <div class="card__content">
        <div><h4>${esc(p.title)}</h4>${p.sub ? `<p>${esc(p.sub)}</p>` : ""}<span class="price">${priceHtml(p)}</span></div>
        <span class="arrow">${ARROW}</span>
      </div>
    </div></button>`;
}
function render() {
  $("#catalog").innerHTML = SECTIONS.map(([id, name]) => {
    const list = PRODUCTS.filter((p) => p.cat === id);
    return list.length
      ? `<section class="wrap" id="${id}"><h2 class="title">${name}</h2><div class="grid">${list.map(card).join("")}</div></section>`
      : "";
  }).join("");
  watch();
}
let io;
function watch() {
  const items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window) || calm) {
    items.forEach((e) => e.classList.add("in"));
    return;
  }
  io =
    io ||
    new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { rootMargin: "0px 0px -8% 0px" },
    );
  items.forEach((e) => {
    if (!e.classList.contains("in")) io.observe(e);
  });
}

/* ---------- окно товара + карусель ---------- */
function openProduct(id) {
  const p = byId(id),
    d = $("#pd");
  const photos = p.photos && p.photos.length ? p.photos : [p.cover];
  d.innerHTML = `<button class="x" data-close aria-label="Закрыть">×</button>
  <div class="pd">
    <div class="gal">
      <div class="track" id="trk">${photos.map((s, j) => `<div class="sl"><img src="${esc(s)}" alt="${esc(p.title)}, фото ${j + 1}" ${j ? 'loading="lazy"' : ""}></div>`).join("")}</div>
      ${
        photos.length > 1
          ? `<button class="gb prev" data-g="-1" aria-label="Назад" disabled>‹</button><button class="gb next" data-g="1" aria-label="Вперёд">›</button>
      <div class="dots" id="dots">${photos.map((_, j) => `<button data-s="${j}" class="${j ? "" : "on"}" aria-label="Фото ${j + 1}"></button>`).join("")}</div>`
          : ""
      }
    </div>
    <div class="pd__info">
      <h2>${esc(p.title)}</h2>
      ${p.sub ? `<div class="pd__sub">${esc(p.sub)}</div>` : ""}
      <div class="pd__price">${priceHtml(p)}</div>
      <p class="pd__desc">${esc(p.desc || DEFAULT_DESC)}</p>
      <div class="pd__btns">
        ${p.sold ? '<button class="btn" disabled>Продано</button>' : `<button class="btn" data-buy="${esc(p.id)}">Купить сейчас</button>`}
        <a class="btn btn--ghost" href="${TG}" target="_blank" rel="noopener">Написать в Telegram</a>
      </div>
    </div>
  </div>`;
  d.showModal();
  d.scrollTop = 0;
  const k = $("#trk"),
    ds = [...d.querySelectorAll("#dots button")],
    pr = d.querySelector(".gb.prev"),
    nx = d.querySelector(".gb.next");
  if (ds.length)
    k.onscroll = () => {
      const c = Math.round(k.scrollLeft / k.clientWidth);
      ds.forEach((x, j) => x.classList.toggle("on", j === c));
      pr.disabled = c === 0;
      nx.disabled = c === ds.length - 1;
    };
}

/* ---------- заказ ---------- */
let cur = null;
function openOrder(id) {
  cur = byId(id);
  $("#pd").close();
  $("#osum").textContent =
    cur.title + (cur.sub ? ", " + cur.sub : "") + " — " + cur.price;
  $("#od").showModal();
}
$("#of").onsubmit = async (e) => {
  e.preventDefault();
  const f = new FormData(e.target),
    b = $("#osub");
  b.disabled = true;
  b.textContent = "Отправляем…";
  try {
    const r = await fetch("/.netlify/functions/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item: { title: cur.title, sub: cur.sub, price: cur.price },
        name: f.get("name"),
        contact: f.get("contact"),
        addr: f.get("addr"),
        website: f.get("website"),
      }),
    });
    if (!r.ok) {
      alert("Ошибка: " + (await r.text()));
      throw 0;
    }
    cur.sold = true;
    e.target.reset();
    $("#od").close();
    render();
    toast("Заказ отправлен. Мы свяжемся с вами в Telegram");
  } catch (x) {
    toast("Не удалось отправить. Попробуйте ещё раз");
  }
  b.disabled = false;
  b.textContent = "Отправить заказ";
};

/* ---------- события ---------- */
document.addEventListener("click", (e) => {
  const t = e.target.closest("button, a");
  if (!t) return;
  if (t.classList.contains("product-link")) openProduct(t.dataset.id);
  else if (t.dataset.g) {
    const k = $("#trk");
    k.scrollBy({ left: +t.dataset.g * k.clientWidth });
  } else if (t.dataset.s) {
    const k = $("#trk");
    k.scrollTo({ left: +t.dataset.s * k.clientWidth });
  } else if (t.dataset.buy) openOrder(t.dataset.buy);
  else if (t.hasAttribute("data-close")) $("#pd").close();
  else if (t.id === "ox") $("#od").close();
  if (t.closest("#navLinks") && t.tagName === "A") closeMenu();
});
["pd", "od"].forEach((id) =>
  $("#" + id).addEventListener("click", (e) => {
    if (e.target.id === id) e.target.close();
  }),
);
document.addEventListener("keydown", (e) => {
  const k = $("#trk");
  if (!$("#pd").open || !k) return;
  if (e.key === "ArrowRight") k.scrollBy({ left: k.clientWidth });
  if (e.key === "ArrowLeft") k.scrollBy({ left: -k.clientWidth });
});

/* меню на телефоне */
const menuBtn = $("#menuBtn"),
  navLinks = $("#navLinks");
function closeMenu() {
  navLinks.classList.remove("open");
  menuBtn.textContent = "☰";
  menuBtn.setAttribute("aria-expanded", "false");
}
menuBtn.onclick = () => {
  const o = navLinks.classList.toggle("open");
  menuBtn.textContent = o ? "✕" : "☰";
  menuBtn.setAttribute("aria-expanded", o);
};

/* подсветка раздела в меню при прокрутке */
function spy() {
  if (!("IntersectionObserver" in window)) return;
  const links = [...document.querySelectorAll(".nav-link")];
  const so = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        if (e.isIntersecting)
          links.forEach((l) =>
            l.classList.toggle(
              "active",
              l.getAttribute("href") === "#" + e.target.id,
            ),
          );
      }),
    { rootMargin: "-40% 0px -55% 0px" },
  );
  document.querySelectorAll("#catalog > section").forEach((s) => so.observe(s));
}

render();
spy();

/* ссылки на Telegram */
document.querySelectorAll(".tg-link").forEach((a) => (a.href = TG));
document
  .querySelectorAll(".tg-name")
  .forEach((e) => (e.textContent = "@" + CONTACT.tg));
})();
