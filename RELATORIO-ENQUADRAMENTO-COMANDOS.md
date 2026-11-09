# Validação da versão 2.0.0-beta.3

## APROVADO

- CSS, ícones e manifesto preservados em relação ao ZIP mobile indicado. A entrada HTML inclui o mesmo CSS, além de manter a referência ao arquivo separado.
- Seleção de orientação removida e substituída por enquadramento; os demais campos foram mantidos. Ajustes pessoais só existem no navegador do usuário e não foram lidos ou copiados.
- Geometria de recorte sem distorção, limites de posição e zoom, presets e formato automático antes de iniciar. Dimensões de saída mantidas durante o take.
- A prévia composta e a faixa gravada usam o mesmo canvas. Na verificação integrada com fonte artificial de 480×640, o Close exibiu e gravou 360×640, com prévia final reproduzível de 59,588633 segundos. Console sem erros/avisos na inspeção.
- Os comandos Gravar, Começar e Ação têm testes de reconhecimento de uma palavra; gravador não dispara gravar. Atalhos não duplicam comandos nem removem os personalizados. São comandos iniciais, não comandos durante a captura.

Os resultados automatizados estão em tests/resultado-enquadramento.txt e tests/resultado-comandos-tema.txt. Os testes do segundo arquivo repetem parte da preservação de tema, além de testar os comandos novos; não some cegamente os dois totais.

## NÃO TESTADO / pendente

- iPhone e Android físicos, sensores reais, captura de canvas e MediaRecorder nas versões do aparelho, desempenho, aquecimento, nitidez e sincronismo em takes longos.
- Reconhecimento de voz por serviço real do navegador: testes de comandos são simulados.
- Instalação PWA, atualização publicada, compartilhamento e download físico de celular nesta revisão.
- Diferença de tema relatada no site do usuário: ainda é necessário o endereço publicado ou uma referência visual para verificar qual versão/estilo está sendo carregado. Preservar o CSS do ZIP não comprova que o site já tenha sido atualizado corretamente.

## Implementação e limitações

Imagem inteira usa a faixa nativa. Outros enquadramentos usam captura de canvas local, com aproximação digital. Não são enviados roteiros nem vídeos a servidor. O comando de fala pode usar o serviço externo do navegador. Modos digitais são desabilitados se captureStream não existir, em vez de mostrar uma prévia cortada e gravar outra imagem. Confira um take curto no aparelho: a detecção de API não substitui teste real.

A estrutura é estática; nenhum APK, IPA, instalador ou compilação nativa foi gerado. Nenhum arquivo foi enviado ao GitHub. O ZIP original e os pacotes anteriores foram preservados.
