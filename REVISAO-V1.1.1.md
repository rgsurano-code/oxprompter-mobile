# OXPROMPTER Mobile — revisão V1.1.1

Data: 09/11/2026.

## Alterações solicitadas

- A tela final contém somente **SALVAR** e **EXCLUIR**, com fundo escuro e verde do programa. Não há Fechar prévia. Salvar solicita o download e volta à preparação; Excluir descarta a tomada e volta à preparação, sem outra tela de escolha.
- Câmera passa a ser a primeira seção da preparação. Formato, resolução, FPS e lado da câmera ficam agrupados no topo. Prévia tem proporção própria 9:16 ou 16:9, botões de toque e espaço adequado. O cabeçalho não se sobrepõe à imagem.
- A captura é negociada no sistema de coordenadas primário da câmera, com perfil 16:9; existe alternativa 9:16 para navegadores com orientação primária diferente. A orientação é conferida nas dimensões efetivamente recebidas do vídeo.
- O início de uma gravação de vídeo faz essa conferência ainda na preparação. Um quadro incompatível não é gravado dentro de um quadro maior com grandes áreas pretas. O aplicativo pede para virar o aparelho quando a orientação não corresponde ao modo escolhido.
- A saída usa uma resolução suportada pela fonte, sem aumentar artificialmente uma fonte menor para simular 4K. A resolução entregue é informada. O navegador pode derivar o perfil solicitado a partir do sensor; o mesmo enquadramento negociado é usado na prévia, na leitura e no arquivo.
- Se o aparelho mudar para orientação incompatível durante a tomada, a gravação pausa antes de desenhar quadros incorretos. O formato do arquivo permanece fixo; a retomada é manual após corrigir a posição.
- Recomeçar reinicia texto, cronômetro, contagem e uma nova gravação. A espera por comando de voz preserva a câmera já conferida, liberando apenas o microfone necessário ao reconhecimento.
- Recursos JS/CSS recebem identificação de versão. O service worker atualiza o cache sem recarregar automaticamente uma tomada em andamento. A biblioteca local e sua chave de armazenamento foram preservadas.

## Evidência dos vídeos recebidos

Foram examinadas amostras visuais a cada segundo dos arquivos **1000167681.mp4** (25,32 s) e **1000167682.mp4** (22,66 s), ambos registros de tela 1080 × 2340. Também foi ampliado o quadro de 6,15 s do primeiro vídeo.

No vertical, a interface informa saída 2160 × 3840 com fonte 2448 × 2160, de orientação e proporção incompatíveis. No horizontal, uma imagem vertical aparece pequena no quadro largo, enquanto a tela permanece em pé. A revisão inclui testes para impedir esses resultados, além do ajuste visual da tela final.

Os vídeos são referências da versão anterior. Não constituem teste físico desta nova versão. As imagens pessoais extraídas ficaram fora da publicação e do ZIP.

## Conferência

| Verificação | Estado |
|---|---|
| 35 testes unitários e de regressão | APROVADO |
| Biblioteca, importação, senha, leitura, áudio e vídeo no Chromium/Edge Windows | APROVADO |
| Preparação, controles, erros de permissão e tema | APROVADO |
| 10 verificações de câmera e tela final | APROVADO com câmera sintética |
| Prévia 9:16/16:9 em larguras 320, 390, 768, 844 e 1280 pixels | APROVADO |
| Arquivos de vídeo reais gerados, baixados e decodificados em 720 × 1280 e 1280 × 720 | APROVADO com imagens sintéticas |
| Cache e inicialização offline com recursos versionados | APROVADO |
| Câmera física Android/iPhone nesta nova revisão | NÃO TESTADO |
| 4K/60 fps, gravação longa, aquecimento e sincronismo real em cada aparelho | NÃO TESTADO |

Evidências atuais: `tests/results/verification.json`, logs de execução e `tests/results/camera/`. As revisões anteriores permanecem como histórico.

## Uso e atualização

Endereço: [Abrir OXPROMPTER](https://oxprompter-mobile-110-rs.earnedcourt4.chatgpt.site). Confira **V1.1.1** na abertura. No iPhone use Safari; no Android use Chrome. Os vídeos recebidos mostram um endereço GitHub Pages: para atualizar essa outra origem, substitua todos os arquivos pelo conteúdo da pasta do ZIP, incluindo o novo CSS e o service worker.

Exporte a biblioteca antes de substituir uma instalação. Não limpe os dados do navegador. Teste primeiro HD 720p/30 fps. Para horizontal, vire o aparelho; se a imagem não acompanhar, confira a rotação automática do sistema. As gravações ainda ficam em memória até o download, e a confirmação do arquivo salvo depende do navegador. Não houve medição de desempenho nem certificação de todos os aparelhos.

## Fundamentação técnica

[W3C — Media Capture and Streams](https://www.w3.org/TR/mediacapture-streams/): os parâmetros de captura seguem a orientação primária do sistema; as dimensões efetivas podem mudar de orientação. A implementação verifica o vídeo recebido e mantém a saída escolhida. Esta orientação técnica não substitui homologação física.
