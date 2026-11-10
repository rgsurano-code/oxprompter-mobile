# Correção de vídeo final — 10/11/2026

Base exclusiva: `oxprompter-mobile semGRAVA IOS.zip`. O arquivo original foi preservado.

## Alterações

- Removida a rotina da revisão que pausava o vídeo após 260 ms e voltava ao primeiro quadro. A reprodução com som começa pelo controle nativo, por toque.
- Quando a câmera de fundo da leitura está ativa, a captura usa esse mesmo elemento visível como fonte, evitando depender de um segundo vídeo oculto no iPhone.
- A preparação aguarda uma imagem decodificada da câmera. Falhas de reprodução deixam de ser ignoradas nessa etapa.
- A finalização de uma sessão antiga não encerra recursos de uma sessão nova. Erros assíncronos do gravador são apresentados no status.
- Alterado o identificador do cache para distribuir o JavaScript atualizado.

Não foram alterados CSS, proporções, recortes, resolução, disposição das telas de preparação/leitura ou os botões Salvar/Excluir. Isso preserva inclusive as diferenças de enquadramento existentes entre câmera de fundo e arquivo, conforme o pedido de manter a aparência atual.

## Verificação

- APROVADO: dez testes automatizados — sete existentes e três novos para rejeição de reprodução, espera da primeira imagem e timeout da câmera.
- APROVADO: gravação MP4 vertical 1080×1920 e horizontal 1920×1080 com câmera e áudio sintéticos no Edge 157 para Windows, executando o caminho de código identificado como iOS pelo user agent.
- APROVADO: arquivo com quadros diferentes em momentos distintos; reprodução avançando por mais de 1,5 s sem pausa forçada; download dos dois arquivos.
- APROVADO: pausa, retomada e recomeço durante o cenário vertical; nova gravação sem os dados anteriores.
- APROVADO: nenhum erro JavaScript de página nesses cenários.
- NÃO TESTADO: Safari/iOS real, câmera e microfone físicos, qualidade/escuta do áudio, gravação longa e interrupções do sistema. Simular o user agent do iPhone não simula o motor Safari.

Resultados da execução: `tests/results-ios-video-final/resultados.json`.

## Teste no iPhone

1. Publicar os arquivos por HTTPS. Fechar as abas e reabrir o aplicativo após atualizar.
2. Gravar pelo menos dez segundos em pé e depois deitado, movimentando a mão e falando.
3. Finalizar e tocar no controle de reprodução: conferir movimento, avanço do tempo e áudio.
4. Salvar e abrir o MP4 em Arquivos/Fotos. Se apenas a revisão falhar, conferir se o arquivo salvo reproduz normalmente.
5. Repetir pausando/retomando e recomeçando. Conferir se o novo arquivo começa no recomeço.

Sem teste no aparelho não é possível garantir que todas as causas do congelamento específico foram eliminadas.

## Reproduzir verificações

`node --test tests/core.test.cjs tests/camera-readiness.test.cjs`

Com a dependência Playwright declarada no projeto e Microsoft Edge disponível: `node tests/ios-video-final.cjs`.

## Reversão

Restaurar os arquivos do ZIP original. Ao publicar uma reversão, usar um novo identificador de cache em `sw.js` para evitar mistura de versões.

