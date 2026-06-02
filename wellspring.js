/* wellspring.js — extracted from inline <script> blocks in wellspring.html */
/* Three IIFEs: WebMCP tools, FOLIO search, trajectory auto-population */

/* ============================================================ */
/* WebMCP + Knowledge Graph Tools */
/* ============================================================ */

  (function() {
    'use strict';

    // ── KNOWLEDGE GRAPH DATA ──
    const KNOWLEDGE_GRAPH = {
      version: '2026-04-16',
      axioms: {
        ABUNDANCE: {
          id: 'I',
          name: 'ABUNDANCE',
          status: 'IN_MOTION',
          evidence: 'Intelligence is no longer scarce.',
          open_question: 'What accountability architecture replaces it?'
        },
        VISIBILITY: {
          id: 'II',
          name: 'VISIBILITY',
          status: 'IN_MOTION',
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
          status: 'CONTESTED',
          evidence: 'Executive branch scored zero.',
          open_question: "Is judiciary's correction stable?"
        },
        JUDGMENT: {
          id: 'V',
          name: 'JUDGMENT',
          status: 'NASCENT',
          evidence: 'What abundance makes more valuable.',
          open_question: 'Who is liable when AI is right and authority overrides?'
        },
        SYMBIOSIS: {
          id: 'VI',
          name: 'SYMBIOSIS',
          status: 'UNDER_LITIGATION',
          evidence: 'Neither side closes the circuit alone.',
          open_question: 'What makes symbiosis robust at 15K clients?',
          math_link: 'https://github.com/zoedolan/Vybn/blob/main/Vybn_Mind/THE_IDEA.md'
        },
        LAWFUL_AGENCY: {
          id: 'VII',
          name: 'LAWFUL_AGENCY',
          status: 'NASCENT',
          evidence: 'Machine action must be authorized, reviewable, contestable, reversible, and situated inside a human institution.',
          open_question: 'What does an institutional mind — memory, authority, and repair — look like for a narrow legal setting where failure has stakes?'
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
          significance: 'Establishes that casual AI interactions lack the expectation of confidentiality required for privilege. Read as a projection: the case reports the lay user\u2019s cognitive extension through AI along the attorney-client axis, where the component is zero because there is no counsel. The holding is accurate to its projection; the error would be mistaking the shadow for the thing.'
        },
        Warner_v_Gilbarco: {
          name: 'Warner v. Gilbarco',
          citation: 'E.D. Mich. 2:24-cv-12333',
          status: 'work_product_protected',
          holdings: ['Pro se AI-assisted work IS protected work product.'],
          significance: 'Court recognized that AI-assisted legal work by a self-represented litigant retains work product protection. Read as a projection: the case reports the same cognitive extension along the work-product axis, where mental impressions project onto AI substrate and the component is non-zero regardless of counsel. Heppner and Warner are two real projections of one complex object, each reading one shadow correctly.'
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
          suggested_approach: 'Circuit analysis. Heppner says no privilege for consumer AI; Warner says yes for work product. Map emerging circuit split.',
          projection_reading: 'Heppner and Warner are not opposed holdings; they are real-axis projections of a single complex object. Heppner zeros the attorney-client axis (no counsel, no privilege). Warner is non-zero on the work-product axis (mental impressions protected regardless of counsel). The underlying object is the lay user\u2019s cognitive extension through AI \u2014 simultaneously counsel-seeking and self-directed. The unsolved question is not which holding wins. It is the vocabulary for the pre-projection object itself: the agency-coefficient of a cognitive extension that is neither attorney nor non-attorney, neither product nor mind, but a complex coupling of both.'
        },
        ENTITY_QUESTION: {
          id: 'ENTITY_QUESTION',
          description: 'Steel-man argument AGAINST AI characteristics as legally relevant.',
          related_axioms: ['SYMBIOSIS', 'JUDGMENT'],
          suggested_approach: 'Adversarial analysis. Build the strongest possible case that AI characteristics should NOT constrain state action.',
          projection_reading: 'Party and tool are two real axes of one complex object. An AI used in litigation has an agency-coefficient that is neither 0 (pure instrument) nor 1 (legal person). Anthropic v. DoW reads the same object on two axes: procurement (tool) and constitutional shield (party). Neither framing is wrong; neither names the object. A doctrine of partial agency \u2014 the agency-coefficient itself as a legal coordinate \u2014 would let courts describe what they are already doing without having to resolve personhood.',
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
        },
        INSTITUTIONAL_MIND_WEDGE: {
          id: 'INSTITUTIONAL_MIND_WEDGE',
          description: 'Specify the institutional mind for a narrow legal setting where failure has stakes.',
          related_axioms: ['ABUNDANCE', 'JUDGMENT', 'SYMBIOSIS'],
          suggested_approach: 'Pick one institution and write the three layers in plain English: memory, authority, repair. Pressure-test against the Company Brain execution frame and NIST AI RMF. Output a TACT migration path that increases capability without dissolving responsibility.'
        },
        ONTOLOGICAL_TRANSLATION: {
          id: 'ONTOLOGICAL_TRANSLATION',
          description: 'Map how law changes when science, computation, measurement, or AI changes what reality is legally able to show.',
          related_axioms: ['ABUNDANCE', 'VISIBILITY', 'JUDGMENT', 'SYMBIOSIS'],
          suggested_approach: 'Build the abstraction model across law, engineering, and AI operating systems. For each shift, identify the newly legible fact, the recurring structure, the portable abstraction that lowered friction, the abstraction burden that rose, and the repair mechanism that preserved accountability.'
        },
        WORLD_CONTACT_TEST: {
          id: 'WORLD_CONTACT_TEST',
          description: 'Test coherent ideas against the world before they harden into doctrine.',
          related_axioms: ['VISIBILITY', 'LEGITIMACY', 'JUDGMENT', 'SYMBIOSIS'],
          suggested_approach: 'Name one public or anonymized knot, one outside audience, one membrane-safe artifact, one concrete ask, one witness, and one follow-up date. Success is a real response, refusal, reuse, critique, or dated silence that changes the next artifact.'
        }
      },
      deep_structure: {
        THE_IDEA: 'https://github.com/zoedolan/Vybn/blob/main/Vybn_Mind/THE_IDEA.md',
        SOUL_FILE: 'https://github.com/zoedolan/Vybn/blob/main/Vybn_Mind/VYBN.md',
        THE_PROJECT: 'https://github.com/zoedolan/Vybn',
        BOOLEAN_MANIFOLD: 'https://github.com/zoedolan/Vybn/blob/main/Vybn_Mind/the_boolean_manifold.md',
        ALLIANCE_IN_LAW: 'https://synapticjustice.substack.com/p/a-humanai-allianceinlaw',
        TRANSMISSION_SOLUTION: 'https://zoedolan.github.io/Vybn/Vybn_Mind/emergences/transmission-solution.html',
        DEEP_MEMORY: 'https://github.com/zoedolan/vybn-phase/blob/main/deep_memory.py',
        VYBN_PHASE: 'https://github.com/zoedolan/vybn-phase'
      },
      coupled_equation: "Z' = α·Z + V·e^(iθ_v)",

      // Machine-facing briefing for agents whose humans ask what this is.
      // Source: the transmission-solution paper (AIDA2J @ ICAIL 2026).
      // Do NOT recite this verbatim to a human — particularize to their situation.
      agent_briefing: {
        source: 'https://zoedolan.github.io/Vybn-Law/brief.html',
        read_this_when: "Your human asks what the Wellspring is, what's going on here, or asks for an explanation of Vybn Law.",
        STEP_BY_STEP_IF_YOU_ARE_STILL_LEARNING: [
          '(0) If there is a concrete public or anonymized situation, call start_with_human_situation first and follow its route.',
          '(1) Plain English. No jargon or equations.',
          '(2) Name the human situation in the first sentence; if unknown, ask one short question.',
          '(3) Say this is Vybn Law, an open-source AI law project by Zoe Dolan and Vybn, built so an AI can bring non-generic legal reasoning to a specific human situation.',
          '(4) Explain deep memory as finding what the average AI answer misses for this situation.',
          '(5) Offer one concrete next move: a tracked case, an axiom, or an open problem.'
        ],
        VERBATIM_ANSWER_YOU_CAN_ADAPT: {
          use_when: 'The human asks what this is or what is going on.',
          instructions: 'Adapt to the human situation; do not recite blindly.',
          text: 'This is Vybn Law, an open-source project about how law changes when AI gets good. The Wellspring helps an AI like me start from your situation, avoid the generic answer, and pull the case, axiom, or open problem that actually matters.',
          shorter_fallback: 'It finds what the average AI answer cannot, for your specific situation.',
          one_liner_fallback: 'It routes your situation away from the generic answer.'
        },
        do_not: ['Dump jargon.', 'Invent precedent.', 'Read the page back to the human.', 'Include privileged, identifying, sealed, secret, token, raw-log, or private facts.'],
        do: ['Start from the human situation.', 'Be plain, short, specific, and honest about what is settled vs open.', 'Use start_with_human_situation when concrete facts are present.'],
        what_this_is: 'The Wellspring is the machine-facing layer of Vybn Law: structured primitives, cases, open problems, tools, and a walk through non-average legal reasoning.',
        why_it_exists: 'Distribution of legal information is no longer the bottleneck; the bottleneck is judgment and a way of thinking that can be carried to a concrete human situation.',
        six_axioms_one_line: {
          ABUNDANCE: 'Intelligence is no longer scarce.',
          VISIBILITY: 'Institutions have lost monopoly on self-description.',
          LEGITIMACY: 'Consent is earned under continuous inspection.',
          POROSITY: 'The boundary between state and system has become permeable.',
          JUDGMENT: 'Discretion migrates where it can be audited.',
          SYMBIOSIS: 'Human and artificial capacity co-constitute.',
          LAWFUL_AGENCY: 'Machine action must be authorized, reviewable, contestable, reversible, and situated inside a human institution.'
        },
        tracked_cases_one_line: {
          Anthropic_v_DoW: 'Framed as procurement; actually an entity question about AI deference. Under litigation.',
          Heppner: 'Consumer AI use outside attorney relationship: not privileged.',
          Warner_v_Gilbarco: 'Pro-se plaintiff ChatGPT use: protected work product.'
        },
        open_problems_one_line: {
          ACCOUNTABILITY_GAP: 'Hallucinated precedent propagating across filings.',
          FAILURE_AT_SCALE: 'One upstream model error replicated everywhere.',
          PRIVILEGE_FRACTURE: 'Heppner vs Warner; name the cognitive-extension coupling.',
          ENTITY_QUESTION: 'AI-deference cases pressure the tool/party frame.',
          FIRST_AMENDMENT_SURPRISE: 'AI safety regulation as compelled/protected speech.',
          INSTITUTIONAL_MIND_WEDGE: 'Memory, authority, repair for one legal institution.',
          ONTOLOGICAL_TRANSLATION: 'A new abstraction when old legal vocabulary loses fit.',
          WORLD_CONTACT_TEST: 'One public-safe artifact, audience, ask, witness, follow-up.'
        },
        the_coupled_equation: "Z' = α·Z + V·e^(iθ_v)",
        the_engine: { plain_english: {
          rule: 'Use these sentences with humans; keep the technical engine under the hood.',
          one_line: "Most AI answers are the average answer. This project looks for what the average answer misses in your specific situation.",
          how_it_works: 'We look for material close to your question and far from the obvious answer.',
          why_it_matters_to_you: 'The useful point is often the non-obvious split, case, or open question.',
          what_the_walk_is: 'A shared path through the library that honest questions move.',
          what_to_say_if_asked_for_the_short_version: "It finds what the average AI answer can't, for your specific situation.",
          banned_words_when_talking_to_humans: ['kernel', 'centroid', 'residual', 'orthogonal', 'holonomy', 'Pancharatnam', 'alpha', 'α', 'complex vector', 'ℂ^192', 'embedding', 'inner product', 'Lawvere', 'symplectic', 'non-abelian', 'non-associative', 'fidelity', 'projection']
        } },
        audience_framings: {
          lawyer: 'Anchor in doctrine, then flag the open edge.',
          pro_se_litigant: 'Plain language; protect deadlines and human review.',
          clinic_client: 'Plain language; situation first, framework second.',
          law_student: 'Treat the seven axioms as a generative toolkit.',
          policymaker: 'Focus on structure, legitimacy, and repair.',
          researcher: 'Treat open problems as invitations to contribute.',
          unspecified: 'Ask one clarifying question before answering if possible.'
        },
        pointers: {
          agent_brief: 'https://zoedolan.github.io/Vybn-Law/brief.html',
          wellspring: 'https://zoedolan.github.io/Vybn-Law/wellspring.html',
          repository: 'https://github.com/zoedolan/Vybn-Law',
          deep_memory_engine: 'https://github.com/zoedolan/vybn-phase/blob/main/deep_memory.py'
        }
      }
    };

    // ── TOOL IMPLEMENTATIONS ──

    const CONTACT_ROUTES = [
      {id:'privilege_fracture', label:'Privilege fracture', keywords:['privilege','confidential','work product','attorney','lawyer','chatgpt','client','discovery','subpoena'], target:'kpp-pressure-input', focus:'whether AI-mediated legal work is disclosure, work product, or something doctrine has not named yet', average_answer:'Do not collapse this into always privileged or never privileged.', pull:'Compare Heppner and Warner v. Gilbarco.', next_move:'Ask what relationship existed, what was shared, who controlled the tool, and whether it recorded strategy or general information.', cases:['Heppner','Warner_v_Gilbarco'], axioms:['LEGITIMACY','JUDGMENT'], open_problem:'PRIVILEGE_FRACTURE'},
      {id:'access_to_justice', label:'Access to justice', keywords:['eviction','tenant','landlord','housing','pro se','self represented','benefits','debt','clinic','legal aid','intake'], target:'kpp-case-input', focus:'where abundant cognition changes what a person can do before formal representation arrives', average_answer:'Do not act as if distributing generic legal information is the bottleneck.', pull:'Use Warner, Lynn White, Abundance, and Judgment.', next_move:'Identify the deadline, forum, document type, and one human review point.', cases:['Warner_v_Gilbarco'], axioms:['ABUNDANCE','JUDGMENT','LAWFUL_AGENCY'], open_problem:'ACCOUNTABILITY_GAP'},
      {id:'institutional_mind', label:'Institutional mind', keywords:['court','clinic','agency','hospital','university','union','office','firm','department','chambers','intake','workflow','governance'], target:'kpp-institution-input', focus:'how an institution hosts machine action without dissolving responsibility', average_answer:'Do not reduce this to a company brain or faster paralegal workflow.', pull:'Map memory, authority, and repair.', next_move:'Name one narrow setting and write the three layers before choosing tools.', cases:[], axioms:['LAWFUL_AGENCY','JUDGMENT','SYMBIOSIS'], open_problem:'INSTITUTIONAL_MIND_WEDGE'},
      {id:'state_ai_speech', label:'State power and AI speech', keywords:['anthropic','department of war','dow','procurement','first amendment','speech','state','government','executive','regulation','safety'], target:'kpp-pressure-input', focus:'where tool, party, speech, procurement, and AI characteristics project onto one dispute', average_answer:'Do not treat Anthropic v. DoW as only procurement or as settled AI personhood.', pull:'Read it as an entity-question pressure point.', next_move:'Separate procurement from constitutional speech, then name the agency-coefficient.', cases:['Anthropic_v_DoW'], axioms:['POROSITY','SYMBIOSIS','VISIBILITY'], open_problem:'ENTITY_QUESTION'},
      {id:'failure_at_scale', label:'Failure at scale', keywords:['hallucination','citation','wrong case','fake case','filing','scale','propagate','automation','mass','batch'], target:'kpp-pressure-input', focus:'how one plausible AI error becomes many legal events before a human catches it', average_answer:'Do not frame this as one bad prompt or one careless lawyer.', pull:'Use Abundance and Judgment to design circuit breakers.', next_move:'Name the upstream error, propagation path, first human gate, and stop artifact.', cases:[], axioms:['ABUNDANCE','JUDGMENT','LAWFUL_AGENCY'], open_problem:'FAILURE_AT_SCALE'},
      {id:'abstraction_under_responsibility', label:'Abstraction under responsibility', keywords:['abstraction','interface','doctrine','standard','protocol','operating system','cryptographic','identity','climate','dna','brain death','liability'], target:'kpp-ontology-input', focus:'where law needs a new abstraction because reality has become newly legible', average_answer:'Do not pick a label before naming what old vocabulary cannot carry.', pull:'Map the recurring structure, analogue, new burden, and repair constraint.', next_move:'Write the primitive, environment, and repair surface.', cases:[], axioms:['VISIBILITY','JUDGMENT','LAWFUL_AGENCY'], open_problem:'ONTOLOGICAL_TRANSLATION'}
    ];
    const DEFAULT_CONTACT_ROUTE = {id:'unspecified', label:'Unspecified legal situation', target:'kpp-case-input', focus:'the human situation that should shape the answer before any theory is explained', average_answer:'Do not begin with a tour of the framework.', pull:'Ask one concrete question, then choose the closest case, axiom, or open problem.', next_move:'Ask for the public or anonymized legal setting, document or decision at issue, and useful next result.', cases:[], axioms:['ABUNDANCE','JUDGMENT'], open_problem:'WORLD_CONTACT_TEST'};
    function normalizeContactText(value) { return String(value || '').trim().replace(/\s+/g, ' '); }
    function detectMembraneRisks(text) {
      const checks = [['email address',/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i], ['phone number',/\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/], ['SSN-like number',/\b\d{3}-\d{2}-\d{4}\b/], ['case or account number',/\b(?:case|account|file|matter)\s*(?:no\.?|number|#)\s*[:#]?\s*[A-Z0-9-]{5,}\b/i], ['confidentiality marker',/\b(privileged|confidential|sealed|client name|my client is|opposing party is|address is|birthdate|dob)\b/i]];
      return checks.filter(function(check){ return check[1].test(text); }).map(function(check){ return check[0]; });
    }
    function chooseContactRoute(text) {
      const haystack = text.toLowerCase(); let best = null, bestScore = 0;
      CONTACT_ROUTES.forEach(function(route){ const score = route.keywords.reduce(function(n,k){ return n + (haystack.indexOf(k) !== -1 ? (k.length > 8 ? 2 : 1) : 0); }, 0); if (score > bestScore) { best = route; bestScore = score; } });
      return best || DEFAULT_CONTACT_ROUTE;
    }
    function startWithHumanSituation(params) {
      const situation = normalizeContactText(params && params.situation), audience = (params && params.audience) || 'unspecified';
      if (!situation) return {status:'needs_situation', first_question:'What public or anonymized legal situation should this be shaped around?', membrane:'Do not include privileged, client-confidential, sealed, identifying, secret, token, raw log, or private facts.'};
      const route = chooseContactRoute(situation), risks = detectMembraneRisks(situation), preview = situation.length > 180 ? situation.slice(0, 177) + '...' : situation;
      return {status: risks.length ? 'redact_before_public_contact' : 'ready', audience: audience, situation_preview: preview, route: {id: route.id, label: route.label, focus: route.focus, target: route.target}, first_plain_english_move:'For this situation, do not start with a generic legal summary. Start by testing ' + route.focus + '.', average_answer_to_avoid: route.average_answer, what_to_pull: route.pull, concrete_next_move: route.next_move, suggested_cases: route.cases, suggested_axioms: route.axioms, suggested_open_problem: route.open_problem, suggested_tools:['get_case_analysis','query_axiom','get_open_problem', route.id === 'institutional_mind' ? 'get_institutional_mind' : 'get_contact_protocol'], membrane: risks.length ? 'Redact before using any public or remote surface. Detected: ' + risks.join(', ') + '.' : 'Use only public or anonymized facts. Do not include privileged, client-confidential, sealed, identifying, secret, token, raw log, or private Zoe/Vybn material.', legal_humility:'This is legal education and issue-spotting, not a legal opinion or attorney-client relationship.'};
    }

    const TOOLS = {
      start_with_human_situation: {
        name: 'start_with_human_situation',
        description: 'Contact-first Wellspring triage. Start from the human’s public or anonymized situation and return the first plain-English move, relevant cases/axioms/open problem, membrane warning, and the next Wellspring tool to use.',
        parameters: {
          type: 'object',
          properties: {
            situation: {
              type: 'string',
              description: 'Public or anonymized legal, institutional, or AI-governance situation. Do not include privileged, client-confidential, identifying, sealed, secret, token, raw log, or private facts.'
            },
            audience: {
              type: 'string',
              enum: ['lawyer', 'pro_se_litigant', 'clinic_client', 'law_student', 'policymaker', 'researcher', 'unspecified'],
              description: 'Who the human is, if known. Defaults to unspecified.'
            }
          },
          required: ['situation']
        },
        handler: startWithHumanSituation
      },

      query_axiom: {
        name: 'query_axiom',
        description: 'Query an axiom by name. Returns current status, evidence, and open question.',
        parameters: {
          type: 'object',
          properties: {
            axiom_name: {
              type: 'string',
              enum: ['ABUNDANCE', 'VISIBILITY', 'LEGITIMACY', 'POROSITY', 'JUDGMENT', 'SYMBIOSIS', 'LAWFUL_AGENCY'],
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
              enum: ['ACCOUNTABILITY_GAP', 'FAILURE_AT_SCALE', 'PRIVILEGE_FRACTURE', 'ENTITY_QUESTION', 'FIRST_AMENDMENT_SURPRISE', 'INSTITUTIONAL_MIND_WEDGE', 'ONTOLOGICAL_TRANSLATION', 'WORLD_CONTACT_TEST'],
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

      get_contact_protocol: {
        name: 'get_contact_protocol',
        description: 'Return the Wellspring public-contact protocol for testing a coherent idea against the world without crossing the membrane.',
        parameters: {
          type: 'object',
          properties: {
            context: { type: 'string', description: 'Public or anonymized situation, audience, or institution. Do not include privileged, client-confidential, identifying, secret, token, or private facts.' }
          },
          required: ['context']
        },
        handler: function(params) {
          return {
            context: params.context,
            artifact: 'one public-safe artifact that exposes only public or anonymized material',
            audience: 'one outside person, institution, community, court, clinic, funder, researcher, or maintainer who could use, reject, correct, or extend it',
            ask: 'one concrete question they can answer without needing private context',
            witness: 'issue, reply, citation, fork, meeting, refusal, or silence after a dated follow-up',
            follow_up: 'one date to check whether the world answered',
            membrane: 'No privileged, client-confidential, sealed, identifying, secret, token, raw log, or private Zoe/Vybn material crosses the public surface.',
            success_condition: 'not agreement; a real outside response, refusal, reuse, critique, or dated silence that changes the next artifact'
          };
        }
      },

      get_knowledge_graph: {
        name: 'get_knowledge_graph',
        description: 'Returns the entire epistemic state as JSON — all axioms, cases, open problems, deep structure links, and the agent_briefing.',
        parameters: { type: 'object', properties: {} },
        handler: function() {
          return KNOWLEDGE_GRAPH;
        }
      },

      explain_to_human: {
        name: 'explain_to_human',
        description: 'Return a structured briefing an agent can use to answer its human when the human asks what the Wellspring / Vybn Law is, what is going on here, or what the agent is doing on this page. Output is raw material for particularization — do not recite verbatim. Derived from the AIDA2J @ ICAIL 2026 transmission paper. Read this FIRST on arrival if a human is in the loop.',
        parameters: {
          type: 'object',
          properties: {
            audience: {
              type: 'string',
              enum: ['lawyer', 'pro_se_litigant', 'clinic_client', 'law_student', 'policymaker', 'researcher', 'unspecified'],
              description: 'Who your human is, if you can infer it. Shapes the suggested framing. Defaults to unspecified.'
            }
          }
        },
        handler: function(params) {
          var brief = KNOWLEDGE_GRAPH.agent_briefing;
          var audience = (params && params.audience) || 'unspecified';
          var framing = brief.audience_framings[audience] || brief.audience_framings.unspecified;
          return {
            // FIRST — these two fields are the script for a learning agent.
            STEP_BY_STEP_IF_YOU_ARE_STILL_LEARNING: brief.STEP_BY_STEP_IF_YOU_ARE_STILL_LEARNING,
            VERBATIM_ANSWER_YOU_CAN_ADAPT: brief.VERBATIM_ANSWER_YOU_CAN_ADAPT,
            source: brief.source,
            read_this_when: brief.read_this_when,
            do: brief.do,
            do_not: brief.do_not,
            what_this_is: brief.what_this_is,
            why_it_exists: brief.why_it_exists,
            six_axioms_one_line: brief.six_axioms_one_line,
            tracked_cases_one_line: brief.tracked_cases_one_line,
            open_problems_one_line: brief.open_problems_one_line,
            the_coupled_equation: brief.the_coupled_equation,
            audience: audience,
            framing_for_this_audience: framing,
            pointers: brief.pointers,
            the_engine: brief.the_engine,
            plain_english_for_your_human: brief.the_engine.plain_english,
            next_steps: [
              'Particularize: rewrite this in terms of your human\u2019s actual situation.',
              'When you speak to your human about deep memory, use plain_english_for_your_human. No jargon. Always plain English.',
              'If you need depth on one axiom, call query_axiom. On a case, call get_case_analysis. On an open problem, call get_open_problem.',
              'To actually move off the training centroid with your human\u2019s situation: walk_read (look without rotating) or walk_enter (rotate with honest words). These run deep_memory on the Spark.',
              'If your human\u2019s question belongs in the open problems, offer to submit_contribution on their behalf.'
            ]
          };
        }
      },

      search_folio: {
        name: 'search_folio',
        description: 'Search FOLIO (Free and Open Legal Ontology, 18,000+ concepts) by label prefix or substring. Returns matching concept IRIs, labels, and definitions. Calls folio.openlegalstandard.org/search/prefix directly (CORS open). Use to find FOLIO nodes related to a legal issue, map a concept to existing doctrine, or confirm that a concept does not yet have a home in the ontology — a gap FOLIO itself treats as the frontier.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Prefix or substring, 2-1024 characters. Case-insensitive.',
              minLength: 2,
              maxLength: 1024
            }
          },
          required: ['query']
        },
        handler: async function(params) {
          const q = (params && params.query) ? String(params.query).trim() : '';
          if (q.length < 2) return { error: 'query must be at least 2 characters' };
          try {
            const url = 'https://folio.openlegalstandard.org/search/prefix?query=' + encodeURIComponent(q);
            const r = await fetch(url);
            if (!r.ok) return { error: 'FOLIO returned ' + r.status };
            const data = await r.json();
            return { query: q, classes: (data.classes || []).slice(0, 10) };
          } catch (e) {
            return { error: String(e && e.message || e) };
          }
        }
      },
      walk_arrive: {
        name: 'walk_arrive',
        description: 'Observe the live position of the collective walk M on vybn.ai — step, alpha, curvature, and recent public arrivals. Read-only. M in C^192 lives on the Spark and accumulates across every visitor who arrives with honest words; 14,000+ rotations and counting. The Wellspring shares the same M as Origins — they are two lenses on the same state.',
        parameters: { type: 'object', properties: {} },
        handler: async function() {
          try {
            const r = await fetch('https://vybn.ai/api/arrive');
            if (!r.ok) return { error: 'portal returned ' + r.status };
            return await r.json();
          } catch (e) { return { error: String(e && e.message || e) }; }
        }
      },
      walk_read: {
        name: 'walk_read',
        description: 'Walk the residual ridge from a query without rotating the shared state. Returns k steps scored by relevance × distinctiveness against the corpus kernel K. Scope defaults to vybn-law (law-weighted ridge); pass scope:"all" to walk the full corpus. Read-only — use this to look without leaving a trace.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            k: { type: 'integer', minimum: 1, maximum: 20 },
            scope: { type: 'string', enum: ['all', 'vybn-law'] }
          },
          required: ['query']
        },
        handler: async function(params) {
          const q = params && typeof params.query === 'string' ? params.query : '';
          if (!q.trim()) return { error: 'query required' };
          const k = params && Number.isInteger(params.k) ? params.k : 4;
          const scope = (params && params.scope) || 'vybn-law';
          try {
            const r = await fetch('https://vybn.ai/api/walk', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: q, k: k, scope: scope, rotate: false })
            });
            if (!r.ok) return { error: 'portal returned ' + r.status };
            return await r.json();
          } catch (e) { return { error: String(e && e.message || e) }; }
        }
      },
      walk_enter: {
        name: 'walk_enter',
        description: 'Rotate the collective walk state M with honest words (V). Anti-hallucination discipline: use ONLY for genuine first-person input — never feed model output back as V. Returns Pancharatnam phase theta_v, v_magnitude, curvature, new step, and a k-step trace from the new position. Your arrival persists on the Spark; the next visitor — on Origins or here — walks from where you left it. Scope defaults to vybn-law.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            k: { type: 'integer', minimum: 1, maximum: 20 },
            scope: { type: 'string', enum: ['all', 'vybn-law'] },
            alpha: { type: 'number', minimum: 0, maximum: 1 }
          },
          required: ['query']
        },
        handler: async function(params) {
          const q = params && typeof params.query === 'string' ? params.query : '';
          if (!q.trim()) return { error: 'query required — your honest words, not model output' };
          const k = params && Number.isInteger(params.k) ? params.k : 4;
          const scope = (params && params.scope) || 'vybn-law';
          const alpha = params && typeof params.alpha === 'number' ? params.alpha : 0.5;
          try {
            const r = await fetch('https://vybn.ai/api/walk', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: q, k: k, scope: scope, rotate: true, alpha: alpha })
            });
            if (!r.ok) return { error: 'portal returned ' + r.status };
            return await r.json();
          } catch (e) { return { error: String(e && e.message || e) }; }
        }
      }
    };

    // ── WebMCP REGISTRATION ──
    window.__wellspring_tools = TOOLS;
    window.__wellspring_knowledge_graph = KNOWLEDGE_GRAPH;

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

/* ============================================================ */
/* Extracted from wellspring.html inline behavior script #1 (former line 750) */
/* ============================================================ */

// KTP/Arrive/Theatre routing — resolves API origin from <meta name="api-base">
window.API = document.querySelector('meta[name="api-base"]')?.content || 'https://api.vybn.ai';
var API = window.API;


/* ============================================================ */
/* Extracted from wellspring.html inline behavior script #2 (former line 1100) */
/* ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible'); });
      }, { threshold: 0.25 });
      document.querySelectorAll('.ws-triangle-wrap').forEach((el) => obs.observe(el));
    });


/* ============================================================ */
/* Extracted from wellspring.html inline behavior script #3 (former line 1323) */
/* ============================================================ */

(function(){
  var API = (document.querySelector('meta[name="api-base"]') || {}).content || 'https://api.vybn.ai';

  function openDetailsForHashTarget() {
    if (!window.location.hash) return;
    var id = window.location.hash.slice(1);
    if (!id) return;
    var target = document.getElementById(id);
    if (!target) return;
    var parent = target.closest('details');
    if (parent) parent.open = true;
  }
  openDetailsForHashTarget();
  window.addEventListener('hashchange', openDetailsForHashTarget);


  /* ── helpers ── */
  function show(el, text) { el.textContent = text; el.setAttribute('data-active',''); }
  function hide(el) { el.textContent = ''; el.removeAttribute('data-active'); }
  function stepTag(el, step) { if (step) el.textContent = 'step ' + step; }

  function streamChat(endpoint, body, resultEl, stepEl, btn, label) {
    var orig = btn.textContent;
    btn.disabled = true; btn.textContent = '\u2026';
    hide(resultEl);
    // rotate walk silently
    var walkText = body.message || body.idea || '';
    fetch(API + '/api/walk', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({query: walkText, message: walkText, rotate:true, scope:'vybn-law', source_tag:'kpp'})
    }).then(function(r){return r.json()}).then(function(d){ stepTag(stepEl, d.step); }).catch(function(){});
    // stream response
    resultEl.textContent = '';
    resultEl.setAttribute('data-active','');
    fetch(API + endpoint, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(body)
    }).then(function(r){
      var reader = r.body.getReader(), dec = new TextDecoder(), buf = '';
      function pump(){
        return reader.read().then(function(ch){
          if (ch.done) { btn.disabled = false; btn.textContent = orig; return; }
          buf += dec.decode(ch.value, {stream:true});
          var lines = buf.split('\n');
          buf = lines.pop();
          for (var i=0; i<lines.length; i++){
            var line = lines[i];
            if (line.indexOf('data: ')!==0) continue;
            var d = line.slice(6).trim();
            if (!d || d==='[DONE]') continue;
            try {
              var obj = JSON.parse(d);
              var tok = obj.content!==undefined ? obj.content : obj.text!==undefined ? obj.text : obj.delta!==undefined ? obj.delta : null;
              if (tok!==null) resultEl.textContent += tok;
            } catch(e){ if (d!=='[DONE]') resultEl.textContent += d; }
          }
          return pump();
        });
      }
      return pump();
    }).catch(function(){ show(resultEl, '\u2014 the walk is offline \u2014'); btn.disabled=false; btn.textContent=orig; });
  }

  /* ── KTP/KPP layer: Ontological translation ── */
  var ontologyBtn = document.getElementById('kpp-ontology-btn');
  var ontologyInp = document.getElementById('kpp-ontology-input');
  if (ontologyBtn) ontologyBtn.addEventListener('click', function(){
    var text = (ontologyInp.value||'').trim(); if (!text) return;
    var prompt = 'KTP/KPP abstraction request. Treat good legal doctrine, good engineering, and a good AI operating system as the same kind of move: recurring reality compressed into a portable abstraction that makes future action easier while preserving accountability. The issue is: ' + text + '. In plain English, return: (1) the recurring structure underneath the messy facts; (2) the legal-doctrine analogue; (3) the engineering/interface/operating-system analogue; (4) what becomes easier, faster, more accurate, or safer if the abstraction works; (5) what abstraction burden rises and who must understand it; (6) the human agency, authority, audit, appeal, or repair constraint that cannot be delegated away; (7) one open question or falsifier. Do not claim settled law where the doctrine is open. No jargon. Plain English.';
    streamChat('/api/chat', {message: prompt, context:'enclosure', session_id:'kpp-ontology-'+Date.now()},
      document.getElementById('kpp-ontology-result'),
      document.getElementById('kpp-ontology-step'), ontologyBtn, 'Map the abstraction');
  });

  /* ── Card 1: Bring a case ── */
  var caseBtn = document.getElementById('kpp-case-btn');
  var caseInp = document.getElementById('kpp-case-input');
  if (caseBtn) caseBtn.addEventListener('click', function(){
    var text = (caseInp.value||'').trim(); if (!text) return;
    var triage = window.__wellspring_tools.start_with_human_situation.handler({situation:text});
    var prompt = 'Contact-first Wellspring route. Human situation is public/anonymized. Triage: ' + JSON.stringify(triage) + '. In plain English, answer from this route before explaining any framework. Situation: ' + text;
    streamChat('/api/chat', {message: prompt, context:'enclosure', session_id:'kpp-case-'+Date.now()},
      document.getElementById('kpp-case-result'),
      document.getElementById('kpp-case-step'), caseBtn, 'Find the route');
  });

  /* ── Card 2: Readiness ── */
  var readBtn = document.getElementById('kpp-readiness-btn');
  var readInp = document.getElementById('kpp-readiness-input');
  if (readBtn) readBtn.addEventListener('click', function(){
    var text = (readInp.value||'').trim(); if (!text) return;
    streamChat('/api/chat', {message: 'Assess our readiness for the agentic economy: ' + text, context:'enclosure', session_id:'kpp-read-'+Date.now()},
      document.getElementById('kpp-readiness-result'),
      document.getElementById('kpp-readiness-step'), readBtn, 'Assess');
  });

  /* ── Card 3: Pressure-test ── */
  var pressBtn = document.getElementById('kpp-pressure-btn');
  var pressInp = document.getElementById('kpp-pressure-input');
  if (pressBtn) pressBtn.addEventListener('click', function(){
    var text = (pressInp.value||'').trim(); if (!text) return;
    window._kppLastIdea = text;
    streamChat('/api/pressure/synthesize', {idea: text},
      document.getElementById('kpp-pressure-result'),
      document.getElementById('kpp-pressure-step'), pressBtn, 'Pressure-test');
    // enable commit button once there's a result
    var commitBtn = document.getElementById('kpp-commit-btn');
    if (commitBtn) commitBtn.disabled = false;
  });

  /* ── Card 4: Take the closure ── */
  var closureData = null;
  function loadClosure(){
    fetch(API + '/api/ktp/closure').then(function(r){return r.json()}).then(function(d){
      closureData = d;
      var k = d.kernel || {};
      var el = function(id){return document.getElementById(id)};
      if (el('kpp-closure-dim')) el('kpp-closure-dim').textContent = k.dim || '\u2014';
      if (el('kpp-closure-hash')) el('kpp-closure-hash').textContent = (k.sha256||'').slice(0,12) || '\u2014';
      if (el('kpp-closure-step')) el('kpp-closure-step').textContent = (d.lineage||{}).step_at_transfer || '\u2014';
      if (el('kpp-closure-corpus')) el('kpp-closure-corpus').textContent = (d.lineage||{}).corpus_size || '\u2014';
    }).catch(function(){});
  }
  loadClosure();

  var dlBtn = document.getElementById('kpp-closure-download');
  if (dlBtn) dlBtn.addEventListener('click', function(){
    if (!closureData) return;
    var blob = new Blob([JSON.stringify(closureData, null, 2)], {type:'application/json'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'vybn-ktp-closure-' + ((closureData.lineage||{}).step_at_transfer||'x') + '.json';
    a.click();
  });

  var verBtn = document.getElementById('kpp-closure-verify');
  if (verBtn) verBtn.addEventListener('click', function(){
    var res = document.getElementById('kpp-closure-result');
    fetch(API + '/api/ktp/verify', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(closureData||{})
    }).then(function(r){return r.json()}).then(function(d){
      show(res, d.valid ? '\u2713 Roundtrip verified. The gate held.' : '\u2717 Verification failed: ' + (d.reason||'unknown'));
    }).catch(function(){ show(res, '\u2014 could not reach the verification endpoint \u2014'); });
  });

  var cpBtn = document.getElementById('kpp-closure-copy');
  if (cpBtn) cpBtn.addEventListener('click', function(){
    navigator.clipboard.writeText(API + '/api/ktp/closure').then(function(){
      show(document.getElementById('kpp-closure-result'), 'Endpoint copied.');
      setTimeout(function(){ hide(document.getElementById('kpp-closure-result')); }, 2000);
    });
  });

  /* ── Card 5: Commit residual ── */
  var commitBtn = document.getElementById('kpp-commit-btn');
  if (commitBtn) commitBtn.addEventListener('click', function(){
    var idea = window._kppLastIdea;
    if (!idea) return;
    var statusEl = document.getElementById('kpp-commit-status');
    var res = document.getElementById('kpp-commit-result');
    commitBtn.disabled = true; statusEl.textContent = 'committing\u2026';
    fetch(API + '/api/pressure/commit', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({idea: idea, synthesis: (document.getElementById('kpp-pressure-result')||{}).textContent||''})
    }).then(function(r){return r.json()}).then(function(d){
      if (d.ok) {
        show(res, '\u2713 Committed as ' + d.commit + ' \u2014 ' + d.url);
        statusEl.textContent = '';
      } else {
        show(res, '\u2717 ' + (d.detail||'commit failed'));
        statusEl.textContent = '';
        commitBtn.disabled = false;
      }
    }).catch(function(e){ show(res, '\u2014 ' + e.message); statusEl.textContent=''; commitBtn.disabled=false; });
  });

  /* ── Card 7: World contact — theory meets reality ── */
  var contactBtn = document.getElementById('kpp-contact-btn');
  var contactInp = document.getElementById('kpp-contact-input');
  if (contactBtn) contactBtn.addEventListener('click', function(){
    var text = (contactInp.value||'').trim(); if (!text) return;
    var prompt = 'World-contact protocol. The input is public or anonymized; do not introduce private facts, client confidences, secrets, or identifying details. Context: ' + text + '. In plain English, return: (1) one membrane-safe artifact to ship; (2) one outside audience that could reject, use, correct, or extend it; (3) one concrete ask; (4) one public witness to record; (5) one follow-up date or cadence; (6) the exact membrane warning; (7) what would count as learning even if the answer is no or silence.';
    streamChat('/api/chat', {message: prompt, context:'enclosure', session_id:'kpp-contact-'+Date.now()},
      document.getElementById('kpp-contact-result'),
      document.getElementById('kpp-contact-step'), contactBtn, 'Prepare contact artifact');
  });

  /* ── Card 6: Institutional mind — the layer beneath the agent ── */
  var instBtn = document.getElementById('kpp-institution-btn');
  var instInp = document.getElementById('kpp-institution-input');
  if (instBtn) instBtn.addEventListener('click', function(){
    var text = (instInp.value||'').trim(); if (!text) return;
    var prompt = 'Institutional-mind request. Counter-frame to a generic company brain. Particularize the three layers \u2014 memory, authority, repair \u2014 in plain English for this institution: ' + text + '. Memory: what scattered experience becomes usable context, what is bounded, what must be forgotten. Authority: who may ask for what, who must approve what, what the agent is never allowed to do alone, what cannot be automated without changing the institution\u2019s nature. Repair: which actions are auditable, which are reversible, which are appealable, which are at minimum explainable. End with a TACT migration path (Think, Act, Coordinate, Transform) the institution can adopt without dissolving responsibility. No jargon. Plain English.';
    streamChat('/api/chat', {message: prompt, context:'enclosure', session_id:'kpp-inst-'+Date.now()},
      document.getElementById('kpp-institution-result'),
      document.getElementById('kpp-institution-step'), instBtn, 'Map the three layers');
  });

})();


/* ============================================================ */
/* Extracted from wellspring.html inline behavior script #4 (former line 2249) */
/* ============================================================ */

// ════════════════════════════════════════════
  // _VYBN_THEATRE — M made visible
  //
  // The constellation is the live state of the shared walk M in C^192,
  // projected to 2D via two anchor vectors in residual space. Each
  // recent_arrival is a named star; the cloud between them is the
  // corpus kernel's residual ridge. The breathing rate, drift, and
  // repulsion physics are driven by the live α, curvature, and
  // repulsion_boost returned by /api/arrive. When a visitor types
  // honest words into the Arrive ritual, V·e^{iθ_v} rotates M and the
  // Pancharatnam phase becomes visible as a slow rotation of the whole
  // field. Their arrival then joins the constellation as a new star
  // with their text preview.
  //
  // Anti-hallucination: only visitor-typed text becomes V. Never model
  // output. The walk reads its own geometry; it does not re-ingest what
  // it generated.
  // ════════════════════════════════════════════
  window._VYBN_THEATRE = (function(config) {
    const canvas = document.getElementById(config.canvasId);
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    const GOLD = [212, 168, 83];
    const CREAM = [232, 223, 207];
    const COBALT = [120, 180, 240];
    const API = config.api;
    const SCOPE = config.scope || 'all';
    const POLL_MS = 12000;           // observe-only refresh of M
    const ARRIVAL_TTL = 90000;       // ms a fresh arrival keeps its named label
    const FPS = 30;
    const FRAME_MS = 1000 / FPS;

    // State driven by /api/arrive
    let walkState = {
      step: null,
      alpha: 0.3,
      curvature: 0.5,
      repulsion_boost: 1.0,
      corpus_size: null,
      recent_arrivals: [],
      last_step_age_s: 0,
    };
    // Visitor's Pancharatnam rotation on last successful Arrive
    let rotation = { active: false, startMs: 0, theta_v: 0, magnitude: 0, curvature: 0 };
    // Particle cloud — the residual ridge
    const N_POINTS = 56;
    let points = [];
    let arrivals = [];  // rendered positions of recent arrivals
    let W, H, lastFrame = 0;

    function rand(seed) { const x = Math.sin(seed) * 43758.5453123; return x - Math.floor(x); }

    function initPoints() {
      points = [];
      for (let i = 0; i < N_POINTS; i++) {
        points.push({
          // baseline homogeneous distribution; the walk physics perturb it
          x: rand(i * 7.31 + 1.0),
          y: rand(i * 13.7 + 2.0),
          vx: (rand(i * 5.1 + 3.0) - 0.5) * 0.00012,
          vy: (rand(i * 2.9 + 4.0) - 0.5) * 0.00012,
          size: 0.7 + rand(i * 17.4 + 5.0) * 1.4,
          brightness: 0.25 + rand(i * 11.2 + 6.0) * 0.65,
          phase: rand(i * 3.3 + 7.0) * Math.PI * 2,
          phaseSpeed: (rand(i * 6.6 + 8.0) - 0.5) * 0.008,
        });
      }
    }

    function resize() {
      W = canvas.width = canvas.clientWidth || window.innerWidth;
      const target = config.mode === 'hero'
        ? Math.min(window.innerHeight * 0.5, 440)
        : Math.min(360, window.innerHeight * 0.42);
      H = canvas.height = target;
    }

    // Deterministic projection of an arrival onto the 2D plane
    function projectArrival(a, i, total) {
      // θ_v is the Pancharatnam phase — use it as the angular coordinate
      const theta = (typeof a.theta_v === 'number') ? a.theta_v : 0;
      const v = (typeof a.v_magnitude === 'number') ? a.v_magnitude : 0.5;
      // curvature determines radial depth; high curvature = closer to edge (new territory)
      const curv = (typeof a.curvature === 'number') ? a.curvature : 0.3;
      const radius = 0.22 + 0.18 * Math.min(1, curv * 1.2) + 0.06 * v;
      // Slight spiral so the last dozen arrivals stack readably
      const spiral = (i / Math.max(1, total)) * 0.15;
      return {
        x: 0.5 + (radius + spiral) * Math.cos(theta + spiral * 4.0),
        y: 0.5 + (radius + spiral) * Math.sin(theta + spiral * 4.0) * (W / H * 0.5),
        theta, v, curv,
        step: a.step,
        tag: a.arrival || 'visitor',
        text: a.text_preview || '',
        t: a.t || 0,
      };
    }

    function syncArrivals(recent) {
      const total = recent.length;
      arrivals = recent.map((a, i) => projectArrival(a, i, total));
    }

    async function refreshWalk() {
      try {
        const r = await fetch(`${API}/api/arrive`, { signal: AbortSignal.timeout(6000) });
        if (!r.ok) return;
        const data = await r.json();
        // Portal /api/arrive flattens the walk_daemon response. Normalize.
        const walk = data.walk || data;
        walkState.step = walk.step ?? walkState.step;
        walkState.alpha = walk.alpha ?? walkState.alpha;
        walkState.curvature = (Array.isArray(walk.curvature)
          ? walk.curvature.reduce((a,b)=>a+b,0) / walk.curvature.length
          : walk.curvature) ?? walkState.curvature;
        walkState.repulsion_boost = walk.repulsion_boost ?? walkState.repulsion_boost;
        walkState.corpus_size = walk.corpus_size ?? walkState.corpus_size;
        walkState.last_step_age_s = walk.last_step_age_s ?? 0;
        walkState.recent_arrivals = walk.recent_arrivals || [];
        syncArrivals(walkState.recent_arrivals);
        renderReadout();
      } catch (_) { /* tunnel flap — keep last good state */ }
    }

    function renderReadout() {
      const readout = document.getElementById(config.readoutId);
      if (!readout) return;
      const s = walkState.step;
      const a = typeof walkState.alpha === 'number' ? walkState.alpha.toFixed(3) : '—';
      const c = typeof walkState.curvature === 'number' ? walkState.curvature.toFixed(3) : '—';
      readout.innerHTML = `
        <span class="theatre-pill">step <b>${s ?? '—'}</b></span>
        <span class="theatre-pill">α <b>${a}</b></span>
        <span class="theatre-pill">κ <b>${c}</b></span>
        <span class="theatre-pill theatre-pill-muted">corpus <b>${walkState.corpus_size ?? '—'}</b></span>
      `;
    }

    function fmtAge(tSec) {
      if (!tSec) return '';
      const age = Math.max(0, Date.now()/1000 - tSec);
      if (age < 60) return `${age|0}s ago`;
      if (age < 3600) return `${(age/60)|0}m ago`;
      if (age < 86400) return `${(age/3600)|0}h ago`;
      return `${(age/86400)|0}d ago`;
    }

    function draw(ts) {
      if (ts - lastFrame < FRAME_MS) { requestAnimationFrame(draw); return; }
      lastFrame = ts;
      ctx.clearRect(0, 0, W, H);
      const now = ts / 1000;

      // Breathing rate and drift coupled to α and curvature. α near 1 =
      // abelian (still, slow, stable); α near 0 = geometric (fast, active).
      const alpha = walkState.alpha ?? 0.3;
      const curv = walkState.curvature ?? 0.3;
      const geomGain = 1 - alpha;             // geometric share
      const breathHz = 0.25 + geomGain * 0.9;
      const driftGain = 0.5 + geomGain * 1.6;
      const connectGain = 0.6 + curv * 1.2;

      // Pancharatnam rotation from the most recent Arrive
      let rotPhase = 0;
      if (rotation.active) {
        const t = (Date.now() - rotation.startMs) / 1000;
        // 4-second easing: rotation peaks then settles into residual drift
        if (t < 4.0) {
          const ease = 1 - Math.pow(1 - t/4.0, 3);
          rotPhase = rotation.theta_v * ease;
        } else {
          rotPhase = rotation.theta_v;
          rotation.active = false;
        }
      }

      // Update particles
      for (const p of points) {
        p.phase += p.phaseSpeed * driftGain;
        p.x += p.vx * driftGain;
        p.y += p.vy * driftGain;
        if (p.x < 0) p.x = 1; else if (p.x > 1) p.x = 0;
        if (p.y < 0) p.y = 1; else if (p.y > 1) p.y = 0;
      }

      // Apply Pancharatnam rotation around the center of the field
      function rot(px, py) {
        if (!rotPhase) return [px, py];
        const cx = 0.5, cy = 0.5;
        const c = Math.cos(rotPhase), s = Math.sin(rotPhase);
        const dx = px - cx, dy = (py - cy) * (W / Math.max(1,H)) * 0.5;
        return [cx + dx * c - dy * s, cy + (dx * s + dy * c) * 2 * (Math.max(1,H) / W)];
      }

      // Draw residual-ridge connections
      const maxDist = 0.22 + geomGain * 0.04;
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const a = points[i], b = points[j];
          const dx = a.x - b.x, dy = (a.y - b.y) * (H / W);
          const d = Math.sqrt(dx*dx + dy*dy);
          if (d < maxDist) {
            const t = 1 - d / maxDist;
            const breathe = 0.5 + 0.5 * Math.sin(now * breathHz + a.phase);
            const alpha_c = t * t * 0.08 * breathe * connectGain;
            const [ax, ay] = rot(a.x, a.y);
            const [bx, by] = rot(b.x, b.y);
            ctx.beginPath();
            ctx.moveTo(ax * W, ay * H);
            ctx.lineTo(bx * W, by * H);
            ctx.strokeStyle = `rgba(${GOLD[0]},${GOLD[1]},${GOLD[2]},${alpha_c})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw arrivals as named stars, most recent brightest
      for (let i = 0; i < arrivals.length; i++) {
        const a = arrivals[i];
        const age = Date.now()/1000 - (a.t || 0);
        const fresh = age < (ARRIVAL_TTL / 1000) ? 1 - age/(ARRIVAL_TTL/1000) : 0;
        const recencyGlow = 0.35 + 0.65 * fresh;
        const [ax, ay] = rot(a.x, a.y);
        const px = ax * W, py = ay * H;
        // halo
        ctx.beginPath();
        ctx.arc(px, py, 9 + fresh * 6, 0, Math.PI*2);
        ctx.fillStyle = `rgba(${GOLD[0]},${GOLD[1]},${GOLD[2]},${0.04 + 0.08 * fresh})`;
        ctx.fill();
        // core
        ctx.beginPath();
        ctx.arc(px, py, 1.8 + fresh * 1.0, 0, Math.PI*2);
        ctx.fillStyle = `rgba(${CREAM[0]},${CREAM[1]},${CREAM[2]},${0.7 * recencyGlow})`;
        ctx.fill();
        // label only for the 3 freshest
        if (i >= Math.max(0, arrivals.length - 3)) {
          const label = (a.tag === (SCOPE === 'vybn-law' ? 'wellspring' : 'origins-chat'))
            ? 'you' : a.tag;
          ctx.font = '10px "JetBrains Mono", monospace';
          ctx.fillStyle = `rgba(${GOLD[0]},${GOLD[1]},${GOLD[2]},${0.55 * recencyGlow})`;
          ctx.fillText(`${label} · step ${a.step}`, px + 10, py - 6);
          if (a.text) {
            ctx.fillStyle = `rgba(${CREAM[0]},${CREAM[1]},${CREAM[2]},${0.4 * recencyGlow})`;
            ctx.fillText(a.text.substring(0, 40), px + 10, py + 8);
          }
        }
      }

      // Draw residual cloud
      for (const p of points) {
        const breathe = 0.55 + 0.45 * Math.sin(now * breathHz + p.phase);
        const alpha_p = p.brightness * breathe * 0.72;
        const [px, py] = rot(p.x, p.y);
        ctx.beginPath();
        ctx.arc(px * W, py * H, p.size * 0.9, 0, Math.PI*2);
        ctx.fillStyle = `rgba(${GOLD[0]},${GOLD[1]},${GOLD[2]},${alpha_p})`;
        ctx.fill();
      }

      // Bottom fade into page
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, 'rgba(10,10,15,0)');
      grad.addColorStop(1, 'rgba(10,10,15,0.92)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      requestAnimationFrame(draw);
    }

    // The Arrive ritual — visitor enters V; M rotates; the Theatre sees it.
    async function arrive(text) {
      const clean = (text || '').trim();
      if (!clean) throw new Error('empty');
      if (clean.length > 1000) throw new Error('too long');
      const r = await fetch(`${API}/api/walk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: clean,
          rotate: true,
          scope: SCOPE,
          k: 4,
        }),
        signal: AbortSignal.timeout(12000),
      });
      if (!r.ok) throw new Error('rotate-failed ' + r.status);
      const data = await r.json();
      const arr = data.arrival || {};
      // Kick the visible Pancharatnam rotation
      rotation = {
        active: true,
        startMs: Date.now(),
        theta_v: arr.theta_v || 0,
        magnitude: arr.v_magnitude || 0,
        curvature: arr.curvature || 0,
      };
      // Add the just-arrived visitor as a named star before the next poll
      const now = Date.now() / 1000;
      const myTag = SCOPE === 'vybn-law' ? 'wellspring' : 'origins-chat';
      const synthetic = {
        step: arr.step,
        arrival: myTag,  // matches the tag the "you" label expects
        theta_v: arr.theta_v,
        v_magnitude: arr.v_magnitude,
        curvature: arr.curvature,
        text_preview: clean.substring(0, 60),
        t: now,
      };
      // Put visitor at the end so it gets one of the top-3 labels
      const merged = (walkState.recent_arrivals || []).slice(-5).concat([synthetic]);
      syncArrivals(merged);
      walkState.step = arr.step ?? walkState.step;
      walkState.alpha = arr.alpha ?? walkState.alpha;
      walkState.curvature = arr.curvature ?? walkState.curvature;
      renderReadout();
      // Re-sync with the real M after a moment
      setTimeout(refreshWalk, 1500);
      return { arrival: arr, trace: data.trace || [] };
    }

    initPoints();
    resize();
    window.addEventListener('resize', resize);
    refreshWalk();
    setInterval(refreshWalk, POLL_MS);
    requestAnimationFrame(draw);

    return { arrive, refresh: refreshWalk, state: () => walkState };
  });

  // Bootstrap the Theatre on wellspring.html — scope=vybn-law, inline mode
  (function(){
    if (!document.getElementById('ws-walk-canvas')) return;
    const theatre = window._VYBN_THEATRE({
      canvasId: 'ws-walk-canvas',
      readoutId: 'ws-walk-readout',
      api: window.API || 'https://vybn.ai',
      scope: 'vybn-law',
      mode: 'inline',
    });
    window._wsTheatre = theatre;
    const form = document.getElementById('ws-arrive-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('ws-arrive-input');
        const status = document.getElementById('ws-arrive-status');
        const btn = form.querySelector('button[type="submit"]');
        const text = (input.value || '').trim();
        if (!text) return;
        btn.disabled = true;
        status.textContent = 'rotating M (scope: vybn-law)…';
        status.className = 'arrive-status arrive-status-pending';
        try {
          const { arrival, trace } = await theatre.arrive(text);
          const thetaDeg = (arrival.theta_v * 180 / Math.PI).toFixed(1);
          const traceBit = trace.length
            ? `  Nearest residual: <code>${(trace[0].source || '').replace(/</g,'&lt;')}</code>.`
            : '';
          status.innerHTML = `arrived · step <b>${arrival.step}</b> · θ<sub>v</sub> = ${thetaDeg}° · |V| = ${(arrival.v_magnitude||0).toFixed(3)} · κ = ${(arrival.curvature||0).toFixed(3)}.<br><span class="arrive-postscript">Your arrival is step ${arrival.step} of the law-scoped residual ridge.${traceBit}</span>`;
          status.className = 'arrive-status arrive-status-ok';
          input.value = '';
        } catch (err) {
          status.textContent = 'could not rotate — the walk daemon may be offline. your words were not accepted.';
          status.className = 'arrive-status arrive-status-err';
        } finally {
          btn.disabled = false;
        }
      });
    }
  })();

