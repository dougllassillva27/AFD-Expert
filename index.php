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
 * index.php - Página inicial do AFD Expert.
 * Permite ao usuário escolher entre o AFD Expert 671 e AFD Expert 1510.
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
    <meta name="description" content="Validador AFD Portaria 671 e 1510" />
    <meta name="keywords" content="afd, portaria, 671, 1510, rep-c" />
    <meta name="author" content="Douglas Silva" />
    <!-- Carrega CSS com versionamento -->
    <link rel="stylesheet" href="<?= versao("$base/style.css") ?>">
    <link rel="icon" type="image/x-icon" href="favicon.ico?v=1" />
    <title>AFD Expert</title>
  </head>
  <body class="index-body">
    <!-- Container principal para centralização -->
    <div class="index-container">
      <h1>AFD Expert</h1>
      <p>Escolha o tipo de arquivo AFD para validação:</p>
      <div class="button-group-vertical">
        <a href="afd671.php" class="btn-index">AFD Expert 671</a>
        <a href="afd1510.php" class="btn-index">AFD Expert 1510</a>
      </div>
    </div>
    <!-- Footer com crédito ao desenvolvedor -->
    <footer class="footer">
      <p>Desenvolvido por <a href="https://www.linkedin.com/in/dougllassillva27/" target="_blank" rel="noopener">Douglas Silva</a></p>
    </footer>
  </body>
</html>