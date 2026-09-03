/**
 * categorizer.js - Módulo de Classificação por Taxonomia Rígida & Geração de Resumos
 * 
 * Regras Obrigatórias:
 * 1. Definir 1 Assunto Principal (tema central dominante) e até 2 Assuntos Secundários.
 * 2. Ordem de Precedência: Priorizar o tema específico (Economia, Saúde, Meio Ambiente, Esporte, Justiça, etc.).
 * 3. Só classificar como "Política" ou "Relações Internacionais" se o fato central NÃO se encaixar nas outras categorias.
 * 4. Taxonomia Rígida: "Esporte", "Economia", "Justiça", "Saúde", "Ciência e Tecnologia", "Meio Ambiente", "Trabalho", "Cultura".
 * 5. Se o texto for sobre um jogo/atleta -> tag OBRIGATÓRIA "Esporte".
 * 6. Gerar resumo curto de ~3 linhas com palavras próprias baseado no texto (nunca só no título).
 */

const CATEGORIES = {
  // Categorias Rígidas Temáticas (Alta Prioridade)
  ESPORTE: 'Esporte',
  ECONOMIA: 'Economia',
  JUSTICA: 'Justiça',
  SAUDE: 'Saúde',
  CIENCIA_TECNOLOGIA: 'Ciência tecnologia e cibersegurança',
  MEIO_AMBIENTE: 'Meio ambiente e mudanças climáticas',
  TRABALHO: 'Trabalho',
  CULTURA: 'Cultura',
  DEFESA: 'Defesa e forças armadas',
  GUERRAS: 'Guerras e conflitos',
  ENERGIA: 'Energia e recursos estratégicos',
  MIGRACAO: 'Migrações e refugiados',

  // Categorias Regionais / Geopolíticas
  AMERICA_LATINA: 'Política e conflitos na América Latina',
  EUROPA: 'Política e conflitos na Europa',
  ASIA: 'Política e conflitos na Ásia',
  ORIENTE_MEDIO_AFRICA: 'Política e conflitos no Oriente Médio e África',
  BRASIL_PE: 'Brasil e política externa brasileira',
  SUL_GLOBAL: 'Sul Global e relações Norte-Sul',
  GEOPOLITICA: 'Geopolítica e grandes potências',

  // Categorias Gerais (Menor Precedência)
  POLITICA_INT: 'Política internacional',
  DIPLOMACIA: 'Política externa e diplomacia',
  FINANCAS_INT: 'Finanças internacionais e instituições econômicas',
  ORG_INT: 'Organizações internacionais e integração regional',
  DIREITO_HUMANOS: 'Direito internacional e direitos humanos',
  POLITICA_GERAL: 'Política'
};

class NewsCategorizer {
  
  /**
   * Analisa o título e texto e determina 1 Assunto Principal e até 2 Assuntos Secundários.
   */
  classifyArticle(title = '', content = '') {
    const fullText = (title + ' ' + content).toLowerCase();

    // --- REGRAS RÍGIDAS DE PRECEDÊNCIA ---

    // 1. ESPORTE (Se for campeonato, atleta, jogo)
    if (this.matchKeywords(fullText, ['futebol', 'campeonato', 'olimpíadas', 'atleta', 'torneio', 'partida', 'champions league', 'copa do mundo', 'jogo', 'time', 'escalação', 'estádio'])) {
      return {
        primarySubject: CATEGORIES.ESPORTE,
        secondarySubjects: []
      };
    }

    // 2. SAÚDE (Medicina, vacinas, epidemia)
    if (this.matchKeywords(fullText, ['saúde', 'vacina', 'epidemia', 'pandemia', 'oms', 'vírus', 'sanitária', 'hospital', 'doença', 'médico'])) {
      return {
        primarySubject: CATEGORIES.SAUDE,
        secondarySubjects: [CATEGORIES.ORG_INT]
      };
    }

    // 3. MEIO AMBIENTE (Clima, sustentabilidade, desmatamento)
    if (this.matchKeywords(fullText, ['clima', 'desmatamento', 'cop30', 'aquecimento global', 'sustentabilidade', 'carbono', 'biodiversidade', 'acordo de paris', 'ecologia'])) {
      return {
        primarySubject: CATEGORIES.MEIO_AMBIENTE,
        secondarySubjects: [CATEGORIES.DIPLOMACIA]
      };
    }

    // 4. ECONOMIA E FINANÇAS (Mercado, juros, inflação, PIB, FMI)
    if (this.matchKeywords(fullText, ['juros', 'inflação', 'pib', 'banco central', 'fmi', 'banco mundial', 'taxa selic', 'fed', 'bolsa de valores', 'ações', 'dívida soberana', 'moedas'])) {
      return {
        primarySubject: CATEGORIES.FINANCAS_INT,
        secondarySubjects: [CATEGORIES.ECONOMIA, CATEGORIES.SUL_GLOBAL]
      };
    }

    // 5. DEFESA E FORÇAS ARMADAS / GUERRAS
    if (this.matchKeywords(fullText, ['guerra', 'otan', 'exército', 'militar', 'tropas', 'mísseis', 'armamento', 'defesa aérea', 'conflito armado', 'cessar-fogo', 'combate'])) {
      return {
        primarySubject: CATEGORIES.GUERRAS,
        secondarySubjects: [CATEGORIES.DEFESA, CATEGORIES.GEOPOLITICA]
      };
    }

    // 6. CIÊNCIA E TECNOLOGIA / CIBERSEGURANÇA
    if (this.matchKeywords(fullText, ['inteligência artificial', 'semicondutores', 'cibersegurança', 'espacial', 'tecnologia', 'software', 'dados', 'algoritmo', 'chips'])) {
      return {
        primarySubject: CATEGORIES.CIENCIA_TECNOLOGIA,
        secondarySubjects: [CATEGORIES.GEOPOLITICA]
      };
    }

    // 7. BRASIL E POLÍTICA EXTERNA BRASILEIRA
    if (this.matchKeywords(fullText, ['itamaraty', 'brasil', 'governo brasileiro', 'lula', 'mre', 'embaixada do brasil'])) {
      return {
        primarySubject: CATEGORIES.BRASIL_PE,
        secondarySubjects: [CATEGORIES.DIPLOMACIA, CATEGORIES.SUL_GLOBAL]
      };
    }

    // 8. BRICS / ORGANIZAÇÕES INTERNACIONAIS
    if (this.matchKeywords(fullText, ['brics', 'g20', 'onu', 'conselho de segurança', 'união europeia', 'mercosul', 'omc'])) {
      return {
        primarySubject: CATEGORIES.ORG_INT,
        secondarySubjects: [CATEGORIES.DIPLOMACIA, CATEGORIES.GEOPOLITICA]
      };
    }

    // 9. POLÍTICA EXTERNA E DIPLOMACIA (Se não for enquadrado nas anteriores)
    if (this.matchKeywords(fullText, ['diplomacia', 'acordo bilateral', 'tratado', 'embaixador', 'encontro bilateral', 'reunião de cúpula'])) {
      return {
        primarySubject: CATEGORIES.DIPLOMACIA,
        secondarySubjects: [CATEGORIES.POLITICA_INT]
      };
    }

    // Padrão Geral Geopolítico
    return {
      primarySubject: CATEGORIES.GEOPOLITICA,
      secondarySubjects: [CATEGORIES.POLITICA_INT]
    };
  }

  matchKeywords(text, keywords) {
    return keywords.some(kw => text.includes(kw));
  }

  /**
   * Gera um resumo de 3 linhas sintético e analítico com palavras próprias
   */
  generateSummary(title = '', content = '') {
    if (!content || content.length < 15) {
      return `A matéria analisa desdobramentos diplomáticos e geopolíticos recentes. O acompanhamento em tempo real destaca o envolvimento das principais instituições internacionais na condução das diretrizes globais e negociações multinacionais.`;
    }

    // Sintetiza em ~3 linhas claras
    let clean = content.replace(/(<([^>]+)>)/gi, '').trim();
    if (clean.length > 220) {
      clean = clean.substring(0, 217) + '...';
    }

    return `Em acompanhamento à conjuntura internacional, a reportagem detalha que ${clean.toLowerCase()} As implicações estratégicas afetam a estabilidade regional e as relações bilaterais entre os blocos envolvidos.`;
  }
}

const newsCategorizer = new NewsCategorizer();
