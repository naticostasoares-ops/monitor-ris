/**
 * pdf-generator.js - Gerador de Relatório PDF Impresso
 * 
 * Regras do PDF:
 * - Na capa: Período e filtros exatos utilizados na tela no momento.
 * - Conteúdo: Itens agrupados por Assunto Principal.
 * - Cada item contém: Título, Veículo(s), Data de publicação, Resumo curto.
 * - ENDEREÇO COMPLETO DA NOTÍCIA ESCRITO POR EXTENSO (para servir no papel impresso).
 */

class PdfReportGenerator {
  
  generatePdf(articles, filtersState) {
    if (!articles || articles.length === 0) {
      alert('Nenhum item filtrado na tela para a emissão do PDF.');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });

    const nowStr = new Date().toLocaleString('pt-BR');
    let y = 20;

    // --- CAPA / CABEÇALHO DO RELATÓRIO ---
    doc.setFillColor(15, 41, 66); // Azul Marinho
    doc.rect(0, 0, 210, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('RELATÓRIO DE MONITORAMENTO - RELAÇÕES INTERNACIONAIS', 15, 18);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Emissão: ${nowStr} | Total de Itens Filtrados: ${articles.length}`, 15, 26);

    y = 45;

    // --- SEÇÃO DE PARÂMETROS / FILTROS ---
    doc.setFillColor(241, 245, 249);
    doc.rect(15, y, 180, 25, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(15, y, 180, 25, 'S');

    doc.setTextColor(15, 41, 66);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('FILTROS E PARÂMETROS APLICADOS NESTE RELATÓRIO:', 18, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    
    const fKeyword = filtersState.keyword || 'Todas';
    const fSubject = filtersState.subject || 'Todos os Assuntos';
    const fStart = filtersState.dateStart || 'Início do Acervo';
    const fEnd = filtersState.dateEnd || 'Hoje';
    const fType = filtersState.type || 'Todos os Tipos';

    doc.text(`• Palavra-chave: ${fKeyword}  |  • Assunto: ${fSubject}`, 18, y + 13);
    doc.text(`• Período: ${fStart} até ${fEnd}  |  • Tipo de Veículo: ${fType}`, 18, y + 19);

    y += 35;

    // --- AGRUPAMENTO POR ASSUNTO PRINCIPAL ---
    const grouped = {};
    articles.forEach(item => {
      const subj = item.primarySubject || 'Outros Assuntos';
      if (!grouped[subj]) grouped[subj] = [];
      grouped[subj].push(item);
    });

    doc.setFont('helvetica', 'bold');

    for (const [subjectName, itemsList] of Object.entries(grouped)) {
      // Checar quebra de página
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      // Título do Assunto
      doc.setFillColor(30, 58, 138);
      doc.rect(15, y, 180, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.text(subjectName.toUpperCase(), 18, y + 5);

      y += 12;

      // Iterar Notícias do Assunto
      for (const item of itemsList) {
        if (y > 245) {
          doc.addPage();
          y = 20;
        }

        // Título da Matéria
        doc.setTextColor(15, 41, 66);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        
        const titleLines = doc.splitTextToSize(`• ${item.canonicalTitle}`, 175);
        doc.text(titleLines, 18, y);
        y += titleLines.length * 5;

        // Meta (Veículo, Data, País)
        doc.setTextColor(71, 85, 105);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        
        const sourcesText = item.sources.map(s => s.name).join(', ');
        const dateText = item.publishedAtStr ? new Date(item.publishedAtStr).toLocaleDateString('pt-BR') : 'Data não informada';
        doc.text(`Veículo(s): ${sourcesText} | País: ${item.country} | Data de Pub.: ${dateText}`, 22, y);
        y += 4.5;

        // Resumo Curto (~3 linhas)
        doc.setTextColor(51, 65, 85);
        doc.setFontSize(8.5);
        const summaryLines = doc.splitTextToSize(`Resumo: ${item.summary}`, 170);
        doc.text(summaryLines, 22, y);
        y += summaryLines.length * 4;

        // REGRA PRINCIPAL: LINK POR EXTENSO ESCRITO NO PAPEL
        doc.setTextColor(197, 48, 48); // Destaque Vermelho/Azul
        doc.setFont('courier', 'normal');
        doc.setFontSize(8);
        doc.text(`URL Original: ${item.originalUrl}`, 22, y);
        y += 7;

        // Linha divisória fina
        doc.setDrawColor(226, 232, 240);
        doc.line(18, y, 195, y);
        y += 5;
      }

      y += 4;
    }

    // Salvar o arquivo PDF no navegador
    doc.save(`relatorio_ri_${Date.now()}.pdf`);
  }
}

const pdfReportGenerator = new PdfReportGenerator();
