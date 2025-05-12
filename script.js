/**
 * MIT License
 *
 * Copyright (c) 2025 Douglas Silva
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/*
 * script.js - Lógica principal do frontend para o AFD Expert 671 e 1510.
 * Este arquivo gerencia o upload, processamento e exibição dos arquivos AFD,
 * com otimizações como cache, processamento em lotes e feedback visual.
 * Todas as interações do usuário (upload, filtros, pesquisa, exportação) são tratadas aqui.
 */

// Processador para Portaria 671
const AFDProcessor = {
  // Elementos do DOM usados frequentemente, agrupados para fácil acesso
  dom: {
    resultado: document.getElementById('resultado'),
    searchArea: document.getElementById('searchArea'),
    searchInput: document.getElementById('searchInput'),
    searchButton: document.getElementById('searchButton'),
    saveSearchButton: document.getElementById('saveSearchButton'),
    fileInput: document.getElementById('file'),
    fileName: document.getElementById('file-name'),
  },

  // Armazena os dados processados do arquivo AFD
  registrosData: {},

  // Cache para resultados já processados, evita reprocessamento
  resultCache: {},

  // Armazena os resultados da última busca para exportação
  lastSearchResults: null,

  // Descrições dos tipos de registros para exibição amigável
  tipoRegistroDescricao: {
    1: 'Cabeçalho:',
    2: 'Tipo 2: Registros do tipo 2 (Identificação da empresa no REP):',
    3: 'Tipo 3: Registros do tipo 3 (Marcação de ponto para REP-C e REP-A):',
    4: 'Tipo 4: Registros do tipo 4 (Ajuste do relógio):',
    5: 'Tipo 5: Registros do tipo 5 (Inclusão, alteração ou exclusão de empregado no REP):',
    6: 'Tipo 6: Registros do tipo 6 (Eventos sensíveis do REP):',
  },

  // Funções utilitárias para formatação de datas
  format: {
    // Formata uma data no formato DD-MM-AAAA
    date(dateStr) {
      if (!dateStr) return 'Não disponível';
      const [y, m, d] = dateStr.split('-');
      return d && m && y ? `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}` : 'Inválida';
    },

    // Formata uma data/hora no formato DD/MM/AAAA HH:MM:SS
    dateTime(dateTimeStr) {
      if (!dateTimeStr) return 'Não disponível';
      const [datePart, timePart] = dateTimeStr.split(' ');
      return datePart && timePart ? `${datePart.split('-').reverse().join('/')} ${timePart.substring(0, 5)}` : 'Inválido';
    },

    // Formata data/hora de registros AFD para DD/MM/AAAA HH:MM:SS
    dataHora(dataHoraStr) {
      if (typeof dataHoraStr !== 'string' || !dataHoraStr.includes(' ')) {
        return 'Data/Hora inválida';
      }
      const [data, tempo] = dataHoraStr.split(' ');
      if (!data || !tempo) {
        return 'Data/Hora inválida';
      }
      return `${data.split('-').reverse().join('/')} ${tempo.substring(0, 5)}`;
    },
  },

  /*
   * init - Inicializa os eventos do frontend.
   * Configura listeners para upload de arquivo, pesquisa por Enter e salvar busca.
   * É chamado ao carregar a página para preparar a interface.
   */
  init() {
    // Permite pesquisar pressionando Enter no campo de busca
    this.dom.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.performSearch();
    });

    // Listener para o botão "Salvar busca"
    this.dom.saveSearchButton.addEventListener('click', () => this.saveSearchResults());

    // Manipula o envio do formulário de upload
    document.getElementById('uploadForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      this.showLoading(); // Exibe overlay de carregamento

      const formData = new FormData();
      formData.append('file', this.dom.fileInput.files[0]);

      try {
        const response = await fetch('processar_afd.php', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Erro ao processar o arquivo');
        }

        // Armazena os dados processados e exibe os resultados
        this.registrosData = await response.json();
        this.displayResult(this.registrosData.registros);

        // Habilita os botões de filtro após o upload
        document.querySelectorAll('.buttons button').forEach((button) => {
          button.disabled = false;
          button.classList.remove('btn-disabled');
          button.removeAttribute('title');
        });
      } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao processar o arquivo: ' + error.message);
      } finally {
        this.hideLoading(); // Esconde overlay de carregamento
      }
    });
  },

  /*
   * displayResult - Exibe os registros no elemento <pre>.
   * Usa cache para evitar reprocessamento e organiza os dados por tipo.
   * Usada para filtros e exibição inicial.
   */
  displayResult(data) {
    // Gera uma chave única para o cache baseada nos tipos e conteúdo dos dados
    const cacheKey = JSON.stringify({
      types: Object.keys(data).sort(),
      content: Object.values(data).flat().join('|'),
    });
    if (this.resultCache[cacheKey]) {
      // Usa resultado em cache, se disponível
      this.dom.resultado.textContent = this.resultCache[cacheKey];
      return;
    }

    const chunks = [];
    for (const tipo in data) {
      const registros = Array.isArray(data[tipo]) ? data[tipo] : Object.values(data[tipo]);
      if (registros.length > 0) {
        chunks.push(`${this.tipoRegistroDescricao[tipo] || `Tipo ${tipo}:`}\n`);
        chunks.push(...registros.map((linha) => `${linha}\n`));
        chunks.push('-'.repeat(40) + '\n');
      }
    }

    const result = chunks.length > 0 ? chunks.join('') : 'Nenhum registro encontrado.\n';
    this.resultCache[cacheKey] = result; // Armazena no cache
    this.dom.resultado.textContent = result; // Exibe no <pre>
  },

  /*
   * filterByType - Filtra registros por tipo (ex.: "all", "3").
   * Limpa a área de busca e chama displayResult com os dados filtrados.
   */
  filterByType(tipo) {
    if (!this.registrosData || !this.registrosData.registros) {
      alert('Por favor, carregue um arquivo antes de usar os filtros.');
      return;
    }

    this.dom.searchArea.style.display = 'none';
    this.dom.searchInput.value = '';
    const filteredData = tipo === 'all' ? this.registrosData.registros : { [tipo]: this.registrosData.registros[tipo] || [] };
    this.displayResult(filteredData);
  },

  /*
   * filterInvalidLines - Exibe linhas inválidas do arquivo.
   * Usado para depuração de arquivos com formatação incorreta.
   */
  filterInvalidLines() {
    this.dom.searchArea.style.display = 'none';
    if (!this.registrosData?.linhasInvalidas) return;

    const texto = this.registrosData.linhasInvalidas.length > 0 ? `Linhas inválidas:\n${this.registrosData.linhasInvalidas.join('\n')}` : 'Nenhuma linha inválida encontrada';
    this.dom.resultado.textContent = texto;
  },

  /*
   * showDetails - Exibe informações resumidas do arquivo (ex.: datas, contagens).
   * Extrai dados do cabeçalho e dos registros para um relatório detalhado.
   */
  showDetails() {
    this.dom.searchArea.style.display = 'none';
    if (!this.registrosData?.registros) return;

    const cabecalho = this.registrosData.registros[1]?.[0] || '';
    const detalhes = {
      dataHoraGeracao: this.format.dateTime(this.registrosData.dataHoraGeracao),
      totalLinhas: this.registrosData.totalLinhas,
      serialEquipamento: cabecalho.substring(189, 206).trim(),
      dataInicio: this.format.date(this.registrosData.dataInicio),
      dataFim: this.format.date(this.registrosData.dataFim),
      tipo2: 0,
      tipo3: 0,
      tipo4: 0,
      tipo5: 0,
    };

    for (const tipo in this.registrosData.registros) {
      const t = parseInt(tipo, 10);
      if (t === 2) detalhes.tipo2 = this.registrosData.registros[tipo].length;
      if (t === 3) detalhes.tipo3 = this.registrosData.registros[tipo].length;
      if (t === 4) detalhes.tipo4 = this.registrosData.registros[tipo].length;
      if (t === 5) detalhes.tipo5 = this.registrosData.registros[tipo].length;
    }

    let detalhesText = `
Detalhes do arquivo:
----------------------------------------
Data e hora da geração do arquivo: ${detalhes.dataHoraGeracao}
Quantidade de linhas no arquivo: ${detalhes.totalLinhas}
Quantidade de registros Tipo 2 (Identificação da empresa no REP): ${detalhes.tipo2}
Quantidade de registros Tipo 3 (Marcação de ponto para REP-C e REP-A): ${detalhes.tipo3}
Quantidade de registros Tipo 4 (Ajuste do relógio): ${detalhes.tipo4}
Quantidade de registros Tipo 5 (Inclusão, alteração ou exclusão de empregado no REP): ${detalhes.tipo5}

Nº serial do equipamento: ${detalhes.serialEquipamento}
Data de início dos eventos: ${detalhes.dataInicio}
Data de fim dos eventos: ${detalhes.dataFim}
`;

    if (this.registrosData.ultimaAlteracaoEmpresa) {
      detalhesText += `
Última alteração da empresa:
Data e hora da gravação: ${this.format.dateTime(this.registrosData.ultimaAlteracaoEmpresa.dataHoraGravacao)}
CNPJ/CPF do empregador: ${this.registrosData.ultimaAlteracaoEmpresa.cnpjCpfEmpregador}
Razão social: ${this.registrosData.ultimaAlteracaoEmpresa.razaoSocial}
`;
    }

    this.dom.resultado.textContent = detalhesText;
  },

  /*
   * performSearch - Realiza busca nos registros por um termo.
   * Filtra todas as linhas que contêm o termo (case-insensitive) e armazena resultados.
   */
  performSearch() {
    const termo = this.dom.searchInput.value.trim().toLowerCase();
    if (!termo) {
      alert('Digite um termo para pesquisar');
      return;
    }

    if (!this.registrosData || !this.registrosData.registros) {
      alert('Por favor, carregue um arquivo antes de pesquisar.');
      return;
    }

    const resultados = {};
    let totalResultados = 0;

    // Filtra registros por tipo, incluindo apenas tipos com resultados
    for (const tipo in this.registrosData.registros) {
      const filtered = this.registrosData.registros[tipo].filter((linha) => {
        return linha && typeof linha === 'string' && linha.toLowerCase().includes(termo);
      });
      if (filtered.length > 0) {
        resultados[tipo] = filtered;
        totalResultados += filtered.length;
      }
    }

    // Armazena os resultados para exportação
    this.lastSearchResults = resultados;

    // Exibe mensagem se não houver resultados
    if (totalResultados === 0) {
      this.dom.resultado.textContent = 'Nenhum resultado encontrado para o termo pesquisado.';
      this.lastSearchResults = null; // Limpa resultados se não houver
      return;
    }

    // Exibe os resultados filtrados
    this.displayResult(resultados);
  },

  /*
   * saveSearchResults - Exporta os resultados da última busca como arquivo .txt.
   * Gera um arquivo com o mesmo formato da exibição no <pre>, com nome baseado no termo pesquisado.
   */
  saveSearchResults() {
    if (!this.lastSearchResults) {
      alert('Nenhuma busca realizada ou nenhum resultado encontrado.');
      return;
    }

    const chunks = [];
    for (const tipo in this.lastSearchResults) {
      const registros = this.lastSearchResults[tipo];
      if (registros.length > 0) {
        chunks.push(`${this.tipoRegistroDescricao[tipo] || `Tipo ${tipo}:`}\n`);
        chunks.push(...registros.map((linha) => `${linha}\n`));
        chunks.push('-'.repeat(40) + '\n');
      }
    }

    const content = chunks.join('');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });

    // Obtém o termo pesquisado e limpa para uso no nome do arquivo
    let termo = this.dom.searchInput.value.trim();
    if (!termo) {
      termo = 'sem_termo';
    } else {
      // Substitui caracteres inválidos por underscore
      termo = termo
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      if (!termo) {
        termo = 'termo_invalido';
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resultados_busca_${termo}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /*
   * showInterpretedLines - Exibe todas as linhas interpretadas de forma legível.
   * Usa processamento em lotes para evitar travamentos em arquivos grandes.
   * Inclui barra de progresso para feedback visual.
   */
  showInterpretedLines() {
    const cacheKey = 'interpreted_lines';
    if (this.resultCache[cacheKey]) {
      // Usa cache para evitar reprocessamento
      this.dom.resultado.textContent = this.resultCache[cacheKey];
      this.dom.searchArea.style.display = 'none';
      return;
    }

    this.showLoading(true); // Exibe overlay com progresso
    this.dom.searchArea.style.display = 'none';
    if (!this.registrosData?.registros) return;

    // Ordena todas as linhas por NSR
    const todasLinhas = Object.values(this.registrosData.registros)
      .flat()
      .sort((a, b) => parseInt(a.substring(0, 9), 10) - parseInt(b.substring(0, 9), 10));

    const batchSize = 1000; // Tamanho do lote para processamento
    let index = 0;
    const resultados = [];

    // Função interna para processar lotes
    const processBatch = () => {
      const end = Math.min(index + batchSize, todasLinhas.length);
      for (; index < end; index++) {
        const linha = todasLinhas[index];
        const tipo = linha.substring(9, 10);
        resultados.push(this.interpretarLinha(linha, tipo));
      }

      // Atualiza barra de progresso
      const progress = Math.round((index / todasLinhas.length) * 100);
      document.getElementById('loadingOverlay').querySelector('p').textContent = `Processando... ${progress}%`;
      document.getElementById('loadingOverlay').querySelector('.progress-bar-fill').style.width = `${progress}%`;

      if (index < todasLinhas.length) {
        setTimeout(processBatch, 0); // Agenda próximo lote
      } else {
        const result = resultados.join('\n');
        this.resultCache[cacheKey] = result; // Armazena no cache
        this.dom.resultado.textContent = result; // Exibe resultado
        this.hideLoading(); // Esconde overlay
      }
    };

    processBatch();
  },

  /*
   * interpretarLinha - Converte uma linha AFD em texto legível.
   * Extrai informações específicas com base no tipo de registro.
   * Inclui validações para evitar erros em linhas malformadas.
   */
  interpretarLinha(linha, tipo) {
    if (!linha || typeof linha !== 'string') {
      return 'Linha inválida: Dados ausentes';
    }

    let descricao = `NSR: ${linha.substring(0, 9).trim()} - Tipo: `;

    switch (tipo) {
      case '1':
        if (linha.length >= 226) {
          descricao += `Cabeçalho - Data Início: ${linha.substring(206, 216)} | Data Fim: ${linha.substring(216, 226)}`;
        } else {
          descricao += 'Cabeçalho - Formato inválido';
        }
        break;
      case '2':
        if (linha.length >= 227) {
          descricao += `Alteração Empresa - Razão Social: ${linha.substring(77, 227).trim()} | CNPJ: ${linha.substring(49, 63).trim()}`;
        } else {
          descricao += 'Alteração Empresa - Formato inválido';
        }
        break;
      case '3':
        if (linha.length >= 46) {
          const dataHora = linha.substring(10, 34);
          descricao += `Marcação Ponto - Data: ${this.format.dataHora(dataHora)} | CPF: ${linha.substring(34, 46).trim()}`;
        } else {
          descricao += 'Marcação Ponto - Formato inválido';
        }
        break;
      case '4':
        if (linha.length >= 58) {
          const antes = linha.substring(10, 34);
          const apos = linha.substring(34, 58);
          descricao += `Ajuste Relógio - Antes: ${this.format.dataHora(antes)} | Após: ${this.format.dataHora(apos)}`;
        } else {
          descricao += 'Ajuste Relógio - Formato inválido';
        }
        break;
      case '5':
        if (linha.length >= 99) {
          const operacao = linha.substring(34, 35) === 'I' ? 'Inclusão' : linha.substring(34, 35) === 'A' ? 'Alteração' : 'Exclusão';
          descricao += `${operacao} Funcionário - Nome: ${linha.substring(47, 99).trim()} | CPF: ${linha.substring(35, 47).trim()}`;
        } else {
          descricao += 'Funcionário - Formato inválido';
        }
        break;
      case '6':
        if (linha.length >= 36) {
          const dataHora = linha.substring(10, 34);
          descricao += `Evento Sensível - Tipo ${linha.substring(34, 36)} | ${this.format.dataHora(dataHora)}`;
        } else {
          descricao += 'Evento Sensível - Formato inválido';
        }
        break;
      default:
        descricao += 'Registro desconhecido';
    }

    return descricao;
  },

  // Alterna visibilidade da área de pesquisa
  toggleSearch() {
    this.dom.searchArea.style.display = this.dom.searchArea.style.display === 'none' ? 'block' : 'none';
    this.dom.resultado.textContent = ''; // Limpa resultado ao abrir/fechar busca
  },

  // Atualiza o nome do arquivo exibido na interface
  updateFileName() {
    this.dom.fileName.textContent = this.dom.fileInput.files[0]?.name || 'Nenhum arquivo selecionado';
  },

  /*
   * clearFile - Reseta o estado da aplicação.
   * Limpa o input de arquivo, resultados, cache e desabilita botões.
   */
  clearFile() {
    this.dom.fileInput.value = '';
    this.dom.fileName.textContent = 'Nenhum arquivo selecionado';
    this.dom.resultado.textContent = '';
    this.registrosData = {};
    this.resultCache = {}; // Limpa cache
    this.lastSearchResults = null; // Limpa resultados da busca
    this.dom.searchArea.style.display = 'none';
    this.dom.searchInput.value = '';

    // Desabilita botões de filtro
    document.querySelectorAll('.buttons button').forEach((button) => {
      button.disabled = true;
      button.classList.add('btn-disabled');
      button.setAttribute('title', 'Carregue o arquivo primeiramente');
    });
  },

  /*
   * showLoading - Exibe o overlay de carregamento.
   * Suporta progresso (para operações longas como interpretação de linhas).
   */
  showLoading(showProgress = false) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = 'flex';
    if (showProgress) {
      overlay.querySelector('p').textContent = 'Processando... 0%';
      overlay.querySelector('.progress-bar-fill').style.width = '0%';
    } else {
      overlay.querySelector('p').textContent = 'Carregando...';
      overlay.querySelector('.progress-bar-fill').style.width = '0%';
    }
  },

  /*
   * hideLoading - Esconde o overlay de carregamento.
   * Usado ao final de operações como upload ou interpretação.
   */
  hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
  },
};

// Processador para Portaria 1510
const AFDProcessor1510 = {
  // Elementos do DOM usados frequentemente, agrupados para fácil acesso
  dom: {
    resultado: document.getElementById('resultado'),
    searchArea: document.getElementById('searchArea'),
    searchInput: document.getElementById('searchInput'),
    searchButton: document.getElementById('searchButton'),
    saveSearchButton: document.getElementById('saveSearchButton'),
    fileInput: document.getElementById('file'),
    fileName: document.getElementById('file-name'),
  },

  // Armazena os dados processados do arquivo AFD
  registrosData: {},

  // Cache para resultados já processados, evita reprocessamento
  resultCache: {},

  // Armazena os resultados da última busca para exportação
  lastSearchResults: null,

  // Descrições dos tipos de registros para exibição amigável
  tipoRegistroDescricao: {
    1: 'Cabeçalho:',
    2: 'Tipo 2: Registros do tipo 2 (Identificação da empresa no REP):',
    3: 'Tipo 3: Registros do tipo 3 (Marcação de ponto):',
    4: 'Tipo 4: Registros do tipo 4 (Ajuste do relógio):',
    5: 'Tipo 5: Registros do tipo 5 (Inclusão, alteração ou exclusão de empregado no REP):',
    9: 'Tipo 9: Registros do tipo 9 (Trailer):',
  },

  // Funções utilitárias para formatação de datas
  format: {
    // Formata uma data no formato DD-MM-AAAA
    date(dateStr) {
      if (!dateStr || dateStr.length < 8) return 'Não disponível';
      const d = dateStr.substring(0, 2);
      const m = dateStr.substring(2, 4);
      const y = dateStr.substring(4, 8);
      return `${d}-${m}-${y}`;
    },

    // Formata uma data/hora no formato DD/MM/AAAA HH:MM
    dateTime(dateTimeStr) {
      if (!dateTimeStr || dateTimeStr.length < 12) return 'Não disponível';
      const d = dateTimeStr.substring(0, 2);
      const m = dateTimeStr.substring(2, 4);
      const y = dateTimeStr.substring(4, 8);
      const h = dateTimeStr.substring(8, 10);
      const min = dateTimeStr.substring(10, 12);
      return `${d}/${m}/${y} ${h}:${min}`;
    },

    // Formata data/hora de registros AFD para DD/MM/AAAA HH:MM
    dataHora(dataHoraStr) {
      if (!dataHoraStr || dataHoraStr.length < 12) return 'Data/Hora inválida';
      const d = dataHoraStr.substring(0, 2);
      const m = dataHoraStr.substring(2, 4);
      const y = dataHoraStr.substring(4, 8);
      const h = dataHoraStr.substring(8, 10);
      const min = dataHoraStr.substring(10, 12);
      return `${d}/${m}/${y} ${h}:${min}`;
    },

    // Limpa a razão social, removendo prefixos numéricos ou caracteres indesejados
    cleanRazaoSocial(razaoSocial) {
      if (!razaoSocial) return 'Não disponível';
      // Remove espaços em branco iniciais e finais
      razaoSocial = razaoSocial.trim();
      // Remove prefixos numéricos ou caracteres não alfabéticos no início
      razaoSocial = razaoSocial.replace(/^\d+\s*/, '');
      // Remove caracteres de controle ou não imprimíveis
      razaoSocial = razaoSocial.replace(/[\x00-\x1F\x7F]/g, '');
      return razaoSocial;
    },
  },

  /*
   * init - Inicializa os eventos do frontend.
   * Configura listeners para upload de arquivo, pesquisa por Enter e salvar busca.
   * É chamado ao carregar a página para preparar a interface.
   */
  init() {
    // Permite pesquisar pressionando Enter no campo de busca
    this.dom.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.performSearch();
    });

    // Listener para o botão "Salvar busca"
    this.dom.saveSearchButton.addEventListener('click', () => this.saveSearchResults());

    // Manipula o envio do formulário de upload
    document.getElementById('uploadForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      this.showLoading(); // Exibe overlay de carregamento

      const formData = new FormData();
      formData.append('file', this.dom.fileInput.files[0]);

      try {
        const response = await fetch('processar_afd_1510.php', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Erro ao processar o arquivo');
        }

        // Armazena os dados processados e exibe os resultados
        this.registrosData = await response.json();
        this.displayResult(this.registrosData.registros);

        // Habilita os botões de filtro após o upload
        document.querySelectorAll('.buttons button').forEach((button) => {
          button.disabled = false;
          button.classList.remove('btn-disabled');
          button.removeAttribute('title');
        });
      } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao processar o arquivo: ' + error.message);
      } finally {
        this.hideLoading(); // Esconde overlay de carregamento
      }
    });
  },

  /*
   * displayResult - Exibe os registros no elemento <pre>.
   * Usa cache para evitar reprocessamento e organiza os dados por tipo.
   * Usada para filtros e exibição inicial.
   */
  displayResult(data) {
    // Gera uma chave única para o cache baseada nos tipos e conteúdo dos dados
    const cacheKey = JSON.stringify({
      types: Object.keys(data).sort(),
      content: Object.values(data).flat().join('|'),
    });
    if (this.resultCache[cacheKey]) {
      // Usa resultado em cache, se disponível
      this.dom.resultado.textContent = this.resultCache[cacheKey];
      return;
    }

    const chunks = [];
    for (const tipo in data) {
      const registros = Array.isArray(data[tipo]) ? data[tipo] : Object.values(data[tipo]);
      if (registros.length > 0) {
        chunks.push(`${this.tipoRegistroDescricao[tipo] || `Tipo ${tipo}:`}\n`);
        chunks.push(...registros.map((linha) => `${linha}\n`));
        chunks.push('-'.repeat(40) + '\n');
      }
    }

    const result = chunks.length > 0 ? chunks.join('') : 'Nenhum registro encontrado.\n';
    this.resultCache[cacheKey] = result; // Armazena no cache
    this.dom.resultado.textContent = result; // Exibe no <pre>
  },

  /*
   * filterByType - Filtra registros por tipo (ex.: "all", "3").
   * Limpa a área de busca e chama displayResult com os dados filtrados.
   */
  filterByType(tipo) {
    if (!this.registrosData || !this.registrosData.registros) {
      alert('Por favor, carregue um arquivo antes de usar os filtros.');
      return;
    }

    this.dom.searchArea.style.display = 'none';
    this.dom.searchInput.value = '';
    const filteredData = tipo === 'all' ? this.registrosData.registros : { [tipo]: this.registrosData.registros[tipo] || [] };
    this.displayResult(filteredData);
  },

  /*
   * filterInvalidLines - Exibe linhas inválidas do arquivo.
   * Usado para depuração de arquivos com formatação incorreta.
   */
  filterInvalidLines() {
    this.dom.searchArea.style.display = 'none';
    if (!this.registrosData?.linhasInvalidas) return;

    const texto = this.registrosData.linhasInvalidas.length > 0 ? `Linhas inválidas:\n${this.registrosData.linhasInvalidas.join('\n')}` : 'Nenhuma linha inválida encontrada';
    this.dom.resultado.textContent = texto;
  },

  /*
   * showDetails - Exibe informações resumidas do arquivo (ex.: datas, contagens).
   * Extrai dados do cabeçalho e dos registros para um relatório detalhado.
   */
  showDetails() {
    this.dom.searchArea.style.display = 'none';
    if (!this.registrosData?.registros) return;

    const detalhes = {
      dataHoraGeracao: this.format.dateTime(this.registrosData.dataHoraGeracao),
      totalLinhas: this.registrosData.totalLinhas,
      serialEquipamento: this.registrosData.serialEquipamento || 'Não disponível',
      dataInicio: this.format.date(this.registrosData.dataInicio),
      dataFim: this.format.date(this.registrosData.dataFim),
      tipo2: 0,
      tipo3: 0,
      tipo4: 0,
      tipo5: 0,
      tipo9: 0,
    };

    for (const tipo in this.registrosData.registros) {
      const t = parseInt(tipo, 10);
      if (t === 2) detalhes.tipo2 = this.registrosData.registros[tipo].length;
      if (t === 3) detalhes.tipo3 = this.registrosData.registros[tipo].length;
      if (t === 4) detalhes.tipo4 = this.registrosData.registros[tipo].length;
      if (t === 5) detalhes.tipo5 = this.registrosData.registros[tipo].length;
      if (t === 9) detalhes.tipo9 = this.registrosData.registros[tipo].length;
    }

    let detalhesText = `
Detalhes do arquivo:
----------------------------------------
Data e hora da geração do arquivo: ${detalhes.dataHoraGeracao}
Quantidade de linhas no arquivo: ${detalhes.totalLinhas}
Quanidade de registros Tipo 2 (Identificação da empresa no REP): ${detalhes.tipo2}
Quantidade de registros Tipo 3 (Marcação de ponto): ${detalhes.tipo3}
Quantidade de registros Tipo 4 (Ajuste do relógio): ${detalhes.tipo4}
Quantidade de registros Tipo 5 (Inclusão, alteração ou exclusão de empregado no REP): ${detalhes.tipo5}
Quantidade de registros Tipo 9 (Trailer): ${detalhes.tipo9}

Nº serial do equipamento: ${detalhes.serialEquipamento}
Data de início dos eventos: ${detalhes.dataInicio}
Data de fim dos eventos: ${detalhes.dataFim}
`;

    if (this.registrosData.ultimaAlteracaoEmpresa) {
      detalhesText += `
Última alteração da empresa:
Data e hora da gravação: ${this.format.dateTime(this.registrosData.ultimaAlteracaoEmpresa.dataHoraGravacao)}
CNPJ/CPF do empregador: ${this.registrosData.ultimaAlteracaoEmpresa.cnpjCpfEmpregador}
Razão social: ${this.format.cleanRazaoSocial(this.registrosData.ultimaAlteracaoEmpresa.razaoSocial)}
`;
    }

    this.dom.resultado.textContent = detalhesText;
  },

  /*
   * performSearch - Realiza busca nos registros por um termo.
   * Filtra todas as linhas que contêm o termo (case-insensitive) e armazena resultados.
   */
  performSearch() {
    const termo = this.dom.searchInput.value.trim().toLowerCase();
    if (!termo) {
      alert('Digite um termo para pesquisar');
      return;
    }

    if (!this.registrosData || !this.registrosData.registros) {
      alert('Por favor, carregue um arquivo antes de pesquisar.');
      return;
    }

    const resultados = {};
    let totalResultados = 0;

    // Filtra registros por tipo, incluindo apenas tipos com resultados
    for (const tipo in this.registrosData.registros) {
      const filtered = this.registrosData.registros[tipo].filter((linha) => {
        return linha && typeof linha === 'string' && linha.toLowerCase().includes(termo);
      });
      if (filtered.length > 0) {
        resultados[tipo] = filtered;
        totalResultados += filtered.length;
      }
    }

    // Armazena os resultados para exportação
    this.lastSearchResults = resultados;

    // Exibe mensagem se não houver resultados
    if (totalResultados === 0) {
      this.dom.resultado.textContent = 'Nenhum resultado encontrado para o termo pesquisado.';
      this.lastSearchResults = null; // Limpa resultados se não houver
      return;
    }

    // Exibe os resultados filtrados
    this.displayResult(resultados);
  },

  /*
   * saveSearchResults - Exporta os resultados da última busca como arquivo .txt.
   * Gera um arquivo com o mesmo formato da exibição no <pre>, com nome baseado no termo pesquisado.
   */
  saveSearchResults() {
    if (!this.lastSearchResults) {
      alert('Nenhuma busca realizada ou nenhum resultado encontrado.');
      return;
    }

    const chunks = [];
    for (const tipo in this.lastSearchResults) {
      const registros = this.lastSearchResults[tipo];
      if (registros.length > 0) {
        chunks.push(`${this.tipoRegistroDescricao[tipo] || `Tipo ${tipo}:`}\n`);
        chunks.push(...registros.map((linha) => `${linha}\n`));
        chunks.push('-'.repeat(40) + '\n');
      }
    }

    const content = chunks.join('');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });

    // Obtém o termo pesquisado e limpa para uso no nome do arquivo
    let termo = this.dom.searchInput.value.trim();
    if (!termo) {
      termo = 'sem_termo';
    } else {
      // Substitui caracteres inválidos por underscore
      termo = termo
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      if (!termo) {
        termo = 'termo_invalido';
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resultados_busca_${termo}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /*
   * showInterpretedLines - Exibe todas as linhas interpretadas de forma legível.
   * Usa processamento em lotes para evitar travamentos em arquivos grandes.
   * Inclui barra de progresso para feedback visual e tratamento de erros.
   */
  showInterpretedLines() {
    const cacheKey = 'interpreted_lines';
    if (this.resultCache[cacheKey]) {
      // Usa cache para evitar reprocessamento
      this.dom.resultado.textContent = this.resultCache[cacheKey];
      this.dom.searchArea.style.display = 'none';
      this.hideLoading();
      return;
    }

    this.showLoading(true); // Exibe overlay com progresso
    this.dom.searchArea.style.display = 'none';

    // Valida se há registros para processar
    if (!this.registrosData?.registros || Object.values(this.registrosData.registros).every((arr) => arr.length === 0)) {
      this.dom.resultado.textContent = 'Nenhum registro disponível para interpretação.';
      this.hideLoading();
      return;
    }

    // Ordena todas as linhas por NSR
    const todasLinhas = Object.values(this.registrosData.registros)
      .flat()
      .sort((a, b) => parseInt(a.substring(0, 9), 10) - parseInt(b.substring(0, 9), 10));

    const batchSize = 500; // Tamanho do lote reduzido para melhor performance
    let index = 0;
    const resultados = [];

    // Função interna para processar lotes
    const processBatch = () => {
      try {
        const end = Math.min(index + batchSize, todasLinhas.length);
        for (; index < end; index++) {
          const linha = todasLinhas[index];
          const tipo = linha.substring(9, 10);
          resultados.push(this.interpretarLinha(linha, tipo));
        }

        // Atualiza barra de progresso
        const progress = Math.round((index / todasLinhas.length) * 100);
        document.getElementById('loadingOverlay').querySelector('p').textContent = `Processando... ${progress}%`;
        document.getElementById('loadingOverlay').querySelector('.progress-bar-fill').style.width = `${progress}%`;

        if (index < todasLinhas.length) {
          setTimeout(processBatch, 0); // Agenda próximo lote
        } else {
          const result = resultados.join('\n');
          this.resultCache[cacheKey] = result; // Armazena no cache
          this.dom.resultado.textContent = result; // Exibe resultado
          this.hideLoading(); // Esconde overlay
        }
      } catch (error) {
        console.error('Erro ao processar linhas interpretadas:', error);
        this.dom.resultado.textContent = `Erro ao processar linhas interpretadas: ${error.message}`;
        this.hideLoading();
      }
    };

    processBatch();
  },

  /*
   * interpretarLinha - Converte uma linha AFD em texto legível.
   * Extrai informações específicas com base no tipo de registro.
   * Inclui validações para evitar erros em linhas malformadas.
   */
  interpretarLinha(linha, tipo) {
    if (!linha || typeof linha !== 'string') {
      return 'Linha inválida: Dados ausentes';
    }

    let descricao = `NSR: ${linha.substring(0, 9).trim()} - Tipo: `;

    switch (tipo) {
      case '1':
        if (linha.length >= 232) {
          descricao += `Cabeçalho - Data Início: ${this.format.date(linha.substring(204, 212))} | Data Fim: ${this.format.date(linha.substring(212, 220))}`;
        } else {
          descricao += 'Cabeçalho - Formato inválido';
        }
        break;
      case '2':
        if (linha.length >= 299) {
          const razaoSocial = this.format.cleanRazaoSocial(linha.substring(49, 199));
          descricao += `Alteração Empresa - Razão Social: ${razaoSocial} | CNPJ/CPF: ${linha.substring(23, 37).trim()}`;
        } else {
          descricao += 'Alteração Empresa - Formato inválido';
        }
        break;
      case '3':
        if (linha.length >= 34) {
          const dataHora = linha.substring(10, 22);
          descricao += `Marcação Ponto - Data: ${this.format.dataHora(dataHora)} | PIS: ${linha.substring(22, 34).trim()}`;
        } else {
          descricao += 'Marcação Ponto - Formato inválido';
        }
        break;
      case '4':
        if (linha.length >= 34) {
          const antes = linha.substring(10, 22);
          const apos = linha.substring(22, 34);
          descricao += `Ajuste Relógio - Antes: ${this.format.dataHora(antes)} | Após: ${this.format.dataHora(apos)}`;
        } else {
          descricao += 'Ajuste Relógio - Formato inválido';
        }
        break;
      case '5':
        if (linha.length >= 87) {
          const operacao = linha.substring(22, 23) === 'I' ? 'Inclusão' : linha.substring(22, 23) === 'A' ? 'Alteração' : 'Exclusão';
          descricao += `${operacao} Funcionário - Nome: ${linha.substring(35, 87).trim()} | PIS: ${linha.substring(23, 35).trim()}`;
        } else {
          descricao += 'Funcionário - Formato inválido';
        }
        break;
      case '9':
        if (linha.length >= 46) {
          descricao += `Trailer - Total Tipo 2: ${linha.substring(9, 18).trim()} | Total Tipo 3: ${linha.substring(18, 27).trim()} | Total Tipo 4: ${linha.substring(27, 36).trim()} | Total Tipo 5: ${linha.substring(36, 45).trim()}`;
        } else {
          descricao += 'Trailer - Formato inválido';
        }
        break;
      default:
        descricao += 'Registro desconhecido';
    }

    return descricao;
  },

  // Alterna visibilidade da área de pesquisa
  toggleSearch() {
    this.dom.searchArea.style.display = this.dom.searchArea.style.display === 'none' ? 'block' : 'none';
    this.dom.resultado.textContent = ''; // Limpa resultado ao abrir/fechar busca
  },

  // Atualiza o nome do arquivo exibido na interface
  updateFileName() {
    this.dom.fileName.textContent = this.dom.fileInput.files[0]?.name || 'Nenhum arquivo selecionado';
  },

  /*
   * clearFile - Reseta o estado da aplicação.
   * Limpa o input de arquivo, resultados, cache e desabilita botões.
   */
  clearFile() {
    this.dom.fileInput.value = '';
    this.dom.fileName.textContent = 'Nenhum arquivo selecionado';
    this.dom.resultado.textContent = '';
    this.registrosData = {};
    this.resultCache = {}; // Limpa cache
    this.lastSearchResults = null; // Limpa resultados da busca
    this.dom.searchArea.style.display = 'none';
    this.dom.searchInput.value = '';

    // Desabilita botões de filtro
    document.querySelectorAll('.buttons button').forEach((button) => {
      button.disabled = true;
      button.classList.add('btn-disabled');
      button.setAttribute('title', 'Carregue o arquivo primeiramente');
    });
  },

  /*
   * showLoading - Exibe o overlay de carregamento.
   * Suporta progresso (para operações longas como interpretação de linhas).
   */
  showLoading(showProgress = false) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = 'flex';
    if (showProgress) {
      overlay.querySelector('p').textContent = 'Processando... 0%';
      overlay.querySelector('.progress-bar-fill').style.width = '0%';
    } else {
      overlay.querySelector('p').textContent = 'Carregando...';
      overlay.querySelector('.progress-bar-fill').style.width = '0%';
    }
  },

  /*
   * hideLoading - Esconde o overlay de carregamento.
   * Usado ao final de operações como upload ou interpretação.
   */
  hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
  },
};

// Inicializa o processador apropriado com base na página
if (window.location.pathname.includes('afd671.php')) {
  AFDProcessor.init();
} else if (window.location.pathname.includes('afd1510.php')) {
  AFDProcessor1510.init();
}
