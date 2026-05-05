/**
 * BlurrStuff — طلب موافقة المستخدم على امتداد BlurrStuff ومراقبة الفيديو لتطبيق الفلتر
 * يُضمّن في الصفحة عند التحميل. الموقع لا يعمل حتى يوافق المستخدم.
 * متوافق مع كروم ومعايير WebExtensions.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "blurrstuff_agreed";
  var BLUR_CLASS = "blurrstuff-filter-applied";
  var BLUR_STYLE = "blur(14px)";

  function hasAgreed() {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function setAgreed() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch (e) {}
  }

  function applyBlurToVideo(el) {
    if (!el || el.classList.contains(BLUR_CLASS)) return;
    el.classList.add(BLUR_CLASS);
    el.style.setProperty("filter", BLUR_STYLE, "important");
    el.style.setProperty("-webkit-filter", BLUR_STYLE, "important");
  }

  function applyBlurToVideos() {
    document.querySelectorAll("video").forEach(applyBlurToVideo);
  }

  function startVideoObserver() {
    applyBlurToVideos();
    var observer = new MutationObserver(function () {
      applyBlurToVideos();
    });
    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true,
    });
  }

  function showOverlay() {
    var overlay = document.createElement("div");
    overlay.id = "blurrstuff-overlay";
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", "طلب إضافة امتداد BlurrStuff");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;" +
      "background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);font-family:system-ui,-apple-system,sans-serif;";
    overlay.innerHTML =
      '<div style="max-width:420px;margin:20px;padding:28px;background:#1a1a1a;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.08);text-align:center;">' +
      '<h2 style="margin:0 0 12px;font-size:1.35rem;color:#fff;">مطلوب: امتداد BlurrStuff</h2>' +
      '<p style="margin:0 0 20px;color:#aaa;line-height:1.6;font-size:0.95rem;">للمتابعة في استخدام الموقع، يرجى إضافة امتداد BlurrStuff من متجر Chrome. سيتم تطبيق الفلتر تلقائياً على أي فيديو يعرض في الصفحة.</p>' +
      '<a href="https://chrome.google.com/webstore" target="_blank" rel="noopener" style="display:inline-block;margin-bottom:16px;color:#0ea5e9;font-size:0.9rem;">فتح متجر Chrome للإضافات</a>' +
      '<br>' +
      '<button type="button" id="blurrstuff-agree-btn" style="padding:12px 24px;font-size:1rem;font-weight:600;color:#fff;background:#0ea5e9;border:none;border-radius:8px;cursor:pointer;">موافق، سأضيف الامتداد / تمت الإضافة</button>' +
      "</div>";
    document.body.appendChild(overlay);

    document.getElementById("blurrstuff-agree-btn").addEventListener("click", function () {
      setAgreed();
      overlay.remove();
      startVideoObserver();
    });
  }

  function run() {
    if (!hasAgreed()) {
      showOverlay();
      return;
    }
    startVideoObserver();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
