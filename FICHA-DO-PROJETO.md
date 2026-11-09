# OXPROMPTER Mobile V2 — ficha de projeto

Objetivo: reconstrução da versão web mobile para Safari no iPhone e Chrome no Android, preservando a versão de computador e os ZIPs originais.

Essenciais: senha local, biblioteca/edição/importação de roteiros e backup; preparação; câmera frontal/traseira e dispositivos; resolução, FPS e orientação solicitados; prévia contínua; texto sobre câmera opcional; temas, espelho, fonte, largura, opacidade e velocidade; reposicionamento por toque; início automático ou por comando; rolagem por volume da voz; contagem, cronômetro e aviso de tempo; gravação de vídeo/áudio independentes; pausa, revisão e salvamento; PWA e cache offline.

Arquitetura: HTML/CSS/JS sem framework ou compilação; MediaSession central com aquisições serializadas e cancelamento de resultados atrasados; vídeo persistente entre preparação e leitura; gravador usa as mesmas faixas sem encerrar a prévia ao finalizar. JSZip original com licença para DOCX/ODT. Sem dependências de execução novas.

Dados: chave tp_data_v1 preservada, sem migração destrutiva; senha bloqueia interface e não cifra roteiros. Nenhum roteiro ou gravação enviado a servidor; reconhecimento de voz do navegador pode usar serviço externo. Backup JSON com restauração aditiva.

Distribuição: arquivos estáticos compatíveis com GitHub Pages no caminho /oxprompter-mobile/. Publicação posterior à revisão; HTTPS no celular. Nenhuma alteração remota nesta etapa.

Riscos: diferenças de permissões, reprodução inline, formatos de gravação, rotação e interrupções no iOS/Android. Testes locais não substituem aparelhos reais. Pedidos de resolução/FPS são preferências, dimensões reais serão exibidas.

Critérios de aceite: não haver captura duplicada em pedidos concorrentes; nenhuma faixa tardia sobreviver ao encerramento; mesma captura na preparação/leitura; falhas exibirem recuperação; finalizar não descartar produção; textos e backups preservados; layout utilizável em retrato e paisagem; testes classificados com evidências.
