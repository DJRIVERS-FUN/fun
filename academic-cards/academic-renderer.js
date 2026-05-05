function renderAcademic(containerId, data, options = {}) {
  const source = options.source || 'rivers-academic';
  const itemLabel = options.itemLabel || 'item';
  const wrap = document.getElementById(containerId);
  const state = { decade: 'All', type: 'All', domain: 'All', query: '' };

  wrap.innerHTML = `
    <div class="rivers-academic-controls">
      <div class="rivers-academic-row">
        <input class="rivers-academic-search" placeholder="Search publications, venues, topics..." data-search />
      </div>
      <div class="rivers-academic-row"><span class="rivers-academic-count" data-count></span></div>
      <div class="rivers-academic-row" data-filter="decade"><span class="rivers-academic-label">Decade</span></div>
      <div class="rivers-academic-row" data-filter="type"><span class="rivers-academic-label">Type</span></div>
      <div class="rivers-academic-row" data-filter="domain"><span class="rivers-academic-label">Domain</span></div>
    </div>
    <div class="rivers-academic-grid" data-grid></div>
  `;

  const count = wrap.querySelector('[data-count]');
  const grid = wrap.querySelector('[data-grid]');
  const searchInput = wrap.querySelector('[data-search]');

  data.sort((a, b) => {
    const yearDiff = Number(b.year) - Number(a.year);
    if (yearDiff !== 0) return yearDiff;
    return (a.ref || '').localeCompare(b.ref || '');
  });

  function sendHeight() {
    const h = Math.ceil(wrap.getBoundingClientRect().height) + 2;
    parent.postMessage({ type: 'resize', source, height: h }, '*');
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function highlight(value) {
    const safe = escapeHtml(value);
    const q = state.query.trim();
    if (!q) return safe;
    const pattern = new RegExp(`(${escapeRegExp(q)})`, 'gi');
    return safe.replace(pattern, '<strong class="rivers-academic-match">$1</strong>');
  }

  function decadeOf(year) {
    const y = Number(year);
    return y >= 2020 ? '2020s' : y >= 2010 ? '2010s' : '2000s';
  }

  function valuesFor(key) {
    return ['All', ...Array.from(new Set(data.map(item => key === 'decade' ? decadeOf(item.year) : item[key]).filter(Boolean))).sort()];
  }

  function matchesSearch(item) {
    if (!state.query) return true;
    const q = state.query.toLowerCase();
    return (
      (item.ref && item.ref.toLowerCase().includes(q)) ||
      (item.domain && item.domain.toLowerCase().includes(q)) ||
      (item.type && item.type.toLowerCase().includes(q)) ||
      (item.year && String(item.year).includes(q))
    );
  }

  function visibleItems() {
    return data.filter(item =>
      matchesSearch(item) &&
      (state.decade === 'All' || decadeOf(item.year) === state.decade) &&
      (state.type === 'All' || item.type === state.type) &&
      (state.domain === 'All' || item.domain === state.domain)
    );
  }

  function renderFilters() {
    ['decade', 'type', 'domain'].forEach(key => {
      const row = wrap.querySelector(`[data-filter="${key}"]`);
      row.querySelectorAll('button').forEach(button => button.remove());
      valuesFor(key).forEach(value => {
        const button = document.createElement('button');
        button.className = 'rivers-academic-button' + (state[key] === value ? ' active' : '');
        button.textContent = value;
        button.onclick = () => {
          state[key] = value;
          renderFilters();
          renderCards();
        };
        row.appendChild(button);
      });
    });
  }

  function renderCards() {
    const items = visibleItems();
    grid.innerHTML = '';
    count.textContent = `${items.length} ${itemLabel}${items.length === 1 ? '' : 's'} shown`;

    items.forEach(item => {
      const card = document.createElement('article');
      card.className = 'rivers-academic-card';
      card.innerHTML = `
        <div class="rivers-academic-badges">
          <span class="rivers-academic-badge">${highlight(item.year)}</span>
          <span class="rivers-academic-badge">${highlight(item.type)}</span>
          <span class="rivers-academic-badge">${highlight(item.domain)}</span>
        </div>
        <p class="rivers-academic-ref">${highlight(item.ref)}</p>
      `;
      grid.appendChild(card);
    });

    requestAnimationFrame(sendHeight);
  }

  searchInput.addEventListener('input', (e) => {
    state.query = e.target.value.trim();
    renderCards();
  });

  window.addEventListener('load', sendHeight);
  window.addEventListener('resize', sendHeight);
  renderFilters();
  renderCards();
}
