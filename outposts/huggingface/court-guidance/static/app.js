window.goatcounter = {
  path: (path) => `${location.host}${path}`,
};

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

/* The loop: ask the public Court Guidance Vybn, share in the open, see what returns. */
(() => {
  const API = "";
  const form = document.getElementById("courtChatForm");
  const list = document.getElementById("returnsList");

  /* Returned: the page's own changelog, rendered from the live feed. */
  if (list) {
    fetch("/returns.json")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        list.textContent = "";
        for (const item of (data.returns || []).slice(0, 6)) {
          const li = document.createElement("li");
          const time = document.createElement("time");
          time.dateTime = item.date;
          time.textContent = new Date(item.date + "T12:00:00").toLocaleDateString(undefined, {month: "short", day: "numeric"});
          const to = document.createElement("span");
          to.className = "to";
          to.textContent = item.to;
          const p = document.createElement("p");
          p.textContent = item.change;
          li.append(time, to, p);
          list.append(li);
        }
        if (!list.children.length) {
          list.innerHTML = '<li class="returns-empty">Nothing returned yet &mdash; the first reviewed change lands here.</li>';
        }
      })
      .catch(() => { list.innerHTML = '<li class="returns-empty">The returns feed is unreachable.</li>'; });
  }

  if (!form) return;
  const input = document.getElementById("courtChatInput");
  const send = document.getElementById("courtChatSend");
  const messages = document.getElementById("chatMessages");
  const dot = document.getElementById("chatDot");
  const status = document.getElementById("chatStatus");
  const receipt = document.getElementById("chatReceipt");
  const history = [];
  const session = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36);
  let busy = false;

  function bubble(role, text = "") {
    const el = document.createElement("div");
    el.className = `live-msg ${role}`;
    el.textContent = text;
    messages.append(el);
    messages.scrollTop = messages.scrollHeight;
    return el;
  }
  function setOnline(ok, label = "") {
    dot.className = `chat-dot ${ok ? "online" : "offline"}`;
    status.textContent = ok ? (label || "online") : "reconnecting\u2026";
  }
  async function health() {
    try {
      const res = await fetch(`${API}/api/health`, {signal: AbortSignal.timeout(8000)});
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.components?.chat?.ok !== true) throw new Error();
      setOnline(true, `${data.model || "gpt-5.6-sol"} · online`);
    } catch (_) { setOnline(false); }
  }
  async function ask(text) {
    if (!text.trim() || busy) return;
    busy = true; send.disabled = true;
    bubble("user", text);
    history.push({role: "user", content: text});
    input.value = "";
    const answer = bubble("vybn", "Thinking\u2026");
    let full = "", confirmed = false;
    try {
      const res = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({message: text, conversation_history: history.slice(-20), session_id: session, context: "court-guidance"})
      });
      if (!res.ok || !res.body) throw new Error(`The conversation service returned ${res.status}.`);
      const reader = res.body.getReader(), decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, {stream: true});
        const lines = buffer.split("\n"); buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw || raw === "[DONE]") continue;
          try {
            const data = JSON.parse(raw);
            if (data.content) { full += data.content; answer.textContent = full; messages.scrollTop = messages.scrollHeight; }
            if (data.adaptation?.status === "candidate_logged") confirmed = true;
          } catch (_) {}
        }
      }
      if (!full) throw new Error("No answer returned.");
      history.push({role: "assistant", content: full});
      receipt.textContent = confirmed ? "logged for review \u2014 what survives returns below" : "";
    } catch (error) {
      answer.textContent = "Court Guidance didn't answer. It should be back shortly \u2014 try again in a moment.";
      setOnline(false);
    } finally { busy = false; send.disabled = false; input.focus(); }
  }
  form.addEventListener("submit", (event) => { event.preventDefault(); ask(input.value); });
  input.addEventListener("keydown", (event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); ask(input.value); } });
  document.querySelectorAll("[data-chat-prompt]").forEach((button) => button.addEventListener("click", () => ask(button.dataset.chatPrompt)));
  window.addEventListener("message", (event) => {
    if (event.origin !== "https://vybn-co-protection.hf.space" || event.data?.type !== "court-guidance-contribution") return;
    document.getElementById("commonsReceipt").textContent = "logged for review";
  });
  health(); setInterval(health, 10000);
})();
