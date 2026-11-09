# Validação física — iPhone e Android

Versão: 2.0.0-beta.1. Preencha APROVADO, FALHOU ou NÃO TESTADO em cada aparelho. Nenhum resultado físico foi presumido nesta entrega.

Antes de atualizar: exporte os roteiros atuais e preserve a versão anterior. Abra a beta em HTTPS, sem excluir o armazenamento. Anote modelo do aparelho, versão do sistema e do navegador, endereço e se está no navegador ou na PWA. Esses contextos devem ser testados separadamente.

| Caso | Procedimento e resultado esperado | iPhone / Safari | Android / Chrome |
|---|---|---|---|
| Acesso e dados | Entrar, criar/editar roteiro, fechar/reabrir e conferir persistência; importar backup adiciona cópias sem apagar originais. | NÃO TESTADO | NÃO TESTADO |
| Prévia frontal | Testar câmera: imagem visível dentro da página, sem abrir player em tela cheia; dimensões reais informadas. | NÃO TESTADO | NÃO TESTADO |
| Prévia traseira | Trocar a câmera e repetir frontal/traseira três vezes, sem imagem congelada ou indicador de câmera residual após sair à biblioteca. | NÃO TESTADO | NÃO TESTADO |
| Permissão negada | Negar câmera, conferir mensagem e possibilidade de leitura sem câmera; autorizar nas configurações e testar novamente. Repetir com microfone. | NÃO TESTADO | NÃO TESTADO |
| Preparação → leitura | Ativar prévia, escolher automático com vídeo e áudio, iniciar: a captura deve permanecer contínua, sem troca inesperada de câmera. | NÃO TESTADO | NÃO TESTADO |
| Imagem e texto | Testar câmera ao fundo ligada/desligada e espelho do texto. O texto não deve aparecer no vídeo salvo; prévia frontal é espelhada e o arquivo não. | NÃO TESTADO | NÃO TESTADO |
| Vídeo e áudio | Gravar 20 segundos, falar, pausar, continuar, finalizar; reproduzir e conferir presença de imagem e som, sincronismo e ausência do trecho pausado. | NÃO TESTADO | NÃO TESTADO |
| Vídeo silencioso | Gravar vídeo sem áudio, em modo de rolagem por volume: o microfone controla o texto mas não deve entrar no arquivo. | NÃO TESTADO | NÃO TESTADO |
| Som sem vídeo | Desativar vídeo e manter áudio; finalizar, reproduzir e salvar arquivo de áudio válido. | NÃO TESTADO | NÃO TESTADO |
| Só leitura | Desativar áudio, vídeo e câmera de fundo; leitura automática sem solicitar permissões. | NÃO TESTADO | NÃO TESTADO |
| Voz e comando | No modo semiautomático, fala move e silêncio para o texto. No modo com comando, testar frase completa e início por toque quando o serviço falhar. | NÃO TESTADO | NÃO TESTADO |
| Orientação e resolução | Testar celular em pé e deitado antes de gravar; conferir dimensões efetivas, enquadramento e arquivo. Pedidos de 4K/60 não garantem suporte. | NÃO TESTADO | NÃO TESTADO |
| Controles | Fonte, velocidade, largura, linha de leitura, arraste, pausa e cronômetro; redimensionamento não deve voltar ao início do texto. | NÃO TESTADO | NÃO TESTADO |
| Salvar e compartilhar | Baixar e/ou compartilhar; localizar o arquivo fora do navegador e reproduzir antes de concluir a revisão. Cancelar compartilhamento deve manter o take. | NÃO TESTADO | NÃO TESTADO |
| Segundo plano | Durante gravação, trocar de app e voltar. Conferir pausa/aviso e retomar manualmente; testar chamada e bloqueio de tela somente em takes descartáveis. | NÃO TESTADO | NÃO TESTADO |
| Uso prolongado | Gravar takes de 1, 5 e 10 minutos, conferindo memória, temperatura, continuidade e arquivo final; limite do aparelho pode ser inferior ao limite interno. | NÃO TESTADO | NÃO TESTADO |
| PWA e offline | Após carregar todos os arquivos, instalar e reabrir; testar roteiros offline. Comando de voz pode não funcionar offline. | NÃO TESTADO | NÃO TESTADO |
| Atualização | Fechar todas as abas/PWA antigas e reabrir; conferir V2, acesso, roteiros e backup. Nunca limpar dados sem backup. | NÃO TESTADO | NÃO TESTADO |

Se falhar, registre o passo exato, a mensagem exibida e se a falha também ocorre no navegador sem PWA. Não envie senha, roteiro confidencial ou gravações pessoais como diagnóstico.
