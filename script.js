const menuToggle = document.querySelector(".menu-toggle");
const mobileMenu = document.querySelector(".mobile-menu");
const mobileLinks = document.querySelectorAll(".mobile-menu a");
const navLinks = document.querySelectorAll(".desktop-nav a");
const sections = document.querySelectorAll("[data-section]");
const revealItems = document.querySelectorAll(".reveal");

document.getElementById("year").textContent = new Date().getFullYear();

menuToggle?.addEventListener("click", () => {
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isOpen));
  mobileMenu.classList.toggle("open", !isOpen);
});

mobileLinks.forEach((link) => {
  link.addEventListener("click", () => {
    menuToggle.setAttribute("aria-expanded", "false");
    mobileMenu.classList.remove("open");
  });
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: "0px 0px -4% 0px" },
);

revealItems.forEach((item) => revealObserver.observe(item));

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const current = entry.target.dataset.section;
      navLinks.forEach((link) => {
        link.classList.toggle("active", link.getAttribute("href") === `#${current}`);
      });
    });
  },
  { rootMargin: "-35% 0px -55% 0px", threshold: 0 },
);

sections.forEach((section) => sectionObserver.observe(section));

const orbit = document.querySelector(".hero-orbit");
window.addEventListener(
  "scroll",
  () => {
    if (!orbit || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    orbit.style.transform = `translate3d(0, ${Math.min(window.scrollY * 0.12, 90)}px, 0)`;
  },
  { passive: true },
);
