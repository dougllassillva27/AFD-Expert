<?php
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
 * afd1510.php - Página principal do AFD Expert 1510 (Portaria 1510).
 * Define a interface do usuário, incluindo formulário de upload,
 * botões de filtro, área de busca e área de resultados.
 * Inclui versionamento para evitar cache de arquivos estáticos.
 */
include_once $_SERVER['DOCUMENT_ROOT'] . '/inc/versao.php';
$base = '/Secullum/AFD-Expert';
?>

<!DOCTYPE html>
<html lang="pt-br">
  <head>
    <!-- Metadados para codificação, responsividade e SEO -->
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Validador AFD Portaria 1510" />
    <meta name="keywords" content="afd, portaria, 1510, rep-c" />
    <meta name="author" content="Douglas Silva" />
    <!-- Carrega CSS com versionamento -->
    <link rel="stylesheet" href="<?= versao("$base/style.css") ?>">
    <link rel="icon" type="image/x-icon" href="favicon.ico?v=1" />
    <title>AFD Expert 1510</title>
  </head>
  <body>
    <!-- Container principal da aplicação -->
    <div class="container">
      <h1>AFD Expert 1510</h1>

      <!-- Overlay de carregamento com spinner e barra de progresso -->
      <div id="loadingOverlay" style="display: none">
        <div class="loading-spinner"></div>
        <p>Carregando...</p>
        <div class="progress-bar">
          <div class="progress-bar-fill"></div>
        </div>
      </div>

      <!-- Formulário para upload de arquivo AFD -->
      <form id="uploadForm" enctype="multipart/form-data">
        <div class="file-action-group">
          <button class="btn-home" data-tooltip="Voltar para a tela inicial" onclick="window.location.href='index.php'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
              <path d="M9 22V12h6v10" />
            </svg>
            Home
          </button>
          <label for="file" class="label-file">Escolher arquivo</label>
        </div>
        <input type="file" id="file" name="file" required onchange="AFDProcessor1510.updateFileName()" />
        <span id="file-name">Nenhum arquivo selecionado</span>
        <br />
        <div class="button-group">
          <button type="submit" class="btn-listar">Listar</button>
          <button type="button" class="btn-limpar" onclick="AFDProcessor1510.clearFile()">Limpar</button>
        </div>
        <br />
      </form>

      <!-- Botões de filtro e ações -->
      <div class="buttons">
        <button data-tooltip="Exibe detalhes do arquivo ou registro" onclick="AFDProcessor1510.showDetails()" disabled class="btn-disabled">Detalhes</button>
        <button data-tooltip="Mostrar todos os registros" onclick="AFDProcessor1510.filterByType('all')" disabled class="btn-disabled">Todos</button>
        <button data-tooltip="Registros do tipo 2 (Identificação da empresa no REP)" onclick="AFDProcessor1510.filterByType('2')" disabled class="btn-disabled">Tipo 2</button>
        <button data-tooltip="Registros do tipo 3 (Marcação de ponto)" onclick="AFDProcessor1510.filterByType('3')" disabled class="btn-disabled">Tipo 3</button>
        <button data-tooltip="Registros do tipo 4 (Ajuste do relógio)" onclick="AFDProcessor1510.filterByType('4')" disabled class="btn-disabled">Tipo 4</button>
        <button data-tooltip="Registros do tipo 5 (Inclusão, alteração ou exclusão de empregado no REP)" onclick="AFDProcessor1510.filterByType('5')" disabled class="btn-disabled">Tipo 5</button>
        <button data-tooltip="Registros do tipo 9 (Trailer)" onclick="AFDProcessor1510.filterByType('9')" disabled class="btn-disabled">Trailer</button>
        <button data-tooltip="Linhas que não atendem a nenhum tipo" onclick="AFDProcessor1510.filterInvalidLines()" disabled class="btn-disabled">Linhas inválidas</button>
        <button data-tooltip="Mostrar interpretação detalhada das linhas" onclick="AFDProcessor1510.showInterpretedLines()" disabled class="btn-disabled">Linhas interpretadas</button>
        <button data-tooltip="Pesquisar dentro do arquivo carregado" onclick="AFDProcessor1510.toggleSearch()" disabled class="btn-disabled">Pesquisar</button>
      </div>

      <h2>Resultado</h2>

      <!-- Área de busca por texto -->
      <div id="searchArea" style="display: none">
        <input type="text" id="searchInput" placeholder="Digite o termo de pesquisa" />
        <button id="searchButton" onclick="AFDProcessor1510.performSearch()">Buscar</button>
        <button id="saveSearchButton">Salvar busca</button>
      </div>
      
      <!-- Área onde os resultados são exibidos -->
      <pre id="resultado"></pre>
    </div>

    <!-- Footer com crédito ao desenvolvedor -->
    <footer class="footer">
      <p>Desenvolvido por <a href="https://www.linkedin.com/in/dougllassillva27/" target="_blank" rel="noopener">Douglas Silva</a></p>
    </footer>

    <!-- Carrega JavaScript com versionamento -->
    <script src="<?= versao("$base/script.js") ?>"></script>
  </body>
</html>