# V1.0.4 — primeira etapa de estabilidade

## Escopo e preservação

Base: V1.0.3 aprovada pelo usuário. A pasta e o ZIP anteriores foram preservados. Não houve alteração do CSS, da imagem do painel, da abertura ou do reconhecimento do comando de voz. Sete funções de captura/enquadramento/gravação/revisão/salvamento foram comparadas e são idênticas à base. O helper de prontidão da câmera foi ajustado para aplicar o timeout à operação inteira. Não foram adicionadas dependências, permissões ou armazenamento remoto.

## Corrigido

1. **Salvamento:** telas verificam o retorno antes de confirmar/restaurar/navegar. Roteiro não salvo permanece na tela e uma nova tentativa usa o mesmo cadastro. Há avisos visíveis na biblioteca e preparação quando existirem alterações pendentes ou conflito.
2. **Importação de backup:** prepara os dados, valida configurações suportadas, preserva comandos e reverte a importação se a gravação no armazenamento falhar. Backups legados sem versão continuam aceitos; versões futuras não suportadas são rejeitadas sem mudar o banco. Valores inválidos e propriedades não reconhecidas não são aplicados como ajustes.
3. **Exclusões:** remover comando persiste imediatamente; falhas de exclusão restauram o item. A troca de senha mantém o hash anterior quando não consegue salvar.
4. **Conflito de sessões:** save compara o armazenamento atual com a última versão lida/salva pela sessão. Se outra aba já mudou o conteúdo, bloqueia a sobrescrita e orienta exportar/reabrir. É detecção otimista, sem mesclagem ou garantia de atomicidade para escritas exatamente simultâneas; não substitui uma transação de banco.
5. **Dispositivos tardios:** câmera e microfone solicitados na preparação são associados a uma geração de sessão. Resultados cancelados são encerrados; um retorno antigo não substitui a câmera de uma preparação nova.
6. **Prontidão:** play pendente agora está sujeito ao timeout. A prévia só anuncia funcionamento quando play resolve; permissão não é confundida com reprodução.
7. **Conversores:** RTF passa a tratar controles de texto, grupos de metadados e Unicode; XML decimal/hexadecimal preserva caracteres suplementares e trata valores fora do intervalo. RTF continua sendo extração de texto, sem promessa de suporte integral a todos os recursos do formato.
8. **Documentação/testes:** README atual consolidado, histórico preservado, novos testes e comando verify sequencial.

## Testes

- **APROVADO:** 30 testes automatizados, incluindo os 17 existentes e 13 novos.
- **APROVADO:** 11 cenários de interface para backup com comandos/ajustes, exclusão persistente, importação sem espaço, roteiro com nova tentativa sem duplicação, reversão de exclusão, senha anterior preservada, cancelamento tardio de câmera/microfone, conflito de abas, RTF e backup de versão não suportada.
- **APROVADO:** fluxo de voz com comando simulado, mesmo contexto de áudio, fala acionando barra/texto, silêncio interrompendo a rolagem, pausa/continuação e finalização da gravação.
- **APROVADO:** MP4 vertical 1080×1920 e horizontal 1920×1080, com diferenças entre quadros, reprodução avançando e download; pausa/retomada/recomeço no cenário vertical.
- **APROVADO:** sinal de áudio presente no MP4 salvo do cenário de voz, verificado por decodificação e analisador independente no navegador.
- **APROVADO:** regressão do painel nos dois temas e quatro tamanhos, dez áreas de toque corretas, fonte/velocidade/largura, pausa/continuação, ocultar/mostrar, recomeço/retorno e backup nulo rejeitado sem mudar os roteiros.
- Resultados do painel e do backup nulo: tests/results-neon/resultados.json.
- **NÃO TESTADO:** nova versão em iPhone/Android físicos, aparelhos modestos, gravação longa, gasto de bateria, temperatura, interrupções por chamadas, todos os microfones/câmeras e todas as combinações de opções.

Os testes de navegador usam Edge 157 para Windows e áudio/câmera sintéticos. Os resultados não certificam Safari/iOS. Logs em tests/results-stability, tests/results-ios-voice, tests/results-ios-video-final e tests/results-neon. O arquivo de áudio usado pela verificação é gerado por test:voice; binários/screenshot de teste não são necessários para publicar o aplicativo.

## Avaliação técnica atual

Estimativa **aproximadamente 8/10**, frente aos 7/10 da auditoria anterior, pelo tratamento dos casos de persistência, cancelamento e importação agora comprovados. A avaliação é de engenharia, não certificação: funcionalidade principal 8,5, dados 8, robustez 8, manutenção 6,5 e testes 8,5 com os pesos anteriores resultam em 7,975. A manutenção continua limitada pelo CSS legado e pelo estado global. A validação no celular permanece pendente.

## Próximas prioridades

- Validar esta versão no mesmo iPhone que aprovou a V1.0.3 e no Android.
- Consolidar CSS/estados de sessão em mudanças pequenas, mantendo comparação visual.
- Medir duração, memória, bateria e temperatura em aparelhos reais.
- Projetar e testar recuperação de gravação interrompida, respeitando limites do navegador. Não foi implementado salvamento durável de vídeos nesta etapa.
- Evoluir concorrência para transações se for necessário editar simultaneamente em várias abas; incluir uma estratégia específica de recuperação de armazenamento danificado.

## Roteiro no celular e reversão

Exporte um backup, atualize no mesmo endereço HTTPS e feche/reabra. Confira um roteiro antigo, comando por voz, fala/silêncio, pausa, continuação, recomeço e gravação nos dois formatos. Exporte e importe uma cópia de teste para conferir os ajustes. Dados usam a mesma chave do navegador e formato legível pela V1.0.3.

Para reverter, restaurar os arquivos da V1.0.3 e publicar com um identificador novo de cache. Não foi executada uma reversão em telefone nesta entrega.
