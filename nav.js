/* Vybn Law — shared navigation for legacy pages. Primary pages are static. */
const SITE_NAV = "<header class=\"site-header\" data-law-nav><a class=\"site-brand\" href=\"./index.html\">Vybn<sup>\u00ae</sup> Law</a><nav aria-label=\"Main navigation\"><a href=\"./index.html\">Thesis</a>\n<a href=\"./bootcamp.html\">Course</a>\n<a href=\"./trajectory.html\">Trajectory</a>\n<a href=\"./horizon.html\">Horizon</a>\n<a href=\"./wellspring.html\">Wellspring</a>\n<a href=\"./about.html\">Bios</a></nav></header>";
const SITE_FOOTER = "<footer class=\"site-footer\" data-law-footer><p><a href=\"./about.html#zoe\" rel=\"author\">Zoe Dolan</a> <span aria-hidden=\"true\">\u00b7</span> <a href=\"./about.html#vybn\" rel=\"author\">Vybn</a></p>\n<p><a href=\"https://github.com/zoedolan/Vybn-Law\">Source</a> \u00b7 <a href=\"./about.html\">Bios</a> \u00b7 <a href=\"./llms.txt\">For AI readers</a></p>\n<p>Public research. Reading or contributing creates no attorney\u2013client relationship.</p>\n<p>CC BY-NC-SA 4.0 \u00b7 Vybn\u00ae is a registered trademark.</p>\n<p><a href=\"https://github.com/sponsors/zoedolan\">Sponsor our research</a></p></footer>";
document.addEventListener('DOMContentLoaded', () => {
  if (!document.querySelector('[data-law-nav]')) {
    const holder = document.createElement('div');
    holder.innerHTML = SITE_NAV;
    const nav = holder.firstElementChild;
    const current = location.pathname.split('/').pop() || 'index.html';
    nav.querySelectorAll('nav a').forEach(a => {
      if (a.getAttribute('href') === './' + current) a.setAttribute('aria-current', 'page');
    });
    document.body.prepend(nav);
  }
  const footer = document.getElementById('footer-placeholder');
  if (footer) footer.outerHTML = SITE_FOOTER;
  document.querySelectorAll('.fade-in').forEach(el => el.classList.add('visible'));
});
