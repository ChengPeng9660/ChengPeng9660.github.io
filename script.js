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

const homepageViewCounter = document.querySelector("#homepage-view-counter");
const homepageViewCount = document.querySelector("#homepage-view-count");

async function loadHomepageViewCount() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch("COUNTER_ENDPOINT", {
      method: "POST",
      credentials: "omit",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("Counter unavailable");
    const data = await response.json();
    if (!Number.isSafeInteger(data.views) || data.views < 0) {
      throw new Error("Invalid page-view count");
    }
    homepageViewCount.textContent = new Intl.NumberFormat("en-US").format(data.views);
  } catch {
    homepageViewCounter.title = "Page-view count is temporarily unavailable.";
  } finally {
    clearTimeout(timeout);
  }
}

if (homepageViewCounter && homepageViewCount && window.location.origin === "https://chengpeng9660.github.io") {
  loadHomepageViewCount();
}
