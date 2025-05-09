# Analisador de Arquivo AFD Portaria 671 e 1510

![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)

Este repositório contém um projeto que analisa e valida arquivos AFD (Arquivo Fonte de Dados) conforme as Portarias 671 (2021) e 1510 (2009). O AFD é um arquivo gerado por equipamentos de registro de ponto (REP) e contém informações sobre marcações de ponto dos funcionários, ajustes de relógio, eventos sensíveis, entre outros dados.

A aplicação web permite o upload de arquivos AFD nos formatos definidos pelas Portarias 671 e 1510, realiza a análise do conteúdo, exibe os registros de forma organizada, identifica linhas inválidas e fornece detalhes sobre o arquivo. O suporte à Portaria 1510 garante compatibilidade com sistemas legados que ainda utilizam o formato AFD original.

## Funcionalidades

- **Upload de arquivo AFD**: Permite o upload de arquivos AFD no formato texto, compatíveis com as Portarias 671 e 1510.
- **Detalhes do arquivo**: Exibe informações gerais sobre o arquivo, como:
  - Número total de linhas.
  - Quantidade de registros por tipo.
  - Número serial do equipamento.
  - Data de início e fim dos eventos registrados.
  - Última alteração de empresa.
- **Análise de registros**: Classifica os registros do arquivo AFD em diferentes tipos, conforme as Portarias 671 e 1510:
  - **Tipo 1**: Cabeçalho do arquivo.
  - **Tipo 2**: Identificação da empresa no REP.
  - **Tipo 3**: Marcação de ponto para REP-C e REP-A (Portaria 671) ou marcação de ponto com PIS (Portaria 1510).
  - **Tipo 4**: Ajuste do relógio.
  - **Tipo 5**: Inclusão, alteração ou exclusão de empregado no REP.
  - **Tipo 6**: Eventos sensíveis do REP (Portaria 671).
- **Validações específicas da Portaria 1510**:
  - Verifica o formato do campo PIS (12 dígitos, com '0' inicial na posição 23).[](https://centraldeatendimento.totvs.com/hc/pt-br/articles/21892016897047-RH-RM-PTO-Layout-AFD-portaria-1510-adaptado-para-portaria-671)
  - Suporta tipos de validação '0', '9' e '8' definidos no software do REP.[](https://centraldeatendimento.totvs.com/hc/pt-br/articles/21892016897047-RH-RM-PTO-Layout-AFD-portaria-1510-adaptado-para-portaria-671)
  - Valida a estrutura de registros conforme o layout do Anexo I da Portaria 1510, incluindo campos como data (DDMMAAAA), hora (HHMM), e NSR (número sequencial de registro).[](https://centraldeatendimento.totvs.com/hc/pt-br/articles/360016819371-MP-PON-Descri%25C3%25A7%25C3%25A3o-dos-campos-no-leiaute-do-arquivo-AFD-Arquivo-de-Fonte-de-Dados-conforme-Portaria-1510-2009)
- **Detecção de linhas inválidas**: Identifica e exibe linhas que não seguem os padrões esperados para as Portarias 671 ou 1510.
- **Linhas Interpretadas**: Exibe os registros do arquivo AFD (Tipos 1, 2, 3, etc.) com interpretações detalhadas e legíveis, facilitando a análise dos dados.
- **Filtragem de dados**: Permite filtrar registros por termos de pesquisa (ex.: CPF, PIS, nome da empresa, NSR).
- **Compatibilidade com sistemas legados**: Processa arquivos AFD gerados por REPs certificados sob a Portaria 1510, conforme permitido pelo Art. 96, § 1º da Portaria 671.[](https://pontoonlinetech.com.br/portaria-671-perguntas-e-respostas/)

## Suporte à Portaria 1510

A Portaria 1510 (2009), revogada pela Portaria 671 (2021), estabeleceu o formato original do arquivo AFD para Registradores Eletrônicos de Ponto (REP). Este projeto inclui suporte completo ao formato AFD da Portaria 1510, permitindo a análise de arquivos gerados por sistemas legados. As principais características do suporte incluem:

- **Formato do arquivo**: Arquivos AFD no formato texto, codificado em ASCII (ISO 8859-1), com registros terminados por CR+LF (caracteres 13 e 10).[](https://www.pontotel.com.br/portaria-1510/)
- **Estrutura de registros**: Suporta os tipos de registros definidos no Anexo I da Portaria 1510, incluindo marcações de ponto com PIS (12 dígitos) e validações específicas ('0', '9', '8').[](https://centraldeatendimento.totvs.com/hc/pt-br/articles/21892016897047-RH-RM-PTO-Layout-AFD-portaria-1510-adaptado-para-portaria-671)
- **Validações**:
  - Verificação do campo PIS com 12 dígitos, incluindo o '0' inicial na posição 23.[](https://centraldeatendimento.totvs.com/hc/pt-br/articles/21892016897047-RH-RM-PTO-Layout-AFD-portaria-1510-adaptado-para-portaria-671)
  - Validação de datas no formato DDMMAAAA e horas no formato HHMM.[](https://centraldeatendimento.totvs.com/hc/pt-br/articles/360016819371-MP-PON-Descri%25C3%25A7%25C3%25A3o-dos-campos-no-leiaute-do-arquivo-AFD-Arquivo-de-Fonte-de-Dados-conforme-Portaria-1510-2009)
  - Verificação de NSR (número sequencial de registro) único e incremental.[](https://centraldeatendimento.totvs.com/hc/pt-br/articles/360016819371-MP-PON-Descri%25C3%25A7%25C3%25A3o-dos-campos-no-leiaute-do-arquivo-AFD-Arquivo-de-Fonte-de-Dados-conforme-Portaria-1510-2009)
- **Compatibilidade**: Permite processar arquivos AFD gerados por REPs certificados sob a Portaria 1510, conforme permitido pelo Art. 96, § 1º da Portaria 671, garantindo conformidade com sistemas antigos ainda em uso.[](https://pontoonlinetech.com.br/portaria-671-perguntas-e-respostas/)

## Como usar

1. Na interface web, selecione a portaria desejada (Portaria 671 ou Portaria 1510) para processar o arquivo AFD.
2. Clique em "Escolher arquivo" para selecionar um arquivo AFD no formato texto.
3. Clique em "Listar" para processar o arquivo e exibir os registros interpretados.
4. Utilize os botões de filtro para visualizar registros específicos (ex.: Tipo 2, Tipo 3, etc.).
5. Clique em "Detalhes" para ver informações gerais sobre o arquivo, incluindo validações específicas da portaria selecionada.
6. Para limpar o arquivo e os resultados, clique em "Limpar".

## Tecnologias Utilizadas

- HTML/CSS: Para a interface web.
- JavaScript: Para a lógica de frontend e interação com o usuário.
- PHP: Para o backend que processa o arquivo AFD.

## Instalação

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/analisador-afd-671.git
   ```

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para mais detalhes.
