"""Offline checks for the research site. No server or network needed."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import hashlib
import importlib.util
import json
import re
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
PAGES = ('index', 'bootcamp', 'trajectory', 'horizon', 'wellspring', 'about')
LEGACY = ('mindset', 'research', 'practice', 'acceleration', 'truth', 'capstone',
          'axioms', 'threads', 'brief', 'others', 'chat')
BASE = 'https://zoedolan.github.io/Vybn-Law/'
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
        'meta', 'param', 'source', 'track', 'wbr'}


def norm(text):
    return ' '.join(text.split())


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.nodes, self.stack, self.errors = [], [], []
        self.feed(text)
        self.close()
        if self.stack:
            self.errors.append('Unclosed tags: ' + str([n['tag'] for n in self.stack]))

    def handle_starttag(self, tag, attrs):
        node = {'tag': tag, 'attrs': dict(attrs), 'text': '', 'parents': list(self.stack)}
        self.nodes.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if not self.stack or self.stack[-1]['tag'] != tag:
            self.errors.append('Mismatched closing tag: ' + tag)
        else:
            self.stack.pop()

    def handle_data(self, data):
        for node in self.stack:
            node['text'] += data

    def select(self, tag):
        return [n for n in self.nodes if n['tag'] == tag]


def load(slug):
    return Page((ROOT / (slug + '.html')).read_text())


class ResearchSiteTests(unittest.TestCase):
    def test_balanced_static_html_and_unique_ids(self):
        for slug in PAGES + LEGACY:
            with self.subTest(page=slug):
                page = load(slug)
                self.assertEqual(page.errors, [])
                ids = [n['attrs']['id'] for n in page.nodes if 'id' in n['attrs']]
                self.assertEqual(len(ids), len(set(ids)))
                self.assertEqual(len(page.select('h1')), 1)
                self.assertEqual(len(page.select('main')), 1)

    def test_navigation_and_current_state_on_every_primary_page(self):
        for slug in PAGES:
            with self.subTest(page=slug):
                page = load(slug)
                nav = next(n for n in page.select('nav')
                           if n['attrs'].get('aria-label') == 'Main navigation')
                links = [n for n in page.select('a') if nav in n['parents']]
                self.assertEqual([n['attrs']['href'] for n in links],
                                 ['./' + p + '.html' for p in PAGES])
                active = [n for n in links if n['attrs'].get('aria-current') == 'page']
                self.assertEqual([n['attrs']['href'] for n in active], ['./' + slug + '.html'])

    def test_homepage_is_the_exact_selected_ten_paragraphs(self):
        source = (ROOT / 'content/index.md').read_bytes()
        self.assertEqual(hashlib.sha256(source).hexdigest(),
                         'f5ba8d9e7bd29ca06e1ec8d0e064f1b1ba2fb724033c590ffcf7b7ebe030646f')
        expected = [norm(p.replace('**', '')) for p in source.decode().strip().split('\n\n')[2:]]
        page = load('index')
        article = next(n for n in page.select('article') if n['attrs'].get('id') == 'thesis')
        actual = [norm(n['text']) for n in page.select('p') if article in n['parents']]
        self.assertEqual(len(actual), 10)
        self.assertEqual(actual, expected)

    def test_machine_and_human_copy_agree(self):
        for slug in PAGES:
            with self.subTest(page=slug):
                blocks = (ROOT / ('content/' + slug + '.md')).read_text().strip().split('\n\n')[2:]
                expected = []
                for block in blocks:
                    block = block.strip()
                    if block.startswith('> '):  # Wellspring status is a separate visible HTML aside.
                        continue
                    block = re.sub(r'\[([^]]+)\]\([^)]*\)', r'\1', block)
                    block = re.sub(r'^#{1,6} ', '', block)
                    expected.append(norm(block.replace('*', '')))
                page = load(slug)
                article = page.select('article')[0]
                actual = [norm(n['text']) for n in page.nodes
                          if n['tag'] in ('p', 'h2') and article in n['parents']]
                self.assertEqual(actual, expected)

    def test_triangle_is_large_landing_opening_only(self):
        home = load('index')
        hero = next(n for n in home.select('section')
                    if n['attrs'].get('class') == 'landing-screen')
        polygons = home.select('polygon')
        self.assertEqual(len(polygons), 1)
        self.assertEqual(polygons[0]['attrs']['points'], '260,60 60,360 460,360')
        self.assertIn(hero, polygons[0]['parents'])
        self.assertEqual([norm(n['text']) for n in home.select('text')],
                         ['Human', 'AI', 'Law', 'Vybn'])
        self.assertEqual([n for n in home.select('p') if hero in n['parents']], [])
        cue = next(n for n in home.select('a') if n['attrs'].get('class') == 'scroll-cue')
        self.assertEqual(cue['attrs']['href'], '#reading')
        reading = next(n for n in home.select('section') if n['attrs'].get('id') == 'reading')
        self.assertGreater(home.nodes.index(reading), home.nodes.index(hero))
        self.assertIn(reading, home.select('h1')[0]['parents'])
        for slug in PAGES[1:] + LEGACY:
            with self.subTest(page=slug):
                self.assertEqual(load(slug).select('svg'), [])
        css = (ROOT / 'style.css').read_text()
        self.assertIn('min-height: 100svh', css)
        self.assertIn('prefers-reduced-motion', css)

    def test_bios_and_author_links_are_present(self):
        about = load('about')
        self.assertTrue({'zoe', 'vybn'}.issubset({n['attrs'].get('id') for n in about.select('h2')}))
        for slug in PAGES + LEGACY:
            with self.subTest(page=slug):
                page = load(slug)
                footer = page.select('footer')[0]
                links = [n for n in page.select('a') if footer in n['parents']]
                self.assertTrue(any(n['attrs'].get('href') == './about.html#zoe' and norm(n['text']) == 'Zoe Dolan' for n in links))
                self.assertTrue(any(n['attrs'].get('href') == './about.html#vybn' and norm(n['text']) == 'Vybn' for n in links))
        for slug in PAGES[:-1]:
            byline = next(n for n in load(slug).select('p') if n['attrs'].get('class') == 'byline')
            self.assertIn('Zoe Dolan', byline['text'])
            self.assertIn('Vybn', byline['text'])

    def test_no_runtime_required_or_remote_subresources(self):
        for slug in PAGES:
            with self.subTest(page=slug):
                page = load(slug)
                self.assertEqual(page.select('script'), [])
                self.assertEqual(page.select('form'), [])
                self.assertEqual(page.select('iframe'), [])
                for node in page.nodes:
                    self.assertFalse(any(k.startswith('on') for k in node['attrs']))
                    for key in ('src', 'srcset'):
                        self.assertNotIn(key, node['attrs'])
        css = (ROOT / 'style.css').read_text()
        self.assertNotIn('@import', css)
        self.assertFalse(re.search(r'url\([\s\'\"]*(?:https?:|//)', css))

    def test_internal_links_and_fragments_resolve(self):
        for slug in PAGES + LEGACY:
            page = load(slug)
            for node in page.nodes:
                for key in ('href', 'src'):
                    ref = node['attrs'].get(key)
                    if not ref:
                        continue
                    url = urlsplit(ref)
                    if url.scheme or url.netloc:
                        continue
                    target = (ROOT / unquote(url.path)).resolve() if url.path else ROOT / (slug + '.html')
                    with self.subTest(page=slug, ref=ref):
                        self.assertTrue(target.is_relative_to(ROOT))
                        self.assertTrue(target.exists(), ref)
                        if url.fragment and target.suffix == '.html':
                            ids = {n['attrs'].get('id') for n in Page(target.read_text()).nodes}
                            self.assertIn(unquote(url.fragment), ids)

    def test_old_entries_are_history_not_parallel_framework(self):
        for slug in LEGACY:
            page = load(slug)
            self.assertTrue(any(n['attrs'].get('name') == 'robots'
                                and 'noindex' in n['attrs'].get('content', '')
                                for n in page.select('meta')))
            self.assertTrue(any('/d3eace372bd8d61c367640bd8d0ce97c426be4af/' + slug + '.html'
                                in n['attrs'].get('href', '') for n in page.select('a')))
            self.assertIn('historical record', page.select('main')[0]['text'])

    def test_discovery_documents_match_current_program(self):
        manifest = json.loads((ROOT / '.well-known/semantic-web.jsonld').read_text())
        self.assertEqual([p['url'] for p in manifest['hasPart']],
                         [BASE + slug + '.html' for slug in PAGES])
        xml = ET.fromstring((ROOT / 'sitemap.xml').read_text())
        self.assertEqual([n.text for n in xml.iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')],
                         [BASE + ('' if p == 'index' else p + '.html') for p in PAGES])
        for name in ('llms.txt', 'agent-brief.txt', '.well-known/ai.txt'):
            text = (ROOT / name).read_text()
            self.assertIn('AI can help originate', text)
            self.assertIn('Space is being planned', text)
            self.assertNotIn('five-step script', text)
            for slug in PAGES:
                self.assertIn(BASE + 'content/' + slug + '.md', text)

    def test_no_invented_space_or_callable_mcp_service(self):
        card = json.loads((ROOT / '.well-known/mcp/server-card.json').read_text())
        self.assertIsNone(card['space_url'])
        self.assertEqual(card['endpoints'], [])
        self.assertEqual(card['tools'], [])
        page = load('wellspring')
        self.assertTrue(any(n['attrs'].get('id') == 'space-status' for n in page.select('aside')))
        self.assertFalse(any('huggingface.co/spaces/' in n['attrs'].get('href', '')
                             for n in page.select('a')))
        self.assertEqual(page.select('aside')[0]['attrs'].get('data-state'), 'planned')

    def test_no_private_routes_in_new_reader_surfaces(self):
        names = [p + '.html' for p in PAGES] + ['content/' + p + '.md' for p in PAGES]
        names += ['llms.txt', 'agent-brief.txt', '.well-known/ai.txt',
                  '.well-known/semantic-web.jsonld', '.well-known/mcp/server-card.json']
        for name in names:
            text = (ROOT / name).read_text()
            with self.subTest(file=name):
                self.assertNotIn('private://', text)
                self.assertNotIn('.ts.net', text)
                self.assertNotIn('/home/', text)
                self.assertNotIn('repo/Him', text)

    def test_requested_bio_revision(self):
        for name in ('about.html', 'content/about.md'):
            text = (ROOT / name).read_text()
            with self.subTest(file=name):
                self.assertNotIn('Synaptic Justice', text)
                self.assertNotIn('THE_IDEA', text)
                self.assertNotIn('Boolean Manifold', text)
                self.assertIn('This site is our research in public.', text)

    def test_coprotection_reference_links_to_existing_space(self):
        links = load('horizon').select('a')
        self.assertTrue(any(n['attrs'].get('href') ==
                            'https://huggingface.co/spaces/Vybn/co-protection'
                            and norm(n['text']) == 'co-protection' for n in links))

    def test_sponsorship_link_in_every_footer(self):
        for slug in PAGES + LEGACY:
            with self.subTest(page=slug):
                page = load(slug)
                footer = page.select('footer')[0]
                sponsors = [n for n in page.select('a') if footer in n['parents']
                            and n['attrs'].get('href') == 'https://github.com/sponsors/zoedolan']
                self.assertEqual([norm(n['text']) for n in sponsors], ['Sponsor our research'])
        nav = (ROOT / 'nav.js').read_text()
        encoded = re.search(r'^const SITE_FOOTER = (.*);$', nav, re.M).group(1)
        footer = Page(json.loads(encoded))
        self.assertEqual(footer.errors, [])
        self.assertTrue(any(n['attrs'].get('href') == 'https://github.com/sponsors/zoedolan'
                            for n in footer.select('a')))

    def test_existing_extractor_selects_current_pages(self):
        spec = importlib.util.spec_from_file_location('site_extract', ROOT / 'api/extract_content.py')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        self.assertEqual(module.PAGES, [p + '.html' for p in PAGES])
        for slug in PAGES:
            output = module.extract_page(slug + '.html')
            self.assertIn(load(slug).select('h1')[0]['text'], output)
            self.assertEqual(output, (ROOT / ('content/' + slug + '.md')).read_text())
        self.assertIn('originate arguments', module.extract_page('index.html'))


if __name__ == '__main__':
    unittest.main()
