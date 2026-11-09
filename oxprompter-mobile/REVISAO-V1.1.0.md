# Revisão V1.1.0 — OXPROMPTER Mobile

Data: 09/11/2026. Candidata para homologação em aparelhos reais.

## Alterações

- Câmera reescrita em `js/camera.js`, com captura única e saída local compartilhada por prévia, leitura e gravação. A imagem é desenhada com proporção preservada; o preenchimento por recorte CSS que podia causar aumento ao mudar de tela foi removido.
- Orientação e dimensões da saída fixas por tomada. O módulo impede mudar câmera/formato com a tomada preparada. A fonte não é reaberta ao entrar na leitura. A imagem inteira é mantida; proporções de câmera, arquivo e tela diferentes podem deixar espaço livre. Não é possível prometer simultaneamente tela cheia, imagem inteira e ausência de deformação em proporções incompatíveis.
- O arquivo é gravado a partir da saída orientada, sem depender apenas dos metadados de rotação da câmera. O texto do teleprompter não entra no vídeo. Resolução da fonte e da saída são informadas; gerar mais pixels que a fonte não cria detalhes. FPS e desempenho real ainda dependem do aparelho.
- Solicitações simultâneas são controladas; uma permissão concedida depois de sair é encerrada. Falhas de abertura, desconexão durante a contagem e falhas ao iniciar a gravação liberam os recursos. Finalizações antigas não encerram uma sessão nova.
- Recomeçar descarta a tomada anterior somente após escolha explícita e reinicia texto, cronômetro, contagem e gravador. Voltar também oferece finalizar/revisar, descartar ou cancelar. Cancelar preserva a tomada pausada. Erros do gravador mantêm os blocos disponíveis para revisar um arquivo parcial, quando o navegador os fornece.
- Importar texto após abrir um roteiro cria um novo roteiro. Salvamento falho não confirma troca de senha nem avança a preparação como se tivesse salvo. Há aviso persistente e exportação de emergência; preferências são salvas nas mudanças.
- Correções de RTF, Unicode XML, duração e preservação de parágrafos. Cache PWA versionado e módulo de câmera incluído nos recursos offline. Versão visível na abertura.

## Validação efetivamente realizada

| Verificação | Estado |
|---|---|
| Sintaxe dos scripts da aplicação e service worker | APROVADO |
| 29 testes unitários e de regressão, Node.js v24.21.0 | APROVADO |
| Roteiro anterior de navegador: biblioteca, backup, DOCX, leitura, controles, áudio, vídeo, cache e recarga offline | APROVADO em Chromium/Edge 157.0.4341.42 no Windows |
| Roteiro complementar: edição, exclusão, senha, alternativa ao comando de voz, câmera negada e tema | APROVADO em Chromium/Edge no Windows |
| 8 verificações de câmera: prévia/leitura com quatro bordas, vertical/horizontal, dimensões fixas, vídeo real decodificado, download, reinício e recuperação | APROVADO com imagens sintéticas em Chromium/Edge no Windows |
| Erros JavaScript não tratados nesses roteiros | Nenhum capturado |
| Safari/WebKit nesta revisão | NÃO TESTADO |
| Android e iPhone físicos, câmeras frontal/traseira, seleção real de lentes | NÃO TESTADO |
| 4K/60 fps, fidelidade audiovisual, aquecimento, duração longa, consumo de memória/bateria | NÃO TESTADO em hardware real |
| Instalação e atualização de PWA no celular, interrupções do sistema, compartilhamento/download do iOS | NÃO TESTADO em hardware real |

Os testes de navegador usam dispositivos simulados e padrões sintéticos. Foram produzidos, baixados e decodificados arquivos reais de vídeo de 720 × 1280 e 1280 × 720; as quatro bordas coloridas continuaram visíveis. Isso verifica a lógica e o navegador testado, sem certificar o sensor, os codecs e a rotação de cada iPhone/Android. As evidências atuais estão em `tests/results/`; `tests/evidence/` e `RELATORIO-AUDITORIA.md` são históricos da versão anterior.

## Operação, riscos e próximo passo

A aplicação continua sendo web/PWA, sem instalador nativo novo. No computador: Node.js 20+ e `npm start`. No celular: HTTPS. Antes de atualizar, exporte os roteiros e mantenha a mesma origem. Substitua todos os arquivos e feche abas/PWA antigas; confira V1.1.0 na abertura.

O processamento de orientação em canvas acrescenta trabalho de CPU/GPU; não há ganho de desempenho medido. Gravações ainda permanecem em memória até o download. A senha local continua sem criptografia dos roteiros. Não foi realizado pentest nem teste de instalação nativa.

Próximo passo: executar `TESTE-NO-CELULAR.md` nos aparelhos que apresentaram a falha, começando por vertical/720p/30 fps. Validar o enquadramento e o arquivo baixado antes de homologar outras resoluções. Não foi afirmado funcionamento perfeito em aparelhos não testados.

## Fontes técnicas consultadas

- [W3C — Media Capture and Streams](https://www.w3.org/TR/mediacapture-streams/): restrições desejadas não garantem dimensões efetivas; orientação e configurações precisam de verificação.
- [W3C — Media Capture from DOM Elements](https://www.w3.org/TR/mediacapture-fromelement/): captura do quadro de canvas com dimensões definidas.
- [WebKit — MediaRecorder](https://webkit.org/blog/11353/): entrada de gravação pode ser uma mídia gerada localmente.
- [WebKit — relato de regressão de rotação da câmera frontal](https://bugs.webkit.org/show_bug.cgi?id=323550): evidência de que prévia correta e metadados de orientação do arquivo podem divergir; não comprova a causa no aparelho do usuário.
