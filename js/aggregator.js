/**
 * aggregator.js - Módulo para Unificação de Notícias Duplicadas e Agrupamento
 * 
 * Regra: Quando a mesma notícia (ex: matéria de agência) sair em múltiplos veículos no mesmo dia,
 * junte tudo num item só e mostre quais veículos publicaram.
 */

class NewsAggregator {
  
  /**
   * Consolida notícias similares publicadas por diferentes veículos.
   */
  aggregateDuplicateArticles(rawArticles) {
    if (!Array.isArray(rawArticles) || rawArticles.length === 0) return [];

    const clusters = [];

    for (const article of rawArticles) {
      // Tentar encontrar um cluster existente dentro da janela temporal de 12 horas e alta similaridade de títulos
      let matchedCluster = clusters.find(c => this.isSimilarCluster(c, article));

      if (matchedCluster) {
        // Adicionar o veículo à lista de fontes publicadoras do mesmo evento
        if (!matchedCluster.sources.some(s => s.name === article.sourceName)) {
          matchedCluster.sources.push({
            name: article.sourceName,
            url: article.originalUrl,
            paywall: article.paywall,
            editorial: article.sourceEditorial
          });
        }
        // Atualizar timestamp se for mais recente
        if (article.publishedAtTs && article.publishedAtTs > matchedCluster.latestTimestamp) {
          matchedCluster.latestTimestamp = article.publishedAtTs;
          matchedCluster.publishedAtStr = article.publishedAtStr;
        }
      } else {
        // Criar um novo cluster unificado
        const classification = newsCategorizer.classifyArticle(article.title, article.rawContent);
        const summary = newsCategorizer.generateSummary(article.title, article.rawContent);

        clusters.push({
          id: article.id,
          canonicalTitle: article.title,
          primarySubject: classification.primarySubject,
          secondarySubjects: classification.secondarySubjects,
          summary: summary,
          latestTimestamp: article.publishedAtTs || Date.now(),
          publishedAtStr: article.publishedAtStr,
          country: article.country,
          sourceType: article.sourceType,
          originalUrl: article.originalUrl,
          paywall: article.paywall,
          linkStatus: article.linkStatus || 'unknown',
          lastChecked: article.lastChecked || null,
          sources: [
            {
              name: article.sourceName,
              url: article.originalUrl,
              paywall: article.paywall,
              editorial: article.sourceEditorial
            }
          ]
        });
      }
    }

    // Ordenar da mais recente para a mais antiga (Regra da aba Hoje)
    return clusters.sort((a, b) => b.latestTimestamp - a.latestTimestamp);
  }

  /**
   * Verifica se o artigo pertence ao mesmo cluster considerando proximidade temporal (janela de 12h) e texto.
   */
  isSimilarCluster(cluster, article) {
    const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

    // 1. Checagem de Proximidade Temporal: se ambos tiverem timestamp e a diferença for > 12 horas, NÃO agrupa
    if (cluster.latestTimestamp && article.publishedAtTs) {
      const timeDiff = Math.abs(cluster.latestTimestamp - article.publishedAtTs);
      if (timeDiff > TWELVE_HOURS_MS) {
        return false;
      }
    }

    // 2. Checagem de Textualidade dos Títulos com limiar seguro (65%)
    return this.isSimilarText(cluster.canonicalTitle, article.title);
  }

  /**
   * Verifica similaridade textual entre dois títulos para agrupamento de agência.
   */
  isSimilarText(titleA = '', titleB = '') {
    const normalize = str => str.toLowerCase().replace(/[^\w\s]/gi, '').split(' ').filter(w => w.length > 3);
    const wordsA = normalize(titleA);
    const wordsB = normalize(titleB);

    if (wordsA.length === 0 || wordsB.length === 0) return false;

    const common = wordsA.filter(w => wordsB.includes(w));
    const ratio = common.length / Math.min(wordsA.length, wordsB.length);

    // Limiar ajustado para 65% para evitar falsos positivos com entidades genéricas (ex: "Lula", "China")
    return ratio >= 0.65;
  }
}

const newsAggregator = new NewsAggregator();
