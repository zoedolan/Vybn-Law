/* Overlay bloom: opens only from the "in practice" cue — rest-hover ~750ms on
   fine pointers, click, tap, or keyboard. Esc or a click outside the panel
   closes. The page beneath never reflows. */
(() => {
  const cues = document.querySelectorAll(".more[data-overlay]");
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  let openOverlay = null;
  let restTimer = null;
  let lastFocus = null;

  function cueFor(overlay) {
    return document.querySelector('.more[data-overlay="' + overlay.id + '"]');
  }

  function open(overlay) {
    if (openOverlay === overlay) return;
    if (openOverlay) hide(openOverlay, true);
    lastFocus = document.activeElement;
    overlay.hidden = false;
    void overlay.offsetWidth; /* restart the fade */
    overlay.classList.add("on");
    document.body.style.overflow = "hidden";
    openOverlay = overlay;
    const cue = cueFor(overlay);
    if (cue) cue.setAttribute("aria-expanded", "true");
    const closeBtn = overlay.querySelector(".close");
    if (closeBtn) closeBtn.focus();
  }

  function hide(overlay, instant) {
    overlay.classList.remove("on");
    const cue = cueFor(overlay);
    if (cue) cue.setAttribute("aria-expanded", "false");
    const done = () => { overlay.hidden = true; };
    if (instant) done(); else setTimeout(done, 640);
    if (openOverlay === overlay) {
      openOverlay = null;
      document.body.style.overflow = "";
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
  }

  cues.forEach((cue) => {
    const overlay = document.getElementById(cue.dataset.overlay);
    if (!overlay) return;
    cue.addEventListener("click", () => {
      clearTimeout(restTimer);
      if (openOverlay === overlay) hide(overlay); else open(overlay);
    });
    cue.addEventListener("mouseenter", () => {
      if (!finePointer.matches) return;
      clearTimeout(restTimer);
      restTimer = setTimeout(() => open(overlay), 750);
    });
    cue.addEventListener("mouseleave", () => clearTimeout(restTimer));
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) hide(overlay);
    });
    const closeBtn = overlay.querySelector(".close");
    if (closeBtn) closeBtn.addEventListener("click", () => hide(overlay));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && openOverlay) hide(openOverlay);
  });
})();
