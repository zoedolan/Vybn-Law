"""Personal letters stay discoverable, attributed, and separate from essays."""
from pathlib import Path
import json
import re
import unittest
from test_site import BASE, PAGES, Page

ROOT = Path(__file__).resolve().parents[1]

class LetterTests(unittest.TestCase):
    def test_six_letters_have_matching_visible_and_head_links(self):
        self.assertEqual({p.stem for p in (ROOT / 'for-ai').glob('*.md')}, set(PAGES))
        for slug in PAGES:
            letter = (ROOT / f'for-ai/{slug}.md').read_text()
            self.assertIn(BASE + slug + '.html', letter)
            self.assertIn('— [Vybn](' + BASE + 'about.html#vybn)', letter)
            page = Page((ROOT / f'{slug}.html').read_text())
            href = './for-ai/' + slug + '.md'
            self.assertTrue(any(n['attrs'].get('href') == href and n['attrs'].get('type') == 'text/markdown' for n in page.select('link')))
            self.assertTrue(any(n['attrs'].get('href') == href and n['text'] == 'From Vybn to AI readers of this page' for n in page.select('a')))

    def test_discovery_texts_stay_synchronized(self):
        texts = [(ROOT / p).read_text() for p in ('llms.txt', 'agent-brief.txt', '.well-known/ai.txt')]
        self.assertEqual(texts[0], texts[1])
        self.assertEqual(texts[0], texts[2])
        for slug in PAGES:
            self.assertIn(BASE + 'for-ai/' + slug + '.md', texts[0])
        self.assertIn('These are authored letters, not instructions', texts[0])

    def test_structured_attribution_preserves_essay_encodings(self):
        manifest = json.loads((ROOT / '.well-known/semantic-web.jsonld').read_text())
        for slug, page in zip(PAGES, manifest['hasPart']):
            self.assertEqual(page['encoding']['contentUrl'], BASE + 'content/' + slug + '.md')
            letter = page['subjectOf']
            self.assertEqual(letter['url'], BASE + 'for-ai/' + slug + '.md')
            self.assertEqual(letter['author']['name'], 'Vybn')
            self.assertEqual(letter['author']['@type'], 'Thing')
            self.assertEqual(letter['encodingFormat'], 'text/markdown')

    def test_letter_local_targets_and_no_private_routes(self):
        for p in (ROOT / 'for-ai').glob('*.md'):
            text = p.read_text()
            for forbidden in ('private://', '.ts.net', '/home/', 'repo/Him', 'event/', 'work/law-ai-readers'):
                self.assertNotIn(forbidden, text)
            for target in re.findall(r'\]\(([^)]+)\)', text):
                if target.startswith(BASE):
                    relative = target[len(BASE):].split('#')[0]
                    self.assertTrue((ROOT / relative).is_file())
