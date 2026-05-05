function renderAcademic(containerId, data, options = {}) {
  const source = options.source || 'rivers-academic';
  const itemLabel = options.itemLabel || 'item';
  const wrap = document.getElementById(containerId);
  const state = { decade: 'All', type: 'All', domain: 'All' };

  wrap.innerHTML = `
    <div class="rivers-academic-controls">
      <div class="rivers-academic-row"><span class="rivers-academic-count" data-count></span></div>
      <div class="rivers-academic-row" data-filter="decade"><span class="rivers-academic-label">Decade</span></div>
      <div class="rivers-academic-row" data-filter="type"><span class="rivers-academic-label">Type</span></div>
      <div class="rivers-academic-row" data-filter="domain"><span class="rivers-academic-label">Domain</span></div>
    </div>
    <div class="rivers-academic-grid" data-grid></div>
  `;

  const count = wrap.querySelector('[data-count]');
  const grid = wrap.querySelector('[data-grid]');

  data.sort((a, b) => {
    const yearDiff = Number(b.year) - Number(a.year);
    if (yearDiff !== 0) return yearDiff;
    return (a.ref || '').localeCompare(b.ref || '');
  });

  function sendHeight() {
    const h = Math.ceil(wrap.getBoundingClientRect().height) + 2;
    parent.postMessage({ type: 'resize', source, height: h }, '*');
  }

  function decadeOf(year) {
    const y = Number(year);
    return y >= 2020 ? '2020s' : y >= 2010 ? '2010s' : '2000s';
  }

  function valuesFor(key) {
    return ['All', ...Array.from(new Set(data.map(item => key === 'decade' ? decadeOf(item.year) : item[key]).filter(Boolean))).sort()];
  }

  function visibleItems() {
    return data.filter(item =>
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
          <span class="rivers-academic-badge">${item.year}</span>
          <span class="rivers-academic-badge">${item.type}</span>
          <span class="rivers-academic-badge">${item.domain}</span>
        </div>
        <p class="rivers-academic-ref">${item.ref}</p>
      `;
      grid.appendChild(card);
    });

    requestAnimationFrame(sendHeight);
  }

  window.addEventListener('load', sendHeight);
  window.addEventListener('resize', sendHeight);
  renderFilters();
  renderCards();
}
