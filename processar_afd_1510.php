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
 * processar_afd_1510.php - Backend para processamento de arquivos AFD da Portaria 1510.
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
$resultado = processarAFD1510($conteudo);
echo json_encode($resultado);

/*
 * cleanRazaoSocial - Limpa a razão social, removendo prefixos numéricos ou caracteres indesejados.
 * @param string $razaoSocial Texto bruto da razão social.
 * @return string Razão social limpa.
 */
function cleanRazaoSocial($razaoSocial) {
    // Remove espaços em branco iniciais e finais
    $razaoSocial = trim($razaoSocial);
    // Remove prefixos numéricos ou caracteres não alfabéticos no início
    $razaoSocial = preg_replace('/^\d+\s*/', '', $razaoSocial);
    // Remove caracteres de controle ou não imprimíveis
    $razaoSocial = preg_replace('/[\x00-\x1F\x7F]/u', '', $razaoSocial);
    return $razaoSocial;
}

/*
 * processarAFD1510 - Função principal para processar o arquivo AFD da Portaria 1510.
 * Divide as linhas em registros por tipo, valida sequência, comprimento e PIS.
 * Retorna um objeto com registros, linhas inválidas e metadados.
 * @param string $data Conteúdo do arquivo AFD.
 * @return array Resultado processado.
 */
function processarAFD1510($data) {
    // Inicializa arrays para cada tipo de registro
    $registros = ['1' => [], '2' => [], '3' => [], '4' => [], '5' => [], '9' => []];
    $linhasInvalidas = [];
    // Remove \r e divide em linhas
    $linhas = explode("\n", str_replace("\r", "", $data));
    $ultimaSequencia = null;

    // Define comprimentos mínimos por tipo para validação
    $minLengthByType = [
        '1' => 232, // Cabeçalho
        '2' => 299, // Empresa
        '3' => 34,  // Marcação de ponto
        '4' => 34,  // Ajuste de relógio
        '5' => 87,  // Funcionário
        '9' => 46,  // Trailer
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
        if ($tipo !== '1' && $ultimaSequencia !== null && $numeroLinha !== $ultimaSequencia + 1) {
            $linhasInvalidas[] = $linha;
            continue;
        }
        $ultimaSequencia = $numeroLinha;

        // Valida tipo e comprimento da linha
        if (array_key_exists($tipo, $registros) && strlen($linha) >= $minLengthByType[$tipo]) {
            // Validações específicas por tipo
            if ($tipo === '1') {
                // Cabeçalho: NSR deve ser '000000000' e campo 10 deve ser '1'
                if ($nsr !== '000000000' || substr($linha, 10, 1) !== '1') {
                    $linhasInvalidas[] = $linha;
                    continue;
                }
            } elseif ($tipo === '3') {
                // Marcação de ponto: PIS deve ter 12 dígitos
                $pis = substr($linha, 22, 12);
                if (!preg_match('/^\d{12}$/', $pis)) {
                    $linhasInvalidas[] = $linha;
                    continue;
                }
            } elseif ($tipo === '5') {
                // Funcionário: PIS deve ter 12 dígitos, operação deve ser 'I', 'A' ou 'E'
                $pis = substr($linha, 23, 12);
                $operacao = substr($linha, 22, 1);
                if (!preg_match('/^\d{12}$/', $pis) || !in_array($operacao, ['I', 'A', 'E'])) {
                    $linhasInvalidas[] = $linha;
                    continue;
                }
            } elseif ($tipo === '9') {
                // Trailer: NSR deve ser '999999999'
                if ($nsr !== '999999999') {
                    $linhasInvalidas[] = $linha;
                    continue;
                }
            }
            $registros[$tipo][] = $linha;
        } else {
            $linhasInvalidas[] = $linha;
        }
    }

    // Extrai metadados do cabeçalho (tipo 1)
    $cabecalho = $registros['1'][0] ?? '';
    $serialEquipamento = substr($cabecalho, 187, 17); // Posições 188 a 204 (17 caracteres)
    $dataInicio = substr($cabecalho, 204, 8);
    $dataFim = substr($cabecalho, 212, 8);
    $dataHoraGeracao = substr($cabecalho, 220, 8) . substr($cabecalho, 228, 4); // Data (ddmmaaaa) + Hora (HHMM)

    // Valida o número serial (deve ser 17 dígitos numéricos)
    if ($cabecalho && !preg_match('/^\d{17}$/', $serialEquipamento)) {
        $linhasInvalidas[] = $cabecalho;
        $registros['1'] = [];
    }

    // Extrai informações da última alteração de empresa (tipo 2)
    $ultimoTipo2 = end($registros['2']);
    $ultimaAlteracaoEmpresa = null;
    if ($ultimoTipo2) {
        $ultimaAlteracaoEmpresa = [
            'dataHoraGravacao' => substr($ultimoTipo2, 10, 8) . substr($ultimoTipo2, 18, 4), // Data (ddmmaaaa) + Hora (HHMM)
            'cnpjCpfEmpregador' => trim(substr($ultimoTipo2, 23, 14)),
            'razaoSocial' => cleanRazaoSocial(substr($ultimoTipo2, 49, 150))
        ];
    }

    // Valida o trailer (tipo 9)
    $trailer = $registros['9'][0] ?? '';
    $totalTipo2 = (int) substr($trailer, 9, 9);
    $totalTipo3 = (int) substr($trailer, 18, 9);
    $totalTipo4 = (int) substr($trailer, 27, 9);
    $totalTipo5 = (int) substr($trailer, 36, 9);
    $validTrailer = (
        $totalTipo2 === count($registros['2']) &&
        $totalTipo3 === count($registros['3']) &&
        $totalTipo4 === count($registros['4']) &&
        $totalTipo5 === count($registros['5'])
    );
    if ($trailer && !$validTrailer) {
        $linhasInvalidas[] = $trailer;
        $registros['9'] = [];
    }

    // Retorna resultado estruturado
    return [
        'registros' => $registros,
        'linhasInvalidas' => $linhasInvalidas,
        'totalLinhas' => count($linhas),
        'dataInicio' => $dataInicio,
        'dataFim' => $dataFim,
        'dataHoraGeracao' => $dataHoraGeracao,
        'serialEquipamento' => $serialEquipamento, // Adicionado
        'ultimaAlteracaoEmpresa' => $ultimaAlteracaoEmpresa
    ];
}
?>