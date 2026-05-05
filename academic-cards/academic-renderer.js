function renderAcademic(containerId, data, options = {}) {
  const source = options.source || 'rivers-academic';
  const itemLabel = options.itemLabel || 'item';
  const itemLabelPlural = options.itemLabelPlural || `${itemLabel}s`;
  const searchLabel = options.searchLabel || itemLabelPlural;
  const awardInHeader = !!options.awardInHeader;
  const fundingLayout = !!options.fundingLayout;
  const bookLayout = !!options.bookLayout;
  const stripAuthorPrefix = options.stripAuthorPrefix !== false;
  const wrap = document.getElementById(containerId);
  const state = { decade: 'All', type: 'All', domain: 'All', query: '' };

  function stripPrefix(ref) {
    if (!ref || !stripAuthorPrefix) return ref || '';
    const parts = ref.split(',');
    return parts.length > 1 ? parts.slice(1).join(',').trim() : ref;
  }

  function cleanTrailingPeriod(text) {
    return text ? text.replace(/\.$/, '') : '';
  }

  function shortenTitle(title) {
    if (!title) return '';
    if (title.startsWith('SARS-CoV-2 Attitudes and Behaviours')) {
      return 'SARS-CoV-2 Attitudes and Behaviour in Japanese Youth';
    }
    return title;
  }

  function parseFundingRef(ref) {
    if (!ref) return { title: '', funder: '', role: '' };

    const cleaned = ref.trim();
    const roleMatch = cleaned.match(/^.*?\((PI|Co-I)\)\.\s*/i);
    const roleCode = roleMatch ? roleMatch[1].toLowerCase() : '';
    const role = roleCode === 'pi'
      ? 'Principal Investigator'
      : roleCode === 'co-i'
        ? 'Co-Investigator'
        : '';

    const withoutAuthor = roleMatch ? cleaned.slice(roleMatch[0].length).trim() : stripPrefix(cleaned);
    const parts = withoutAuthor.split('. ');

    if (parts.length < 2) {
      return { title: shortenTitle(cleanTrailingPeriod(withoutAuthor)), funder: '', role };
    }

    return {
      title: shortenTitle(cleanTrailingPeriod(parts[0])),
      funder: cleanTrailingPeriod(parts.slice(1).join('. ')),
      role
    };
  }

  function parseBookRef(ref) {
    const lines = String(ref || '').split('\n').map(line => line.trim()).filter(Boolean);
    const title = lines[0] || '';
    const authors = (lines.find(line => line.toLowerCase().startsWith('author:')) || '').replace(/^Author:\s*/i, '');
    const isbnPages = lines.find(line => line.toLowerCase().startsWith('isbn:')) || '';
    const publisherLine = lines.find(line => !line.toLowerCase().startsWith('author:') && !line.toLowerCase().startsWith('isbn:') && line !== title) || '';
    const publisherMatch = publisherLine.match(/^(.*)\s+\((\d{4})\)$/);
    return {
      title,
      authors,
      isbnPages,
      publisher: publisherMatch ? publisherMatch[1] : publisherLine,
      date: publisherMatch ? publisherMatch[2] : ''
    };
  }

  function normalizeDomain(v) {
    if (!v) return v;
    return v.toLowerCase() === 'peer review' ? 'Peer-review' : v;
  }

  wrap.innerHTML = `
    <div class="rivers-academic-controls">
      <div class="rivers-academic-row">
        <input class="rivers-academic-search" placeholder="Search ${searchLabel}, venues, topics..." data-search />
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
    const yearDiff = Number((b.year || '').slice(0, 4)) - Number((a.year || '').slice(0, 4));
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
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function extractAward(item) {
    if (!awardInHeader) return { ref: stripPrefix(item.ref || ''), award: item.award || '' };

    const ref = item.ref || '';
    const match = ref.match(/\s*Award:\s*([^.]*(?:\.[0-9]+)?[^.]*)\.?\s*$/i);

    return {
      ref: match ? ref.slice(0, match.index).trim() : ref,
      award: item.award || (match ? match[1].trim() : '')
    };
  }

  function highlight(value) {
    const safe = escapeHtml(value);
    const q = state.query.trim();
    if (!q) return safe;
    const pattern = new RegExp(`(${escapeRegExp(q)})`, 'gi');
    return safe.replace(pattern, '<strong class="rivers-academic-match">$1</strong>');
  }

  function decadeOf(year) {
    const match = String(year || '').match(/\d{4}/);
    const y = match ? Number(match[0]) : 0;
    return y >= 2020 ? '2020s' : y >= 2010 ? '2010s' : '2000s';
  }

  function valuesFor(key) {
    return ['All', ...Array.from(new Set(data.map(item => key === 'decade' ? decadeOf(item.year) : (key === 'domain' ? normalizeDomain(item[key]) : item[key])).filter(Boolean))).sort()];
  }

  function matchesSearch(item) {
    if (!state.query) return true;
    const q = state.query.toLowerCase();
    const display = extractAward(item);
    const parsed = fundingLayout ? parseFundingRef(display.ref) : null;
    const searchableRef = fundingLayout ? `${parsed.title} ${parsed.funder} ${parsed.role}` : item.ref;
    const award = display.award;
    const domain = normalizeDomain(item.domain);
    return (
      (searchableRef && searchableRef.toLowerCase().includes(q)) ||
      (award && award.toLowerCase().includes(q)) ||
      (domain && domain.toLowerCase().includes(q)) ||
      (item.type && item.type.toLowerCase().includes(q)) ||
      (item.year && String(item.year).includes(q))
    );
  }

  function visibleItems() {
    return data.filter(item =>
      matchesSearch(item) &&
      (state.decade === 'All' || decadeOf(item.year) === state.decade) &&
      (state.type === 'All' || item.type === state.type) &&
      (state.domain === 'All' || normalizeDomain(item.domain) === state.domain)
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

  function renderBadges(item, role = '') {
    const award = extractAward(item).award;
    const domain = normalizeDomain(item.domain);
    return `
      <div class="rivers-academic-badges">
        <span class="rivers-academic-badge">${highlight(item.year)}</span>
        <span class="rivers-academic-badge">${highlight(item.type)}</span>
        <span class="rivers-academic-badge">${highlight(domain)}</span>
        ${award ? `<span class="rivers-academic-badge rivers-academic-award">${highlight(award)}</span>` : ''}
        ${role ? `<span class="rivers-academic-badge rivers-academic-role">${highlight(role)}</span>` : ''}
      </div>
    `;
  }

  function attachImageHandlers(card) {
    const img = card.querySelector('img.rivers-academic-cover');
    if (!img) return;
    img.addEventListener('load', sendHeight);
    img.addEventListener('error', () => {
      const fallback = img.getAttribute('data-fallback');
      if (fallback && img.src !== fallback) {
        img.src = fallback;
      } else {
        img.classList.add('missing-cover');
        img.removeAttribute('src');
        img.setAttribute('alt', 'Cover unavailable');
      }
      sendHeight();
    });
  }

  function renderRef(display) {
    if (bookLayout) {
      const book = parseBookRef(display.ref);
      return `
        <p class="rivers-academic-ref rivers-book-ref">
          <span class="rivers-book-title">${highlight(book.title)}</span>
          ${book.authors ? `<span class="rivers-book-authors">${highlight(book.authors)}</span>` : ''}
          ${book.isbnPages ? `<span class="rivers-book-isbn">${highlight(book.isbnPages)}</span>` : ''}
          ${book.publisher ? `<span class="rivers-book-publisher">${highlight(book.publisher)}</span>` : ''}
          ${book.date ? `<span class="rivers-book-date">${highlight(book.date)}</span>` : ''}
        </p>
      `;
    }

    if (!fundingLayout) {
      return `<p class="rivers-academic-ref">${highlight(stripPrefix(display.ref))}</p>`;
    }

    const parsed = parseFundingRef(display.ref);
    return `
      <p class="rivers-academic-ref rivers-funding-ref">
        <span class="rivers-project-title">${highlight(parsed.title)}</span>
        ${parsed.funder ? `<span class="rivers-funder">${highlight(parsed.funder)}</span>` : ''}
      </p>
    `;
  }

  function renderCards() {
    const items = visibleItems();
    grid.innerHTML = '';
    count.textContent = `${items.length} ${items.length === 1 ? itemLabel : itemLabelPlural} shown`;

    items.forEach(item => {
      const hasImage = !!item.image;
      const card = document.createElement('article');
      card.className = `rivers-academic-card ${hasImage ? 'has-image' : ''}`;
      const display = extractAward(item);
      const parsed = fundingLayout ? parseFundingRef(display.ref) : { role: '' };

      card.innerHTML = hasImage ? `
        <img src="${escapeHtml(item.image)}" data-fallback="${escapeHtml(item.fallbackImage || '')}" class="rivers-academic-cover" alt="Book cover" />
        <div class="rivers-academic-content">
          ${renderBadges(item, parsed.role)}
          ${renderRef(display)}
        </div>
      ` : `
        ${renderBadges(item, parsed.role)}
        ${renderRef(display)}
      `;

      grid.appendChild(card);
      attachImageHandlers(card);
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
