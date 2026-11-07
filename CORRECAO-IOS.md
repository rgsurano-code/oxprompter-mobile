# Correção de enquadramento no iOS

## Projeto e plataforma

OXPROMPTER Mobile, aplicativo web/PWA. Falha relatada em iPhone/iOS; o Android funciona como esperado.

## Achado

Na folha `css/styles.css`, havia duas regras para o fundo de câmera no iOS. Uma pedia `object-fit: contain`, mas uma regra posterior, mais forte, definia `object-fit: cover !important`. Isso faz a imagem preencher o palco cortando partes do quadro e pode aparentar zoom na tela de leitura.

## Correção aplicada

A regra final de iOS agora usa `object-fit: contain`, preservando o quadro inteiro na tela de leitura. Se a proporção da câmera não coincidir com a tela, podem aparecer faixas pretas.

## Limite da correção

Essa alteração corrige o enquadramento visual do elemento de prévia. O arquivo gravado usa a faixa de vídeo da câmera por `MediaRecorder`; CSS não altera essa faixa. A gravação baixada ainda precisa ser conferida em um iPhone para saber se existe um segundo problema na orientação da captura.

## Testes e situação

- Revisão estática da regra CSS: aplicada.
- Teste em iPhone/Safari: não executado neste ambiente.
- Verificação do arquivo baixado no iPhone: pendente.
- Situação: correção visual preparada; validação final da gravação pendente em aparelho real.
