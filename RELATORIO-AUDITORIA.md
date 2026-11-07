# Auditoria e revisão — OXPROMPTER Mobile

Data: 28/10/2026. Origem: OXPROMPTER-MOBILE-TESTE11-3-PARA-TRANSFERIR.zip.

## Resultado

O projeto foi revisado e corrigido mantendo sua identidade visual e funcionamento como aplicativo estático. Os fluxos principais passaram nos motores Chromium e WebKit de teste em computador. A gravação foi exercitada no Chromium com mídia simulada e arquivos gerados de fato pelo MediaRecorder.

**A compatibilidade em Safari iOS e Chrome Android ainda depende de homologação em aparelhos reais.** Esta entrega não certifica todas as versões desses navegadores, codecs, lentes ou condições de uso. Nenhum aparelho físico foi conectado a este ambiente.

## Escopo e arquitetura

O ZIP original continha um HTML de aproximadamente 123 KB com estilos e lógica misturados, um service worker, manifest, dois ícones e instruções. Foram examinadas as áreas de acesso, biblioteca, importação, preparação, captura, gravação, contagem, leitura, comandos e cache.

O HTML agora carrega arquivos separados: estado/acesso (`core.js`), documentos (`documents.js`), biblioteca (`library.js`), preparação (`preparation.js`), mídia (`media.js`), leitura (`reader.js`), comando (`speech.js`) e inicialização/controles (`app.js`). Todos os blocos de estilo foram consolidados em `styles.css`; as regras finais estabilizam os controles e a preparação mobile. Há um servidor local sem dependências de produção e testes reproduzíveis.

A organização é incremental: os scripts ainda compartilham estado e precisam da ordem `defer` do HTML. Parte do CSS legado e das funções de apresentação mantém o formato compacto original. Não foi feita uma migração integral para componentes isolados ou framework.

## Problemas encontrados e alterações

| Área | Problema observado na origem | Correção entregue |
|---|---|---|
| Gravação | Condição invertida na contagem pulava a preparação sem recorder e recriava um já preparado | Preparação feita quando a instância está ausente, com verificação de sessão |
| Áudio sem vídeo | Negociação escolhia MIME de vídeo | MIME selecionado conforme as faixas gravadas |
| Vídeo silencioso + voz | A leitura anulava `recordStream` por não encontrar áudio, perdendo a referência do vídeo | A referência do vídeo permanece durante a análise independente do microfone |
| Prévia | Uso de `videoStream` fora de seu escopo; falha escondida pelo catch | Usa o stream de câmera disponível no estado correto |
| Ciclo de mídia | Fontes permaneciam ativas em saídas e ao finalizar; múltiplos caminhos de parada | Limpeza de fontes, faixas clonadas, medidores e intervalos em saídas/finalização |
| Reiniciar | Lógica duplicada abria mídia e reconhecimento em ordens diferentes | Reinício usa a mesma preparação de sessão do início normal |
| Pausa | Cronômetro continuava contando; espaço não pausava a gravação como o botão | Caminho único pausa leitura/recorder/tempo e desconta o intervalo pausado |
| Tempo | Opção de ocultar cronômetro era ignorada | Visibilidade respeitada; parsing rejeita durações inválidas |
| Rotação | Resize recolocava o texto no começo | Preserva a fração de progresso e recalcula os limites |
| Rolagem | Leitura de dimensões repetida em cada frame; fim não alinhava a última linha ao ponto de leitura | Atualização por transform com limites calculados fora do frame; última linha alcança a referência |
| Preferências | Opções globais sobrescreviam opções do roteiro | Valores globais preenchem somente campos ausentes do roteiro |
| Câmera | Câmera escolhida podia ser ignorada; aplicação de orientação fixava Full HD | Dispositivo escolhido tem prioridade; resolução/FPS seguem as preferências como solicitações ao navegador |
| Permissões | Preparação solicitava dispositivos automaticamente | Solicitações ocorrem por teste, atualização ou início, sem bloquear o modo automático sem mídia |
| Controles | Funções de fonte, largura e velocidade existiam sem controles efetivamente conectados | Controles visíveis conectados, nomes acessíveis e limites de ajuste |
| Interface | Blocos de CSS conflitantes e controles laterais/inferiores acumulados | Estilos consolidados, barra inferior consistente, áreas seguras, viewport dinâmico, preparação abrindo no topo, fontes e campos mobile legíveis |
| Tema branco | Regras de tema/câmera disputavam cor do texto | Tema branco conferido; contraste de texto sobre câmera definido |
| Comando inicial | Uma parte da frase podia disparar o comando; falhas deixavam a sessão sem saída clara | Frase completa normalizada, proteção contra retomada de listener antigo e botão Iniciar por toque |
| Mensagens | Interface prometia sincronização de fala apesar de usar volume | Modos explicam que a rolagem depende do volume; comando inicial é uma função separada |
| Armazenamento | JSON inválido derrubava a inicialização; falta de espaço não era tratada | Leitura protegida, validação básica de dados e aviso de falha de gravação sem sobrescrever conteúdo ilegível |
| Backup | Não havia exportação/restauração de biblioteca | Backup JSON de roteiros, restaurado pelo botão de importação como cópias |
| Importação | DOCX/ODT dependiam de `DecompressionStream('deflate-raw')` | JSZip distribuído localmente, com licença e limite de tamanho de entrada/conteúdo principal |
| Conteúdo | IDs interpolados em atributos sem escape e texto HTML importado por inserção em elemento | Escape dos IDs/nome/texto e leitura de HTML por DOMParser; backup usa novos IDs |
| PWA | Manifest alternativo inexistente e referências duplicadas; cache apagava outros caches, guardava GETs indiscriminadamente e podia devolver HTML no lugar de script | Manifest único, lista explícita de recursos, remoção limitada aos caches OXPROMPTER e fallback HTML apenas para navegação |
| Interrupções | Saída/ocultação da página podia deixar atividade fora de controle | Ao ocultar, pausa a sessão; ao sair, encerra recursos. Retomada continua por ação do usuário |

## Testes realizados

Ambiente: Windows, Node.js, Playwright 1.62.1, Chromium 151.0.7922.34 e WebKit 26.5. Viewports de 320×568, 390×844, 768×1024 e 844×390, com parâmetros de toque/mobile. Isso é simulação de viewport e motor, não emulação completa de um telefone.

| Verificação | Chromium | WebKit |
|---|---|---|
| Criar senha, entrar, alterar senha e rejeitar senha atual errada | Passou | Passou |
| Criar, carregar, editar sem duplicar e excluir roteiro | Passou | Passou |
| Exportar backup, restaurar JSON e exibir nome contendo HTML como texto | Passou | Passou |
| Extrair texto de DOCX comprimido, gerado como fixture | Passou | Passou |
| Automático, contagem, pausa por botão/espaço e tempo congelado | Passou | Passou |
| Fonte/velocidade durante leitura | Passou | Conferência de UI/controles; cobertura de gravação não executada |
| Tema branco, espelho e alternância de largura | Passou | Passou |
| Rotação mantendo progresso; ocultar/revelar controles | Passou | Passou |
| Biblioteca e preparação sem overflow horizontal nos quatro tamanhos | Passou | Passou |
| Áudio sem vídeo: iniciar, reiniciar, pausar, retomar, finalizar e obter Blob não vazio | Passou, microfone simulado | Não executado: captura indisponível no motor Windows |
| Vídeo sem áudio, controlado por microfone independente: gravar/finalizar e obter Blob não vazio | Passou, câmera/microfone simulados | Não executado |
| Limpeza das fontes de preparação após finalizar e voltar | Passou | Caminhos sem captura conferidos |
| Frase parcial não dispara; frase completa dispara | Passou com reconhecimento substituído no teste | Passou com reconhecimento substituído no teste |
| Ausência de reconhecimento mantém alternativa de início por toque | Passou com API removida no teste | Passou com API removida no teste |
| Recuperação de início quando câmera é negada/indisponível | Passou com permissão negada simulada | Passou sem API de captura |
| Leitura de armazenamento corrompido preserva os bytes originais | Passou | Passou |
| Cache contém os arquivos separados da aplicação | Passou | Passou |
| Recarregar sem rede e carregar scripts do cache | Passou | Inconclusivo: emulação offline retornou erro interno do WebKit |
| Erros JavaScript não tratados nos cenários aprovados | Nenhum capturado | Nenhum capturado |

Sete testes unitários passaram: armazenamento corrompido, migração/validação de dados anteriores, falha por quota, durações, remoção de anotações/escape de conteúdo, escolha de MIME e extração de entidades XML. Os testes e evidências JSON estão em `tests/`.

Além dos testes automatizados, foram examinadas visualmente capturas da biblioteca e preparação. Os ajustes finais de legibilidade e a tela de leitura constam nas capturas de evidência. Testes de gravação verificam estado do recorder e Blob não vazio; não certificam fidelidade audiovisual nem sincronismo de áudio e vídeo em hardware real.

## Limitações e homologação pendente

- **Android/iPhone físicos:** testar Safari iOS e Chrome Android nas versões efetivamente usadas, permissões reais, troca frontal/traseira, câmera ao fundo, orientação e download/compartilhamento do arquivo.
- **Reconhecimento real:** não foi acionado serviço de transcrição. Sua disponibilidade depende do navegador/serviço e pode exigir rede. O aplicativo mantém início por toque. A rolagem por volume não reconhece palavras, não mede ritmo de fala e reage a ruídos.
- **Captura e formatos:** `isTypeSupported` orienta a escolha, mas não garante que todos os recursos estejam disponíveis. MP4/WebM dependem do navegador. Não há transcodificação. Resolução, FPS e aspecto são preferências negociadas, não uma garantia de recorte ou rotação física do sensor.
- **Vídeo longo:** fica em memória até baixar. Homologar duração real de uso, aquecimento, consumo de bateria e pressão de memória, especialmente em 4K. Fechar a aba pode perder a gravação ainda não salva.
- **Interrupções:** testar bloqueio de tela, telefonemas, troca de aplicativo, suspensão do AudioContext e retorno do modo instalado. A página pausa ao ser ocultada, mas não promete captura em segundo plano. Se o iOS suspender o áudio, toque na tela para reativar o contexto e confira o medidor.
- **Salvar:** o botão solicita download; a confirmação final e o destino pertencem ao navegador. Não há gravação direta garantida em Fotos. O texto do teleprompter não é composto sobre o arquivo de vídeo.
- **Importação:** DOCX comprimido e backup JSON foram exercitados no navegador. DOCX/ODT complexos (tabelas, notas, caixas de texto), RTF avançado, caracteres de codificações antigas e documentos grandes ainda exigem amostras reais. DOC legado não é suportado; SRT/MD/XML genérico entram como texto bruto. Corte de vídeo experimental, sem interface funcional na origem, foi removido do código ativo e não é oferecido nesta entrega.
- **Segurança local:** senha SHA-256 local mantida para compatibilidade; não é autenticação de servidor nem criptografia. Não há recuperação remota de senha. Backup contém texto aberto. Não houve pentest independente.
- **Dados ilegíveis:** conteúdo original não é sobrescrito. O aviso aparece na tentativa de salvar. Recuperação de conteúdo corrompido não é automática; exporte o que estiver disponível e recupere a chave antiga antes de limpar os dados.
- **PWA/offline:** Chromium recarregou offline; no WebKit o cache foi conferido, mas a recarga offline ficou inconclusiva. Instalação na tela inicial e atualização de uma PWA já instalada não foram testadas fisicamente. A atualização do cache requer fechar clientes antigos. Voz por serviço externo pode continuar dependente de rede.
- **Arquitetura:** a separação de arquivos reduz o acoplamento visual, mas há estado global compartilhado e estilos legados consolidados. Uma evolução futura pode introduzir componentes e um gerenciador de sessões, sem tratar esta revisão incremental como reescrita completa.

## Instalação e próximos passos

Use `README.md`. Para computador, execute `npm start` com Node.js 20+. Para celular, publique a pasta por HTTPS. O servidor local fornecido atende somente o próprio computador. Não publique dados de teste ou backups pessoais junto com a aplicação.

Antes de usar em produção, execute uma tomada curta com áudio e vídeo em cada aparelho, confira o arquivo baixado, repita com a orientação desejada e teste uma tomada com a duração real do trabalho. Essa homologação é necessária para encerrar a validação de hardware móvel.

## Referências técnicas consultadas

- [MDN — MediaRecorder e negociação de formato](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static): suporte declarado de MIME não substitui a criação/execução do recorder.
- [MDN — SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition): disponibilidade limitada e dependência da implementação de navegador.
- [WebKit — MediaRecorder API](https://webkit.org/blog/11353/mediarecorder-api/): comportamento e formatos da implementação WebKit; a escolha no aplicativo é feita por detecção em tempo de execução.

SHA-256 do ZIP de origem: `9ac1a35f5758bad520f98a7d885effc928591e06a0ccdb22e24aca27e9448e5d`.


## V0.4 — restauração do início por toque
- Renomeado o modo de comando por voz para **Iniciar com Voz**.
- Mantido o modo **Automático** sem alteração de fluxo.
- No modo **Início com Toque**, após preparar mídia e microfone, é exibido um botão destacado dentro da área de leitura. O toque inicia a contagem regressiva e, ao final, inicia a leitura.
- Estilo do botão compatível com tema escuro e tema claro.
- Service worker atualizado para invalidar o cache anterior.
- Validação: `node --check` em `js/reader.js` e `js/preparation.js` APROVADO; `npm test` (7 testes) APROVADO. Testes de navegador não executados: dependência Playwright ausente neste ambiente. Android/iPhone reais NÃO TESTADOS.
