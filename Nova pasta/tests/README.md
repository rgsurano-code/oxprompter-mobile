# Repetir os testes

`npm test` executa os sete testes unitários com o próprio Node.js.

Para os testes de interface, instale as dependências de desenvolvimento com `npm install`, baixe Chromium e WebKit com `npx playwright install chromium webkit` e execute `npm run test:browser`. São usados servidores locais nas portas 8765 e 8766. Os resultados e capturas serão gravados em `tests/results/`.

Os testes de gravação utilizam dispositivos simulados do Chromium. O serviço de reconhecimento de fala não é testado: apenas a comparação das frases usa um substituto controlado. No WebKit para Windows, captura de mídia não está disponível e a recarga offline não é executada porque a emulação retornou erro interno. O cache de arquivos é inspecionado em ambos os motores.

`evidence/` contém os resultados coletados nesta revisão. Os testes do navegador foram executados com o mesmo código dos roteiros fornecidos, adaptando apenas caminhos e o local da dependência Playwright deste ambiente.
