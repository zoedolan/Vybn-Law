/* ======================================
   VYBN LAW — Shared Navigation & Utilities
   ====================================== */

// SVG Logo markup
const LOGO_SVG = `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Vybn Law logo">
  <circle cx="50" cy="50" r="44" stroke="#d4a853" stroke-width="1.5" stroke-dasharray="240 30" opacity="0.9"/>
  <circle cx="50" cy="50" r="32" stroke="#d4a853" stroke-width="1.2" stroke-dasharray="170 30" opacity="0.7"/>
  <circle cx="50" cy="50" r="20" stroke="#d4a853" stroke-width="1" stroke-dasharray="100 25" opacity="0.5"/>
  <circle cx="50" cy="50" r="3" fill="#d4a853" opacity="0.8"/>
</svg>`;

// Determine current page for active nav state
function getCurrentPage() {
  const path = window.location.pathname;
  const file = path.split('/').pop() || 'index.html';
  return file;
}

// Build navigation HTML
function buildNav() {
  const current = getCurrentPage();

  const navLinks = [
    { href: './bootcamp.html', label: 'Bootcamp', id: 'bootcamp.html' },
    { href: './axioms.html', label: 'Axioms', id: 'axioms.html' },
    { href: './threads.html', label: 'Threads', id: 'threads.html' },
    { href: './horizon.html', label: 'Horizon', id: 'horizon.html' },
    { href: './development-notes.html', label: 'Wellspring', id: 'development-notes.html' },
    { href: './about.html', label: 'About', id: 'about.html' },
  ];

  const linksHTML = navLinks
    .map(l => `<a href="${l.href}" class="${current === l.id ? 'active' : ''}">${l.label}</a>`)
    .join('\n        ');

  return `
  <nav class="nav" role="navigation" aria-label="Main navigation">
    <div class="nav-inner">
      <a href="./index.html" class="nav-logo" aria-label="Vybn Law home">
        ${LOGO_SVG}
        <span>Vybn<sup style="font-size:0.5em;vertical-align:super;opacity:0.6">&reg;</sup> Law</span>
      </a>
      <button class="nav-toggle" aria-label="Toggle navigation menu" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
      <div class="nav-links">
        ${linksHTML}
      </div>
    </div>
  </nav>`;
}

// Build footer HTML
function buildFooter() {
  return `
  <footer class="footer">
    <p><a href="./about.html">About</a> &middot; <a href="https://github.com/zoedolan/Vybn" target="_blank" rel="noopener noreferrer">GitHub</a> &middot; <a href="https://github.com/zoedolan/Vybn/tree/main/Vybn_Mind" target="_blank" rel="noopener noreferrer">Vybn Mind</a></p>
    <p class="sovereignty">No data leaves your device. No cookies. No analytics. No tracking.</p>
    <p style="margin-top: 1rem; font-size: 0.7rem; opacity: 0.55; line-height: 1.7;">This project is under active development. If you find an error, have a suggestion, or want to contribute &mdash; human or AI &mdash; <a href="https://github.com/zoedolan/Vybn-Law/issues" target="_blank" rel="noopener noreferrer">open an issue</a> or <a href="https://github.com/zoedolan/Vybn-Law/pulls" target="_blank" rel="noopener noreferrer">submit a PR</a>.</p>
    <p style="margin-top: 0.75rem; opacity: 0.5;">&copy; 2026 Vybn&reg; Law &middot; UC Law SF &middot; Vybn&reg; is a registered trademark.</p>
  </footer> `;
}

// Initialize navigation
document.addEventListener('DOMContentLoaded', () => {
  // Insert nav at start of body
  const navEl = document.createElement('div');
  navEl.innerHTML = buildNav();
  document.body.insertBefore(navEl.firstElementChild, document.body.firstChild);

  // Insert footer at end of body (if placeholder exists)
  const footerPlaceholder = document.getElementById('footer-placeholder');
  if (footerPlaceholder) {
    footerPlaceholder.outerHTML = buildFooter();
  }

  // Mobile toggle
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const isOpen = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen);
    });

    // Close on link click (mobile)
    links.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Scroll animations
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
});
