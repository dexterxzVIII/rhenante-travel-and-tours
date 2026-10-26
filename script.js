/* ===== EDIT HERE: your tours and prices (PHP) ===== */
const TOURS = {
  "island-hopping": {
    name: "Island Hopping Tour",
    desc: "Visit nearby islands by boat with swimming and snorkeling stops. [EDIT THIS]",
    duration: "6 hours",
    includes: "boat, guide, snorkel gear [EDIT THIS]",
    img: "https://placehold.co/600x400?text=Island+Hopping", // replace with images/island-hopping.jpg
    adult: 1500, child: 1000
  },
  "waterfalls": {
    name: "Waterfalls and Nature Trek",
    desc: "Hike to local waterfalls with a guide and a swim stop. [EDIT THIS]",
    duration: "5 hours",
    includes: "guide, entrance fees [EDIT THIS]",
    img: "https://placehold.co/600x400?text=Waterfalls",
    adult: 1200, child: 800
  },
  "beach-day": {
    name: "Beach Day Package",
    desc: "A full day at a beach with lunch and a relaxing setup. [EDIT THIS]",
    duration: "Full day",
    includes: "transport, lunch, cottage [EDIT THIS]",
    img: "https://placehold.co/600x400?text=Beach+Day",
    adult: 1800, child: 1200
  },
  "overnight": {
    name: "Overnight Stay Package",
    desc: "Two days and one night with accommodation and island activities. [EDIT THIS]",
    duration: "2 days, 1 night",
    includes: "accommodation, meals, guide [EDIT THIS]",
    img: "https://placehold.co/600x400?text=Overnight",
    adult: 3500, child: 2500
  }
};

/* ===== EDIT HERE: contact and form settings ===== */
const FORM_ENDPOINT = "https://formspree.io/f/xjyyykjp"; // get this from formspree.io
const MESSENGER_LINK = "https://m.me/YOUR_PAGE_USERNAME";
const WHATSAPP_NUMBER = "639606054860"; // country code, no plus sign
const VIBER_NUMBER = "639606054860";
const FB_APP_ID = "YOUR_FB_APP_ID"; // only needed for the Messenger share button

/* ===== Code below: no need to edit ===== */
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const peso = n => "PHP " + n.toLocaleString("en-PH");
const todayISO = () => new Date().toLocaleDateString("en-CA");

const form = $("#booking-form");
const el = form.elements;
const grid = $("#tour-grid");

// Build tour cards and the dropdown from TOURS
grid.innerHTML = Object.entries(TOURS).map(([id, t]) => `
  <article class="card">
    <img src="${t.img}" alt="${t.name} photo" loading="lazy">
    <div class="card-body">
      <h3>${t.name}</h3>
      <p>${t.desc}</p>
      <ul class="meta"><li>Duration: ${t.duration}</li><li>Includes: ${t.includes}</li></ul>
      <p class="price">Starts at ${peso(t.adult)} per adult</p>
      <button class="btn btn-primary book-btn" data-tour="${id}">Book this tour</button>
      <div class="share">
        <button data-share="facebook">Facebook</button>
        <button data-share="messenger">Messenger</button>
        <button data-share="copy">Copy link</button>
      </div>
    </div>
  </article>`).join("");

el.tour.innerHTML = `<option value="">Choose a tour</option>` +
  Object.entries(TOURS).map(([id, t]) => `<option value="${id}">${t.name}</option>`).join("");

el.date.min = todayISO();
$("#year").textContent = new Date().getFullYear();

// Toast message
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}

// Copy text, with a fallback for browsers that block clipboard access
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    window.prompt("Copy this text:", text);
    return false;
  }
}

// Price estimate
function estimate() {
  const t = TOURS[el.tour.value];
  const adults = +el.adults.value || 0;
  const children = +el.children.value || 0;
  const box = $("#estimate");
  if (!t || adults < 1) {
    box.textContent = "Choose a tour and number of adults to see an estimate.";
    return;
  }
  const total = t.adult * adults + t.child * children;
  box.textContent = `Estimated total: ${peso(total)} (pending confirmation)`;
}
form.addEventListener("input", estimate);
form.addEventListener("change", estimate);

// Validation
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

// Form submission
form.addEventListener("submit", async e => {
  e.preventDefault();
  const status = $("#form-status");
  if (!validate()) {
    status.className = "form-status";
    status.textContent = "";
    return;
  }
  if (FORM_ENDPOINT.includes("https://formspree.io/f/xjyyykjp")) {
    status.className = "form-status error";
    status.textContent = "The booking form is not connected yet. Add your Formspree ID in script.js.";
    return;
  }
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true;
  btn.textContent = "Sending...";
  try {
    const res = await fetch(FORM_ENDPOINT, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" }
    });
    if (!res.ok) throw new Error("Request failed");
    form.reset();
    el.date.min = todayISO();
    estimate();
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

// Message text used by the Messenger, WhatsApp, and Viber buttons
function bookingMessage() {
  const t = TOURS[el.tour.value];
  return `Hi! I'd like to book a tour.
Tour: ${t ? t.name : "(not chosen yet)"}
Date: ${el.date.value || "(not chosen)"}
Adults: ${el.adults.value || 0}, Children: ${el.children.value || 0}
Pick-up: ${el.pickup.value || "(not given)"}
Name: ${el.fullname.value || "(not given)"}`;
}

$$("[data-book]").forEach(btn => btn.addEventListener("click", async () => {
  const msg = bookingMessage();
  const kind = btn.dataset.book;
  if (kind === "messenger") {
    await copyText(msg);
    toast("Message copied. Paste it into Messenger.");
    window.open(MESSENGER_LINK, "_blank", "noopener");
  }
  if (kind === "whatsapp") {
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
  }
  if (kind === "viber") {
    await copyText(msg);
    toast("Message copied. Paste it into Viber.");
    window.open(`viber://chat?number=${encodeURIComponent(VIBER_NUMBER)}`);
  }
}));

// Tour card buttons: "Book this tour" and share buttons
function shareTo(kind) {
  const page = location.href.split("#")[0];
  const url = encodeURIComponent(page);
  if (kind === "facebook") {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank", "noopener");
  }
  if (kind === "messenger") {
    window.open(`https://www.facebook.com/dialog/send?link=${url}&app_id=${FB_APP_ID}&redirect_uri=${url}`, "_blank", "noopener");
  }
  if (kind === "copy") {
    copyText(page).then(() => toast("Link copied!"));
  }
}

grid.addEventListener("click", e => {
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

// Mobile menu
const header = $(".site-header");
const menuBtn = $(".menu-btn");
menuBtn.addEventListener("click", () => {
  const open = header.classList.toggle("open");
  menuBtn.setAttribute("aria-expanded", open);
});
$$(".site-header nav a").forEach(a => a.addEventListener("click", () => header.classList.remove("open")));
