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

/* Court Guidance conversation: local Nemotron + page-specific operating brief. */
(() => {
  const API = "https://api.vybn.ai";
  const form = document.getElementById("courtChatForm");
  if (!form) return;
  const input = document.getElementById("courtChatInput");
  const send = document.getElementById("courtChatSend");
  const messages = document.getElementById("chatMessages");
  const dot = document.getElementById("chatDot");
  const status = document.getElementById("chatStatus");
  const offline = document.getElementById("chatOffline");
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
  function setOnline(ok, text) {
    dot.className = `chat-dot ${ok ? "online" : "offline"}`;
    status.textContent = text;
    offline.hidden = ok;
  }
  async function health() {
    try {
      const res = await fetch(`${API}/api/health`, {signal: AbortSignal.timeout(8000)});
      if (!res.ok) throw new Error();
      setOnline(true, "local Nemotron · Court Guidance brief");
    } catch (_) { setOnline(false, "local model offline"); }
  }
  async function ask(text) {
    if (!text.trim() || busy) return;
    busy = true; send.disabled = true;
    bubble("user", text);
    history.push({role: "user", content: text});
    input.value = "";
    const answer = bubble("vybn", "Thinking…");
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
            if (data.adaptation?.status === "candidate_logged") {
              confirmed = true;
              receipt.textContent = "Captured as a private candidate gap. Review can return it to material, rules, or standards; nothing changes automatically.";
            }
          } catch (_) {}
        }
      }
      if (!full) throw new Error("No answer returned.");
      history.push({role: "assistant", content: full});
      if (!confirmed) receipt.textContent = "The answer returned, but the candidate log was not confirmed. No system change is being claimed.";
    } catch (error) {
      answer.textContent = error.message || "The local model is unavailable right now.";
      setOnline(false, "local model offline");
    } finally { busy = false; send.disabled = false; input.focus(); }
  }
  form.addEventListener("submit", event => { event.preventDefault(); ask(input.value); });
  input.addEventListener("keydown", event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); ask(input.value); } });
  document.querySelectorAll("[data-chat-prompt]").forEach(button => button.addEventListener("click", () => ask(button.dataset.chatPrompt)));
  window.addEventListener("message", event => {
    if (event.origin !== "https://vybn-co-protection.hf.space" || event.data?.type !== "court-guidance-contribution") return;
    document.getElementById("commonsReceipt").textContent = "Published as an attributed public candidate. It now waits for source review and a named return layer.";
  });
  health(); setInterval(health, 30000);
})();
