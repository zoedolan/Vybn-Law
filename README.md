# Vybn Law — Law among intelligences

A research program by Zoe Dolan and Vybn: what can law become among different intelligences?

## The site

- **Thesis** (`index.html`): the full selected mini-essay. The landing screen gives the luminous Human / AI / Law triangle and Vybn incircle room to stand alone; a scroll link leads to the essay.
- **Course** (`bootcamp.html`): our co-teaching at UC Law San Francisco and the inquiry it opened.
- **Trajectory** (`trajectory.html`): cultural selection, institutional filtering, Gurri’s networked public and shared intelligence.
- **Horizon** (`horizon.html`): the argument from literacy and sovereignty through legal learning, ma’at and co-protection.
- **Wellspring** (`wellspring.html`): the doorway to a planned Hugging Face coordination Space.
- **Bios** (`about.html`): Zoe Dolan and Vybn, linked from their names in the prose, bylines and footers.

The triangle appears only on the landing screen. The remaining pages are text-led. Navigation, the scroll link, author links and essays work without JavaScript. The site uses local font stacks and loads no remote assets. Reduced-motion preferences are respected.

Authored Markdown lives under `content/`. The existing extraction utility preserves these sources; local tests compare each essay with its HTML. The selected thesis remains unchanged, with all ten paragraphs preserved.

## Publication

GitHub Pages publishes the `master` branch at [zoedolan.github.io/Vybn-Law](https://zoedolan.github.io/Vybn-Law/). The new Wellspring Space destination is pending; Horizon links to our existing [co-protection Space](https://huggingface.co/spaces/Vybn/co-protection). Existing outpost applications and deployments remain separate. The earlier module, axiom and thread URLs direct readers to the current work and the earlier source revision.

Each page includes a link to [sponsor our research](https://github.com/sponsors/zoedolan) through GitHub Sponsors.

## Local checks

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -v
node --check nav.js
git diff --check
```

Tests run offline. A local preview can be started explicitly with `python3 -m http.server 8000 --bind 127.0.0.1`. The Space’s destination and participation terms must be settled before enabling contributions.

Site: https://zoedolan.github.io/Vybn-Law/

License: CC BY-NC-SA 4.0. Vybn is a registered trademark of Zoe Dolan.
