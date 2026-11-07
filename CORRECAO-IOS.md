# Correção da gravação vertical no iOS — OXPROMPTER Mobile V0.4

## Escopo

Corrigir o caminho vertical da câmera frontal no Safari iOS, preservando o fluxo de início por toque da V0.4 e sem alterar o caminho Android.

## Alterações aplicadas

- No iOS, a câmera tenta primeiro uma solicitação explícita de proporção 9:16 ou 16:9, conforme a preferência de gravação. Se o navegador rejeitar a proporção exata, o aplicativo tenta novamente com a preferência flexível já usada anteriormente.
- A mesma solicitação explícita é tentada ao reaplicar as restrições à faixa existente antes de criar a gravação.
- A indicação de capacidades passa a mostrar a orientação retornada pela câmera e a comparar com a orientação solicitada. Isso evita esconder uma divergência do Safari.
- A prévia iOS usa `contain`, sem ampliar nem cortar a imagem. O palco usa a altura dinâmica da tela, e o nome do cache foi alterado para ativar os arquivos desta correção após publicação.

## Limites

O navegador pode não aceitar a proporção exata em todos os iPhones/Safaris. Nesse caso, o aplicativo mantém a tentativa flexível e mostra as dimensões/orientação retornadas. A prévia CSS não transforma o arquivo: a gravação continua usando a faixa de vídeo criada pelo navegador.

## Verificação

- Revisão estática do código e das referências de cache: concluída.
- Testes automatizados: não executados nesta correção.
- Teste em iPhone/Safari e inspeção do arquivo gravado: pendentes; precisam ser feitos no aparelho real.
- Situação: **apto para homologação em iPhone; ainda não aprovado para distribuição com a orientação vertical certificada**.
