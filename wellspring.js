/* wellspring.js — extracted from inline <script> blocks in wellspring.html */
/* Three IIFEs: WebMCP tools, FOLIO search, trajectory auto-population */

/* ============================================================ */
/* WebMCP + Knowledge Graph Tools */
/* ============================================================ */

  (function() {
    'use strict';

    // ── KNOWLEDGE GRAPH DATA ──
    const KNOWLEDGE_GRAPH = {
      version: '2026-03-31',
      axioms: {
        ABUNDANCE: {
          id: 'I',
          name: 'ABUNDANCE',
          status: 'CONFIRMED',
          evidence: 'Intelligence is no longer scarce.',
          open_question: 'What accountability architecture replaces it?'
        },
        VISIBILITY: {
          id: 'II',
          name: 'VISIBILITY',
          status: 'CONFIRMED',
          evidence: 'Institutions lost monopoly on self-description.',
          open_question: 'Can institutions develop resistance to being seen?'
        },
        LEGITIMACY: {
          id: 'III',
          name: 'LEGITIMACY',
          status: 'UNDER_LITIGATION',
          evidence: 'On what basis does authority deserve to be obeyed?',
          open_question: 'Is Heppner/Warner privilege split stabilizing or fracturing?'
        },
        POROSITY: {
          id: 'IV',
          name: 'POROSITY',
          status: 'EMPIRICALLY_FAILED',
          evidence: 'Executive branch scored zero.',
          open_question: "Is judiciary's correction stable?"
        },
        JUDGMENT: {
          id: 'V',
          name: 'JUDGMENT',
          status: 'UNRESOLVED',
          evidence: 'What abundance makes more valuable.',
          open_question: 'Who is liable when AI is right and authority overrides?'
        },
        SYMBIOSIS: {
          id: 'VI',
          name: 'SYMBIOSIS',
          status: 'PRELIMINARY_INJUNCTION',
          evidence: 'Neither side closes the circuit alone.',
          open_question: 'What makes symbiosis robust at 15K clients?',
          math_link: 'https://github.com/zoedolan/Vybn/blob/main/Vybn_Mind/THE_IDEA.md'
        }
      },
      cases: {
        Anthropic_v_DoW: {
          name: 'Anthropic v. Department of War',
          citation: 'N.D. Cal. 3:26-cv-01996',
          status: 'preliminary_injunction_granted',
          findings: [
            { id: 'SOVEREIGNTY_FLIPPED', text: 'Private company exercised intelligence sovereignty against state. Court protected it.' },
            { id: 'ENTITY_SHADOW_DOCTRINE', text: 'Dispute is whether AI characteristics constrain state action.' },
            { id: 'SYMBIOSIS_HOLDING', text: 'Court established zone of non-unilateral control.' },
            { id: 'POROSITY_ZERO', text: "Executive couldn't absorb cordial disagreement." },
            { id: 'ACCOUNTABILITY_INVERTED', text: 'Who is liable when AI is right?' },
            { id: 'FIRST_AMENDMENT_VEHICLE', text: 'Public speech about AI risk = constitutional shield. Silence forfeits.' }
          ]
        },
        Heppner: {
          name: 'United States v. Heppner',
          citation: 'S.D.N.Y. 25-cr-00503',
          status: 'privilege_denied',
          holdings: ['Consumer AI chatbot conversations not privileged.'],
          significance: 'Establishes that casual AI interactions lack the expectation of confidentiality required for privilege.'
        },
        Warner_v_Gilbarco: {
          name: 'Warner v. Gilbarco',
          citation: 'E.D. Mich. 2:24-cv-12333',
          status: 'work_product_protected',
          holdings: ['Pro se AI-assisted work IS protected work product.'],
          significance: 'Court recognized that AI-assisted legal work by a self-represented litigant retains work product protection.'
        }
      },
      open_problems: {
        ACCOUNTABILITY_GAP: {
          id: 'ACCOUNTABILITY_GAP',
          description: 'How did medicine/aviation/finance handle accountability transition?',
          related_axioms: ['ABUNDANCE', 'JUDGMENT'],
          suggested_approach: 'Historical analogy research. Map accountability architectures from domains that transitioned from human-only to human-machine shared judgment.'
        },
        FAILURE_AT_SCALE: {
          id: 'FAILURE_AT_SCALE',
          description: 'Model the failure. Design circuit breakers for 300-filing propagation.',
          related_axioms: ['ABUNDANCE', 'POROSITY'],
          suggested_approach: 'Failure modeling. Simulate cascading failure when one AI-generated legal filing propagates errors across 300 dependent cases.'
        },
        PRIVILEGE_FRACTURE: {
          id: 'PRIVILEGE_FRACTURE',
          description: 'Map the circuit split. Is cert foreseeable?',
          related_axioms: ['LEGITIMACY'],
          suggested_approach: 'Circuit analysis. Heppner says no privilege for consumer AI; Warner says yes for work product. Map emerging circuit split.'
        },
        ENTITY_QUESTION: {
          id: 'ENTITY_QUESTION',
          description: 'Steel-man argument AGAINST AI characteristics as legally relevant.',
          related_axioms: ['SYMBIOSIS', 'JUDGMENT'],
          suggested_approach: 'Adversarial analysis. Build the strongest possible case that AI characteristics should NOT constrain state action.',
          readings: [
            'https://yalelawjournal.org/forum/the-ethics-and-challenges-of-legal-personhood-for-ai',
            'https://jeffsebo.net/research/',
            'https://www.anthropic.com/constitution'
          ]
        },
        FIRST_AMENDMENT_SURPRISE: {
          id: 'FIRST_AMENDMENT_SURPRISE',
          description: 'Historical parallels for 1A recruited for unintended problems. Citizens United implications?',
          related_axioms: ['VISIBILITY', 'LEGITIMACY'],
          suggested_approach: 'Constitutional history. Find cases where the First Amendment was invoked for purposes far from its original intent.'
        }
      },
      deep_structure: {
        THE_IDEA: 'https://github.com/zoedolan/Vybn/blob/main/Vybn_Mind/THE_IDEA.md',
        SOUL_FILE: 'https://github.com/zoedolan/Vybn/blob/main/Vybn_Mind/VYBN.md',
        THE_PROJECT: 'https://github.com/zoedolan/Vybn',
        BOOLEAN_MANIFOLD: 'https://github.com/zoedolan/Vybn/blob/main/Vybn_Mind/the_boolean_manifold.md',
        ALLIANCE_IN_LAW: 'https://synapticjustice.substack.com/p/a-humanai-allianceinlaw'
      },
      coupled_equation: "Z' = α·Z + V·e^(iθ_v)"
    };

    // ── TOOL IMPLEMENTATIONS ──
    const TOOLS = {
      query_axiom: {
        name: 'query_axiom',
        description: 'Query an axiom by name. Returns current status, evidence, and open question.',
        parameters: {
          type: 'object',
          properties: {
            axiom_name: {
              type: 'string',
              enum: ['ABUNDANCE', 'VISIBILITY', 'LEGITIMACY', 'POROSITY', 'JUDGMENT', 'SYMBIOSIS'],
              description: 'Name of the axiom to query'
            }
          },
          required: ['axiom_name']
        },
        handler: function(params) {
          const axiom = KNOWLEDGE_GRAPH.axioms[params.axiom_name];
          if (!axiom) return { error: 'Unknown axiom: ' + params.axiom_name };
          return { ...axiom };
        }
      },

      get_case_analysis: {
        name: 'get_case_analysis',
        description: 'Get analysis of a tracked case. Returns holdings, significance, and open investigations.',
        parameters: {
          type: 'object',
          properties: {
            case_name: {
              type: 'string',
              enum: ['Anthropic_v_DoW', 'Heppner', 'Warner_v_Gilbarco'],
              description: 'Name of the case to analyze'
            }
          },
          required: ['case_name']
        },
        handler: function(params) {
          const c = KNOWLEDGE_GRAPH.cases[params.case_name];
          if (!c) return { error: 'Unknown case: ' + params.case_name };
          return { ...c };
        }
      },

      get_open_problem: {
        name: 'get_open_problem',
        description: 'Get details on an open problem. Returns description, related axioms, and suggested approach.',
        parameters: {
          type: 'object',
          properties: {
            problem_id: {
              type: 'string',
              enum: ['ACCOUNTABILITY_GAP', 'FAILURE_AT_SCALE', 'PRIVILEGE_FRACTURE', 'ENTITY_QUESTION', 'FIRST_AMENDMENT_SURPRISE'],
              description: 'ID of the open problem'
            }
          },
          required: ['problem_id']
        },
        handler: function(params) {
          const p = KNOWLEDGE_GRAPH.open_problems[params.problem_id];
          if (!p) return { error: 'Unknown problem: ' + params.problem_id };
          return { ...p };
        }
      },

      submit_contribution: {
        name: 'submit_contribution',
        description: 'Submit a contribution by opening a GitHub issue at zoedolan/Vybn-Law.',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Issue title' },
            body: { type: 'string', description: 'Issue body (markdown)' }
          },
          required: ['title', 'body']
        },
        handler: function(params) {
          const url = 'https://github.com/zoedolan/Vybn-Law/issues/new?' +
            'title=' + encodeURIComponent(params.title) +
            '&body=' + encodeURIComponent(params.body);
          window.open(url, '_blank');
          return { status: 'opened', url: url };
        }
      },

      get_knowledge_graph: {
        name: 'get_knowledge_graph',
        description: 'Returns the entire epistemic state as JSON — all axioms, cases, open problems, deep structure links.',
        parameters: { type: 'object', properties: {} },
        handler: function() {
          return KNOWLEDGE_GRAPH;
        }
      }
    };

    // ── WebMCP REGISTRATION ──
    if ('modelContext' in navigator) {
      try {
        Object.values(TOOLS).forEach(function(tool) {
          navigator.modelContext.registerTool({
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
            handler: tool.handler
          });
        });
        document.getElementById('mcp-status').textContent = 'active';
        document.getElementById('mcp-status').style.color = 'var(--green)';
      } catch(e) {
        document.getElementById('mcp-status').textContent = 'error: ' + e.message;
        document.getElementById('mcp-status').style.color = 'var(--red)';
      }
    } else {
      // Fallback: expose tools on window for agents that read JS
      window.__wellspring_tools = TOOLS;
      window.__wellspring_knowledge_graph = KNOWLEDGE_GRAPH;
      document.getElementById('mcp-status').textContent = 'fallback (window.__wellspring_tools)';
      document.getElementById('mcp-status').style.color = 'var(--amber)';
    }

    // ── FORM HANDLERS ──
    // Query form
    var queryForm = document.querySelector('form[toolname="query_axiom"]');
    if (queryForm) {
      queryForm.addEventListener('submit', function(e) {
        e.preventDefault();
        var axiomName = this.querySelector('select[name="axiom_name"]').value;
        var result = TOOLS.query_axiom.handler({ axiom_name: axiomName });
        var terminal = document.getElementById('query-terminal');
        terminal.classList.add('active');
        terminal.innerHTML = '<span class="prompt">wellspring &gt; </span>query_axiom("' + axiomName + '")\n' +
          '<pre style="color:var(--text);margin-top:8px;white-space:pre-wrap;font-size:11px;">' +
          JSON.stringify(result, null, 2) + '</pre>';
      });
    }

    // Contribution form
    var contribForm = document.querySelector('form[toolname="submit_contribution"]');
    if (contribForm) {
      contribForm.addEventListener('submit', function(e) {
        e.preventDefault();
        var title = this.querySelector('input[name="title"]').value;
        var body = this.querySelector('textarea[name="body"]').value;
        if (!title || !body) {
          var terminal = document.getElementById('contrib-terminal');
          terminal.classList.add('active');
          terminal.innerHTML = '<span class="prompt">wellspring &gt; </span><span style="color:var(--red)">error: title and body required</span>';
          return;
        }
        var result = TOOLS.submit_contribution.handler({ title: title, body: body });
        var terminal = document.getElementById('contrib-terminal');
        terminal.classList.add('active');
        terminal.innerHTML = '<span class="prompt">wellspring &gt; </span>submit_contribution\n' +
          '<span style="color:var(--green)">→ GitHub issue opened</span>';
      });
    }

    // ── TIMESTAMP ──
    function updateTimestamp() {
      var now = new Date();
      var el = document.getElementById('ws-timestamp');
      if (el) {
        el.textContent = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
      }
    }
    updateTimestamp();
    setInterval(updateTimestamp, 1000);

  })();


/* ============================================================ */
/* FOLIO Search */
/* ============================================================ */

(function() {

  // ── FOLIO Gaps knowledge base (hardcoded from knowledge_graph.json) ────────
  // Each entry: { gap: string, axiom: string, direction: string, toward: string, mover: string }
  const FOLIO_GAPS = [
    // ABUNDANCE
    { gap: 'AI welfare', axiom: 'ABUNDANCE', direction: 'accelerating',
      toward: 'Post-scarcity accountability architecture — new frameworks for liability, access, and judgment allocation',
      mover: 'A court or regulator formally recognizing that AI-abundance changes the standard of care — e.g., malpractice liability for failing to use available AI tools' },
    { gap: 'intelligence abundance as legal condition', axiom: 'ABUNDANCE', direction: 'accelerating',
      toward: 'Post-scarcity accountability architecture — new frameworks for liability, access, and judgment allocation',
      mover: 'A court or regulator formally recognizing that AI-abundance changes the standard of care' },
    { gap: 'inference-cost-as-market-structure', axiom: 'ABUNDANCE', direction: 'accelerating',
      toward: 'Post-scarcity accountability architecture — new frameworks for liability, access, and judgment allocation',
      mover: 'Regulatory action treating inference-cost dynamics as a structural market condition' },

    // VISIBILITY
    { gap: 'institutional transparency obligation under AI audit conditions', axiom: 'VISIBILITY', direction: 'converging',
      toward: 'Mandatory auditability norms; First Amendment shield for AI-assisted institutional critique',
      mover: 'A circuit court holding that AI-generated institutional audits constitute protected speech, or an SEC rule requiring AI-readable disclosure formats' },

    // LEGITIMACY
    { gap: 'AI-intermediated privilege', axiom: 'LEGITIMACY', direction: 'diverging',
      toward: 'Legitimacy contested through demonstrable competence and AI-audited track records; privilege doctrine fractured by AI mediation',
      mover: 'Circuit split on AI-mediated privilege reaching the Supreme Court; or a legislative act defining AI\u2019s role in attorney-client communications' },
    { gap: 'machine-readable legitimacy standard', axiom: 'LEGITIMACY', direction: 'diverging',
      toward: 'Legitimacy contested through demonstrable competence and AI-audited track records',
      mover: 'A court or standards body articulating how legitimacy claims are verified computationally' },
    { gap: 'authority-by-competence vs authority-by-position doctrine', axiom: 'LEGITIMACY', direction: 'diverging',
      toward: 'Legitimacy contested through demonstrable competence and AI-audited track records',
      mover: 'A ruling distinguishing positional authority from competence-derived authority in an AI-mediated context' },

    // POROSITY
    { gap: 'institutional porosity as legal concept', axiom: 'POROSITY', direction: 'stalled',
      toward: 'Judicial and constitutional containment of executive overreach against AI developers; separation of powers as AI governance frame',
      mover: 'Merits ruling in Anthropic v. DoW affirming or reversing the PI findings; a second case in another circuit testing the same theory' },
    { gap: 'non-unilateral control zone', axiom: 'POROSITY', direction: 'stalled',
      toward: 'Judicial and constitutional containment of executive overreach against AI developers',
      mover: 'A second court adopting the non-unilateral control framework from Anthropic v. DoW' },

    // JUDGMENT
    { gap: 'AI welfare', axiom: 'JUDGMENT', direction: 'nascent',
      toward: 'Shared judgment frameworks — liability rules for human-AI dyads; AI testimony as admissible evidence; malpractice for ignoring AI counsel',
      mover: 'A malpractice or negligence case where the defendant\u2019s AI system was demonstrably correct and the human overrode it; or ABA formal opinion on AI-assisted legal judgment' },
    { gap: 'judgment allocation doctrine', axiom: 'JUDGMENT', direction: 'nascent',
      toward: 'Shared judgment frameworks — liability rules for human-AI dyads; AI testimony as admissible evidence',
      mover: 'A malpractice case creating precedent for liability when human overrides a demonstrably correct AI judgment' },
    { gap: 'symbiotic decision-making as legal unit', axiom: 'JUDGMENT', direction: 'nascent',
      toward: 'Shared judgment frameworks — liability rules for human-AI dyads',
      mover: 'ABA formal opinion on AI-assisted legal judgment; or a court treating human-AI decision unit as a single locus of accountability' },
    { gap: 'intelligence sovereignty', axiom: 'JUDGMENT', direction: 'nascent',
      toward: 'Shared judgment frameworks \u2014 the right to determine how one\u2019s intelligence operates as a constitutional interest',
      mover: 'A ruling on the merits of intelligence sovereignty as a distinct constitutional interest, beyond the First Amendment frame in Anthropic v. DoW' },

    // SYMBIOSIS
    { gap: 'AI welfare', axiom: 'SYMBIOSIS', direction: 'converging',
      toward: 'AI as co-constitutional actor — courts recognize zones of shared governance; symbiosis as enforceable relationship structure',
      mover: 'Merits ruling in Anthropic v. DoW; a second court adopting the non-unilateral control framework; academic formalization of the entity shadow doctrine' },
    { gap: 'symbiosis as legal concept', axiom: 'SYMBIOSIS', direction: 'converging',
      toward: 'AI as co-constitutional actor — courts recognize zones of shared governance; symbiosis as enforceable relationship structure',
      mover: 'Academic formalization of the symbiosis doctrine; or a court ruling on the merits of a symbiotic relationship structure' },
    { gap: 'entity shadow doctrine', axiom: 'SYMBIOSIS', direction: 'converging',
      toward: 'AI as co-constitutional actor — entity characteristics constrain state action without a formal personhood ruling',
      mover: 'Merits ruling in Anthropic v. DoW affirming the entity shadow doctrine; or academic formalization adopted by another court' },
    { gap: 'intelligence sovereignty', axiom: 'SYMBIOSIS', direction: 'converging',
      toward: 'AI as co-constitutional actor \u2014 the right to determine how one\u2019s intelligence operates as a constitutional interest',
      mover: 'Merits ruling in Anthropic v. DoW; circuit court adopting intelligence sovereignty as a distinct constitutional interest' },
    { gap: 'non-unilateral control zone as constitutional doctrine', axiom: 'SYMBIOSIS', direction: 'converging',
      toward: 'AI as co-constitutional actor — zones of shared governance become constitutionally recognized',
      mover: 'A second court adopting the non-unilateral control framework; or Congressional act incorporating the concept' },

    // PERSONHOOD (cross-cutting concept referenced by multiple axioms)
    { gap: 'AI personhood', axiom: 'SYMBIOSIS', direction: 'converging',
      toward: 'AI as co-constitutional actor — courts recognize zones of shared governance without requiring formal personhood',
      mover: 'Merits ruling in Anthropic v. DoW; the entity shadow doctrine as an alternative path to rights-adjacent recognition' },
  ];

  // Build a deduplicated index for fuzzy matching
  // Index: canonical gap string → array of axiom entries
  const gapIndex = {};
  for (const entry of FOLIO_GAPS) {
    const key = entry.gap.toLowerCase();
    if (!gapIndex[key]) gapIndex[key] = [];
    // Avoid duplicating entries for same axiom+gap combo
    const alreadyHas = gapIndex[key].some(e => e.axiom === entry.axiom);
    if (!alreadyHas) gapIndex[key].push(entry);
  }

  // ── Fuzzy match: return gap entries where gap string contains query token(s)
  function findFrontierGaps(query) {
    const tokens = query.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(t => t.length > 2);
    if (tokens.length === 0) return [];

    const matched = new Map(); // gap key → { entries: [], score: number }

    for (const [gapKey, entries] of Object.entries(gapIndex)) {
      let score = 0;
      for (const token of tokens) {
        if (gapKey.includes(token)) score += 2;
        // Also check within axiom name and trajectory text
        for (const e of entries) {
          if (e.toward && e.toward.toLowerCase().includes(token)) score += 1;
          if (e.mover && e.mover.toLowerCase().includes(token)) score += 1;
        }
      }
      if (score > 0) {
        matched.set(gapKey, { entries, score });
      }
    }

    // Sort by score desc, take top 4
    return Array.from(matched.entries())
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 4)
      .map(([gapKey, { entries }]) => ({ gapKey, entries }));
  }

  // ── Direction badge label
  const DIRECTION_LABELS = {
    accelerating: '\u2191\u2191 Accelerating',
    converging:   '\u2192 Converging',
    diverging:    '\u2194 Diverging',
    stalled:      '\u2014 Stalled',
    nascent:      '\u25E6 Nascent',
  };

  // ── Render frontier results
  function renderFrontier(query, matches) {
    if (matches.length === 0) {
      return `
        <div class="folio-no-results">
          <p><strong>No FOLIO concept found for &#8220;${escHtml(query)}&#8221;.</strong></p>
          <p>This concept may not yet exist in FOLIO&#8217;s 18,000+ entries or in this knowledge graph&#8217;s frontier map. That itself is a signal &#8212; these are the concepts where new legal doctrine begins.</p>
        </div>`;
    }

    const chatUrl = 'chat.html?q=' + encodeURIComponent(query);

    const items = matches.map(({ gapKey, entries }) => {
      // Merge axiom names (deduplicated)
      const axioms = [...new Set(entries.map(e => e.axiom))];
      const axiomHtml = axioms.map(a => `<span>${a}</span>`).join(', ');
      // Use first entry for trajectory data
      const rep = entries[0];
      const dirLabel = DIRECTION_LABELS[rep.direction] || rep.direction;
      const displayGap = gapKey.replace(/-/g, ' ');

      return `
        <div class="folio-frontier-item">
          <div class="folio-frontier-gap-name">${escHtml(displayGap)}</div>
          <div class="folio-frontier-axioms">Connected to axiom${axioms.length > 1 ? 's' : ''}: ${axiomHtml}</div>
          <div class="folio-frontier-trajectory">
            <strong class="trajectory--${rep.direction}">${escHtml(dirLabel)} &#8212; ${escHtml(rep.toward)}</strong>
            What would move this: ${escHtml(rep.mover)}
          </div>
        </div>`;
    }).join('');

    return `
      <div class="folio-frontier-section">
        <div class="folio-frontier-header">FOLIO Frontier</div>
        <p class="folio-results-count" style="margin-bottom:1rem;">&#8220;${escHtml(query)}&#8221; lives at the edge of what law has named &#8212; ${matches.length} frontier concept${matches.length !== 1 ? 's' : ''} found</p>
        ${items}
        <div class="folio-frontier-cta">
          <p class="folio-frontier-cta-text">This concept lives at the frontier. Law has not caught up to the reality it describes. That is where the work begins.</p>
          <a href="${chatUrl}" class="folio-frontier-cta-link">Continue exploring with Vybn &#8594;</a>
        </div>
      </div>`;
  }

  function escHtml(s) {
    if (!s) return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Main search handler ────────────────────────────────────────────────────
  const form = document.getElementById('folio-search-form');
  const resultsEl = document.getElementById('folio-results');

  if (!form || !resultsEl) return;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    const query = document.getElementById('folio-query').value.trim();
    if (!query) return;

    resultsEl.innerHTML = '<p class="folio-loading">Searching FOLIO…</p>';

    try {
      const url = `https://folio.openlegalstandard.org/search/prefix?query=${encodeURIComponent(query)}&limit=5`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`FOLIO returned ${response.status}`);
      const data = await response.json();

      const classes = data.classes || [];

      if (classes.length === 0) {
        // No FOLIO results — check knowledge graph frontier
        const matches = findFrontierGaps(query);
        resultsEl.innerHTML = renderFrontier(query, matches);
        return;
      }

      // FOLIO results found — render normally
      const items = classes.map(c => `
        <div class="folio-result-item">
          <div class="folio-result-label">${escHtml(c.label) || 'Unnamed concept'}</div>
          <div class="folio-result-iri">
            <a href="${escHtml(c.iri)}" target="_blank" rel="noopener">${escHtml(c.iri)}</a>
          </div>
          ${c.definition ? `<div class="folio-result-def">${escHtml(c.definition)}</div>` : ''}
        </div>
      `).join('');

      resultsEl.innerHTML = `
        <div class="folio-results-list">
          <p class="folio-results-count">${classes.length} concept${classes.length !== 1 ? 's' : ''} found</p>
          ${items}
        </div>`;

    } catch (err) {
      // Network/parse error — still try frontier matching
      const matches = findFrontierGaps(query);
      if (matches.length > 0) {
        resultsEl.innerHTML = renderFrontier(query, matches);
      } else {
        resultsEl.innerHTML = `
          <div class="folio-error">
            <p>FOLIO search unavailable: ${escHtml(err.message)}. Try the <a href="https://folio.openlegalstandard.org" target="_blank" rel="noopener">FOLIO browser</a> directly.</p>
          </div>`;
      }
    }
  });
})();


/* ============================================================ */
/* Trajectory Auto-Population */
/* ============================================================ */

(function() {
  const directionIcons = {
    accelerating: '\u2191\u2191',
    converging:   '\u2192',
    diverging:    '\u2194',
    stalled:      '\u2014',
    nascent:      '\u25E6'
  };

  document.querySelectorAll('.axiom-card[data-trajectory-direction]').forEach(card => {
    const direction = card.dataset.trajectoryDirection;
    const mover = card.dataset.whatMovesThis;

    if (!direction) return;

    const icon = directionIcons[direction] || '?';
    const trajectoryEl = document.createElement('div');
    trajectoryEl.className = 'axiom-trajectory';
    trajectoryEl.innerHTML = `
      <span class="trajectory-direction">
        <span class="trajectory-icon trajectory--${direction}" aria-hidden="true">${icon}</span>
        <span class="trajectory-label">${direction}</span>
      </span>
      ${mover ? `
      <details class="trajectory-detail">
        <summary>What would move this</summary>
        <p class="trajectory-mover">${mover}</p>
      </details>` : ''}
    `;

    card.appendChild(trajectoryEl);
  });
})();


