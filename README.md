# RoboSapiens 2026 — Robô Estoura Balão

Aplicação web estática para operar a modalidade Robô Estoura Balão (Ensino Fundamental).
Abra `index.html` no navegador (Chrome/Edge recomendados). Os dados ficam salvos no `localStorage` do navegador.

## Arquivos
- `index.html`, `style.css`, `script.js`: o sistema (abre direto no navegador).
- `assets/`: logotipos (`logo-sumula.js` é o logo usado nas súmulas em Word).
- `servidor.py` + `iniciar-servidor.bat`: modo com dois computadores (telão em outro PC), opcional.
- `sumulas/`: súmulas em Word para imprimir e o gerador delas.

## Telas
| Tela | Função |
|---|---|
| **Início** | Situação atual, próximos da Arena Livre e do Confronto Direto, atalhos. |
| **Equipes** | Incluir, editar e excluir equipes (nome, escola, robô, professor, integrantes). As equipes começam sem número (**Equipe XX**) até o **sorteio da numeração**. |
| **Cores** | Cores dos balões numeradas de 1 a 8. O sistema começa com 3 (Azul, Preto, Laranja); dá para incluir até 8, editar, excluir e restaurar o padrão. Mostra também as cores sorteadas para as equipes. |
| **Arena Livre** | Tudo da Arena Livre numa tela só: sorteio das cores, fila por rodada, chamada da equipe, cronômetro, pontuação, desfazer, classificação. |
| **Confronto Direto** | Tudo do Confronto Direto numa tela só: geração da fase preliminar, confronto ao vivo, classificação, semifinais, final e campeão. |
| **Classificação Geral** | Soma da Arena Livre com os pontos marcados no Confronto Direto (todas as fases, ou só a preliminar, em Configurações). |
| **Cronograma** | Programação do dia: incluir, editar e excluir atividades (horário, atividade e detalhamento). A atividade em andamento é destacada pelo relógio, aparece no Início e pode ser exibida no telão. |
| **Telão** | Tela para o público. Abra em outra janela (📺) e arraste para o projetor: ela acompanha tudo ao vivo. |
| **Config.** | Rodadas e tempo da Arena Livre, critérios de desempate, **planilha Excel**, backup (JSON) e reinício. |

## Arena Livre
- **Passo 1 — Sorteio das cores:** feito uma única vez, antes de chamar as equipes. Cada equipe recebe uma cor, que vale para todas as rodadas. As cores só se repetem entre equipes quando há mais equipes que cores: com 3 cores e 7 equipes, cada cor fica com até 3 equipes. A cor pode ser ajustada manualmente, e o telão mostra o quadro equipe → cor.
- **Passo 2 — Chamar para a arena:** uma equipe por vez, de 1 a 5 rodadas (padrão 4), 30 s por tentativa.
- **Encerrar a etapa:** ao fim de cada rodada, o sistema pergunta se continua ou **encerra a Arena Livre ali** (ex.: com 2 ou 3 rodadas). Encerrada, aparece o botão **⚔️ Ir para o Confronto Direto**. Também dá para reabrir mais rodadas.
- **Falha técnica:** **🔁 Repetir tentativa** zera as marcações e o cronômetro, registrando o motivo. Uma tentativa já registrada pode ser **anulada** com motivo.
- +50 por balão de outra cor · −50 por balão da própria cor · −30 por sair da arena.
- Toda tentativa começa em **0**. A pontuação é calculada somente a partir das marcações da tentativa.
- **↶ Desfazer última** e **✕** em cada marcação corrigem erros. Uma tentativa registrada pode ser **anulada** no histórico.
- Classificação por soma das rodadas (ou melhor rodada, em Configurações). Ela é separada da classificação do Confronto Direto.

## Classificação Geral
- **Total** = pontuação da Arena Livre (soma das rodadas, ou melhor rodada) + pontos marcados no Confronto Direto (+100 por balão, +30 por saída do adversário).
- **Desempate:** mais pontos no Confronto Direto, depois mais pontos na Arena Livre. Persistindo, decisão da comissão.
- O campeão do Confronto Direto continua sendo o vencedor da final. A Classificação Geral pode ser exibida no telão.

## Confronto Direto
- **Fase preliminar (Configurações):** padrão **todos contra todos**: com 7 equipes são **21 confrontos** e cada equipe joga 6 vezes; com 8 equipes, 28 confrontos. Também dá para escolher 2 ou 4 jogos por equipe (7 ou 14 confrontos com 7 equipes). Nunca há adversário repetido; se o número de equipes não permitir, o sistema avisa e usa o maior possível.
- Funciona com qualquer número de equipes (mínimo 4). A ordem dos confrontos evita que uma equipe jogue duas vezes seguidas; com 4 equipes isso é matematicamente impossível e o sistema avisa. Os 4 primeiros vão às semifinais.
- Confronto: Round 1 (padrão 2 min) → intervalo (padrão 2 min, automático) → Round 2 (padrão 1 min) → conferência do resultado. Os tempos são configuráveis.
- +100 por balão adversário · +30 quando o adversário sai da arena (configuráveis).
- **Balões por robô** (padrão 2, configurável): cada robô recomeça cada round com os seus balões, e o painel mostra quantos restam (🎈🎈).
- **Fim automático do round (regulamento 5.1.2.1):** o round encerra sozinho quando os balões de um robô acabam (alínea b) ou quando um robô sai da arena (alínea c, +30 para o adversário). Não é possível marcar mais balões do que o robô tem. Se foi engano, **↶ Desfazer** (ou ✕ na marcação) reabre o round, pausado no tempo em que parou.
- **↶ Desfazer última** de cada equipe e **✕** em cada marcação para corrigir erros. **✏️ Corrigir** reabre um confronto encerrado.
- Classificação: vitória 3, empate 1, derrota 0 (configurável).
- **Semifinais** geradas automaticamente: 1º × 4º e 2º × 3º. **Final:** vencedores das semifinais.
- Empate em semifinal ou final: o operador seleciona o vencedor definido pela Comissão Organizadora.

## Desempate (fase preliminar)
Configurável em **Configurações** (ordem e ativação). Padrão definido pela organização: **1. saldo de pontos → 2. confronto direto → 3. pontos marcados**. Vitórias, resultado da Arena Livre e numeração do sorteio ficam disponíveis, mas desligados.
Se o empate persistir entre os 4 primeiros, a classificação mostra ▲▼ para a Comissão definir a ordem antes de gerar as semifinais.
**Confira e ajuste os critérios conforme o regulamento oficial.**

## Pontuação oculta
Classificações e resultados começam **ocultos**. O botão 👁️ **Pontuação** revela ou oculta. No telão, a revelação é controlada separadamente, na tela Telão.

## Correção do "−140"
A versão anterior acumulava pontos em campos gravados no navegador (`freePoints`/`_freeTemp`). Com isso, restos de testes apareciam como pontuação inicial.
Agora nenhuma pontuação é armazenada como acumulador: tudo é recalculado a partir das marcações. Na primeira abertura, só o cadastro das equipes da versão anterior é aproveitado.

Base: Regulamento Geral RoboSapiens 2026, seção 5.

## Dois computadores: um registra, outro exibe o telão (rede local)
Não precisa de internet nem de banco de dados: os dois PCs só precisam estar na **mesma rede** (roteador, cabo de rede ou o roteador do celular).

**Só uma vez, no PC que registra:** instale o Python 3 (https://www.python.org/downloads/ e marque *Add python.exe to PATH*, ou pela Microsoft Store).

**No dia:**
1. No PC que registra, dê dois cliques em **`iniciar-servidor.bat`**. Uma janela preta mostra os endereços, e o sistema abre sozinho em `http://localhost:8000`. **Deixe a janela preta aberta.**
   - Se o Windows perguntar sobre o firewall, clique em **Permitir acesso** (redes privadas).
2. No PC do telão, abra no navegador o endereço mostrado, por exemplo `http://192.168.0.10:8000`. Ele abre direto no telão, **somente leitura**, e atualiza sozinho. Dê duplo clique para tela cheia.
3. No topo do sistema aparece **🟢 Telão em rede**. A tela **Telão** também mostra o endereço.

- Só o PC que registra consegue alterar os dados. O cronômetro do telão é sincronizado com o do PC de registro.
- Qualquer aparelho da mesma rede que abrir o endereço consegue **ver** o telão (inclusive a pontuação, mesmo oculta na tela). Use uma rede de confiança, como o roteador do celular.
- Cópia automática a cada alteração: `dados-competicao.json`, na pasta do sistema.
- Se a rede cair, o registro continua normalmente. O telão mostra um aviso e volta sozinho quando a conexão retornar.
- Rede da escola bloqueando a comunicação entre computadores? Use o roteador do celular ou um cabo de rede direto entre os dois PCs. Com cabo direto, o endereço mostrado é do tipo `http://169.254.x.x:8000` e aparece marcado como "cabo de rede direto". Pode levar cerca de 1 minuto depois de ligar o cabo para ele aparecer; se não aparecer, feche e abra o `.bat` de novo.
- No Mac ou Linux, use `python3 servidor.py` no lugar do `.bat`.

## Planilha de resultados (Excel)
Em **Config. → 📊 Exportar planilha (Excel)**, ou pelo botão na Classificação Geral, é gerado um arquivo `.xlsx`, sem precisar de internet, com as abas:
Resumo · Equipes · Arena - Classificação · Arena - Tentativas · Arena - Marcações · Confronto - Jogos · Confronto - Classificação · Confronto - Marcações · Classificação Geral · Cronograma · Histórico.
Os números vão como números, prontos para somar ou filtrar. O cabeçalho fica fixo e com filtro.

## Operação (atalhos e avisos)
- **Barra de espaço:** inicia e pausa o cronômetro da Arena Livre ou do round em andamento.
- **Topo da tela:** o indicador **📺 Telão** mostra o que o público está vendo e se a pontuação está visível.
- **Ações recusadas** (por exemplo, marcar pontos antes de iniciar) aparecem em destaque no topo, sem cobrir os botões.

## Configurações de regras
Em **Config.**, dá para ajustar, sem mexer no código:
- **Arena Livre:** rodadas (1 a 5), tempo por tentativa e pontos (+ outra cor, − própria cor, − saída).
- **Confronto Direto:** fase preliminar (todos contra todos, 2 ou 4 jogos por equipe), tempo do Round 1, intervalo e Round 2, pontos (+ balão adversário, + saída do adversário) e pontos de classificação (vitória/empate/derrota).

Cada marcação guarda os pontos do momento: mudar a regra não altera o que já foi registrado.

## Durante a competição
- **Ajuste do cronômetro:** botões **−5 s / +5 s** abaixo do cronômetro (ex.: o juiz iniciou atrasado). Nunca passa do tempo máximo.
- **Sons:** bipes separados para a Arena Livre e para o Confronto Direto: intermediário curto (padrão aos 10 s e aos 5 s; os segundos são configuráveis) e final longo, cada um podendo ser ligado ou desligado. No Confronto, o intervalo entre os rounds não bipa (opcional). Configure em Config. → Sons e backup.
- **Destaque no telão:** cada marcação aparece grande ("+50", "+100") por um instante.
- **Falha técnica no Confronto:** **🔁 Repetir Round** zera o round atual (marcações e cronômetro), registrando o motivo.
- **Backup automático:** ao fim da Arena Livre, da fase preliminar e da final, o sistema baixa sozinho a planilha e o JSON na pasta Downloads (pode ser desligado).
- **Histórico de alterações:** sorteios, resultados, correções, anulações, repetições, ajustes de tempo e mudanças de configuração, com data e hora. Fica em Config. e na aba "Histórico" da planilha.

## Súmulas para imprimir (Word)
**Pelo sistema (recomendado):** em **Config. → 📝 Súmulas para imprimir**, os botões baixam o `.docx` da Arena Livre (uma página por rodada) e do Confronto Direto (uma página por confronto, mais semifinais, final e uma reserva). Sem internet. As súmulas saem com as equipes, as cores sorteadas, os confrontos já gerados e os tempos e pontos configurados no momento; se algo mudar, gere de novo. Antes de gerar a fase preliminar, as páginas dos confrontos saem em branco, na quantidade da configuração atual.

**Arquivos prontos (pasta `sumulas/`), com as 7 equipes da inscrição:**
- `Sumula-Confronto-Direto.docx`: uma página por confronto (Preliminar 1 a 21, Semifinais 1 e 2, Final e uma reserva). Imprima só as preliminares necessárias: 7, 14 ou 21.
- `Sumula-Arena-Livre.docx`: uma página por rodada (1 a 5), já com as 7 equipes e escolas.

Para regerar (ex.: mudou alguma equipe): `npm install docx` e depois `node sumulas/gerar-sumulas.js`.
