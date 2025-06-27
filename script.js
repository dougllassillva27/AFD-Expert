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
  dom: {
    resultado: document.getElementById('resultado'),
    searchArea: document.getElementById('searchArea'),
    searchInput: document.getElementById('searchInput'),
    searchButton: document.getElementById('searchButton'),
    saveSearchButton: document.getElementById('saveSearchButton'),
    fileInput: document.getElementById('file'),
    fileName: document.getElementById('file-name'),
  },
  registrosData: {},
  resultCache: {},
  lastSearchResults: null,
  tipoRegistroDescricao: {
    1: 'Cabeçalho:',
    2: 'Tipo 2: Registros do tipo 2 (Identificação da empresa no REP):',
    3: 'Tipo 3: Registros do tipo 3 (Marcação de ponto para REP-C e REP-A):',
    4: 'Tipo 4: Registros do tipo 4 (Ajuste do relógio):',
    5: 'Tipo 5: Registros do tipo 5 (Inclusão, alteração ou exclusão de empregado no REP):',
    6: 'Tipo 6: Registros do tipo 6 (Eventos sensíveis do REP):',
  },
  format: {
    date(dateStr) {
      if (!dateStr) return 'Não disponível';
      const [y, m, d] = dateStr.split('-');
      return d && m && y ? `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}` : 'Inválida';
    },
    dateTime(dateTimeStr) {
      if (!dateTimeStr) return 'Não disponível';
      const [datePart, timePart] = dateTimeStr.split('T');
      return datePart && timePart ? `${datePart.split('-').reverse().join('/')} ${timePart.substring(0, 5)}` : 'Inválido';
    },
    dataHora(dataHoraStr) {
      if (!dataHoraStr || typeof dataHoraStr !== 'string' || dataHoraStr.length < 19) {
        return 'Data/Hora inválida';
      }
      const match = dataHoraStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
      if (!match) {
        return 'Data/Hora inválida';
      }
      const [, year, month, day, hour, minute] = match;
      return `${day}/${month}/${year} ${hour}:${minute}`;
    },
  },
  init() {
    this.dom.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.performSearch();
    });
    this.dom.saveSearchButton.addEventListener('click', () => this.saveSearchResults());
    document.getElementById('uploadForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      this.showLoading();
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
        this.registrosData = await response.json();
        this.displayResult(this.registrosData.registros);
        document.querySelectorAll('.buttons button').forEach((button) => {
          button.disabled = false;
          button.classList.remove('btn-disabled');
          button.removeAttribute('title');
        });
      } catch (error) {
        alert('Erro ao processar o arquivo: ' + error.message);
      } finally {
        this.hideLoading();
      }
    });
  },
  displayResult(data) {
    const cacheKey = JSON.stringify({
      types: Object.keys(data).sort(),
      content: Object.values(data).flat().join('|'),
    });
    if (this.resultCache[cacheKey]) {
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
    this.resultCache[cacheKey] = result;
    this.dom.resultado.textContent = result;
  },
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
  filterInvalidLines() {
    this.dom.searchArea.style.display = 'none';
    if (!this.registrosData?.linhasInvalidas) return;
    const texto = this.registrosData.linhasInvalidas.length > 0 ? `Linhas inválidas:\n${this.registrosData.linhasInvalidas.join('\n')}` : 'Nenhuma linha inválida encontrada';
    this.dom.resultado.textContent = texto;
  },
  showDetails() {
    this.dom.searchArea.style.display = 'none';
    if (!this.registrosData?.registros) return;
    const cabecalho = this.registrosData.registros[1]?.[0] || '';
    const serialEquipamento = cabecalho.substring(187, 204);
    const detalhes = {
      dataHoraGeracao: this.format.dateTime(this.registrosData.dataHoraGeracao),
      totalLinhas: this.registrosData.totalLinhas,
      serialEquipamento: serialEquipamento.padStart(17, '0'),
      cnpjCpfEmpregadorCabecalho: this.registrosData.cnpjCpfEmpregadorCabecalho || 'Não disponível',
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
  performSearch() {
    const termo = this.dom.searchInput.value.trim();
    if (!termo) {
      alert('Digite um termo para pesquisar');
      return;
    }
    if (!this.registrosData || !this.registrosData.registros) {
      alert('Por favor, carregue um arquivo antes de pesquisar.');
      return;
    }
    const isCPF = /^\d{11}$/.test(termo);
    const resultados = {};
    let totalResultados = 0;
    if (isCPF) {
      for (const tipo of ['3', '5']) {
        if (this.registrosData.registros[tipo]) {
          const filtered = this.registrosData.registros[tipo].filter((linha) => {
            if (!linha || typeof linha !== 'string') return false;
            let cpf = '';
            if (tipo === '3' && linha.length >= 46) {
              cpf = linha.substring(34, 46).trim();
            } else if (tipo === '5' && linha.length >= 47) {
              cpf = linha.substring(35, 47).trim();
            }
            return cpf === termo;
          });
          if (filtered.length > 0) {
            resultados[tipo] = filtered;
            totalResultados += filtered.length;
          }
        }
      }
    } else {
      for (const tipo in this.registrosData.registros) {
        const filtered = this.registrosData.registros[tipo].filter((linha) => {
          return linha && typeof linha === 'string' && linha.toLowerCase().includes(termo.toLowerCase());
        });
        if (filtered.length > 0) {
          resultados[tipo] = filtered;
          totalResultados += filtered.length;
        }
      }
    }
    this.lastSearchResults = resultados;
    if (totalResultados === 0) {
      this.dom.resultado.textContent = 'Nenhum resultado encontrado para o termo pesquisado.';
      this.lastSearchResults = null;
      this.dom.saveSearchButton.disabled = true;
      return;
    }
    this.dom.saveSearchButton.disabled = false;
    const cacheKey = `search_interpreted_${termo}`;
    if (this.resultCache[cacheKey]) {
      this.dom.resultado.textContent = this.resultCache[cacheKey];
      return;
    }
    const chunks = [];
    for (const tipo in resultados) {
      const registros = resultados[tipo];
      if (registros.length > 0) {
        chunks.push(`${this.tipoRegistroDescricao[tipo] || `Tipo ${tipo}:`}\n`);
        chunks.push(...registros.map((linha) => `${this.interpretarLinha(linha, tipo)}\n`));
        chunks.push('-'.repeat(40) + '\n');
      }
    }
    const result = chunks.length > 0 ? chunks.join('') : 'Nenhum registro encontrado.\n';
    this.resultCache[cacheKey] = result;
    this.dom.resultado.textContent = result;
  },
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
        chunks.push(...registros.map((linha) => `${this.interpretarLinha(linha, tipo)}\n`));
        chunks.push('-'.repeat(40) + '\n');
      }
    }
    const content = chunks.join('');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    let termo = this.dom.searchInput.value.trim();
    if (!termo) {
      termo = 'sem_termo';
    } else {
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
  showInterpretedLines() {
    const cacheKey = 'interpreted_lines';
    if (this.resultCache[cacheKey]) {
      this.dom.resultado.textContent = this.resultCache[cacheKey];
      this.dom.searchArea.style.display = 'none';
      return;
    }
    this.showLoading(true);
    this.dom.searchArea.style.display = 'none';
    if (!this.registrosData?.registros) return;
    const todasLinhas = Object.values(this.registrosData.registros)
      .flat()
      .sort((a, b) => parseInt(a.substring(0, 9), 10) - parseInt(b.substring(0, 9), 10));
    const batchSize = 500;
    let index = 0;
    const resultados = [];
    const processBatch = () => {
      const end = Math.min(index + batchSize, todasLinhas.length);
      for (; index < end; index++) {
        const linha = todasLinhas[index];
        const tipo = linha.substring(9, 10);
        resultados.push(this.interpretarLinha(linha, tipo));
      }
      const progress = Math.round((index / todasLinhas.length) * 100);
      document.getElementById('loadingOverlay').querySelector('p').textContent = `Processando... ${progress}%`;
      document.getElementById('loadingOverlay').querySelector('.progress-bar-fill').style.width = `${progress}%`;
      if (index < todasLinhas.length) {
        setTimeout(processBatch, 0);
      } else {
        const result = resultados.join('\n');
        this.resultCache[cacheKey] = result;
        this.dom.resultado.textContent = result;
        this.hideLoading();
      }
    };
    processBatch();
  },
  interpretarLinha(linha, tipo) {
    if (!linha || typeof linha !== 'string') {
      return 'Linha inválida: Dados ausentes';
    }
    let descricao = `NSR: ${linha.substring(0, 9).trim()} - Tipo: `;
    switch (tipo) {
      case '1':
        if (linha.length >= 226) {
          descricao += `Cabeçalho - Data Início: ${this.format.date(linha.substring(206, 216))} | Data Fim: ${this.format.date(linha.substring(216, 226))}`;
        } else {
          descricao += 'Cabeçalho - Formato inválido';
        }
        break;
      case '2':
        if (linha.length >= 227) {
          const dataHora = linha.substring(10, 34);
          descricao += `Alteração Empresa - Data: ${this.format.dataHora(dataHora)} | Razão Social: ${linha.substring(77, 227).trim()} | CNPJ: ${linha.substring(49, 63).trim()}`;
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
          const dataHora = linha.substring(10, 34);
          const operacao = linha.substring(34, 35) === 'I' ? 'Inclusão' : linha.substring(34, 35) === 'A' ? 'Alteração' : 'Exclusão';
          descricao += `${operacao} Funcionário - Data: ${this.format.dataHora(dataHora)} | Nome: ${linha.substring(47, 99).trim()} | CPF: ${linha.substring(35, 47).trim()}`;
        } else {
          descricao += 'Funcionário - Formato inválido';
        }
        break;
      case '6':
        if (linha.length >= 36) {
          const dataHora = linha.substring(10, 34);
          descricao += `Evento Sensível - Tipo ${linha.substring(34, 36)} | Data: ${this.format.dataHora(dataHora)}`;
        } else {
          descricao += 'Evento Sensível - Formato inválido';
        }
        break;
      default:
        descricao += 'Registro desconhecido';
    }
    return descricao;
  },
  toggleSearch() {
    this.dom.searchArea.style.display = this.dom.searchArea.style.display === 'none' ? 'block' : 'none';
    this.dom.resultado.textContent = '';
  },
  updateFileName() {
    this.dom.fileName.textContent = this.dom.fileInput.files[0]?.name || 'Nenhum arquivo selecionado';
  },
  clearFile() {
    this.dom.fileInput.value = '';
    this.dom.fileName.textContent = 'Nenhum arquivo selecionado';
    this.dom.resultado.textContent = '';
    this.registrosData = {};
    this.resultCache = {};
    this.lastSearchResults = null;
    this.dom.searchArea.style.display = 'none';
    this.dom.searchInput.value = '';
    document.querySelectorAll('.buttons button').forEach((button) => {
      button.disabled = true;
      button.classList.add('btn-disabled');
      button.setAttribute('title', 'Carregue o arquivo primeiramente');
    });
  },
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
  hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
  },
};

// Processador para Portaria 1510
const AFDProcessor1510 = {
  dom: {
    resultado: document.getElementById('resultado'),
    searchArea: document.getElementById('searchArea'),
    searchInput: document.getElementById('searchInput'),
    searchButton: document.getElementById('searchButton'),
    saveSearchButton: document.getElementById('saveSearchButton'),
    fileInput: document.getElementById('file'),
    fileName: document.getElementById('file-name'),
  },
  registrosData: {},
  resultCache: {},
  lastSearchResults: null,
  tipoRegistroDescricao: {
    1: 'Cabeçalho:',
    2: 'Tipo 2: Registros do tipo 2 (Identificação da empresa no REP):',
    3: 'Tipo 3: Registros do tipo 3 (Marcação de ponto):',
    4: 'Tipo 4: Registros do tipo 4 (Ajuste do relógio):',
    5: 'Tipo 5: Registros do tipo 5 (Inclusão, alteração ou exclusão de empregado no REP):',
    9: 'Tipo 9: Registros do tipo 9 (Trailer):',
  },
  format: {
    date(dateStr) {
      if (!dateStr || dateStr.length < 8) return 'Não disponível';
      const d = dateStr.substring(0, 2);
      const m = dateStr.substring(2, 4);
      const y = dateStr.substring(4, 8);
      return `${d}/${m}/${y}`;
    },
    dateTime(dateTimeStr) {
      if (!dateTimeStr || dateTimeStr.length < 12) return 'Não disponível';
      const d = dateTimeStr.substring(0, 2);
      const m = dateTimeStr.substring(2, 4);
      const y = dateTimeStr.substring(4, 8);
      const h = dateTimeStr.substring(8, 10);
      const min = dateTimeStr.substring(10, 12);
      return `${d}/${m}/${y} ${h}:${min}`;
    },
    dataHora(dataHoraStr) {
      if (!dataHoraStr || dataHoraStr.length < 12) return 'Data/Hora inválida';
      const d = dataHoraStr.substring(0, 2);
      const m = dataHoraStr.substring(2, 4);
      const y = dataHoraStr.substring(4, 8);
      const h = dataHoraStr.substring(8, 10);
      const min = dataHoraStr.substring(10, 12);
      return `${d}/${m}/${y} ${h}:${min}`;
    },
    cleanRazaoSocial(razaoSocial) {
      if (!razaoSocial) return 'Não disponível';
      razaoSocial = razaoSocial.trim();
      razaoSocial = razaoSocial.replace(/^\d+\s*/, '');
      razaoSocial = razaoSocial.replace(/[\x00-\x1F\x7F]/g, '');
      return razaoSocial;
    },
  },
  init() {
    this.dom.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.performSearch();
    });
    this.dom.saveSearchButton.addEventListener('click', () => this.saveSearchResults());
    document.getElementById('uploadForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      this.showLoading();
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
        this.registrosData = await response.json();
        this.displayResult(this.registrosData);
        document.querySelectorAll('.buttons button').forEach((button) => {
          button.disabled = false;
          button.classList.remove('btn-disabled');
          button.removeAttribute('title');
        });
      } catch (error) {
        alert('Erro ao processar o arquivo: ' + error.message);
      } finally {
        this.hideLoading();
      }
    });
  },
  displayResult(data) {
    const cacheKey = JSON.stringify({
      types: Object.keys(data.registros).sort(),
      content: Object.keys(data.registros)
        .map((tipo) => data.registros[tipo].length)
        .join('|'),
    });
    if (this.resultCache[cacheKey]) {
      this.dom.resultado.textContent = this.resultCache[cacheKey];
      return;
    }

    const chunks = [];
    chunks.push('Resumo do arquivo processado:\n');
    chunks.push('-'.repeat(40) + '\n');
    chunks.push(`Total de linhas: ${data.totalLinhas}\n`);
    for (const tipo in data.registros) {
      const count = data.registros[tipo].length;
      if (count > 0) {
        chunks.push(`${this.tipoRegistroDescricao[tipo] || `Tipo ${tipo}:`} ${count} registros\n`);
      }
    }
    chunks.push('-'.repeat(40) + '\n');
    chunks.push('Use os botões de filtro para visualizar os registros completos.\n');

    const result = chunks.join('');
    this.resultCache[cacheKey] = result;
    this.dom.resultado.textContent = result;
  },
  filterByType(tipo) {
    if (!this.registrosData || !this.registrosData.registros) {
      alert('Por favor, carregue um arquivo antes de usar os filtros.');
      return;
    }
    this.dom.searchArea.style.display = 'none';
    this.dom.searchInput.value = '';
    const filteredData = tipo === 'all' ? this.registrosData.registros : { [tipo]: this.registrosData.registros[tipo] || [] };

    this.displayFilteredData(filteredData);
  },
  displayFilteredData(data) {
    const cacheKey = 'filtered_data_' + JSON.stringify(Object.keys(data));
    if (this.resultCache[cacheKey]) {
      this.dom.resultado.textContent = this.resultCache[cacheKey];
      return;
    }

    this.showLoading(true);

    const chunks = [];
    const tipos = Object.keys(data);
    let tipoIndex = 0;
    const batchSize = 2000; // Processa 2000 registros por vez

    // Função para processar os registros de UM tipo em lotes
    const processRegistrosBatch = (registros, registroIndex, callback) => {
      const end = Math.min(registroIndex + batchSize, registros.length);

      for (let i = registroIndex; i < end; i++) {
        chunks.push(`${registros[i]}\n`);
      }

      const progress = Math.round((end / registros.length) * 100);
      document.getElementById('loadingOverlay').querySelector('p').textContent = `Processando Tipo ${tipos[tipoIndex]}... ${progress}%`;
      document.getElementById('loadingOverlay').querySelector('.progress-bar-fill').style.width = `${progress}%`;

      if (end < registros.length) {
        // Se houver mais registros deste tipo, agenda o próximo lote
        setTimeout(() => processRegistrosBatch(registros, end, callback), 0);
      } else {
        // Terminou de processar os registros deste tipo, chama o callback para avançar
        callback();
      }
    };

    // Função para orquestrar o processamento dos DIFERENTES tipos
    const processTipos = () => {
      if (tipoIndex >= tipos.length) {
        // Todos os tipos foram processados
        const result = chunks.length > 0 ? chunks.join('') : 'Nenhum registro encontrado para o filtro aplicado.\n';
        this.resultCache[cacheKey] = result;
        this.dom.resultado.textContent = result;
        this.hideLoading();
        return;
      }

      const tipo = tipos[tipoIndex];
      const registros = Array.isArray(data[tipo]) ? data[tipo] : [];

      if (registros.length > 0) {
        chunks.push(`${this.tipoRegistroDescricao[tipo] || `Tipo ${tipo}:`}\n`);
        // Inicia o processamento em lote para os registros do tipo atual
        processRegistrosBatch(registros, 0, () => {
          // Callback: quando terminar, adiciona o separador e avança para o próximo tipo
          chunks.push('-'.repeat(40) + '\n');
          tipoIndex++;
          setTimeout(processTipos, 0); // Avança para o próximo tipo de forma assíncrona
        });
      } else {
        // Se não há registros para este tipo, apenas avança para o próximo
        tipoIndex++;
        setTimeout(processTipos, 0);
      }
    };

    // Inicia o processo
    processTipos();
  },
  filterInvalidLines() {
    this.dom.searchArea.style.display = 'none';
    if (!this.registrosData?.linhasInvalidas) return;
    const texto = this.registrosData.linhasInvalidas.length > 0 ? `Linhas inválidas:\n${this.registrosData.linhasInvalidas.join('\n')}` : 'Nenhuma linha inválida encontrada';
    this.dom.resultado.textContent = texto;
  },
  showDetails() {
    this.dom.searchArea.style.display = 'none';
    if (!this.registrosData?.registros) return;
    const cabecalho = this.registrosData.registros[1]?.[0] || '';
    const serialEquipamento = this.registrosData.serialEquipamento || cabecalho.substring(187, 204);
    const detalhes = {
      dataHoraGeracao: this.format.dateTime(this.registrosData.dataHoraGeracao),
      totalLinhas: this.registrosData.totalLinhas,
      serialEquipamento: serialEquipamento,
      cnpjCpfEmpregadorCabecalho: this.registrosData.cnpjCpfEmpregadorCabecalho || 'Não disponível',
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
Quantidade de registros Tipo 2 (Identificação da empresa no REP): ${detalhes.tipo2}
Quantidade de registros Tipo 3 (Marcação de ponto): ${detalhes.tipo3}
Quantidade de registros Tipo 4 (Ajuste do relógio): ${detalhes.tipo4}
Quantidade de registros Tipo 5 (Inclusão, alteração ou exclusão de empregado no REP): ${detalhes.tipo5}
Quantidade de registros Tipo 9 (Trailer): ${detalhes.tipo9}

Nº serial do equipamento: ${detalhes.serialEquipamento}
CNPJ/CPF do empregador (Cabeçalho): ${detalhes.cnpjCpfEmpregadorCabecalho}
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
  // Dentro do objeto AFDProcessor1510
  performSearch() {
    const termo = this.dom.searchInput.value.trim();
    if (!termo) {
      alert('Digite um termo para pesquisar');
      return;
    }
    if (!this.registrosData || !this.registrosData.registros) {
      alert('Por favor, carregue um arquivo antes de pesquisar.');
      return;
    }
    this.hideLoading();
    const isPIS = /^\d{12}$/.test(termo);
    const resultados = [];
    // A lógica de busca agora itera sobre os registros já categorizados
    for (const tipo in this.registrosData.registros) {
      for (const linha of this.registrosData.registros[tipo]) {
        if (!linha || typeof linha !== 'string') continue;
        let encontrada = false;
        if (isPIS) {
          let pis = '';
          if (tipo === '3' && linha.length >= 34) {
            pis = linha.substring(22, 34).trim();
          } else if (tipo === '5' && linha.length >= 35) {
            pis = linha.substring(23, 35).trim();
          }
          if (pis === termo) encontrada = true;
        } else {
          if (linha.toLowerCase().includes(termo.toLowerCase())) {
            encontrada = true;
          }
        }
        if (encontrada) {
          // Armazenamos o objeto {linha, tipo} para a interpretação posterior
          resultados.push({ conteudo: linha, tipo: tipo });
        }
      }
    }
    this.lastSearchResults = resultados;
    if (resultados.length === 0) {
      this.dom.resultado.textContent = 'Nenhum resultado encontrado para o termo pesquisado.';
      this.lastSearchResults = null;
      this.dom.saveSearchButton.disabled = true;
      return;
    }
    // O resto da função para exibir os resultados permanece o mesmo...
    const cacheKey = `search_interpreted_${termo}`;
    if (this.resultCache[cacheKey]) {
      this.dom.resultado.textContent = this.resultCache[cacheKey];
      this.dom.saveSearchButton.disabled = false;
      return;
    }
    const chunks = [];
    const resultadosPorTipo = {};
    for (const { conteudo: linha, tipo } of resultados) {
      if (!resultadosPorTipo[tipo]) {
        resultadosPorTipo[tipo] = [];
      }
      resultadosPorTipo[tipo].push(linha);
    }
    for (const tipo in resultadosPorTipo) {
      const registros = resultadosPorTipo[tipo];
      if (registros.length > 0) {
        chunks.push(`${this.tipoRegistroDescricao[tipo] || `Tipo ${tipo}:`}\n`);
        chunks.push(...registros.map((linha) => `${this.interpretarLinha(linha, tipo)}\n`));
        chunks.push('-'.repeat(40) + '\n');
      }
    }
    const result = chunks.length > 0 ? chunks.join('') : 'Nenhum registro encontrado.\n';
    this.resultCache[cacheKey] = result;
    this.dom.resultado.textContent = result;
    this.dom.saveSearchButton.disabled = false;
  },
  saveSearchResults() {
    if (!this.lastSearchResults) {
      alert('Nenhuma busca realizada ou nenhum resultado encontrado.');
      return;
    }
    const chunks = [];
    const resultadosPorTipo = {};
    for (const { conteudo: linha, tipo } of this.lastSearchResults) {
      if (!resultadosPorTipo[tipo]) {
        resultadosPorTipo[tipo] = [];
      }
      resultadosPorTipo[tipo].push(linha);
    }
    for (const tipo in resultadosPorTipo) {
      const registros = resultadosPorTipo[tipo];
      if (registros.length > 0) {
        chunks.push(`${this.tipoRegistroDescricao[tipo] || `Tipo ${tipo}:`}\n`);
        chunks.push(...registros.map((linha) => `${this.interpretarLinha(linha, tipo)}\n`));
        chunks.push('-'.repeat(40) + '\n');
      }
    }
    const content = chunks.join('');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    let termo = this.dom.searchInput.value.trim();
    if (!termo) {
      termo = 'sem_termo';
    } else {
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
  showInterpretedLines() {
    const cacheKey = 'interpreted_lines';
    if (this.resultCache[cacheKey]) {
      this.dom.resultado.textContent = this.resultCache[cacheKey];
      this.dom.searchArea.style.display = 'none';
      this.hideLoading();
      return;
    }
    this.showLoading(true);
    this.dom.searchArea.style.display = 'none';
    if (!this.registrosData?.registros || Object.keys(this.registrosData.registros).length === 0) {
      this.dom.resultado.textContent = 'Nenhum registro disponível para interpretação.';
      this.hideLoading();
      return;
    }
    const todasLinhas = Object.values(this.registrosData.registros)
      .flat()
      .sort((a, b) => parseInt(a.substring(0, 9), 10) - parseInt(b.substring(0, 9), 10));
    const batchSize = 500;
    let index = 0;
    const resultados = [];
    const processBatch = () => {
      try {
        const end = Math.min(index + batchSize, todasLinhas.length);
        for (; index < end; index++) {
          const linha = todasLinhas[index];
          const tipo = linha.substring(9, 10);
          resultados.push(this.interpretarLinha(linha, tipo));
        }
        const progress = Math.round((index / todasLinhas.length) * 100);
        document.getElementById('loadingOverlay').querySelector('p').textContent = `Processando... ${progress}%`;
        document.getElementById('loadingOverlay').querySelector('.progress-bar-fill').style.width = `${progress}%`;
        if (index < todasLinhas.length) {
          setTimeout(processBatch, 0);
        } else {
          const result = resultados.join('\n');
          this.resultCache[cacheKey] = result;
          this.dom.resultado.textContent = result;
          this.hideLoading();
        }
      } catch (error) {
        this.dom.resultado.textContent = `Erro ao processar linhas interpretadas: ${error.message}`;
        this.hideLoading();
      }
    };
    processBatch();
  },
  interpretarLinha(linha, tipo) {
    if (!linha || typeof linha !== 'string') {
      return 'Linha inválida: Dados ausentes';
    }
    let descricao = `NSR: ${linha.substring(0, 9).trim()} - Tipo: `;
    switch (tipo) {
      case '1':
        if (linha.length >= 232) {
          descricao += `Cabeçalho - Data Início: ${this.format.date(linha.substring(204, 212))} | Data de fim: ${this.format.date(linha.substring(212, 220))}`;
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
          const pis = linha.substring(22, 34).trim();
          descricao += `Marcação Ponto - Data: ${this.format.dataHora(dataHora)} | PIS: ${pis}`;
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
          const nome = linha.substring(35, 87).trim();
          const pis = linha.substring(23, 35).trim();
          descricao += `${operacao} Funcionário - Nome: ${nome} | PIS: ${pis}`;
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
  toggleSearch() {
    this.dom.searchArea.style.display = this.dom.searchArea.style.display === 'none' ? 'block' : 'none';
    this.dom.resultado.textContent = '';
  },
  updateFileName() {
    if (this.dom.fileInput.files.length > 0) {
      this.dom.fileName.textContent = this.dom.fileInput.files[0].name;
    } else {
      this.dom.fileName.textContent = 'Nenhum arquivo selecionado';
    }
  },
  clearFile() {
    this.dom.fileInput.value = '';
    this.dom.fileName.textContent = 'Nenhum arquivo selecionado';
    this.dom.resultado.textContent = '';
    this.registrosData = {};
    this.resultCache = {};
    this.lastSearchResults = null;
    this.dom.searchArea.style.display = 'none';
    this.dom.searchInput.value = '';
    document.querySelectorAll('.buttons button').forEach((button) => {
      button.disabled = true;
      button.classList.add('btn-disabled');
      button.setAttribute('title', 'Carregue o arquivo primeiramente');
    });
  },
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
