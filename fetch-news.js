const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const API_CONFIG = {
  ENDPOINT: 'https://api.gdeltproject.org/api/v2/doc/doc',
  TIMEOUT_MS: 15000,
  MAX_RETRIES: 2,
  BATCH_SIZE: 6,
  BATCH_DELAY_MS: 7000,
  OUTPUT_FILE: path.join(__dirname, 'news-data.json')
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

function extractExactDomain(urlString) {
  try {
    const parsed = new URL(urlString);
    let host = parsed.hostname.toLowerCase();
    if (host.startsWith('www.')) {
      host = host.substring(4);
    }
    return host;
  } catch (e) {
    return '';
  }
}

SOURCES_REGISTRY.forEach(src => {
  src.domain = extractExactDomain(src.url);
});

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

/**
 * Restaura palavras corrompidas sem acentuação (ex: 'explicaes' -> 'explicações', 'construo' -> 'construção')
 * utilizando o slug limpo da URL original do veículo de imprensa.
 */
function restoreTitleFromUrl(title, url) {
  if (!title || !url) return title;

  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return title;

    let slug = segments[segments.length - 1];
    slug = slug.replace(/\.(ghtml|html|htm|php|amp)$/i, '').replace(/-npr$/i, '');

    const slugWords = slug.split('-').filter(w => w.length > 2);
    if (slugWords.length === 0) return title;

    let words = title.split(' ');
    let fixedWords = words.map(w => {
      const cleanWord = w.toLowerCase().replace(/[^\wçáàâãéêíóôõúü]/gi, '');
      if (cleanWord.length > 3) {
        const matchSlug = slugWords.find(sw => {
          if (sw.startsWith(cleanWord) || cleanWord.startsWith(sw)) return true;
          const cleanWordNormalized = cleanWord.replace(/ao$/, 'cao').replace(/es$/, 'coes');
          return sw === cleanWordNormalized || sw.includes(cleanWordNormalized);
        });

        if (matchSlug && matchSlug !== cleanWord) {
          if (matchSlug.includes('cao') && w.toLowerCase().endsWith('ao')) {
            return w.replace(/ao$/i, 'ção').replace(/ao$/g, 'ção');
          }
          if (matchSlug.includes('coes') && w.toLowerCase().endsWith('es')) {
            return w.replace(/es$/i, 'ções').replace(/es$/g, 'ções');
          }
        }
      }
      return w;
    });

    let restored = fixedWords.join(' ');
    if (restored.startsWith('ó ') && slug.startsWith('so-')) {
      restored = 'Só ' + restored.substring(2);
    }

    return restored;
  } catch (e) {
    return title;
  }
}

/**
 * Parse correto de seendate da GDELT (Exemplo: "20260903T223704Z")
 */
function parseGdeltDate(seendateStr) {
  if (!seendateStr || seendateStr.length < 8) return { str: '', ts: null };
  try {
    if (seendateStr.includes('T')) {
      const parts = seendateStr.split('T');
      const dPart = parts[0];
      const tPart = parts[1].replace('Z', '');

      const year = dPart.substring(0, 4);
      const month = dPart.substring(4, 6);
      const day = dPart.substring(6, 8);

      const hour = tPart.length >= 2 ? tPart.substring(0, 2) : '00';
      const min = tPart.length >= 4 ? tPart.substring(2, 4) : '00';
      const sec = tPart.length >= 6 ? tPart.substring(4, 6) : '00';

      const isoStr = `${year}-${month}-${day}T${hour}:${min}:${sec}Z`;
      const ts = new Date(isoStr).getTime();
      return isNaN(ts) ? { str: '', ts: null } : { str: isoStr, ts };
    }

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
    const domainQuery = domainsBatch.map(d => `domain:${d}`).join(' OR ');
    const params = new URLSearchParams({
      query: `(${domainQuery}) sourcelang:portuguese`,
      mode: 'artlist',
      format: 'json',
      sort: 'datedesc',
      maxrecords: '250',
      timespan: timespanParam
    });

    const requestUrl = `${API_CONFIG.ENDPOINT}?${params.toString()}`;

    console.log(`📡 [DIAGNÓSTICO REQUISIÇÃO] (Tentativa ${retry + 1}) URL: ${requestUrl}`);

    const req = https.get(requestUrl, {
      timeout: API_CONFIG.TIMEOUT_MS,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Monitor-RI-Bot/2.0'
      }
    }, async (res) => {
      res.setEncoding('utf8');
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', async () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          console.warn(`⚠️ [DIAGNÓSTICO AVISO] Resposta HTTP ${res.statusCode}: ${body.substring(0, 150)}`);

          if (retry < API_CONFIG.MAX_RETRIES) {
            let retryWaitMs = API_CONFIG.BATCH_DELAY_MS + 3000;
            const retryAfterHeader = res.headers['retry-after'];
            if (retryAfterHeader) {
              const seconds = parseInt(retryAfterHeader, 10);
              if (!isNaN(seconds) && seconds > 0) {
                retryWaitMs = seconds * 1000;
                console.log(`⏳ Cabeçalho Retry-After detectado: aguardando ${seconds}s antes da tentativa ${retry + 2}...`);
              }
            } else {
              console.log(`⏳ Status HTTP ${res.statusCode} detectado. Aguardando ${retryWaitMs / 1000}s para tentativa ${retry + 2}...`);
            }

            await sleep(retryWaitMs);
            const retryResults = await fetchBatchGdelt(domainsBatch, timespanParam, retry + 1);
            resolve(retryResults);
            return;
          }

          console.log(`📥 [DIAGNÓSTICO RESPOSTA] Lote finalizado com status HTTP ${res.statusCode} (0 artigos).`);
          resolve([]);
          return;
        }

        try {
          if (body) {
            const json = JSON.parse(body);
            if (json && Array.isArray(json.articles)) {
              console.log(`📥 [DIAGNÓSTICO RESPOSTA] ${json.articles.length} artigos recebidos na resposta BRUTA da API GDELT.`);
              resolve(json.articles);
              return;
            }
          }
        } catch (e) {
          console.warn(`⚠️ [DIAGNÓSTICO PARSE ERROR]: ${e.message}. Resposta recebida: ${body.substring(0, 150)}`);
        }

        console.log(`📥 [DIAGNÓSTICO RESPOSTA] 0 artigos recebidos para este lote.`);
        resolve([]);
      });
    });

    req.on('error', async (err) => {
      console.warn(`⚠️ [DIAGNÓSTICO ERRO REDE]: ${err.message}`);
      if (retry < API_CONFIG.MAX_RETRIES) {
        await sleep(API_CONFIG.BATCH_DELAY_MS + 3000);
        resolve(await fetchBatchGdelt(domainsBatch, timespanParam, retry + 1));
      } else {
        console.log(`📥 [DIAGNÓSTICO RESPOSTA] Lote finalizado com erro de rede (0 artigos).`);
        resolve([]);
      }
    });

    req.on('timeout', () => {
      console.warn(`⚠️ [DIAGNÓSTICO TIMEOUT] Requisição excedeu ${API_CONFIG.TIMEOUT_MS}ms.`);
      req.destroy();
      console.log(`📥 [DIAGNÓSTICO RESPOSTA] Lote finalizado por timeout (0 artigos).`);
      resolve([]);
    });
  });
}

async function queryGdeltForPeriod(timespanParam, maxHoursCutoff) {
  const uniqueDomains = Array.from(new Set(SOURCES_REGISTRY.map(s => s.domain).filter(Boolean)));
  const domainBatches = chunkArray(uniqueDomains, API_CONFIG.BATCH_SIZE);

  let rawArticles = [];

  for (let i = 0; i < domainBatches.length; i++) {
    const batch = domainBatches[i];
    console.log(`\n🔍 [GDELT DOC 2.0] Consultando Lote ${i + 1}/${domainBatches.length} [Timespan: ${timespanParam}]...`);
    console.log(`📋 Domínios no Lote ${i + 1}: ${batch.join(', ')}`);
    
    const batchResults = await fetchBatchGdelt(batch, timespanParam);
    if (batchResults && batchResults.length > 0) {
      rawArticles = rawArticles.concat(batchResults);
    }

    if (i < domainBatches.length - 1) {
      await sleep(API_CONFIG.BATCH_DELAY_MS);
    }
  }

  if (rawArticles.length === 0) return [];

  const now = Date.now();
  const cutoffTs = now - (maxHoursCutoff * 3600 * 1000);

  const parsedMap = new Map();

  for (const item of rawArticles) {
    if (!item.url || !item.title) continue;

    const sourceObj = matchSourceByUrl(item.url, item.domain || '');
    const dateObj = parseGdeltDate(item.seendate);

    if (dateObj.ts && dateObj.ts < cutoffTs) continue;

    if (!parsedMap.has(item.url)) {
      const cleanedTitle = restoreTitleFromUrl(item.title.trim(), item.url);
      parsedMap.set(item.url, {
        id: 'gdelt-' + Math.random().toString(36).substring(2, 9),
        title: cleanedTitle,
        sourceName: sourceObj.name,
        sourceUrl: sourceObj.url,
        sourceType: sourceObj.type,
        sourceEditorial: sourceObj.editorial,
        country: sourceObj.country,
        paywall: !!sourceObj.paywall,
        originalUrl: item.url,
        publishedAtStr: dateObj.str,
        publishedAtTs: dateObj.ts,
        rawContent: cleanedTitle,
        linkStatus: 'unknown',
        lastChecked: null
      });
    }
  }

  const sortedArticles = Array.from(parsedMap.values()).sort((a, b) => {
    const tsA = a.publishedAtTs || 0;
    const tsB = b.publishedAtTs || 0;
    return tsB - tsA;
  });

  return sortedArticles;
}

/**
 * Realiza a verificação HTTP HEAD de integridade para um lote limitado de links
 */
async function verifySingleLinkHead(url) {
  return new Promise((resolve) => {
    if (!url) {
      resolve('unknown');
      return;
    }

    try {
      const parsedUrl = new URL(url);
      const httpModule = parsedUrl.protocol === 'https:' ? https : http;

      const req = httpModule.request(url, {
        method: 'HEAD',
        timeout: 6000, // Timeout curto de 6s
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Monitor-RI-LinkChecker/1.0'
        }
      }, (res) => {
        const code = res.statusCode;
        if (code >= 200 && code < 300) {
          resolve('active');
        } else if (code === 404 || code === 410) {
          resolve('broken');
        } else {
          // 403, 500, 429 etc tratamos como 'unknown' para não marcar link válido bloqueador de bot como quebrado
          resolve('unknown');
        }
      });

      req.on('error', () => {
        resolve('broken'); // Erro de conexão/DNS/host inacessível
      });

      req.on('timeout', () => {
        req.destroy();
        resolve('unknown');
      });

      req.end();
    } catch (e) {
      resolve('unknown');
    }
  });
}

/**
 * Orquestra a verificação diária de integridade de links no news-data.json
 * Limita a no máximo 40 links não verificados nas últimas 24h por rodada.
 */
async function checkPendingLinks(articlesList) {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const MAX_LINKS_PER_RUN = 40;

  // Filtrar links que precisam de checagem (não checados nas últimas 24h)
  const pendingArticles = articlesList.filter(art => {
    if (!art.lastChecked) return true;
    return (now - art.lastChecked) > ONE_DAY_MS;
  });

  // Priorizar os mais antigos na fila de checagem
  pendingArticles.sort((a, b) => (a.lastChecked || 0) - (b.lastChecked || 0));

  const batchToCheck = pendingArticles.slice(0, MAX_LINKS_PER_RUN);
  console.log(`\n🔍 [VERIFICAÇÃO DE LINKS] Iniciando checagem diária de integridade para ${batchToCheck.length} matérias...`);

  let activeCount = 0;
  let brokenCount = 0;
  let unknownCount = 0;

  const statsExamples = { active: null, broken: null, unknown: null };

  for (let i = 0; i < batchToCheck.length; i++) {
    const art = batchToCheck[i];
    const status = await verifySingleLinkHead(art.originalUrl);
    
    art.linkStatus = status;
    art.lastChecked = now;

    if (status === 'active') {
      activeCount++;
      if (!statsExamples.active) statsExamples.active = art;
    } else if (status === 'broken') {
      brokenCount++;
      if (!statsExamples.broken) statsExamples.broken = art;
    } else {
      unknownCount++;
      if (!statsExamples.unknown) statsExamples.unknown = art;
    }

    // Pequena pausa entre requisições HEAD para evitar rajada
    await sleep(200);
  }

  console.log(`✅ [VERIFICAÇÃO CONCLUÍDA] Resumo do Lote de ${batchToCheck.length} Links:`);
  console.log(`   🟢 Active (200 OK): ${activeCount}`);
  console.log(`   🔴 Broken (404/410/Erro Conexão): ${brokenCount}`);
  console.log(`   🟡 Unknown (403/500/Timeout): ${unknownCount}\n`);

  return {
    checkedCount: batchToCheck.length,
    activeCount,
    brokenCount,
    unknownCount,
    examples: statsExamples
  };
}

async function runCronJob() {
  console.log(`[${new Date().toISOString()}] 🕒 Executando Coleta Real de Notícias via GDELT DOC 2.0 API...`);

  // Preservar estado prévio de links checados se o news-data.json já existir
  let existingLinkMap = new Map();
  if (fs.existsSync(API_CONFIG.OUTPUT_FILE)) {
    try {
      const prevData = JSON.parse(fs.readFileSync(API_CONFIG.OUTPUT_FILE, 'utf8'));
      if (prevData && Array.isArray(prevData.articles)) {
        prevData.articles.forEach(a => {
          if (a.originalUrl) {
            existingLinkMap.set(a.originalUrl, { linkStatus: a.linkStatus, lastChecked: a.lastChecked });
          }
        });
      }
    } catch (e) {}
  }

  const periods = [
    { name: '24h', timespan: '24h', maxHours: 24 },
    { name: '7d', timespan: '7d', maxHours: 24 * 7 },
    { name: '3M', timespan: '90d', maxHours: 24 * 90 }
  ];

  let articles = [];
  let periodUsed = '24h';

  for (let pIdx = 0; pIdx < periods.length; pIdx++) {
    const period = periods[pIdx];
    console.log(`\n==================================================`);
    console.log(`🌐 Tentando busca no período: ${period.name}`);
    console.log(`==================================================`);

    articles = await queryGdeltForPeriod(period.timespan, period.maxHours);
    
    if (articles && articles.length > 0) {
      periodUsed = period.name;
      console.log(`\n✅ Sucesso! ${articles.length} notícias reais encontradas no período de ${period.name}.`);
      break;
    } else {
      console.log(`\n⚠️ Nenhuma notícia encontrada nas últimas ${period.name}. Ampliando período...`);
      if (pIdx < periods.length - 1) {
        await sleep(API_CONFIG.BATCH_DELAY_MS);
      }
    }
  }

  if (!articles) articles = [];

  // Restaurar dados de verificação prévia de links mantendo o histórico
  articles.forEach(art => {
    const prev = existingLinkMap.get(art.originalUrl);
    if (prev) {
      art.linkStatus = prev.linkStatus || 'unknown';
      art.lastChecked = prev.lastChecked || null;
    }
  });

  // Executar checagem diária de links (lote limitado de até 40 matérias por ciclo)
  const linkCheckStats = await checkPendingLinks(articles);

  const payload = {
    updatedAt: new Date().toISOString(),
    periodUsed: periodUsed,
    count: articles.length,
    linkVerificationStats: {
      checkedThisRun: linkCheckStats.checkedCount,
      active: linkCheckStats.activeCount,
      broken: linkCheckStats.brokenCount,
      unknown: linkCheckStats.unknownCount
    },
    articles: articles
  };

  fs.writeFileSync(API_CONFIG.OUTPUT_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`\n💾 Processo concluído. ${articles.length} notícias reais salvas em ${API_CONFIG.OUTPUT_FILE}.`);
}

runCronJob();
