/**
 * app.js - Módulo Principal de Orquestração do Portal de Relações Internacionais
 * 
 * Gerencia o estado da aplicação, troca de abas, renderização dos cards densos,
 * polling de atualização automática a cada 15 min e filtros combinados.
 */

document.addEventListener('DOMContentLoaded', () => {
  PortalApp.init();
});

const PortalApp = {
  state: {
    activeTab: 'tab-hoje',
    rawArticles: [],
    aggregatedArticles: [],
    filteredArticles: [],
    filters: {
      keyword: '',
      dateStart: '',
      dateEnd: '',
      subject: '',
      type: '',
      country: '',
      source: ''
    }
  },

  async init() {
    this.bindDOM();
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);

    // Carregar notícias em tempo real
    await this.loadNewsStream();

    // Configurar polling automático a cada 15 minutos (900.000 ms)
    setInterval(() => {
      console.log('⏰ Polling automático de 15 minutos disparado...');
      this.loadNewsStream();
    }, 15 * 60 * 1000);
  },

  bindDOM() {
    // Abas
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetTab = btn.getAttribute('data-tab');
        this.switchTab(targetTab);
      });
    });

    // Botão de Refresh
    document.getElementById('btn-refresh').addEventListener('click', () => {
      this.loadNewsStream();
    });

    // Filtros da Busca
    document.getElementById('btn-apply-filters').addEventListener('click', () => {
      this.applyFilters();
    });

    document.getElementById('btn-clear-filters').addEventListener('click', () => {
      this.clearFilters();
    });

    // Botão de PDF (PROBLEMA 4: Passa os artigos efetivamente filtrados)
    document.getElementById('btn-export-pdf').addEventListener('click', () => {
      pdfReportGenerator.generatePdf(this.state.filteredArticles, this.state.filters);
    });

    // Popular opções do filtro de veículos
    const sourceSelect = document.getElementById('filter-source');
    if (sourceSelect && typeof SOURCES_REGISTRY !== 'undefined') {
      SOURCES_REGISTRY.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.name;
        opt.textContent = `${s.name} (${s.country})`;
        sourceSelect.appendChild(opt);
      });
    }
  },

  updateClock() {
    const el = document.getElementById('current-date-time');
    if (el) {
      const now = new Date();
      el.textContent = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
  },

  switchTab(tabId) {
    this.state.activeTab = tabId;

    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    const activePanel = document.getElementById(tabId);

    if (activeBtn) activeBtn.classList.add('active');
    if (activePanel) activePanel.classList.add('active');

    if (tabId === 'tab-busca') {
      this.applyFilters();
    }
  },

  showStatus(msg) {
    const bar = document.getElementById('status-bar');
    const txt = document.getElementById('status-message');
    if (bar && txt) {
      txt.textContent = msg;
      bar.classList.remove('hidden');
    }
  },

  hideStatus() {
    const bar = document.getElementById('status-bar');
    if (bar) bar.classList.add('hidden');
  },

  async loadNewsStream() {
    this.showStatus('📡 Consultando 34 fontes internacionais em tempo real...');

    try {
      this.state.rawArticles = await newsApiClient.fetchLiveNews();
      this.state.aggregatedArticles = newsAggregator.aggregateDuplicateArticles(this.state.rawArticles);

      this.renderHojeTab();
      this.applyFilters();

      // Atualizar o player de áudio/texto do canto inferior direito
      summaryPlayer.updateTop5(this.state.aggregatedArticles);

      this.hideStatus();
    } catch (err) {
      console.error('Erro ao carregar fluxo de notícias:', err);
      this.showStatus('⚠️ Falha de conexão ao buscar notícias. Tentando novamente...');
    }
  },

  /**
   * Renderiza a Aba HOJE (Últimas 48 horas)
   */
  renderHojeTab() {
    const grid = document.getElementById('hoje-grid');
    const heroContainer = document.getElementById('featured-hero-container');
    const emptyState = document.getElementById('hoje-empty-state');
    const countTag = document.getElementById('hoje-count-tag');

    grid.innerHTML = '';
    heroContainer.innerHTML = '';

    const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
    const now = Date.now();

    // Filtrar estritamente notícias das últimas 48 horas
    const hojeArticles = this.state.aggregatedArticles.filter(item => {
      if (item.latestTimestamp) {
        return (now - item.latestTimestamp) <= FORTY_EIGHT_HOURS_MS;
      }
      return true;
    });

    countTag.textContent = `${hojeArticles.length} matérias nas últimas 48h`;

    if (hojeArticles.length === 0) {
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');

    // 1. Destaque Principal no Topo (Hero Card)
    const heroArticle = hojeArticles.reduce((prev, current) => {
      const prevScore = (prev.sources.length * 2) + (prev.primarySubject.includes('Brasil') ? 3 : 0);
      const currentScore = (current.sources.length * 2) + (current.primarySubject.includes('Brasil') ? 3 : 0);
      return currentScore > prevScore ? current : prev;
    }, hojeArticles[0]);

    heroContainer.appendChild(this.createHeroElement(heroArticle));

    // 2. Restante das matérias em Cards Densos (excluindo a do destaque)
    const remaining = hojeArticles.filter(a => a.id !== heroArticle.id);
    remaining.forEach(item => {
      grid.appendChild(this.createCardElement(item));
    });
  },

  createHeroElement(item) {
    const div = document.createElement('div');
    div.className = 'hero-card';

    const sourcesListText = item.sources.map(s => s.name).join(', ');
    const timeAgo = this.formatTimeAgo(item.latestTimestamp);

    div.innerHTML = `
      <div class="hero-header-meta">
        <span class="badge-featured">⭐ DESTAQUE PRINCIPAL DA CONJUNTURA</span>
        <span class="badge-subject" style="background-color: ${this.getSubjectColor(item.primarySubject)}">${item.primarySubject}</span>
        <span class="card-time">Publicado há ${timeAgo}</span>
      </div>

      <h2>
        <a href="${item.originalUrl}" target="_blank" rel="noopener noreferrer">${item.canonicalTitle}</a>
      </h2>

      <p class="hero-summary">${item.summary}</p>

      <div class="hero-sources-list">
        <strong>Publicado em simultâneo por ${item.sources.length} veículo(s):</strong> ${sourcesListText} | 
        <strong>País de Origem:</strong> ${item.country} | <strong>Natureza:</strong> ${item.sourceType}
        ${item.paywall ? '<span class="card-paywall-notice"> [CONTEÚDO SOB ASSINATURA / PAYWALL]</span>' : ''}
      </div>
    `;

    return div;
  },

  createCardElement(item) {
    const card = document.createElement('div');
    card.className = 'news-card';

    const timeAgo = this.formatTimeAgo(item.latestTimestamp);
    const sourcesListText = item.sources.map(s => s.name).join(', ');
    const color = this.getSubjectColor(item.primarySubject);

    // Checar saúde do link em tempo real
    const linkStatus = linkChecker.healthMap[item.originalUrl] || { status: 'ok', text: 'Link Ativo' };

    card.innerHTML = `
      <div>
        <div class="card-top-meta">
          <span class="badge-subject" style="background-color: ${color}">${item.primarySubject}</span>
          <span class="card-time">${timeAgo}</span>
        </div>
        ${item.secondarySubjects.map(s => `<span class="badge-secondary-subject">${s}</span>`).join(' ')}

        <h3 class="card-title" style="margin-top: 8px;">
          <a href="${item.originalUrl}" target="_blank" rel="noopener noreferrer">${item.canonicalTitle}</a>
        </h3>
      </div>

      <p class="card-summary">${item.summary}</p>

      <div class="card-source-info">
        <div class="card-sources-list">
          📍 ${sourcesListText} (${item.country})
        </div>
        <div>
          <span>Natureza: ${item.sourceType}</span>
          ${item.paywall ? '<span class="card-paywall-notice"> • ASSINATURA</span>' : ''}
        </div>
        <div class="card-link-status ${linkStatus.status === 'ok' ? 'link-ok' : 'link-warn'}">
          ${linkStatus.text}
        </div>
      </div>
    `;

    return card;
  },

  formatTimeAgo(timestamp) {
    if (!timestamp) return 'Data recente';
    const diffMs = Date.now() - timestamp;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) return `${diffHours}h ${diffMins}min atrás`;
    return `${diffMins}min atrás`;
  },

  getSubjectColor(subject) {
    const map = {
      'Política internacional': '#1e40af',
      'Política externa e diplomacia': '#0369a1',
      'Guerras e conflitos': '#991b1b',
      'Segurança internacional e terrorismo': '#c2410c',
      'Defesa e forças armadas': '#3f6212',
      'Geopolítica e grandes potências': '#4c1d95',
      'Economia internacional e comércio': '#047857',
      'Finanças internacionais e instituições econômicas': '#0f766e',
      'Organizações internacionais e integração regional': '#1d4ed8',
      'Direito internacional e direitos humanos': '#6b21a8',
      'Meio ambiente e mudanças climáticas': '#15803d',
      'Energia e recursos estratégicos': '#b45309',
      'Migrações e refugiados': '#475569',
      'Ciência tecnologia e cibersegurança': '#0284c7',
      'Política e conflitos na América Latina': '#166534',
      'Política e conflitos na Europa': '#1e3a8a',
      'Política e conflitos na Ásia': '#9f1239',
      'Política e conflitos no Oriente Médio e África': '#854d0e',
      'Brasil e política externa brasileira': '#15803d',
      'Sul Global e relações Norte-Sul': '#a16207',
      'Esporte': '#dc2626',
      'Economia': '#047857',
      'Justiça': '#312e81',
      'Saúde': '#0d9488',
      'Cultura': '#805ad5'
    };
    return map[subject] || '#334155';
  },

  /**
   * Normaliza texto para busca case-insensitive e insensível a acentuação
   */
  normalizeText(str) {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  },

  applyFilters() {
    this.state.filters = {
      keyword: this.normalizeText(document.getElementById('filter-keyword').value.trim()),
      dateStart: document.getElementById('filter-date-start').value,
      dateEnd: document.getElementById('filter-date-end').value,
      subject: document.getElementById('filter-subject').value,
      type: document.getElementById('filter-type').value,
      country: document.getElementById('filter-country').value,
      source: document.getElementById('filter-source').value
    };

    const f = this.state.filters;

    this.state.filteredArticles = this.state.aggregatedArticles.filter(item => {
      // 1. Palavra-chave (PROBLEMA 4: Busca estrita no Título E no Resumo de forma insensível a acentos)
      if (f.keyword) {
        const titleNormalized = this.normalizeText(item.canonicalTitle);
        const summaryNormalized = this.normalizeText(item.summary);
        
        const matchTitle = titleNormalized.includes(f.keyword);
        const matchSummary = summaryNormalized.includes(f.keyword);

        if (!matchTitle && !matchSummary) return false;
      }

      // 2. Assunto Principal
      if (f.subject && item.primarySubject !== f.subject) {
        return false;
      }

      // 3. Tipo de Veículo
      if (f.type && item.sourceType !== f.type) {
        return false;
      }

      // 4. País
      if (f.country && item.country !== f.country) {
        return false;
      }

      // 5. Veículo Específico
      if (f.source && !item.sources.some(s => s.name === f.source)) {
        return false;
      }

      // 6. Datas
      if (f.dateStart && item.latestTimestamp) {
        const startTs = new Date(f.dateStart).getTime();
        if (item.latestTimestamp < startTs) return false;
      }

      if (f.dateEnd && item.latestTimestamp) {
        const endTs = new Date(f.dateEnd).getTime() + (24 * 60 * 60 * 1000);
        if (item.latestTimestamp > endTs) return false;
      }

      return true;
    });

    this.renderBuscaTab();
  },

  clearFilters() {
    document.getElementById('search-form').reset();
    this.applyFilters();
  },

  renderBuscaTab() {
    const grid = document.getElementById('busca-grid');
    const emptyState = document.getElementById('busca-empty-state');
    const countTag = document.getElementById('busca-count-tag');

    grid.innerHTML = '';
    countTag.textContent = `${this.state.filteredArticles.length} notícias encontradas`;

    if (this.state.filteredArticles.length === 0) {
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');

    this.state.filteredArticles.forEach(item => {
      grid.appendChild(this.createCardElement(item));
    });
  }
};
