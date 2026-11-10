# Oxprompter - Android & IOS

Versão **1.0.4 — estabilidade e preservação de dados**. Aplicativo web estático de teleprompter com rolagem automática/por voz, câmera e gravação.

## Nesta versão

- Backup restaura configurações e comandos suportados, com validação.
- Falha ao salvar não confirma sucesso; importação e exclusões podem ser revertidas; nova tentativa de roteiro não duplica o cadastro.
- Senha anterior é mantida se a troca não puder ser salva.
- Alteração já salva por outra aba é detectada antes de sobrescrever.
- Solicitações de câmera/microfone da preparação que chegam após sair da tela são encerradas.
- Prévia não informa sucesso se a reprodução falhar; o timeout cobre a espera por play().
- Importação RTF/XML melhora acentos e caracteres Unicode.

Detalhes, testes e limites: [MELHORIAS-V1.0.4.md](MELHORIAS-V1.0.4.md).

## Atualizar e usar no celular

Exporte seus roteiros antes de atualizar. Publique os arquivos no mesmo endereço HTTPS, mantendo index.html, manifest.json, sw.js e as pastas js, css, assets, vendor e icons. Feche as abas do aplicativo e reabra para carregar o cache novo. Os dados continuam na chave tp_data_v1 do mesmo navegador/endereço; não há migração destrutiva nem reinicialização do banco.

Se uma aba avisar conflito, exporte os dados dessa sessão e reabra antes de conciliar. Não há mesclagem automática. Preferências de dispositivos de um backup podem exigir selecionar câmera/microfone disponíveis no aparelho de destino.

## Verificar no computador

Node >=20. npm install instala as dependências de desenvolvimento declaradas; não é necessário no celular. Os testes de navegador atuais usam Playwright com Microsoft Edge instalado. O servidor npm start é uma prévia local em http://localhost:8080, não um link público para celular.

- npm test: 30 testes automatizados.
- npm run test:stability: persistência, backup, conflitos, cancelamento de recursos e repetição após falhas.
- npm run test:voice: comando simulado, áudio sintético, fala/silêncio e gravação.
- npm run test:ios-video: gravação vertical/horizontal, movimento, reprodução e download.
- npm run test:recorded-audio: decodifica o MP4 gerado por test:voice e verifica presença de sinal de áudio.
- npm run test:neon: controles, temas, tamanhos de tela, medidor e backup inválido.
- npm run verify: reúne esses passos sequencialmente.

As etapas foram executadas individualmente nesta entrega. O comando test:browser anterior e os documentos de versões antigas são históricos e não foram usados como certificação de Safari. Simular o user agent do iPhone no Edge não substitui testar Safari.

## Limites conhecidos

A V1.0.3 foi aprovada pelo usuário no iPhone. A **V1.0.4 precisa de nova validação no aparelho real**. Gravação longa, bateria, temperatura, chamadas, fechamento inesperado e todas as combinações de dispositivos ainda não foram testadas.

Vídeos em andamento ficam na memória até finalizar/salvar; recuperação automática de encerramento inesperado não está implementada. A senha é um bloqueio local de interface, não criptografia dos roteiros. RTF é extração de texto, não reprodução completa do layout do documento.

O painel, CSS, abertura e comando de voz foram preservados. O acúmulo de estilos e a reorganização completa dos módulos ficam para a etapa seguinte, com comparação visual e testes.

## Histórico

README anterior preservado em docs/historico/README-ate-v1.0.3.md. Os documentos CORRECAO-IOS.md, ATUALIZACAO-NEON.md e CORRECAO-VOZ-IOS.md registram etapas anteriores; o estado atual é o desta página e de MELHORIAS-V1.0.4.md.
