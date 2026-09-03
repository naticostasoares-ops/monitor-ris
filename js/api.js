/**
 * api.js - Módulo de Leitura de Dados no Navegador
 * 
 * ATUALIZAÇÃO E REGRAS DE SEGURANÇA:
 * 1. O navegador NÃO faz NENHUMA chamada direta a APIs externas nem possui nenhuma chave de API.
 * 2. Toda a busca, consumo e atualização das notícias ocorrem no servidor via rotina agendada (fetch-news.js).
 * 3. O navegador apenas lê o arquivo estático 'news-data.json' gerado pelo agendador.
 * 4. Não há NENHUMA função de geração de notícias fictícias/fallback simulado. Caso o arquivo esteja vazio
 *    ou sem notícias, o site exibirá mensagem clara de "Sem notícias no período".
 */

const API_CONFIG = {
  CRON_JSON_URL: './news-data.json',
  CACHE_KEY: 'ri_portal_news_cache',
  CACHE_TTL_MS: 15 * 60 * 1000 // 15 minutos
};

// As 34 fontes cadastradas no projeto
const SOURCES_REGISTRY = [
  { id: 'dw-brasil', name: 'DW Brasil', url: 'https://www.dw.com/pt-br/', country: 'Alemanha', type: 'Imprensa Internacional / Pública', editorial: 'Emissora pública da Alemanha; foco em diplomacia e direitos humanos' },
  { id: 'bbc-brasil', name: 'BBC News Brasil', url: 'https://www.bbc.com/portuguese', country: 'Reino Unido', type: 'Imprensa Internacional / Pública', editorial: 'Emissora pública do Reino Unido; jornalismo global independente' },
  { id: 'agencia-brasil', name: 'Agência Brasil', url: 'https://agenciabrasil.ebc.com.br/internacional', country: 'Brasil', type: 'Agência Estatal', editorial: 'Agência pública de notícias da EBC (Governo Federal)' },
  { id: 'g1-mundo', name: 'G1 Mundo', url: 'https://g1.globo.com/mundo/', country: 'Brasil', type: 'Imprensa Comercial Brasileira', editorial: 'Portal de notícias mainstream do Grupo Globo' },
  { id: 'cnn-brasil', name: 'CNN Brasil Internacional', url: 'https://www.cnnbrasil.com.br/internacional/', country: 'Brasil', type: 'Imprensa Comercial Brasileira', editorial: 'Cobertura de notícias globais em tempo real' },
  { id: 'o-globo', name: 'O Globo Mundo', url: 'https://oglobo.globo.com/mundo/', country: 'Brasil', type: 'Imprensa Comercial (Assinatura/Paywall)', editorial: 'Jornal diário (Grupo Globo) - Conteúdo sob assinatura', paywall: true },
  { id: 'estadao', name: 'Estadão Internacional', url: 'https://www.estadao.com.br/internacional/', country: 'Brasil', type: 'Imprensa Comercial (Assinatura/Paywall)', editorial: 'Jornal tradicional de geopolítica - Conteúdo sob assinatura', paywall: true },
  { id: 'uol', name: 'UOL Internacional', url: 'https://noticias.uol.com.br/internacional/', country: 'Brasil', type: 'Imprensa Comercial Brasileira', editorial: 'Portal de notícias e análises internacionais' },
  { id: 'veja', name: 'Veja Mundo', url: 'https://veja.abril.com.br/mundo/', country: 'Brasil', type: 'Imprensa Comercial (Assinatura/Paywall)', editorial: 'Revista semanal - Conteúdo sob assinatura parcial', paywall: true },
  { id: 'valor', name: 'Valor Econômico', url: 'https://valor.globo.com/', country: 'Brasil', type: 'Imprensa Comercial (Assinatura/Paywall)', editorial: 'Jornal diário financeiro - Conteúdo sob assinatura', paywall: true },
  { id: 'infomoney', name: 'InfoMoney', url: 'https://www.infomoney.com.br/', country: 'Brasil', type: 'Imprensa Comercial Brasileira', editorial: 'Portal especializado em mercados e economia global' },
  { id: 'cartacapital', name: 'CartaCapital', url: 'https://www.cartacapital.com.br/', country: 'Brasil', type: 'Imprensa Comercial (Assinatura/Paywall)', editorial: 'Jornalismo progressista - Conteúdo sob assinatura parcial', paywall: true },
  { id: 'brasil-de-fato', name: 'Brasil de Fato', url: 'https://www.brasildefato.com.br/', country: 'Brasil', type: 'Jornal / Movimentos Sociais', editorial: 'Mídia popular focada em Direitos Humanos e Sul Global' },
  { id: 'icl-noticias', name: 'ICL Notícias', url: 'https://iclnoticias.com.br/', country: 'Brasil', type: 'Mídia Independente / Opinião', editorial: 'Jornalismo independente, política e economia' },
  { id: 'opeu', name: 'OPEU', url: 'https://www.opeu.org.br/', country: 'Brasil', type: 'Observatório Acadêmico / Pesquisa', editorial: 'Observatório de Política Externa dos EUA' },
  { id: 'ineu', name: 'INEU', url: 'https://www.ineu.org.br/', country: 'Brasil', type: 'Observatório Acadêmico / Pesquisa', editorial: 'Instituto Nacional para Estudos sobre os Estados Unidos' },
  { id: 'diplomatique', name: 'Le Monde Diplomatique Brasil', url: 'https://diplomatique.org.br/', country: 'Brasil', type: 'Análise Geopolítica / Ensaio', editorial: 'Análises aprofundadas e geopolítica crítica', paywall: true },
  { id: 'a-terra-e-redonda', name: 'A Terra é Redonda', url: 'https://aterraeredonda.com.br/', country: 'Brasil', type: 'Análise Geopolítica / Ensaio', editorial: 'Ensaios acadêmicos e filosofia política' },
  { id: 'blog-boitempo', name: 'Blog da Boitempo', url: 'https://blogdaboitempo.com.br/', country: 'Brasil', type: 'Análise Geopolítica / Ensaio', editorial: 'Artigos opinativos e teóricos sobre geopolítica' },
  { id: 'cebri', name: 'CEBRI', url: 'https://cebri.org/', country: 'Brasil', type: 'Think Tank / Centro de Estudos', editorial: 'Centro Brasileiro de Relações Internacionais' },
  { id: 'brics-policy', name: 'BRICS Policy Center', url: 'https://bricspolicycenter.org/', country: 'Brasil', type: 'Think Tank / Centro de Estudos', editorial: 'Pesquisa acadêmica sobre BRICS e cooperação Sul-Sul' },
  { id: 'fgv', name: 'FGV', url: 'https://portal.fgv.br/', country: 'Brasil', type: 'Think Tank / Centro de Estudos', editorial: 'Fundação Getulio Vargas (pesquisa econômica e institucional)' },
  { id: 'itamaraty', name: 'Ministério das Relações Exteriores (Itamaraty)', url: 'https://www.gov.br/mre/pt-br', country: 'Brasil', type: 'Órgão Governamental Oficial', editorial: 'Notas oficiais e diplomacia brasileira' },
  { id: 'onu-brasil', name: 'ONU Brasil', url: 'https://brasil.un.org/pt-br', country: 'Internacional / Multilateral', type: 'Organização Multilateral Oficial', editorial: 'Notícias do sistema das Nações Unidas no Brasil' },
  { id: 'fmi-pt', name: 'FMI em Português', url: 'https://www.imf.org/pt/Home', country: 'Internacional / Multilateral', type: 'Organização Multilateral Oficial', editorial: 'Relatórios econômicos do Fundo Monetário Internacional' },
  { id: 'banco-mundial', name: 'Banco Mundial Brasil', url: 'https://www.worldbank.org/pt/country/brazil', country: 'Internacional / Multilateral', type: 'Organização Multilateral Oficial', editorial: 'Projetos e relatórios de desenvolvimento global' },
  { id: 'ue-brasil', name: 'União Europeia no Brasil', url: 'https://www.eeas.europa.eu/delegations/brazil_pt-br', country: 'Internacional / Multilateral', type: 'Organização Multilateral Oficial', editorial: 'Delegação da União Europeia no Brasil' },
  { id: 'defesanet', name: 'DefesaNet', url: 'https://www.defesanet.com.br/', country: 'Brasil', type: 'Portal Especializado (Defesa)', editorial: 'Notícias militares, compras de defesa e segurança internacional' },
  { id: 'google-academico', name: 'Google Acadêmico', url: 'https://scholar.google.com.br/', country: 'Brasil', type: 'Acervo Científico / Literatura Acadêmica', editorial: 'Indexador de artigos, teses e livros acadêmicos' },
  { id: 'scielo', name: 'SciELO', url: 'https://www.scielo.org/', country: 'Brasil', type: 'Acervo Científico / Literatura Acadêmica', editorial: 'Biblioteca científica de acesso aberto' },
  { id: 'capes', name: 'Portal de Periódicos CAPES', url: 'https://www.periodicos.capes.gov.br/', country: 'Brasil', type: 'Acervo Científico / Literatura Acadêmica', editorial: 'Acervo de pesquisas universitárias do MEC' },
  { id: 'guia-midia-china', name: 'Guia de Mídia (China)', url: 'https://www.guiademidia.com.br/jornais/asia/china.htm', country: 'China', type: 'Imprensa Internacional / Pública', editorial: 'Diretório de cobertura da imprensa asiática e chinesa' }
];

class NewsApiClient {
  constructor() {
    this.cache = this.loadCache();
  }

  loadCache() {
    try {
      const raw = localStorage.getItem(API_CONFIG.CACHE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (Date.now() - data.timestamp < API_CONFIG.CACHE_TTL_MS) {
        console.log('⚡ Dados recuperados do Cache Local em localStorage.');
        return data.news;
      }
    } catch (e) {
      console.warn('Erro ao ler cache local:', e);
    }
    return null;
  }

  saveCache(newsList) {
    try {
      localStorage.setItem(API_CONFIG.CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        news: newsList
      }));
    } catch (e) {
      console.warn('Erro ao gravar cache local:', e);
    }
  }

  /**
   * Lê estritamente o arquivo JSON estático 'news-data.json' atualizado pela rotina agendada.
   * Não faz nenhuma requisição externa a APIs nem inventa notícias fictícias.
   */
  async fetchLiveNews(subjectFilter = '', keyword = '') {
    if (this.cache && !keyword && !subjectFilter) {
      return this.cache;
    }

    try {
      console.log('🔄 Lendo arquivo estático de notícias (news-data.json)...');
      const response = await fetch(`${API_CONFIG.CRON_JSON_URL}?t=${Date.now()}`);
      
      if (response.ok) {
        const payload = await response.json();
        if (payload && Array.isArray(payload.articles)) {
          console.log(`✅ ${payload.articles.length} notícias lidas do arquivo da rotina agendada.`);
          if (!keyword && !subjectFilter) {
            this.saveCache(payload.articles);
          }
          return payload.articles;
        }
      } else {
        console.warn(`Aviso ao ler news-data.json: HTTP ${response.status}`);
      }
    } catch (e) {
      console.error('Erro ao ler news-data.json:', e);
    }

    // Se o arquivo estiver indisponível ou sem notícias, retorna lista vazia
    return [];
  }
}

const newsApiClient = new NewsApiClient();
