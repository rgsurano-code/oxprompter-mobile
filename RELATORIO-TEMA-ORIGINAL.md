# Validação — versão com tema original

Versão 2.0.0-beta.2 · 09/11/2026.

## Preservação

APROVADO: CSS completo, ícones 192/512 e manifesto têm o mesmo SHA-256 do ZIP fornecido. Os campos originais de preparação foram comparados por ID; nenhum foi removido. A rotina savePrep foi executada em teste com tema branco, fonte 62, velocidade 1,4, largura 72%, voz semiautomática, câmeras/dispositivos salvos, orientação horizontal e ajustes de áudio/tempo; as chaves e os valores foram preservados. Ajustes pessoais reais armazenados no navegador do usuário não foram lidos nem incluídos no ZIP.

## Testes automatizados

28 testes: 7 de dados/rotinas existentes, 17 do motor de mídia e 4 de preservação/configuração/regressão do vídeo. Consulte tests/resultado-tema.txt para o resultado efetivamente executado.

APROVADO: verificação de sintaxe de todos os scripts clássicos, referências da entrada HTML e arquivos do cache; executada por node tests/theme-check.cjs. Não há compilação nativa: a entrega contém os arquivos estáticos executáveis pelo navegador. Nenhum APK, IPA ou EXE foi gerado.

## Verificação integrada no navegador

APROVADO com fonte simulada: câmera gerada por canvas 480×640, 15 fps, exibida na prévia; transição para leitura com a imagem visível, readyState 4 e reprodução ativa. A revisão gerou um MP4 de 54,6997 segundos, dimensões 480×640, 79.463 bytes. O download foi confirmado no computador e a revisão continuou aberta após salvar. Console sem erros ou avisos no teste final. Também houve um take com áudio sintético de aproximadamente 37,94 segundos e pausa da sessão. Isso não comprova qualidade/sincronismo ou compatibilidade dos sensores reais.

FALHOU na primeira tentativa e foi CORRIGIDO: ao estacionar o elemento de câmera durante a troca de tela, o ID antigo fazia o seletor reencontrar o vídeo fora da área de leitura. Agora o vídeo estacionado tem um ID exclusivo, e o mesmo elemento é movido ao destino correto. Foi acrescentado um teste de regressão e a transição foi repetida no navegador com imagem visível.

FALHOU na inspeção inicial e foi CORRIGIDO: contraste dos botões na revisão. O adaptador aplica o verde/preto do tema aos botões, mantendo o arquivo CSS original intacto.

## NÃO TESTADO

- iPhone/Safari e Android/Chrome físicos: permissões, troca de lentes, orientação, áudio e vídeo reais, salvamento/compartilhamento e PWA.
- Reconhecimento de voz por serviço real e funcionamento offline no aparelho. Os componentes de comando e medição foram integrados; dependem das capacidades do navegador.
- Instalação/atualização efetiva do service worker em aparelhos e preservação de um perfil pessoal real.
- Desempenho, duração máxima, bateria e aquecimento em celular.
- Auditoria completa de segurança e criptografia (a senha permanece um bloqueio local).

GitHub não foi alterado nem publicado nesta etapa. O aplicativo de uso NÃO inclui o servidor nem a câmera/som simulados de QA; utiliza getUserMedia real. Os relatórios e evidências antigos que vieram do ZIP anterior permanecem históricos; não representam esta atualização.

## Conferir no celular após publicar

1. Faça backup dos roteiros e atualize preservando o endereço HTTPS. Feche abas/PWA antigas antes de reabrir.
2. Confira se as suas configurações continuam selecionadas.
3. Teste prévia frontal/traseira e microfone. Inicie a leitura e confirme a continuidade da imagem.
4. Grave um take curto com vídeo/áudio; pause, continue, finalize, salve e reproduza fora do navegador.
5. Teste vídeo sem áudio, áudio sem vídeo, só leitura, voz/comando e início por toque.
6. Só depois faça takes longos e promova a atualização. Não limpe dados do navegador sem backup.
