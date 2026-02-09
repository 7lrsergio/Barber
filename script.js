/* ============================================
   MARC KEVEN BARBER SHOP - JavaScript
   ============================================
   Handles all interactivity:
   1. Header background change on scroll
   2. Mobile menu open/close
   3. Scroll reveal animations (Lite Mode aware)
   4. Smooth scrolling for anchor links (Lite Mode aware)
   5. Map: load iframe only on good connection, otherwise show fallback image
   ============================================ */

/* ============================================
   0. LITE MODE + NETWORK DETECTION
   ============================================ */

// Network Information API (not supported everywhere, so we guard it)
const connection =
  navigator.connection || navigator.mozConnection || navigator.webkitConnection;

// Lite Mode: Data Saver enabled
const isLiteMode = !!(connection && connection.saveData);

// Poor network: cellular OR slow effectiveType
let isPoorNetwork = false;
if (connection) {
  const type = connection.type || ""; // "wifi", "cellular", etc (not always available)
  const effective = connection.effectiveType || ""; // "4g", "3g", "2g", "slow-2g"
  if (type === "cellular" || ["slow-2g", "2g", "3g"].includes(effective)) {
    isPoorNetwork = true;
  }
}

/* ============================================
   1. HEADER SCROLL EFFECT
   ============================================ */

const header = document.getElementById("header");

function handleScroll() {
  if (!header) return;
  if (window.scrollY > 60) header.classList.add("scrolled");
  else header.classList.remove("scrolled");
}

window.addEventListener("scroll", handleScroll, { passive: true });
handleScroll();

/* ============================================
   2. MOBILE MENU
   ============================================ */

const mobileMenu = document.getElementById("mobile-menu");
const openBtn = document.getElementById("menu-open-btn");
const closeBtn = document.getElementById("menu-close-btn");
const menuOverlay = document.getElementById("menu-overlay");
const menuLinks = document.querySelectorAll(".menu-link");

function openMenu() {
  if (!mobileMenu) return;
  mobileMenu.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeMenu() {
  if (!mobileMenu) return;
  mobileMenu.classList.remove("open");
  document.body.style.overflow = "";
}

if (openBtn) openBtn.addEventListener("click", openMenu);
if (closeBtn) closeBtn.addEventListener("click", closeMenu);
if (menuOverlay) menuOverlay.addEventListener("click", closeMenu);

menuLinks.forEach((link) => link.addEventListener("click", closeMenu));

/* ============================================
   3. SCROLL REVEAL ANIMATIONS (Lite Mode aware)
   ============================================ */

const revealElements = document.querySelectorAll(".reveal");

// If Lite Mode OR IntersectionObserver unsupported → just show everything
if (isLiteMode || !("IntersectionObserver" in window)) {
  revealElements.forEach((el) => el.classList.add("visible"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
  );

  revealElements.forEach((el) => revealObserver.observe(el));
}

/* ============================================
   4. SMOOTH SCROLLING FOR ANCHOR LINKS (Lite Mode aware)
   ============================================ */

const anchorLinks = document.querySelectorAll('a[href^="#"]');

anchorLinks.forEach((link) => {
  link.addEventListener("click", function (e) {
    const targetId = this.getAttribute("href");
    if (!targetId || targetId === "#") return;

    const targetEl = document.querySelector(targetId);
    if (!targetEl) return;

    e.preventDefault();

    const headerHeight = header ? header.offsetHeight : 0;
    const targetPosition = targetEl.offsetTop - headerHeight;

    window.scrollTo({
      top: targetPosition,
      behavior: isLiteMode ? "auto" : "smooth",
    });
  });
});

/* ============================================
   5. MAP: ONLY LOAD IFRAME ON GOOD INTERNET
   ============================================
   HTML requirement:
   <div id="map-container"
        data-src="(google maps embed url)"
        data-img="(your fallback image url)"
        style="height:280px;"></div>

   Rules:
   - If Data Saver OR poor network (cellular / 2g/3g) → show fallback image
   - Otherwise → load google maps iframe
   ============================================ */

(function () {
  const mapContainer = document.getElementById("map-container");
  if (!mapContainer) return;

  const mapSrc = mapContainer.getAttribute("data-src");
  const imgSrc = mapContainer.getAttribute("data-img");

  const shouldLoadMap = !!mapSrc && !isLiteMode && !isPoorNetwork;

  // Clear container so it doesn't keep old content
  mapContainer.innerHTML = "";

  if (shouldLoadMap) {
    const iframe = document.createElement("iframe");
    iframe.title = "Ubicación";
    iframe.src = mapSrc;
    iframe.width = "100%";
    iframe.height = "280";
    iframe.style.border = "0";
    iframe.style.display = "block";
    iframe.loading = "lazy";
    iframe.referrerPolicy = "no-referrer-when-downgrade";
    iframe.setAttribute("allowfullscreen", "");
    mapContainer.appendChild(iframe);
  } else {
    // Fallback image mode (cellular / slow / data-saver)
    if (imgSrc) {
      const img = document.createElement("img");
      img.src = imgSrc;
      img.alt = "Mapa";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      img.loading = "lazy";
      mapContainer.appendChild(img);
    } else {
      // If no fallback provided, show a simple message
      mapContainer.style.display = "flex";
      mapContainer.style.alignItems = "center";
      mapContainer.style.justifyContent = "center";
      mapContainer.textContent = "Mapa no disponible";
    }
  }
})();
