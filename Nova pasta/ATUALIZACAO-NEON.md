# Atualização V1.0.2 — painel Neon e microfone

Base: V1.0.1 aprovada pelo usuário. A pasta e o ZIP anteriores foram preservados.

## Alterações

- Abertura: Oxprompter - Android & IOS.
- Painel com a imagem original enviada pelo usuário. Áreas de toque remapeadas para os comandos existentes, com foco por teclado e nomes acessíveis.
- A− / A+: diminuir e aumentar a fonte; número central mostra o tamanho atual.
- Botão vermelho ⏸: pausar leitura e gravação. Botão verde ▶: continuar leitura e gravação.
- S: finalizar e abrir a revisão para salvar ou excluir.
- Seta circular amarela: recomeçar leitura e gravação.
- Seta branca: voltar à preparação.
- Dois pontos verdes: ocultar controles; o botão de revelar continua disponível.
- − / +: diminuir e aumentar a velocidade; o mostrador indica a velocidade atual.
- Seta dupla laranja: alternar a largura do texto.
- Indicador numérico em dB substituído por barra de nível de entrada do microfone. Ela mede entrada; não altera ganho/volume do aparelho.
- Cache atualizado para incluir a arte e distribuir a nova interface.

## Preservação

Seis funções de captura, gravação, enquadramento, reprodução e salvamento foram comparadas e são idênticas à versão aprovada. Não foram alterados proporções, resolução, recorte nem estilos da imagem de câmera.

## Verificações

- APROVADO: dez testes automatizados de armazenamento, texto, importação, seleção de formato e prontidão da câmera.
- APROVADO: sintaxe JavaScript e igualdade da imagem fornecida.
- APROVADO: painel nos temas claro/escuro em 320×568, 390×844, 844×390 e 1280×800; dez áreas de toque corretas, fonte, velocidade, largura, pausa/continuação, ocultar/mostrar, recomeço e retorno; barra reagindo ao áudio sintético, sem erros JavaScript de página. O painel ocupa no máximo 34% da altura disponível, preservando suas proporções.
- Resultados dos testes do painel: tests/results-neon/resultados.json.
- APROVADO: repetição da gravação MP4 vertical/horizontal, reprodução com movimento, pausa/retomada, recomeço no cenário vertical e download, no Edge para Windows com câmera/áudio sintéticos.
- Resultados da repetição dos testes de gravação: tests/results-ios-video-final/resultados.json.
- NÃO TESTADO: interface nova no Safari/iPhone e Android reais; precisão de toques em aparelho físico.

As verificações de navegador usam Edge para Windows. Áudio e câmera são sintéticos. As áreas dos botões acompanham a escala da arte; em telas estreitas ficam menores.

## Pendência conhecida

A falha relatada no iOS — comando inicia a leitura, mas a fala não aciona a rolagem — ainda NÃO FOI CORRIGIDA. A barra torna a entrada de áudio visível para o próximo diagnóstico. Não houve mudança no ciclo do reconhecimento de voz/AudioContext nesta atualização.

## Conferir no celular

Publicar a pasta por HTTPS; fechar e reabrir o aplicativo. Conferir a abertura e cada botão. Verificar a alternância vermelho/verde e gravar/finalizar nos dois formatos. Depois iniciar pelo comando de voz e observar se a nova barra reage à fala.

## Testes reproduzíveis

- npm test
- npm run test:neon (Playwright com Edge instalado)
- npm run test:ios-video (câmera sintética; não certifica iPhone)

Para reverter, restaurar o ZIP V1.0.1. Em publicação de reversão, usar um identificador novo de cache em sw.js.