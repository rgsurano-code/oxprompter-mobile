# Correção da gravação vertical no iOS — OXPROMPTER Mobile V0.4

## Escopo

Corrigir o caminho vertical da câmera frontal no Safari iOS, preservando o fluxo de início por toque da V0.4 e sem alterar o caminho Android.

## Alterações aplicadas

- No iOS, o aplicativo aguarda o primeiro quadro antes de avaliar as dimensões da câmera. Se a orientação real divergir da solicitada, encerra a primeira faixa antes de tentar uma vez com largura/altura invertidas. Isso evita decidir pela orientação inicial, que pode ser provisória no Safari.
- No Android, continuam as restrições flexíveis originais; a nova tentativa após o primeiro quadro só roda no WebKit para iOS.
- A indicação de capacidades passa a mostrar a orientação retornada pela câmera e a comparar com a orientação solicitada. Isso evita esconder uma divergência do Safari.
- A prévia iOS usa `cover` para ocupar todo o palco, conforme a intenção registrada na versão anterior. Isso pode cortar as bordas se as proporções da câmera e da tela forem diferentes. O palco usa a altura dinâmica da tela, e o nome do cache foi alterado para ativar os arquivos desta atualização após publicação.

## Limites

O Safari pode continuar entregando orientação inesperada após a tentativa invertida. Nesse caso, a indicação mostra a orientação realmente retornada. A regra `cover` altera somente a prévia; a gravação continua usando a faixa de vídeo criada pelo navegador, sem a regra CSS. Se a gravação nativa ainda sair errada no iPhone alvo, a etapa seguinte é uma normalização de quadros somente no iOS, que aumenta o uso de CPU e bateria.

## Verificação

- Revisão estática do código e das referências de cache: concluída.
- Testes automatizados: não executados nesta correção.
- Teste em iPhone 14 ou mais novo com iOS/Safari atuais e inspeção do arquivo gravado: pendentes; precisam ser feitos no aparelho real. O teste em iOS 16.7.15 ajuda na compatibilidade legada, mas não substitui a homologação do aparelho alvo.
- Situação: **apto para homologação em iPhone; ainda não aprovado para distribuição com a orientação vertical certificada**.
