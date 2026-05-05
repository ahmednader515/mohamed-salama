/**
 * BlurrStuff — Content Script (WebExtensions)
 * يراقب عناصر الفيديو في الصفحة ويطبق الفلتر فور ظهورها.
 */
(function () {
  "use strict";

  const BLUR_CLASS = "blurrstuff-filter-applied";
  const BLUR_CSS = "blur(14px)";

  function applyBlur(el) {
    if (!el || el.classList.contains(BLUR_CLASS)) return;
    el.classList.add(BLUR_CLASS);
    el.style.setProperty("filter", BLUR_CSS, "important");
    el.style.setProperty("-webkit-filter", BLUR_CSS, "important");
  }

  function applyToAllVideos() {
    document.querySelectorAll("video").forEach(applyBlur);
  }

  applyToAllVideos();

  const observer = new MutationObserver(() => {
    applyToAllVideos();
  });

  observer.observe(document.documentElement || document.body, {
    childList: true,
    subtree: true,
  });
})();
