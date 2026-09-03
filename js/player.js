/**
 * player.js - Módulo de Síntese Flutuante (Áudio & Texto)
 * 
 * Regra: No canto inferior direito da aba "Hoje", um player de síntese resumindo
 * as 5 notícias mais importantes das últimas 24 horas. Usa Web Speech API para áudio.
 */

class SummaryPlayer {
  constructor() {
    this.speechSynth = window.speechSynthesis;
    this.currentUtterance = null;
    this.isSpeaking = false;
    this.top5News = [];

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.widget = document.getElementById('summary-player-widget');
    this.widgetBody = document.getElementById('widget-body');
    this.btnToggle = document.getElementById('btn-toggle-widget');
    this.btnPlay = document.getElementById('btn-play-audio');
    this.btnStop = document.getElementById('btn-stop-audio');
    this.top5List = document.getElementById('top5-list');
  }

  bindEvents() {
    if (this.btnToggle) {
      this.btnToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        this.widget.classList.toggle('minimized');
        this.btnToggle.textContent = this.widget.classList.contains('minimized') ? '+' : '_';
      });
    }

    if (this.btnPlay) {
      this.btnPlay.addEventListener('click', () => this.playSpeech());
    }

    if (this.btnStop) {
      this.btnStop.addEventListener('click', () => this.stopSpeech());
    }
  }

  /**
   * Atualiza as 5 notícias do topo para a narração
   */
  updateTop5(articles) {
    if (!Array.isArray(articles) || articles.length === 0) {
      if (this.top5List) {
        this.top5List.innerHTML = '<li>Nenhuma matéria recente registrada no momento.</li>';
      }
      return;
    }

    // Seleciona as 5 mais relevantes (priorizando múltiplas fontes)
    this.top5News = articles.slice(0, 5);

    if (this.top5List) {
      this.top5List.innerHTML = this.top5News.map(item => `
        <li>
          <strong>${item.canonicalTitle}</strong> (${item.sources[0]?.name || item.country})
        </li>
      `).join('');
    }
  }

  /**
   * Executa a síntese de voz em Português BR via Web Speech API
   */
  playSpeech() {
    if (!this.top5News || this.top5News.length === 0) {
      alert('Nenhuma notícia disponível para narração neste momento.');
      return;
    }

    if (this.speechSynth.speaking) {
      this.speechSynth.cancel();
    }

    const scriptText = `Resumo executivo de Relações Internacionais das últimas vinte e quatro horas. ` +
      this.top5News.map((item, index) => 
        `Notícia ${index + 1}: ${item.canonicalTitle}. Publicado por ${item.sources.map(s => s.name).join(' e ')}. ${item.summary}`
      ).join(' ');

    this.currentUtterance = new SpeechSynthesisUtterance(scriptText);
    this.currentUtterance.lang = 'pt-BR';
    this.currentUtterance.rate = 1.0;

    this.currentUtterance.onstart = () => {
      this.isSpeaking = true;
      this.btnPlay.classList.add('hidden');
      this.btnStop.classList.remove('hidden');
    };

    this.currentUtterance.onend = () => {
      this.resetControls();
    };

    this.currentUtterance.onerror = (e) => {
      console.warn('Erro na síntese de áudio:', e);
      this.resetControls();
    };

    this.speechSynth.speak(this.currentUtterance);
  }

  stopSpeech() {
    if (this.speechSynth && this.speechSynth.speaking) {
      this.speechSynth.cancel();
    }
    this.resetControls();
  }

  resetControls() {
    this.isSpeaking = false;
    if (this.btnPlay) this.btnPlay.classList.remove('hidden');
    if (this.btnStop) this.btnStop.classList.add('hidden');
  }
}

const summaryPlayer = new SummaryPlayer();
