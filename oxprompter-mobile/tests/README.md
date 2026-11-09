# Repetir os testes

`npm test` executa os testes unitários e de regressão com o próprio Node.js.

Para os testes de interface, instale as dependências de desenvolvimento com `npm install`, baixe Chromium e WebKit com `npx playwright install chromium webkit` e execute `npm run test:browser`. São usados servidores locais nas portas 8765 e 8766. Os resultados e capturas serão gravados em `tests/results/`.

Os testes de gravação utilizam dispositivos simulados do Chromium. O serviço de reconhecimento de fala não é testado: apenas a comparação das frases usa um substituto controlado. No WebKit para Windows, captura de mídia não está disponível e a recarga offline não é executada porque a emulação retornou erro interno. O cache de arquivos é inspecionado em ambos os motores.

`evidence/` contém os resultados coletados nesta revisão. Os testes do navegador foram executados com o mesmo código dos roteiros fornecidos, adaptando apenas caminhos e o local da dependência Playwright deste ambiente.

## Câmera V1.1.0


Use `npm run test:camera` para o teste de imagens sintéticas com quatro bordas coloridas, transição prévia/leitura, arquivo real, reinício e recuperação de permissão negada. O teste usa Edge por padrão neste ambiente; defina `OXPROMPTER_BROWSER_CHANNEL` para outro canal Chromium instalado.

Para executar os roteiros anteriores com Edge no PowerShell:

`$env:OXPROMPTER_ENGINE='chromium'; $env:OXPROMPTER_BROWSER_CHANNEL='msedge'; npm run test:browser`

Os relatórios novos ficam em `results/`. A pasta `evidence/` é histórica. Dispositivos, imagens e permissões simulados não homologam Android ou iOS físicos.
