# OXPROMPTER Mobile — V1.1.1

Tela final com somente Salvar/Excluir no tema do programa; configuração e prévia da câmera reorganizadas. Consulte também REVISAO-V1.1.1.md. Esta é uma candidata para homologação em aparelhos reais. Consulte [REVISAO-V1.1.1.md](REVISAO-V1.1.1.md) e [TESTE-NO-CELULAR.md](TESTE-NO-CELULAR.md).

Antes de atualizar, exporte seus roteiros. Substitua todos os arquivos na mesma origem HTTPS e feche as abas e a PWA antiga. Confira **V1.1.1** na abertura. Não limpe o armazenamento para atualizar.


## Como abrir

No computador, com Node.js 20 ou superior instalado, abra esta pasta no terminal e execute `npm start`. Acesse http://localhost:8080. Não é necessário instalar dependências para executar o aplicativo.

No celular, publique os arquivos desta pasta em uma hospedagem **HTTPS** e abra o endereço no Safari do iPhone ou Chrome do Android. Abrir o HTML diretamente pelo gerenciador de arquivos não é uma instalação suportada. Um endereço HTTP da rede local também não habilita os recursos de câmera/microfone no celular.

No iPhone, use Compartilhar → Adicionar à Tela de Início; no Android, use a opção de instalação do navegador, quando disponível. A instalação é opcional. Na primeira abertura, conecte-se à internet para carregar todos os arquivos. O reconhecimento do comando de voz pode precisar de internet mesmo depois disso.

## Uso

1. Crie sua senha local e entre. Ela bloqueia a interface, mas não criptografa os roteiros.
2. Escreva um roteiro ou importe TXT, MD, SRT, HTML, RTF simples, DOCX ou ODT. DOC antigo deve ser convertido para DOCX. Arquivos de até 20 MB; conteúdo principal DOCX/ODT descompactado de até 10 MB.
3. Toque em Adicionar texto. Ajuste fonte, velocidade, tema e largura.
4. Escolha Automático para rolagem contínua. Os modos por voz usam **volume do microfone**, não acompanham palavra por palavra. Ruídos e outras vozes podem mover o texto.
5. No modo com comando inicial, adicione uma frase completa. Se o serviço de voz não funcionar, use **Iniciar por toque**.
6. Escolha vídeo, áudio e câmera ao fundo independentemente. Teste os dispositivos pelos botões de teste; a entrada na preparação não pede permissões sozinha.
7. Inicie, aguarde a contagem e leia. Ajuste fonte, velocidade e largura pelos controles. Arraste o texto para reposicionar. Pause pelo botão ou barra de espaço.
8. Finalize pelo quadrado, confira a prévia e toque em Salvar produção. O navegador inicia o download; confira Arquivos/Downloads. O teleprompter fica sobre a prévia e **não é incluído no vídeo gravado**.

## Backup e dados existentes

Use **Exportar roteiros** na biblioteca. Para restaurar, use **Importar arquivo** e selecione o JSON exportado. A restauração adiciona cópias dos textos, nomes e observações, sem apagar a biblioteca; os ajustes de gravação devem ser conferidos novamente.

A chave local `tp_data_v1` foi mantida para aproveitar dados da versão anterior no mesmo endereço/navegador. Mudar de domínio, protocolo ou porta cria um armazenamento separado. Exporte antes de mudar o endereço ou limpar o navegador. A gravação fica na memória até ser baixada; não feche a página antes de salvar.

## Estrutura

- `index.html`: entrada e ordem de carregamento.
- `css/styles.css`: estilos consolidados e regras finais para mobile.
- `js/core.js`: estado, armazenamento e acesso local.
- `js/documents.js`: extração de texto de documentos.
- `js/library.js`: biblioteca, importação, edição e senha.
- `js/preparation.js`: opções e persistência da preparação.
- `js/camera.js`: captura única, ciclo de vida e saída orientada compartilhada.
- `js/media.js`: áudio, seleção de dispositivos, gravação e revisão.
- `js/reader.js`: contagem, sessão, rolagem e cronômetro.
- `js/speech.js`: comando inicial de voz.
- `js/app.js`: abertura, controles e eventos do aplicativo.
- `vendor/`: JSZip local e licença; nenhuma CDN é necessária.
- `sw.js` e `manifest.json`: cache offline e instalação opcional.
- `tests/`: testes unitários com `npm test` e roteiro automatizado de navegador.

Os arquivos JavaScript usam escopo compartilhado e carregamento `defer` na ordem do HTML. A separação é incremental: não há framework, compilação nem carregamento de módulos pela rede.

## Atualização da versão anterior

Substitua todos os arquivos, mantendo a mesma origem HTTPS. Feche as abas antigas e reabra para ativar o novo service worker. Se o navegador continuar mostrando a versão antiga, confira a atualização do service worker nas ferramentas de desenvolvimento. Limpar os dados do site também apaga a biblioteca: faça backup antes. Em atualizações futuras, altere a versão de `CACHE` em `sw.js` e mantenha a lista `ASSETS` sincronizada.

## Limites de compatibilidade

Veja `REVISAO-V1.1.1.md` para os testes atuais. `RELATORIO-AUDITORIA.md` registra a revisão anterior. Chromium e WebKit em computador não equivalem a testes em aparelhos reais. Permissões, troca de lentes, gravações longas, instalação PWA e salvamento no iOS ainda exigem homologação física. Resolução, orientação, taxa de quadros e formato são negociados com o navegador; não há promessa de 4K/60 fps nem conversão universal para MP4.
