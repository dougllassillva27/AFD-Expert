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
 * Otimizado para baixo consumo de memória, processando arquivos grandes via streaming.
 */

header('Content-Type: application/json');
ob_start('ob_gzhandler');

ini_set('memory_limit', '512M');
ini_set('max_execution_time', 300);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['erro' => 'Método não permitido. Use POST.']);
    exit;
}

if (!isset($_FILES['file']) || !isset($_FILES['file']['tmp_name']) || !is_uploaded_file($_FILES['file']['tmp_name'])) {
    http_response_code(400);
    echo json_encode(['erro' => 'Nenhum arquivo enviado ou erro no upload.']);
    exit;
}

$arquivo = $_FILES['file'];
$resultado = processarAFD1510($arquivo['tmp_name']);
echo json_encode($resultado);

function cleanRazaoSocial($razaoSocial) {
    $razaoSocial = trim($razaoSocial);
    $razaoSocial = preg_replace('/^\d+\s*/', '', $razaoSocial);
    $razaoSocial = preg_replace('/[\x00-\x1F\x7F]/u', '', $razaoSocial);
    return $razaoSocial;
}

function processarAFD1510($caminhoArquivo) {
    $registros = ['1' => [], '2' => [], '3' => [], '4' => [], '5' => [], '9' => []];
    $linhasInvalidas = [];
    $ultimaSequencia = null;
    $totalLinhasProcessadas = 0;

    $minLengthByType = [
        '1' => 232, '2' => 299, '3' => 34,
        '4' => 34, '5' => 87, '9' => 46,
    ];

    try {
        $arquivo = new SplFileObject($caminhoArquivo, 'r');
        $arquivo->setFlags(SplFileObject::DROP_NEW_LINE | SplFileObject::SKIP_EMPTY);

        while (!$arquivo->eof()) {
            $linha = $arquivo->fgets();
            if ($linha === false) continue;

            if (!mb_check_encoding($linha, 'UTF-8')) {
                $linha = mb_convert_encoding($linha, 'UTF-8', 'ISO-8859-1');
            }
            $linha = trim($linha);
            if (empty($linha)) continue;

            $nsr = substr($linha, 0, 9);
            $tipo = substr($linha, 9, 1);
            $numeroLinha = is_numeric($nsr) ? intval($nsr) : $nsr;
            $totalLinhasProcessadas++;

            if ($tipo !== '1' && $ultimaSequencia !== null && is_numeric($numeroLinha) && $numeroLinha < $ultimaSequencia) {
                $linhasInvalidas[] = $linha;
                continue;
            }
            if (is_numeric($numeroLinha)) {
                $ultimaSequencia = $numeroLinha;
            }

            if (array_key_exists($tipo, $registros) && strlen($linha) >= $minLengthByType[$tipo]) {
                if ($tipo === '1') {
                    if ($nsr !== '000000000' || substr($linha, 10, 1) !== '1') {
                        $linhasInvalidas[] = $linha;
                        continue;
                    }
                } elseif ($tipo === '2') {
                    $tipoEmpregador = substr($linha, 22, 1);
                    $cnpjCpf = in_array($tipoEmpregador, ['1', '2']) ? trim(substr($linha, 23, 14)) : trim(substr($linha, 37, 14));
                    if (!preg_match('/^\d{14}$/', $cnpjCpf)) {
                        $linhasInvalidas[] = $linha;
                        continue;
                    }
                } elseif ($tipo === '3') {
                    $pis = substr($linha, 22, 12);
                    $dataHora = substr($linha, 10, 12);
                    if (!preg_match('/^\d{12}$/', $pis) || !preg_match('/^\d{8}\d{4}$/', $dataHora)) {
                        $linhasInvalidas[] = $linha;
                        continue;
                    }
                } elseif ($tipo === '5') {
                    $pis = substr($linha, 23, 12);
                    $operacao = substr($linha, 22, 1);
                    if (!in_array($operacao, ['I', 'A', 'E']) || !preg_match('/^\d{12}$/', $pis)) {
                        $linhasInvalidas[] = $linha;
                        continue;
                    }
                } elseif ($tipo === '9') {
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
    } catch (Exception $e) {
        http_response_code(500);
        return ['erro' => 'Falha ao ler o arquivo.', 'detalhe' => $e->getMessage()];
    } finally {
        $arquivo = null;
    }

    $cabecalho = $registros['1'][0] ?? '';
    $serialEquipamento = substr($cabecalho, 187, 17);
    $dataInicio = substr($cabecalho, 204, 8);
    $dataFim = substr($cabecalho, 212, 8);
    $dataHoraGeracao = substr($cabecalho, 220, 8) . substr($cabecalho, 228, 4);
    $cnpjCpfEmpregadorCabecalho = trim(substr($cabecalho, 11, 14));

    $ultimoTipo2 = end($registros['2']);
    $ultimaAlteracaoEmpresa = null;
    if ($ultimoTipo2) {
        $tipoEmpregador = substr($ultimoTipo2, 22, 1);
        $cnpjCpf = in_array($tipoEmpregador, ['1', '2']) ? trim(substr($ultimoTipo2, 23, 14)) : trim(substr($ultimoTipo2, 37, 14));
        $razaoSocialPos = in_array($tipoEmpregador, ['1', '2']) ? 49 : 51;
        $ultimaAlteracaoEmpresa = [
            'dataHoraGravacao' => substr($ultimoTipo2, 10, 8) . substr($ultimoTipo2, 18, 4),
            'cnpjCpfEmpregador' => $cnpjCpf,
            'razaoSocial' => cleanRazaoSocial(substr($ultimoTipo2, $razaoSocialPos, 150))
        ];
    }

    $trailer = $registros['9'][0] ?? '';
    if ($trailer) {
        $totalTipo2 = (int) substr($trailer, 10, 9);
        $totalTipo3 = (int) substr($trailer, 19, 9);
        $totalTipo4 = (int) substr($trailer, 28, 9);
        $totalTipo5 = (int) substr($trailer, 37, 9);
        $validTrailer = (
            $totalTipo2 === count($registros['2']) &&
            $totalTipo3 === count($registros['3']) &&
            $totalTipo4 === count($registros['4']) &&
            $totalTipo5 === count($registros['5'])
        );
        if (!$validTrailer) {
            $linhasInvalidas[] = $trailer;
            $registros['9'] = [];
        }
    }

    return [
        'registros' => array_map(fn($tipoRegistros) => array_map('strval', $tipoRegistros), $registros),
        'linhasInvalidas' => $linhasInvalidas,
        'totalLinhas' => $totalLinhasProcessadas,
        'dataInicio' => $dataInicio,
        'dataFim' => $dataFim,
        'dataHoraGeracao' => $dataHoraGeracao,
        'cnpjCpfEmpregadorCabecalho' => $cnpjCpfEmpregadorCabecalho,
        'serialEquipamento' => $serialEquipamento,
        'ultimaAlteracaoEmpresa' => $ultimaAlteracaoEmpresa
    ];
}
?>