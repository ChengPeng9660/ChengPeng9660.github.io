const navToggle = document.querySelector(".nav-toggle");
const siteMenu = document.querySelector("#site-menu");

navToggle?.addEventListener("click", () => {
  const open = navToggle.getAttribute("aria-expanded") === "true";
  navToggle.setAttribute("aria-expanded", String(!open));
  siteMenu.classList.toggle("open", !open);
  document.body.classList.toggle("nav-open", !open);
});

siteMenu?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navToggle?.setAttribute("aria-expanded", "false");
    siteMenu.classList.remove("open");
    document.body.classList.remove("nav-open");
  });
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 680) {
    navToggle?.setAttribute("aria-expanded", "false");
    siteMenu?.classList.remove("open");
    document.body.classList.remove("nav-open");
  }
});
