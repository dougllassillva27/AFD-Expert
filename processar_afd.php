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

/**
 * processar_afd.php - Backend para processamento de arquivos AFD.
 * Recebe o arquivo via POST, valida, processa e retorna JSON com os registros.
 * Inclui otimizações como compressão gzip e validação de comprimento de linhas.
 */

/*
 * Configura o cabeçalho para JSON e habilita compressão gzip.
 * A compressão reduz o tamanho da resposta para arquivos grandes.
 */
header('Content-Type: application/json');
ob_start('ob_gzhandler');

/*
 * Valida se a requisição é POST.
 * Retorna erro 405 se o método for inválido.
 */
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['erro' => 'Método não permitido. Use POST.']);
    exit;
}

/*
 * Verifica se o arquivo foi enviado.
 * Retorna erro 400 se não houver arquivo.
 */
if (!isset($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(['erro' => 'Nenhum arquivo enviado.']);
    exit;
}

/*
 * Lê o conteúdo do arquivo enviado.
 * Converte codificação para UTF-8, se necessário.
 */
$arquivo = $_FILES['file'];
$conteudo = file_get_contents($arquivo['tmp_name']);
if (!mb_check_encoding($conteudo, 'UTF-8')) {
    $conteudo = mb_convert_encoding($conteudo, 'UTF-8', 'ISO-8859-1');
}

/*
 * Processa o arquivo e retorna o resultado como JSON.
 */
$resultado = processarAFD($conteudo);
echo json_encode($resultado);

/*
 * processarAFD - Função principal para processar o arquivo AFD.
 * Divide as linhas em registros por tipo, valida sequência e comprimento.
 * Retorna um objeto com registros, linhas inválidas e metadados.
 * @param string $data Conteúdo do arquivo AFD.
 * @return array Resultado processado.
 */
function processarAFD($data) {
    // Inicializa arrays para cada tipo de registro
    $registros = ['1' => [], '2' => [], '3' => [], '4' => [], '5' => [], '6' => []];
    $linhasInvalidas = [];
    // Remove \r e divide em linhas
    $linhas = explode("\n", str_replace("\r", "", $data));
    $ultimaSequencia = null;

    // Define comprimentos mínimos por tipo para validação
    $minLengthByType = [
        '1' => 250, // Cabeçalho
        '2' => 227, // Empresa
        '3' => 46,  // Marcação de ponto
        '4' => 58,  // Ajuste de relógio
        '5' => 99,  // Funcionário
        '6' => 36,  // Evento sensível
    ];

    // Processa cada linha do arquivo
    foreach ($linhas as $linha) {
        $linha = trim($linha);
        if (empty($linha)) continue;

        // Extrai NSR (número sequencial) e tipo
        $nsr = substr($linha, 0, 9);
        $tipo = substr($linha, 9, 1);
        $numeroLinha = intval($nsr);

        // Valida sequência de NSR
        if ($ultimaSequencia !== null && $numeroLinha !== $ultimaSequencia + 1) {
            $linhasInvalidas[] = $linha;
            continue;
        }
        $ultimaSequencia = $numeroLinha;

        // Valida tipo e comprimento da linha
        if (array_key_exists($tipo, $registros) && strlen($linha) >= $minLengthByType[$tipo]) {
            $registros[$tipo][] = $linha;
        } else {
            $linhasInvalidas[] = $linha;
        }
    }

    // Extrai metadados do cabeçalho (tipo 1)
    $cabecalho = $registros['1'][0] ?? '';
    $dataInicio = substr($cabecalho, 206, 10);
    $dataFim = substr($cabecalho, 216, 10);
    $dataHoraGeracao = trim(substr($cabecalho, 226, 24));

    // Extrai informações da última alteração de empresa (tipo 2)
    $ultimoTipo2 = end($registros['2']);
    $ultimaAlteracaoEmpresa = null;
    if ($ultimoTipo2) {
        $ultimaAlteracaoEmpresa = [
            'dataHoraGravacao' => trim(substr($ultimoTipo2, 10, 24)),
            'cnpjCpfEmpregador' => trim(substr($ultimoTipo2, 49, 14)),
            'razaoSocial' => trim(substr($ultimoTipo2, 77, 150))
        ];
    }

    // Retorna resultado estruturado
    return [
        'registros' => $registros,
        'linhasInvalidas' => $linhasInvalidas,
        'totalLinhas' => count($linhas),
        'dataInicio' => $dataInicio,
        'dataFim' => $dataFim,
        'dataHoraGeracao' => $dataHoraGeracao,
        'ultimaAlteracaoEmpresa' => $ultimaAlteracaoEmpresa
    ];
}
?>