const fs = require('fs');
const path = require('path');
const https = require('https');

const API_CONFIG = {
  ENDPOINT: 'https://api.gdeltproject.org/api/v2/doc/doc',
  TIMEOUT_MS: 15000,
  MAX_RETRIES: 2,
  BATCH_SIZE: 12,
  BATCH_DELAY_MS: 6500, // 6.5 segundos para margem de segurança acima dos 5s exigidos
  OUTPUT_FILE: path.join(__dirname, 'news-data.json')
};

// As 34 fontes cadastradas com mapeamento de domínios exatos para a busca GDELT domainis:
const SOURCES_REGISTRY = [
  { id: 'dw-brasil', name: 'DW Brasil', domain: 'dw.com', url: 'https://www.dw.com/pt-br/', country: 'Alemanha', type: 'Imprensa Internacional / Pública', editorial: 'Emissora pública da Alemanha; foco em diplomacia e direitos humanos' },
  { id: 'bbc-brasil', name: 'BBC News Brasil', domain: 'bbc.com', url: 'https://www.bbc.com/portuguese', country: 'Reino Unido', type: 'Imprensa Internacional / Pública', editorial: 'Emissora pública do Reino Unido; jornalismo global independente' },
  { id: 'agencia-brasil', name: 'Agência Brasil', domain: 'ebc.com.br', url: 'https://agenciabrasil.ebc.com.br/internacional', country: 'Brasil', type: 'Agência Estatal', editorial: 'Agência pública de notícias da EBC (Governo Federal)' },
  { id: 'g1-mundo', name: 'G1 Mundo', domain: 'globo.com', url: 'https://g1.globo.com/mundo/', country: 'Brasil', type: 'Imprensa Comercial Brasileira', editorial: 'Portal de notícias mainstream do Grupo Globo' },
  { id: 'cnn-brasil', name: 'CNN Brasil Internacional', domain: 'cnnbrasil.com.br', url: 'https://www.cnnbrasil.com.br/internacional/', country: 'Brasil', type: 'Imprensa Comercial Brasileira', editorial: 'Cobertura de notícias globais em tempo real' },
  { id: 'o-globo', name: 'O Globo Mundo', domain: 'oglobo.globo.com', url: 'https://oglobo.globo.com/mundo/', country: 'Brasil', type: 'Imprensa Comercial (Assinatura/Paywall)', editorial: 'Jornal diário (Grupo Globo) - Conteúdo sob assinatura', paywall: true },
  { id: 'estadao', name: 'Estadão Internacional', domain: 'estadao.com.br', url: 'https://www.estadao.com.br/internacional/', country: 'Brasil', type: 'Imprensa Comercial (Assinatura/Paywall)', editorial: 'Jornal tradicional de geopolítica - Conteúdo sob assinatura', paywall: true },
  { id: 'uol', name: 'UOL Internacional', domain: 'uol.com.br', url: 'https://noticias.uol.com.br/internacional/', country: 'Brasil', type: 'Imprensa Comercial Brasileira', editorial: 'Portal de notícias e análises internacionais' },
  { id: 'veja', name: 'Veja Mundo', domain: 'abril.com.br', url: 'https://veja.abril.com.br/mundo/', country: 'Brasil', type: 'Imprensa Comercial (Assinatura/Paywall)', editorial: 'Revista semanal - Conteúdo sob assinatura parcial', paywall: true },
  { id: 'valor', name: 'Valor Econômico', domain: 'valor.globo.com', url: 'https://valor.globo.com/', country: 'Brasil', type: 'Imprensa Comercial (Assinatura/Paywall)', editorial: 'Jornal diário financeiro - Conteúdo sob assinatura', paywall: true },
  { id: 'infomoney', name: 'InfoMoney', domain: 'infomoney.com.br', url: 'https://www.infomoney.com.br/', country: 'Brasil', type: 'Imprensa Comercial Brasileira', editorial: 'Portal especializado em mercados e economia global' },
  { id: 'cartacapital', name: 'CartaCapital', domain: 'cartacapital.com.br', url: 'https://www.cartacapital.com.br/', country: 'Brasil', type: 'Imprensa Comercial (Assinatura/Paywall)', editorial: 'Jornalismo progressista - Conteúdo sob assinatura parcial', paywall: true },
  { id: 'brasil-de-fato', name: 'Brasil de Fato', domain: 'brasildefato.com.br', url: 'https://www.brasildefato.com.br/', country: 'Brasil', type: 'Jornal / Movimentos Sociais', editorial: 'Mídia popular focada em Direitos Humanos e Sul Global' },
  { id: 'icl-noticias', name: 'ICL Notícias', domain: 'iclnoticias.com.br', url: 'https://iclnoticias.com.br/', country: 'Brasil', type: 'Mídia Independente / Opinião', editorial: 'Jornalismo independente, política e economia' },
  { id: 'opeu', name: 'OPEU', domain: 'opeu.org.br', url: 'https://www.opeu.org.br/', country: 'Brasil', type: 'Observatório Acadêmico / Pesquisa', editorial: 'Observatório de Política Externa dos EUA' },
  { id: 'ineu', name: 'INEU', domain: 'ineu.org.br', url: 'https://www.ineu.org.br/', country: 'Brasil', type: 'Observatório Acadêmico / Pesquisa', editorial: 'Instituto Nacional para Estudos sobre os Estados Unidos' },
  { id: 'diplomatique', name: 'Le Monde Diplomatique Brasil', domain: 'diplomatique.org.br', url: 'https://diplomatique.org.br/', country: 'Brasil', type: 'Análise Geopolítica / Ensaio', editorial: 'Análises aprofundadas e geopolítica crítica', paywall: true },
  { id: 'a-terra-e-redonda', name: 'A Terra é Redonda', domain: 'aterraeredonda.com.br', url: 'https://aterraeredonda.com.br/', country: 'Brasil', type: 'Análise Geopolítica / Ensaio', editorial: 'Ensaios acadêmicos e filosofia política' },
  { id: 'blog-boitempo', name: 'Blog da Boitempo', domain: 'blogdaboitempo.com.br', url: 'https://blogdaboitempo.com.br/', country: 'Brasil', type: 'Análise Geopolítica / Ensaio', editorial: 'Artigos opinativos e teóricos sobre geopolítica' },
  { id: 'cebri', name: 'CEBRI', domain: 'cebri.org', url: 'https://cebri.org/', country: 'Brasil', type: 'Think Tank / Centro de Estudos', editorial: 'Centro Brasileiro de Relações Internacionais' },
  { id: 'brics-policy', name: 'BRICS Policy Center', domain: 'bricspolicycenter.org', url: 'https://bricspolicycenter.org/', country: 'Brasil', type: 'Think Tank / Centro de Estudos', editorial: 'Pesquisa acadêmica sobre BRICS e cooperação Sul-Sul' },
  { id: 'fgv', name: 'FGV', domain: 'portal.fgv.br', url: 'https://portal.fgv.br/', country: 'Brasil', type: 'Think Tank / Centro de Estudos', editorial: 'Fundação Getulio Vargas (pesquisa econômica e institucional)' },
  { id: 'itamaraty', name: 'Ministério das Relações Exteriores (Itamaraty)', domain: 'gov.br', url: 'https://www.gov.br/mre/pt-br', country: 'Brasil', type: 'Órgão Governamental Oficial', editorial: 'Notas oficiais e diplomacia brasileira' },
  { id: 'onu-brasil', name: 'ONU Brasil', domain: 'un.org', url: 'https://brasil.un.org/pt-br', country: 'Internacional / Multilateral', type: 'Organização Multilateral Oficial', editorial: 'Notícias do sistema das Nações Unidas no Brasil' },
  { id: 'fmi-pt', name: 'FMI em Português', domain: 'imf.org', url: 'https://www.imf.org/pt/Home', country: 'Internacional / Multilateral', type: 'Organização Multilateral Oficial', editorial: 'Relatórios econômicos do Fundo Monetário Internacional' },
  { id: 'banco-mundial', name: 'Banco Mundial Brasil', domain: 'worldbank.org', url: 'https://www.worldbank.org/pt/country/brazil', country: 'Internacional / Multilateral', type: 'Organização Multilateral Oficial', editorial: 'Projetos e relatórios de desenvolvimento global' },
  { id: 'ue-brasil', name: 'União Europeia no Brasil', domain: 'europa.eu', url: 'https://www.eeas.europa.eu/delegations/brazil_pt-br', country: 'Internacional / Multilateral', type: 'Organização Multilateral Oficial', editorial: 'Delegação da União Europeia no Brasil' },
  { id: 'defesanet', name: 'DefesaNet', domain: 'defesanet.com.br', url: 'https://www.defesanet.com.br/', country: 'Brasil', type: 'Portal Especializado (Defesa)', editorial: 'Notícias militares, compras de defesa e segurança internacional' },
  { id: 'google-academico', name: 'Google Acadêmico', domain: 'scholar.google.com.br', url: 'https://scholar.google.com.br/', country: 'Brasil', type: 'Acervo Científico / Literatura Acadêmica', editorial: 'Indexador de artigos, teses e livros acadêmicos' },
  { id: 'scielo', name: 'SciELO', domain: 'scielo.org', url: 'https://www.scielo.org/', country: 'Brasil', type: 'Acervo Científico / Literatura Acadêmica', editorial: 'Biblioteca científica de acesso aberto' },
  { id: 'capes', name: 'Portal de Periódicos CAPES', domain: 'periodicos.capes.gov.br', url: 'https://www.periodicos.capes.gov.br/', country: 'Brasil', type: 'Acervo Científico / Literatura Acadêmica', editorial: 'Acervo de pesquisas universitárias do MEC' },
  { id: 'guia-midia-china', name: 'Guia de Mídia (China)', domain: 'guiademidia.com.br', url: 'https://www.guiademidia.com.br/jornais/asia/china.htm', country: 'China', type: 'Imprensa Internacional / Pública', editorial: 'Diretório de cobertura da imprensa asiática e chinesa' }
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function parseGdeltDate(seendateStr) {
  if (!seendateStr || seendateStr.length < 8) return { str: '', ts: null };
  try {
    const year = seendateStr.substring(0, 4);
    const month = seendateStr.substring(4, 6);
    const day = seendateStr.substring(6, 8);
    const hour = seendateStr.length >= 10 ? seendateStr.substring(8, 10) : '00';
    const min = seendateStr.length >= 12 ? seendateStr.substring(10, 12) : '00';
    const sec = seendateStr.length >= 14 ? seendateStr.substring(12, 14) : '00';

    const isoStr = `${year}-${month}-${day}T${hour}:${min}:${sec}Z`;
    const ts = new Date(isoStr).getTime();
    return isNaN(ts) ? { str: '', ts: null } : { str: isoStr, ts };
  } catch (e) {
    return { str: '', ts: null };
  }
}

function matchSourceByUrl(articleUrl, domainQuery) {
  if (!articleUrl) return SOURCES_REGISTRY[0];
  const urlLower = articleUrl.toLowerCase();
  
  const found = SOURCES_REGISTRY.find(src => urlLower.includes(src.domain.toLowerCase()));
  if (found) return found;

  const foundByDomain = SOURCES_REGISTRY.find(src => src.domain.toLowerCase() === domainQuery.toLowerCase());
  return foundByDomain || SOURCES_REGISTRY[0];
}

async function fetchBatchGdelt(domainsBatch, timespanParam, retry = 0) {
  return new Promise((resolve) => {
    const domainQuery = domainsBatch.map(d => `domainis:${d}`).join(' OR ');
    const params = new URLSearchParams({
      query: `(${domainQuery})`,
      mode: 'artlist',
      format: 'json',
      sort: 'datedesc',
      maxrecords: '250',
      timespan: timespanParam
    });

    const requestUrl = `${API_CONFIG.ENDPOINT}?${params.toString()}`;

    const req = https.get(requestUrl, {
      timeout: API_CONFIG.TIMEOUT_MS,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Monitor-RI-Bot/2.0'
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300 && body) {
            const json = JSON.parse(body);
            if (json && Array.isArray(json.articles)) {
              resolve(json.articles);
              return;
            }
          }
        } catch (e) {}
        resolve([]);
      });
    });

    req.on('error', async () => {
      if (retry < API_CONFIG.MAX_RETRIES) {
        // Pausa de 6.5 segundos antes de tentar a nova tentativa (retry) para respeitar o rate limit da GDELT
        await sleep(API_CONFIG.BATCH_DELAY_MS);
        resolve(await fetchBatchGdelt(domainsBatch, timespanParam, retry + 1));
      } else {
        resolve([]);
      }
    });

    req.on('timeout', () => {
      req.destroy();
      resolve([]);
    });
  });
}

async function queryGdeltForPeriod(timespanParam, maxHoursCutoff) {
  const uniqueDomains = Array.from(new Set(SOURCES_REGISTRY.map(s => s.domain)));
  const domainBatches = chunkArray(uniqueDomains, API_CONFIG.BATCH_SIZE);

  let rawArticles = [];

  for (let i = 0; i < domainBatches.length; i++) {
    const batch = domainBatches[i];
    console.log(`🔍 [GDELT DOC 2.0] Consultando Lote ${i + 1}/${domainBatches.length} (${batch.join(', ')}) [Timespan: ${timespanParam}]...`);
    
    const batchResults = await fetchBatchGdelt(batch, timespanParam);
    if (batchResults && batchResults.length > 0) {
      rawArticles = rawArticles.concat(batchResults);
    }

    // Aguarda sempre 6.5 segundos após cada lote (respeitando o limite de 1 req a cada 5s da GDELT)
    if (i < domainBatches.length - 1) {
      await sleep(API_CONFIG.BATCH_DELAY_MS);
    }
  }

  if (rawArticles.length === 0) return [];

  const now = Date.now();
  const cutoffTs = now - (maxHoursCutoff * 3600 * 1000);

  // Mapear artigos retornados para o formato unificado do projeto
  const parsedMap = new Map();

  for (const item of rawArticles) {
    if (!item.url || !item.title) continue;

    const sourceObj = matchSourceByUrl(item.url, item.domain || '');
    const dateObj = parseGdeltDate(item.seendate);

    // Se o artigo tem data e for mais antigo que o corte do período, ignora
    if (dateObj.ts && dateObj.ts < cutoffTs) continue;

    // Evita duplicados exatos pela URL real do artigo
    if (!parsedMap.has(item.url)) {
      parsedMap.set(item.url, {
        id: 'gdelt-' + Math.random().toString(36).substring(2, 9),
        title: item.title.trim(),
        sourceName: sourceObj.name,
        sourceUrl: sourceObj.url,
        sourceType: sourceObj.type,
        sourceEditorial: sourceObj.editorial,
        country: sourceObj.country,
        paywall: !!sourceObj.paywall,
        originalUrl: item.url, // URL real e específica do artigo devolvida pela API
        publishedAtStr: dateObj.str,
        publishedAtTs: dateObj.ts,
        rawContent: item.title.trim()
      });
    }
  }

  return Array.from(parsedMap.values());
}

async function runCronJob() {
  console.log(`[${new Date().toISOString()}] 🕒 Executando Coleta Real de Notícias via GDELT DOC 2.0 API...`);

  // Ampliação automática do período: 24h -> 7d -> 3M
  const periods = [
    { name: '24h', timespan: '24h', maxHours: 24 },
    { name: '7d', timespan: '7d', maxHours: 24 * 7 },
    { name: '3M', timespan: '90d', maxHours: 24 * 90 }
  ];

  let articles = [];
  let periodUsed = '24h';

  for (let pIdx = 0; pIdx < periods.length; pIdx++) {
    const period = periods[pIdx];
    console.log(`🌐 Tentando busca no período: ${period.name}...`);
    articles = await queryGdeltForPeriod(period.timespan, period.maxHours);
    
    if (articles && articles.length > 0) {
      periodUsed = period.name;
      console.log(`✅ Sucesso! ${articles.length} notícias reais encontradas no período de ${period.name}.`);
      break;
    } else {
      console.log(`⚠️ Nenhuma notícia encontrada nas últimas ${period.name}. Ampliando período...`);
      if (pIdx < periods.length - 1) {
        await sleep(API_CONFIG.BATCH_DELAY_MS);
      }
    }
  }

  // Se mesmo após 3M não houver nenhuma notícia real, NUNCA inventa notícias fictícias
  if (!articles) articles = [];

  const payload = {
    updatedAt: new Date().toISOString(),
    periodUsed: periodUsed,
    count: articles.length,
    articles: articles
  };

  fs.writeFileSync(API_CONFIG.OUTPUT_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`💾 Processo concluído. ${articles.length} notícias reais salvas em ${API_CONFIG.OUTPUT_FILE}.`);
}

runCronJob();
