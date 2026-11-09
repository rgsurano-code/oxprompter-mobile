# Atualização: enquadramento e comandos de uma palavra

Referência visual: OXPROMPTER-MOBILE-AJUSTE-IOS-TESTE.zip, indicado pelo usuário. O CSS, os ícones e o manifesto desse pacote foram preservados. O CSS também está embutido no index.html para evitar visual sem estilos se o arquivo externo não carregar. O usuário informou que o tema publicado está diferente; o endereço público ainda não foi fornecido para confirmar a causa. Não foi presumido que essa diferença já está resolvida no site.

## Enquadramento antes de prosseguir

A seleção Vertical/Horizontal foi removida. Agora há Imagem inteira, Preencher a tela, Plano médio (1,25×), Close (1,6×) e Ajuste manual (1× a 2,5×), com posição lateral, altura e centralização. Imagem inteira usa a câmera nativa sem recorte digital. Os outros modos usam a mesma imagem composta na prévia e na faixa de vídeo gravada, sem incluir o texto do teleprompter.

A orientação do celular define automaticamente o formato antes do início. O take mantém as dimensões estabelecidas ao iniciar para evitar mudanças de formato durante a gravação. Nos modos digitais, girar durante o take adapta o recorte dentro do formato já iniciado. Para mudar o formato do arquivo, finalize e inicie outro take com o aparelho na nova posição.

A aproximação é digital e pode reduzir a nitidez e exigir mais processamento. Se o navegador não oferecer captura de canvas, os modos digitais ficam indisponíveis; use Imagem inteira. A presença da API não comprova compatibilidade física: em iPhone/Android, confira um take curto antes de usar.

## Comandos iniciais de uma palavra

Na preparação, toque em Gravar, Começar ou Ação para adicionar essa palavra. O mesmo atalho não é duplicado. Use + Comando para escrever outra palavra ou frase. Comandos existentes são preservados. Selecione o modo Por volume da voz + comando inicial para utilizá-los. Eles iniciam a contagem: não são comandos de pausa/finalização durante a gravação. O início por toque continua disponível.

## Testes desta atualização

Consulte RELATORIO-ENQUADRAMENTO-COMANDOS.md. Os relatórios anteriores da pasta descrevem versões anteriores.

---

# OXPROMPTER Mobile — atualização com tema original

Versão 2.0.0-beta.3. Esta é a versão para testar com o tema, as telas e os campos de configuração do ZIP fornecido. O CSS, os ícones e o manifesto foram preservados byte a byte. O ZIP original não foi alterado.

## Atualizar o GitHub

1. Exporte um backup de roteiros na versão atual. Preserve uma cópia/branch anterior.
2. Extraia o ZIP e abra a pasta OXPROMPTER-MOBILE-ENQUADRAMENTO-COMANDOS.
3. Copie o conteúdo da pasta para a raiz do seu repositório oxprompter-mobile, onde já existe index.html, substituindo os arquivos correspondentes. Inclua a pasta nova engine. Não envie o ZIP como se fosse o site e não coloque a pasta inteira dentro de outra pasta do repositório.
4. Faça commit/push pelo GitHub Desktop e aguarde a publicação habitual do GitHub Pages. Esta entrega não publicou nem alterou o repositório remoto.
5. Feche abas/PWA antigas e reabra o mesmo endereço HTTPS para atualizar o service worker. Não limpe dados do navegador sem backup.

## Configurações e dados

A chave tp_data_v1, os nomes dos campos e os controles originais foram mantidos. Ajustes pessoais ficam no navegador e não estão dentro do ZIP. Eles são reaproveitados no mesmo domínio, protocolo, porta e perfil. Se mudar de endereço ou de navegador, use Exportar roteiros / Importar arquivo (JSON); a restauração agora conserva também as configurações exportadas por roteiro. Nenhum backup desta entrega inclui senha.

Cores, efeitos visuais, biblioteca, preparação e controles de leitura usam o tema original. A revisão ganhou confirmação de exclusão, botão CONCLUIR e compartilhamento quando o navegador suporta, usando as mesmas cores. Os botões de revisão receberam contraste legível.

## Correções integradas

- Uma fila central controla os pedidos de câmera e microfone; pedidos repetidos reutilizam as faixas existentes.
- O mesmo elemento de vídeo permanece anexado ao documento durante a troca entre preparação e leitura, com ID temporário separado para não ser confundido com o novo destino.
- A gravação reutiliza as faixas da prévia, sem abrir outra câmera. O gravador é preparado antes da contagem e começa ao final dela.
- Reprodução bloqueada pelo navegador oferece Ativar imagem da câmera.
- Trocar câmera, resolução e FPS atualiza a câmera sem encerrar desnecessariamente o microfone. Dimensões e FPS efetivos são informados; 4K/60 e proporção exata não são garantidos.
- Comando inicial usa frases completas sem misturar alternativas incompatíveis. Iniciar por toque continua disponível. Rolagem por voz continua baseada no volume, sem acompanhamento palavra por palavra.
- Recomeçar/voltar durante uma gravação conduz primeiro à revisão. Salvar não fecha nem descarta a cópia temporária. Só conclua após confirmar o arquivo fora do navegador.
- Cancelamentos ignoram gravações e permissões atrasadas; dados ilegíveis são preservados para recuperação.
- O cache foi versionado para não misturar os scripts antigos com os atualizados.

## Testar no computador

Node.js 20+ apenas para servidor/testes. Não precisa instalar pacotes para executar.

    npm start
    npm test
    npm run check

No celular, abra a publicação HTTPS pelo Safari do iPhone ou Chrome do Android. Não abra o HTML como arquivo nem use HTTP de rede local para câmera/microfone. Instalar a PWA é opcional.

## Limites e privacidade

Câmera e microfone reais são solicitados somente nos testes/início que os utilizem. O aplicativo final não contém a câmera simulada utilizada na verificação isolada. Roteiros e gravações não são enviados a servidor pelo app. O comando de voz do navegador pode usar internet e serviço externo.

A senha bloqueia a interface, sem criptografar os roteiros. A produção fica na memória até você baixá-la; fechamento, recarga ou encerramento pelo sistema podem perdê-la. Há finalização automática acima de aproximadamente 300 MB de dados; um aparelho pode atingir seu limite antes disso. Resolução, formato, orientação e duração máxima dependem do dispositivo.

Consulte RELATORIO-TEMA-ORIGINAL.md. Testes simulados no computador não comprovam funcionamento em iPhone e Android físicos. Os arquivos de tests/evidence e RELATORIO-AUDITORIA.md vindos do ZIP anterior são históricos, não resultados desta entrega.
