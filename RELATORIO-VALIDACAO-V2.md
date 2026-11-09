# Relatório de validação — OXPROMPTER Mobile V2.0.0-beta.1

Data: 09/11/2026. Ambiente: Windows com Node.js v24.21.0 e navegador integrado do computador.

## Estado real da entrega

| Item | Estado | Evidência e limite |
|---|---|---|
| Código-fonte da reconstrução | APROVADO | Arquivos completos de interface, armazenamento, mídia, leitura e voz gravados na pasta da entrega. Não é uma comprovação de todas as funções em aparelho real. |
| Testes automatizados | APROVADO | 37 testes executados com 37 aprovados, 0 falhos e 0 ignorados. Câmera, microfone, gravador e reconhecimento são simulados. |
| Sintaxe e integridade de ativos | APROVADO | Verificação das sintaxes JS, IDs HTML únicos, arquivos importados e lista de ativos do service worker. |
| Servidor local e abertura | APROVADO | Servidor executado em 127.0.0.1:8080; tela inicial efetivamente carregada no navegador. 13 arquivos/rotas retornaram HTTP 200; resultados em tests/results/http.json. |
| Layout inicial responsivo | APROVADO | Tela inicial inspecionada a 390×844; larguras 320 e 844 verificadas sem excesso horizontal; console sem erros/avisos na inspeção. |
| Fluxo visual em ambiente isolado | APROVADO | Sem criar senha, com armazenamento virtual apenas em memória na porta 8082: criação de roteiro, preparação, contagem de 1 segundo, leitura automática, pausa com relógio congelado, fonte 48 → 50, velocidade 1,0 → 1,1, ocultar/mostrar controles, rotação e retorno à biblioteca com roteiro preservado em memória. Console sem erros ou avisos. Nenhuma mídia real foi capturada. |
| Login, persistência e fluxo completo de produção | NÃO TESTADO | A tela de senha real foi inspecionada; o ambiente de QA usa memória virtual e não valida autenticação nem persistência local real. Testes isolados cobrem hash compatível e armazenamento simulado; hardware e salvamento continuam pendentes. |
| Prévia e gravação com hardware físico | NÃO TESTADO | Nenhuma câmera/microfone real foi capturada nos testes. |
| Safari no iPhone e Chrome no Android | NÃO TESTADO | Requer aparelhos e versões identificados; simulações não comprovam compatibilidade física. |
| Codecs, rotação, pausa, vídeo longo e sincronismo real | NÃO TESTADO | Devem ser conferidos no arquivo gerado por cada aparelho. |
| Download e compartilhamento no celular | NÃO TESTADO | É necessário confirmar arquivo fora do navegador e reproduzi-lo. |
| PWA, atualização e offline reais | NÃO TESTADO | Arquivos e cache foram preparados e verificados estruturalmente; ciclo de instalação/atualização em aparelho real não foi executado. |
| Compilação nativa, APK, IPA, EXE e instalador | NÃO TESTADO | Não se aplicam à arquitetura estática desta entrega; nenhum foi gerado. |
| Desempenho e consumo em celular | NÃO TESTADO | Não houve medição de FPS, memória, temperatura ou duração máxima em aparelho. |
| Segurança básica | APROVADO parcialmente | Dados ilegíveis e erros de quota testados, backups validados, textos de roteiro exibidos via textContent e nenhum segredo embutido. Senha local sem criptografia; não houve auditoria de segurança completa. |
| GitHub / publicação / PR | NÃO TESTADO | Nenhuma escrita remota, publicação ou PR foi realizado. Conexão GitHub ainda ausente. |

## Cobertura automatizada

15 testes de mídia: requisições simultâneas, captura combinada, microfone sem reiniciar câmera, troca de câmera, cancelamento pendente e de fila, recuperação de permissão, identidade do srcObject da prévia, reprodução bloqueada, finalização, vídeo sem áudio, áudio sem vídeo, bloqueio de alterações durante gravação, espera do bloco final e constraints preferenciais.

13 testes de dados/leitura: dados antigos, preservação de dados ilegíveis, restauração aditiva, rejeição integral de backup inválido, reversão por quota, limites de ajustes, tempo/normalização, rolagem/pausa, silêncio e rotação/arraste, armazenamento bloqueado, preservação de roteiros parcialmente inválidos e compatibilidade do SHA-256.

4 testes de comando: frase completa, resultados parciais, separação entre alternativas e erro com orientação para início por toque.

5 testes de documentos: texto com acentuação, DOCX compactado, ODT, erro para DOC legado e RTF simples. A validação encontrou e corrigiu a preservação indevida do delimitador de espaço após um parágrafo RTF.

## Ressalvas

O código novo foi elaborado a partir do ZIP mobile fornecido, com referência ao pacote de computador e à estrutura pública do repositório informado. Duas tentativas de clone falharam no ambiente; não foi feita sincronização de um commit remoto exato. Os ícones, JSZip e extratores de documentos foram aproveitados da referência; o fluxo central de interface e mídia foi reconstruído.

A beta não pode ser declarada “perfeitamente funcionando nos dois sistemas” antes de completar ROTEIRO-TESTES-CELULAR.md. Promova somente após validar especialmente prévia, continuidade ao iniciar leitura, orientação, áudio e salvamento. Preserve uma versão recuperável antes de atualizar a distribuição.
