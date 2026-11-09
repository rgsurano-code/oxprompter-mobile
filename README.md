# OXPROMPTER Mobile V2.0.0-beta.1

Reconstrução da versão mobile para validação no Safari do iPhone e Chrome do Android. A versão para computador e os ZIPs originais não foram alterados. Esta entrega é uma aplicação web/PWA, sem APK, IPA ou instalador nativo.

## O que foi reconstruído

- Biblioteca, edição, busca e exclusão de roteiros; observações e anotações entre colchetes.
- Importação TXT, MD, SRT, HTML, XML, RTF simples, DOCX e ODT; backup JSON com restauração aditiva e ajustes por roteiro.
- Acesso por senha local, alteração de senha e bloqueio da interface.
- Preparação com tema, espelho do texto, fonte, velocidade, largura, opacidade, linha de leitura, contagem e tempo desejado.
- Prévia frontal/traseira e seleção dos dispositivos; preferências de orientação, resolução e FPS com informação da configuração efetiva.
- Vídeo persistente entre preparação e leitura: a mesma captura alimenta a prévia e o gravador. Pedidos de acesso são serializados e os resultados de operações canceladas são descartados com liberação das faixas.
- Rolagem automática ou pelo volume da voz; comando inicial opcional e alternativa de início por toque. Não acompanha palavras individualmente; ruídos podem mover o texto.
- Contagem regressiva, cronômetro, aviso de tempo, arraste do texto, ajustes durante a leitura e ocultação dos controles.
- Gravação de vídeo/áudio independentes; pausa conjunta com a leitura; revisão, download, compartilhamento de arquivo quando oferecido pelo navegador e exclusão confirmada.
- PWA com cache local. Nenhum arquivo de execução depende de CDN ou de fonte externa.

## Executar no computador

Requer Node.js 20 ou superior apenas para o servidor de desenvolvimento e testes:

    npm start

Abra http://127.0.0.1:8080. O servidor escuta apenas neste computador. Não há instalação de dependências para executar ou testar. Como não há etapa de compilação, a pasta do projeto já contém os arquivos finais.

## Usar no celular

É necessário hospedar os arquivos por HTTPS. Não abra index.html como arquivo e não use o endereço HTTP de rede local para testar câmera/microfone no celular.

No iPhone, abra no Safari; no Android, abra no Chrome. Instalar na tela de início é opcional. Os requisitos exatos de versão e hardware permanecem NÃO TESTADOS em aparelhos reais. A instalação PWA não dispensa a permissão de câmera/microfone.

## GitHub existente

Repositório informado: https://github.com/rgsurano-code/oxprompter-mobile

Esta entrega não foi enviada ao GitHub. Não contém credenciais, identidade de um novo Site ou autorização para substituir a versão publicada.

1. Exporte um backup pela versão mobile atual.
2. Preserve a versão atual em uma tag ou branch recuperável.
3. Prepare uma branch de teste, por exemplo mobile-v2-beta. Copie o conteúdo desta pasta para a raiz dessa branch, incluindo .nojekyll; não acrescente uma pasta intermediária.
4. Mantenha a versão publicada atual até concluir a validação. Uma branch separada por si só não publica um segundo GitHub Pages; use um ambiente de prévia ou escolha a branch nas configurações do Pages somente quando quiser alterar a publicação.
5. O projeto usa caminhos relativos, compatíveis com o subcaminho /oxprompter-mobile/. O endereço exato publicado deve ser confirmado nas configurações do Pages; não foi verificado nesta entrega.
6. Após uma atualização, feche todas as abas antigas e a PWA antes de reabrir. Não limpe o armazenamento como tentativa de atualizar: isso apaga os roteiros.

Os módulos novos ficam em studio-v2/, evitando que o service worker anterior devolva os scripts antigos com o mesmo nome. O novo worker não força ativação durante uma gravação. Em atualizações futuras, revise a versão do cache e sua lista de arquivos.

## Como gravar

1. Crie sua senha local ou entre com a senha já existente no mesmo endereço.
2. Escreva/importe o roteiro e selecione Salvar e preparar.
3. Escolha câmera e orientação; segure o celular nessa orientação. Teste a câmera e o microfone separadamente.
4. Confira o enquadramento e as dimensões efetivas. Resolução e FPS são pedidos preferenciais: 4K, 60 fps e formato exato de quadro não são garantidos. Não existe recorte/conversão por canvas para forçar proporções.
5. Escolha gravação de vídeo/áudio e câmera atrás do texto. Essas opções são independentes. Sem vídeo e sem áudio, ocorre apenas a leitura.
6. Inicie e aguarde a contagem. Em modo por voz, falar movimenta o texto e o silêncio o interrompe. O comando inicial pode depender de internet e dos serviços de reconhecimento do navegador; Iniciar por toque permite continuar sem ele.
7. Pausar interrompe tanto a rolagem quanto o gravador. Ao colocar o app em segundo plano, a sessão tenta pausar; verifique e continue manualmente ao voltar. O sistema pode interromper a captura, especialmente ao bloquear a tela ou atender chamadas.
8. Finalize e reproduza o take. Use Salvar produção ou Compartilhar / salvar no celular, quando disponível. Confira o arquivo em Arquivos/Downloads/Fotos conforme as opções oferecidas pelo aparelho. O aplicativo não confirma a existência do arquivo salvo pelo sistema.
9. Só então use Concluir e voltar. Essa opção libera a cópia temporária. Excluir produção pede confirmação. Recomeçar uma gravação em andamento conduz primeiro à revisão para não descartar o take.

A prévia frontal é espelhada para facilitar o enquadramento; a gravação usa a imagem original. O espelho do texto é um ajuste independente. O texto, os botões e as anotações não são incluídos no vídeo gravado.

## Dados e privacidade

A chave tp_data_v1 foi preservada. Dados compatíveis podem ser reaproveitados apenas no mesmo domínio, protocolo, porta, perfil e contexto de navegador. Safari, PWA e Chrome podem manter armazenamentos distintos. Exportar/importar backup é o caminho para transferir roteiros.

A senha é um bloqueio da interface e não cifra os roteiros. A compatibilidade com o hash antigo foi mantida; esta versão não é indicada para proteger documentos sensíveis contra alguém com acesso ao navegador. Backups não incluem a senha.

Dados ilegíveis são preservados e bloqueiam novas gravações no armazenamento; a tela oferece exportação dos dados brutos para recuperação. Falhas de quota são informadas. Os arquivos de produção ficam na memória até serem baixados e confirmados pelo usuário, e não sobrevivem garantidamente a fechamento, recarga, falha ou encerramento do navegador pelo sistema. Há finalização automática acima de aproximadamente 300 MB de dados para reduzir o risco de esgotar a memória; aparelhos podem atingir limites antes disso. Faça takes curtos e salve com frequência.

Roteiros e gravações não são enviados a servidor pelo aplicativo. O reconhecimento de fala é do navegador e pode usar um serviço externo. O navegador e o GitHub Pages mantêm suas próprias práticas de rede e privacidade.

## Testes

    npm test
    npm run check

Consulte RELATORIO-VALIDACAO-V2.md e ROTEIRO-TESTES-CELULAR.md. Os testes de câmera/gravador usam simulações; não comprovam reprodução, codecs ou permissões em aparelhos reais. A tela inicial foi inspecionada no navegador do computador em larguras de celular. Em ambiente isolado, com armazenamento virtual sem senha e sem acesso a dados reais, também foram conferidos criação de roteiro, preparação, contagem, leitura automática, pausa, ajustes, ocultação de controles, rotação e retorno à biblioteca. Login real, persistência real, mídia física e salvamento não foram testados de ponta a ponta. Para reproduzir esse ambiente opcional, execute node tests/qa-server.mjs e abra a porta 8082. Ele não é a versão para uso nem deve ser utilizado para armazenar dados.

## Estrutura e manutenção

- index.html / styles.css: interface responsiva e elemento de vídeo persistente.
- studio-v2/media-session.js: propriedade das faixas, fila de aquisições, cancelamento e gravador.
- studio-v2/reader.js: rolagem, pausa, cronômetro e reposicionamento.
- studio-v2/speech.js: comando inicial e medidor de voz.
- studio-v2/store.js: compatibilidade de dados, limites e backups.
- studio-v2/documents.js: extratores de documentos aproveitados da referência, com correção do delimitador RTF.
- studio-v2/app.js: coordenação das telas e dos fluxos.
- vendor/: JSZip original e sua licença.
- icons/: ícones aproveitados do projeto fornecido.
- tests/: testes reproduzíveis sem dependências adicionais.

Próximo passo: revisar esta entrega em branch separada e validar câmera, microfone, reprodução e salvamento em iPhone e Android físicos antes de promover a versão.
