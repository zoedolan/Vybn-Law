# Wellspring entry — 2026-04-22T13:10:26+00:00

## The idea

> are you with me?

## Where it lands

**This walks in company**  
The corpus has material that speaks to this directly. The nearest sits in the research note register. Review the sources below; what you are saying extends or sharpens something already alive in the memory.

## Sources nearby

### 1. Vybn/spark/tests/test_chat_routing.py
_Register:_ research note

> t_user_text="", classify=False,         )         self.assertIsNone(name)         self.assertIsNone(cfg)         self.assertIn("unknown_role", reason)  def test_directive_prefix_detected(self):         name, cfg, reason = self.mod._resolve_role(             explicit_role=None,             last_user_text="/local what's the weather",             classify=False,         )         self.assertEqual(name, "local")         self.assertEqual(reason, "directive=/local")  def test_classify_disabled_means_n

### 2. Vybn/spark/tests/test_lightweight_routing.py
_Register:_ research note

> in saved.items():             if v is None:                 os.environ.pop(k, None)             else:                 os.environ[k] = v     return mod  class TestPolicyHasLightweightRoles(unittest.TestCase):     """The policy ships phatic + identity roles with the expected shape."""  def test_default_policy_has_phatic_and_identity(self):         pol = default_policy()         self.assertIn("phatic", pol.roles)         self.assertIn("identity", pol.roles)  def test_phatic_is_lightweight_and_no_ra

### 3. Vybn/spark/tests/test_harness.py
_Register:_ research note

> ith("directive"))  def test_directive_code(self):         d = self.router.classify("/code write me a script")         self.assertEqual(d.role, "code")  def test_directive_create(self):         d = self.router.classify("/create brainstorm a bunch of ideas")         self.assertEqual(d.role, "create")  def test_heuristic_code(self):         d = self.router.classify("fix this python traceback")         self.assertEqual(d.role, "code")         self.assertTrue(d.reason.startswith("heuristic"))  def te

### 4. Vybn/spark/tests/test_lightweight_routing.py
_Register:_ research note

> ision is actually used.         self.assertIn("{model}", ident.direct_reply_template)         self.assertIn("{provider}", ident.direct_reply_template)  def test_directives_include_new_roles(self):         pol = default_policy()         self.assertEqual(pol.directives.get("/phatic"), "phatic")         self.assertEqual(pol.directives.get("/identity"), "identity")  def test_yaml_policy_mirrors_defaults(self):         # Load the shipped YAML; phatic + identity must be present so         # operators

### 5. Vybn/spark/tests/test_live_repl_fixes.py
_Register:_ research note

> role = self._role("is routing holding after the policy edit?")         self.assertEqual(role, "code", f"'holding' should route to code, got {role!r}")  # --------------------------------------------------------------------------- # Bug 2 — bracket-balanced probe scanner # ---------------------------------------------------------------------------  class TestBracketBalancedProbe(unittest.TestCase):     """The probe scanner survives ']' inside the command body."""  def setUp(self):         self.pr

### 6. Vybn/spark/tests/test_chat_routing.py
_Register:_ research note

> role="local",             route="auto",         )         self.assertEqual(req.role, "local")         self.assertEqual(req.route, "auto")  def test_chat_request_legacy_clients_unchanged(self):         # No role, no route — must still validate.         req = self.mod.ChatRequest(             messages=[self.mod.Message(role="user", content="hi")],         )         self.assertIsNone(req.role)         self.assertIsNone(req.route)         self.assertTrue(req.rag)  # legacy default preserved  def tes

---

_Committed from the Wellspring pressure-test surface._
