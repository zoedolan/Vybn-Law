(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('motion-ready');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.09, rootMargin: '0px 0px -4% 0px' });
    document.querySelectorAll('.reveal').forEach((node) => observer.observe(node));
  }

  const views = {
    litigant: {
      speaker: 'Person',
      question: '“I need to know when my appellate filing is due.”',
      label: 'Guidance assistant',
      title: 'I cannot calculate that from the information provided.',
      copy: 'First I need the court, case type, filing, triggering event, event date, and any service facts the governing rules make relevant.',
      ask: 'Collect only the missing facts needed for the selected workflow.',
      retrieve: 'Open the adopted statewide rule, local rule, and court instruction.',
      explain: 'Label what is required, permitted, uncertain, and not found.',
      control: 'Show the source-linked calculation and let the person review every input.'
    },
    clerk: {
      speaker: 'Court staff member',
      question: '“This filing may be late. What should I check before issuing a deficiency notice?”',
      label: 'Clerk-side reference tool',
      title: 'Open the same verified guidance package before reaching a conclusion.',
      copy: 'Confirm the filing type, triggering event, event date, service facts, accepted filing channels, and any exception or court-specific instruction.',
      ask: 'Identify the facts the deficiency decision actually depends on.',
      retrieve: 'Open the same adopted rules and instructions visible to the public-facing tool.',
      explain: 'Show the requirement, source, calculation, exception check, and unresolved point.',
      control: 'Leave the staff decision to authorized personnel and produce a clear correction path.'
    }
  };
  const ids = {
    speaker: 'sampleSpeaker', question: 'sampleQuestion', label: 'responseLabel',
    title: 'responseTitle', copy: 'responseCopy', ask: 'askText',
    retrieve: 'retrieveText', explain: 'explainText', control: 'controlText'
  };
  document.querySelectorAll('[data-role]').forEach((button) => {
    button.addEventListener('click', () => {
      const view = views[button.dataset.role];
      if (!view) return;
      document.querySelectorAll('[data-role]').forEach((item) => {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      Object.entries(ids).forEach(([key, id]) => {
        const node = document.getElementById(id);
        if (node) node.textContent = view[key];
      });
    });
  });
})();
