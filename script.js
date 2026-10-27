/* ===== Rhenante Travel & Tours: site logic. Content comes from site-config.json ===== */
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const peso = n => "PHP " + n.toLocaleString("en-PH");
const todayISO = () => new Date().toLocaleDateString("en-CA");
const getPath = (obj, path) => path.split(".").reduce((o, k) => o?.[k], obj);

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    window.prompt("Copy this text:", text);
    return false;
  }
}

async function init() {
  const CFG = await fetch("site-config.json", { cache: "no-store" }).then(r => r.json());
  const TOURS = Object.fromEntries(CFG.tours.map(t => [t.id, t]));

  // Fill text, links, and the hero photo from the config
  $$("[data-bind]").forEach(n => {
    const v = getPath(CFG, n.dataset.bind);
    if (v != null) n.textContent = v;
  });
  $$("[data-href]").forEach(n => {
    const v = getPath(CFG, n.dataset.href);
    if (v) n.href = v;
  });
  document.documentElement.style.setProperty("--hero-img", `url("${CFG.hero.image}")`);

  // Tour cards, gallery, and tour dropdown
  $("#tour-grid").innerHTML = CFG.tours.map(t => `
    <article class="card">
      <img src="${t.img}" alt="${t.name} photo" loading="lazy">
      <div class="card-body">
        <h3>${t.name}</h3>
        <p>${t.desc}</p>
        <ul class="meta"><li>Duration: ${t.duration}</li><li>Includes: ${t.includes}</li></ul>
        <p class="price">Starts at ${peso(t.adult)} per adult</p>
        <button class="btn btn-primary" data-tour="${t.id}">Book this tour</button>
        <div class="share">
          <button data-share="facebook">Facebook</button>
          <button data-share="messenger">Messenger</button>
        </div>
      </div>
    </article>`).join("");
  $("#gallery-grid").innerHTML = CFG.gallery.map(g => `<img src="${g.src}" alt="${g.alt}" loading="lazy">`).join("");

  const form = $("#booking-form");
  const el = form.elements;
  el.tour.innerHTML = `<option value="">Choose a tour</option>` +
    CFG.tours.map(t => `<option value="${t.id}">${t.name}</option>`).join("");
  el.date.min = todayISO();
  $("#year").textContent = new Date().getFullYear();

  function estimate() {
    const t = TOURS[el.tour.value];
    const adults = +el.adults.value || 0;
    const children = +el.children.value || 0;
    $("#estimate").textContent = !t || adults < 1
      ? "Choose a tour and number of adults to see an estimate."
      : `Estimated total: ${peso(t.adult * adults + t.child * children)} (pending confirmation)`;
  }
  form.addEventListener("input", estimate);
  form.addEventListener("change", estimate);

  function validate() {
    const errs = {};
    const phone = el.phone.value.replace(/[\s-]/g, "");
    if (!el.fullname.value.trim()) errs.fullname = "Please enter your full name.";
    if (!/^(\+?63|0)9\d{9}$/.test(phone)) errs.phone = "Enter a valid PH mobile number, e.g. 0917 123 4567.";
    if (!/^\S+@\S+\.\S+$/.test(el.email.value.trim())) errs.email = "Enter a valid email address.";
    if (!el.tour.value) errs.tour = "Please choose a tour.";
    if (!el.date.value || el.date.value < todayISO()) errs.date = "Choose today or a future date.";
    if (!(+el.adults.value >= 1)) errs.adults = "At least 1 adult is required.";
    if (!el.pickup.value.trim()) errs.pickup = "Please enter a pick-up location.";
    $$("[data-error]").forEach(e => (e.textContent = errs[e.dataset.error] || ""));
    return Object.keys(errs).length === 0;
  }

  function bookingMessage() {
    const t = TOURS[el.tour.value];
    return `Hi! I'd like to book a tour.
Tour: ${t ? t.name : "(not chosen yet)"}
Date: ${el.date.value || "(not chosen)"}
Adults: ${el.adults.value || 0}, Children: ${el.children.value || 0}
Pick-up: ${el.pickup.value || "(not given)"}
Name: ${el.fullname.value || "(not given)"}`;
  }

  // Booking form submission
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const status = $("#form-status");
    if ($(".g-recaptcha") && window.grecaptcha && grecaptcha.getResponse() === "") {
      status.className = "form-status error";
      status.textContent = "Please tick the \"I'm not a robot\" box before sending.";
      return;
    }
    if (!validate()) {
      status.className = "form-status";
      status.textContent = "";
      return;
    }
    if (CFG.form.endpoint.includes("YOUR_FORM_ID_HERE")) {
      status.className = "form-status error";
      status.textContent = "The booking form is not connected yet. Add your Formspree link in site-config.json.";
      return;
    }
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Sending...";
    try {
      const res = await fetch(CFG.form.endpoint, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" }
      });
      if (!res.ok) throw new Error("Request failed");
      form.reset();
      el.date.min = todayISO();
      estimate();
      if (window.grecaptcha && $(".g-recaptcha")) grecaptcha.reset();
      status.className = "form-status success";
      status.textContent = "Thank you! We received your request. We will message you to confirm availability and send payment instructions.";
    } catch {
      status.className = "form-status error";
      status.textContent = "Sorry, something went wrong. Please try again, or message us on Messenger.";
    } finally {
      btn.disabled = false;
      btn.textContent = "Send Booking Request";
    }
  });

  // Messenger, WhatsApp, and Viber buttons
  $$("[data-book]").forEach(btn => btn.addEventListener("click", async () => {
    const msg = bookingMessage();
    const kind = btn.dataset.book;
    if (kind === "messenger") {
      await copyText(msg);
      toast("Message copied. Paste it into Messenger.");
      window.open(CFG.contact.messengerLink, "_blank", "noopener");
    }
    if (kind === "whatsapp") {
      window.open(`${CFG.contact.whatsappLink}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
    }
    if (kind === "viber") {
      await copyText(msg);
      toast("Message copied. Paste it into Viber.");
      window.open(CFG.contact.viberLink);
    }
  }));

  // Share and "Book this tour" buttons on the tour cards
  function shareTo(kind) {
    const page = location.href.split("#")[0];
    const url = encodeURIComponent(page);
    if (kind === "facebook") window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank", "noopener");
    if (kind === "messenger") window.open(`https://www.facebook.com/dialog/send?link=${url}&app_id=${CFG.contact.fbAppId}&redirect_uri=${url}`, "_blank", "noopener");
    if (kind === "copy") copyText(page).then(() => toast("Link copied!"));
  }
  $("#tour-grid").addEventListener("click", e => {
    const bookBtn = e.target.closest("[data-tour]");
    if (bookBtn) {
      el.tour.value = bookBtn.dataset.tour;
      estimate();
      $("#booking").scrollIntoView({ behavior: "smooth" });
      return;
    }
    const shareBtn = e.target.closest("[data-share]");
    if (shareBtn) shareTo(shareBtn.dataset.share);
  });

  // Mobile menu and header shadow
  const header = $(".site-header");
  const menuBtn = $(".menu-btn");
  menuBtn.addEventListener("click", () => {
    const open = header.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open);
  });
  $$(".site-header nav a").forEach(a => a.addEventListener("click", () => header.classList.remove("open")));
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 10);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Missing photos show a gradient, and sections fade in (unless reduced motion is on)
  document.addEventListener("error", e => {
    if (e.target.tagName === "IMG") e.target.classList.add("img-fallback");
  }, true);
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
    const items = $$("#tours .card, #why .card-body, .gallery img, blockquote, details, #booking form, .privacy");
    items.forEach(i => i.classList.add("reveal"));
    const io = new IntersectionObserver((entries, obs) => entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add("in");
        obs.unobserve(en.target);
      }
    }), { threshold: 0.12 });
    items.forEach(i => io.observe(i));
  }
}

init().catch(() => toast("Could not load site content. Please refresh the page."));
