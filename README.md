# RoboSapiens 2026 — Robô Estoura Balão

Aplicação web estática para operar a modalidade Robô Estoura Balão (Ensino Fundamental).
Abra `index.html` no navegador (Chrome/Edge recomendados). Os dados ficam salvos no `localStorage` do navegador.

## Arquivos
- `index.html`, `style.css` e a pasta `js/` (`01-base.js` … `08-config-inicio.js`, carregados nessa ordem): o sistema (abre direto no navegador). Pasta `assets/`: logos, logo da súmula e a voz "Preparar". Copie sempre **todas** as pastas.
- `assets/`: logotipos (`logo-sumula.js` é o logo usado nas súmulas em Word).
- `servidor.py` + `iniciar-servidor.bat`: modo com dois computadores (telão em outro PC), opcional.
- `abrir-telao.bat`: abre o telão em tela cheia na TV ligada a este PC.
- `sumulas/`: súmulas em Word para imprimir e o gerador delas.

## Telas
| Tela | Função |
|---|---|
| **Início** | Situação atual, próximos da Arena Livre e do Confronto Direto, atalhos. |
| **Equipes** | Incluir, editar e excluir equipes (nome, escola, robô, professor, integrantes). As equipes começam sem número (**Equipe XX**) até o **sorteio da numeração**. |
| **Cores** | Cores dos balões (até 8), sem número: o número que aparece no círculo da cor é sempre a numeração sorteada da equipe. O sistema começa com 3 (Azul, Preto, Laranja); dá para incluir até 8, editar, excluir e restaurar o padrão. Mostra também as cores sorteadas para as equipes. |
| **Arena Livre** | Tudo da Arena Livre numa tela só: sorteio das cores, fila por rodada, chamada da equipe, cronômetro, pontuação, desfazer, classificação. |
| **Confronto Direto** | Tudo do Confronto Direto numa tela só: geração da fase preliminar, confronto ao vivo, classificação, semifinais, final e Vencedor - Confronto Direto. |
| **Classificação Geral** | Soma da Arena Livre com o saldo (pontos marcados) da fase preliminar do Confronto Direto. Semifinais, 3º lugar e final não contam (padrão; em Config. dá para incluir a fase eliminatória). |
| **Extras** | Testes e registros **fora da competição**: sessões avulsas de Arena Livre ou Confronto Direto com os mesmos cronômetros, "Preparar", bipes, rounds e controles do jogo, mas totalmente isoladas (veja abaixo). |
| **Pódio** | Três pódios separados (Confronto Direto, Classificação Geral e Arena Livre), cada um com botão para mostrar no telão. |
| **Cronograma** | Programação do dia: incluir, editar e excluir atividades (horário, atividade e detalhamento). A atividade em andamento é destacada pelo relógio, aparece no Início e pode ser exibida no telão. |
| **Telão** | Tela para o público. Abra em outra janela (📺) e arraste para o projetor: ela acompanha tudo ao vivo. |
| **Config.** | Rodadas e tempo da Arena Livre, critérios de desempate, **planilha Excel**, backup (JSON) e reinício. |

## Arena Livre
- **Passo 1 — Sorteio das cores:** feito uma única vez, antes de chamar as equipes. Cada equipe recebe uma cor, que vale para todas as rodadas. As cores só se repetem entre equipes quando há mais equipes que cores: com 3 cores e 7 equipes, cada cor fica com até 3 equipes. A cor pode ser ajustada manualmente, e o telão mostra o quadro equipe → cor.
- **Passo 2 — Chamar para a arena:** uma equipe por vez, de 1 a 5 rodadas (padrão 5), 30 s por tentativa.
- **Encerrar a etapa:** ao fim de cada rodada, o sistema pergunta se continua ou **encerra a Arena Livre ali** (ex.: com 2 ou 3 rodadas). Encerrada, aparece o botão **⚔️ Ir para o Confronto Direto**. Também dá para reabrir mais rodadas.
- **Falha técnica:** **🔁 Repetir tentativa** zera as marcações e o cronômetro, registrando o motivo. Uma tentativa já registrada pode ser **anulada** com motivo.
- +50 por balão de outra cor · −50 por balão da própria cor · −30 por sair da arena.
- Toda tentativa começa em **0**. A pontuação é calculada somente a partir das marcações da tentativa.
- **↶ Desfazer última** e **✕** em cada marcação corrigem erros. Uma tentativa registrada pode ser **corrigida** (✏️ na fila da Arena ou no histórico de tentativas) ou **anulada** no histórico.
- Classificação por soma das rodadas (ou melhor rodada, em Configurações). Ela é separada da classificação do Confronto Direto.

## Classificação Geral
- **Total** = pontuação da Arena Livre (soma das rodadas, ou melhor rodada) + saldo (pontos marcados) da **fase preliminar** do Confronto Direto (+100 por balão, +30 por saída do adversário). Semifinais, 3º lugar e final não contam. Em **Config. → Fase eliminatória e Classificação Geral** é possível escolher "Também a fase eliminatória" (aí semifinais, 3º lugar e final somam; o chaveamento não muda).
- **Desempate:** mais pontos no Confronto Direto, depois mais pontos na Arena Livre. Persistindo, decisão da comissão.
- O Vencedor - Confronto Direto é o vencedor da final. A Classificação Geral pode ser exibida no telão.

## Confronto Direto
- **Fase preliminar (Configurações):** padrão **todos contra todos**: com 7 equipes são **21 confrontos** e cada equipe joga 6 vezes; com 8 equipes, 28 confrontos. Também dá para escolher 2 ou 4 jogos por equipe (7 ou 14 confrontos com 7 equipes). Nunca há adversário repetido; se o número de equipes não permitir, o sistema avisa e usa o maior possível.
- Funciona com qualquer número de equipes (mínimo 4). A ordem dos confrontos evita que uma equipe jogue duas vezes seguidas; com 4 equipes isso é matematicamente impossível e o sistema avisa. Os 4 primeiros vão às semifinais.
- Confronto: Round 1 (padrão 2 min) → intervalo (padrão 2 min, automático) → Round 2 (padrão 1 min) → conferência do resultado. Os tempos são configuráveis.
- +100 por balão adversário · +30 quando o adversário sai da arena (configuráveis).
- **Balões por robô** (padrão 2, configurável): valem para o confronto inteiro, **sem reposição entre os rounds**. O painel mostra quantos restam, na cor da equipe.
- **Balões acabaram:** o confronto encerra e vai para a conferência do resultado; se for no Round 1, não há Round 2.
- **Robô saiu da arena (5.1.2.1 c):** +30 para o adversário e **só o round** encerra. No Round 1, segue para o intervalo e o Round 2 acontece normalmente, com os balões que sobraram. Não é possível marcar mais balões do que o robô tem. Se foi engano, **↶ Desfazer** (ou ✕ na marcação) reabre o round, pausado no tempo em que parou.
- **↶ Desfazer última** de cada equipe e **✕** em cada marcação para corrigir erros. **✏️ Corrigir** (na lista de confrontos e no chaveamento) abre uma janela para ajustar os balões estourados e as saídas de cada equipe em cada round, mesmo com outro confronto em andamento; o vencedor, a classificação e, se preciso, semifinais/final são recalculados.
- **Classificação da fase preliminar: pelo saldo** = soma dos pontos marcados pela equipe nos confrontos (os pontos do adversário não são descontados). Não há pontos de vitória/empate/derrota; a tabela mostra jogos (J), vitórias (V), empates (E), derrotas (D) e o saldo.
- **Semifinais** geradas automaticamente com os **4 primeiros da Classificação Geral** (Arena Livre + saldo da fase preliminar): 1º × 4º e 2º × 3º. Saem quando a fase preliminar **e** a Arena Livre estão concluídas. Em **Config. → Fase eliminatória** dá para trocar para **só o Confronto Direto** (saldo da fase preliminar, a Arena não conta; empate entre os 4 primeiros: critérios de desempate e ▲▼ da comissão). O critério usado aparece escrito no chaveamento, na súmula e no telão. Empate na Classificação Geral: mais pontos no Confronto, depois na Arena Livre, depois a menor numeração do sorteio. Se uma correção mudar os 4 primeiros antes de as semifinais começarem, elas são refeitas. **Disputa de 3º lugar:** perdedores das semifinais, jogada antes da final (pode ser desligada em Config.; sem ela, o 3º lugar fica com o perdedor de semifinal mais bem colocado na classificação do chaveamento). **Final:** vencedores das semifinais.
- **Empate na fase eliminatória** (Config.; só semifinais, 3º lugar e final): **intervalo e Round 3** só se empatar, com os balões que sobraram (não são repostos). Opções: **Round 3 igual ao Round 2 (por pontuação)** — padrão: mesmo tempo do Round 2, vence quem marcar mais no Round 3; **morte súbita** (tempo próprio): vence quem tirar o adversário da arena ou estourar os balões que restam dele; ou **decisão da comissão** (sem Round 3). Sem decisão no Round 3: comissão.
- Empate em semifinal ou final: o operador seleciona o vencedor definido pela Comissão Organizadora.

## Desempate (fase preliminar)
O critério principal é sempre o **saldo de pontos**. Desempate configurável em **Configurações** (ordem e ativação). Padrão: **1. confronto direto (quem venceu o jogo entre as empatadas) → 2. número de vitórias → 3. numeração do sorteio (menor número à frente) → decisão da comissão**. Pontos marcados e resultado da Arena Livre ficam disponíveis, mas desligados.
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

## Começar do zero (antes da competição)
- **Config. → Limpar histórico:** apaga só os registros do histórico.
- **Config. → Resetar tudo:** apaga resultados e volta ao cadastro inicial das equipes (mantém configurações e histórico).
- **Config. → 🧹 Zerar este computador:** deixa o sistema como recém-instalado: apaga equipes, resultados, cores, cronograma, configurações e histórico guardados neste navegador e, se o servidor estiver ligado, também a cópia `dados-competicao.json` (o telão zera junto). Pede para digitar **ZERAR**. Não mexe em outros sites. Exporte um backup antes, se quiser guardar.

## Planilha de resultados (Excel)
Em **Config. → 📊 Exportar planilha (Excel)**, ou pelo botão na Classificação Geral, é gerado um arquivo `.xlsx`, sem precisar de internet, com as abas:
Resumo · Equipes · Arena - Classificação · Arena - Tentativas · Arena - Marcações · Confronto - Jogos · Confronto - Classificação · Confronto - Marcações · Classificação Geral · Cronograma · Histórico.
Os números vão como números, prontos para somar ou filtrar. O cabeçalho fica fixo e com filtro.

## Operação (atalhos e avisos)
- **Sorteios no telão:** em **Equipes** (ou em Cores, no quadro "Cores das equipes") clique em **📺 Mostrar no telão**. O telão mostra o **antes** (equipes como "XX" / sem cor); ao clicar em **🎲 Sortear**, o telão faz a **animação do sorteio**: contagem 3, 2, 1 e depois uma equipe a cada 3 s ("roleta" de números ou de cores que para no resultado, com bipe curto; bipe longo na última), mostrando o **depois** (numeração 01 a 07 / cor de cada equipe, agrupadas por cor). Ao chamar a primeira equipe ou iniciar um confronto, o telão volta ao automático. Também pelo menu Telão: "Sorteio da numeração" e "Sorteio das cores".
- **Telão na TV pelo `abrir-telao.bat` (recomendado):** com a TV conectada em modo **Estender** (Windows + P), dê dois cliques em **`abrir-telao.bat`**. Ele liga o servidor (se ainda não estiver ligado), encontra a TV e abre o telão **direto em tela cheia nela**, numa janela própria que não sai da tela cheia quando você clica no sistema. Para fechar o telão: clique nele e aperte **Alt+F4**. Precisa do Python (o mesmo do `iniciar-servidor.bat`) e do Edge ou Chrome.
- **Telão na TV (mesmo PC):** clique em 📺, arraste a janela do telão para a TV e clique no botão **⛶ Tela cheia** (ou duplo clique / **F11**). O telão continua em tela cheia enquanto você opera o sistema na outra tela. Se algum navegador ainda sair da tela cheia, use **F11** na janela do telão (tela cheia do próprio navegador).
- **Barra de espaço:** inicia e pausa o cronômetro da Arena Livre ou do round em andamento.
- **Topo da tela:** o indicador **📺 Telão** mostra o que o público está vendo e se a pontuação está visível.
- **Ações recusadas** (por exemplo, marcar pontos antes de iniciar) aparecem em destaque no topo, sem cobrir os botões.

## Configurações de regras
Em **Config.**, dá para ajustar, sem mexer no código:
- **Arena Livre:** rodadas (1 a 5), tempo por tentativa e pontos (+ outra cor, − própria cor, − saída).
- **Confronto Direto:** fase preliminar (todos contra todos, 2 ou 4 jogos por equipe), tempo do Round 1, intervalo e Round 2, pontos (+ balão adversário, + saída do adversário) e pontos de classificação (vitória/empate/derrota).

**Previsão máxima de balões** (nos blocos da Arena Livre e do Confronto Direto, em Config.):
- Arena Livre: rodadas × equipes × balões montados na arena (padrão 9), com a divisão por cor.
- Confronto Direto: (confrontos da fase preliminar + 2 semifinais + 3º lugar, se ligado, + 1 final) × 3 balões, o máximo que pode ser estourado por confronto.

Cada marcação guarda os pontos do momento: mudar a regra não altera o que já foi registrado.

## Durante a competição
- **Ajuste do cronômetro:** botões **−5 s / +5 s** abaixo do cronômetro (ex.: o juiz iniciou atrasado). Nunca passa do tempo máximo.
- **Sons:** volume ajustável em Config. → Sons e backup (padrão: máximo, 10 de 10). Bipes separados para a Arena Livre e para o Confronto Direto: **bipe de início** quando a tentativa ou o round começa (não ao retomar uma pausa), intermediário curto (padrão: Arena Livre aos 5 s, Confronto Direto aos 10 s; os segundos são configuráveis) e final longo, cada um podendo ser ligado ou desligado. No Confronto, o intervalo entre os rounds não bipa (opcional). **"PREPARAR":** ao clicar em Iniciar, toca "Preparar!" (voz gravada embutida, `assets/preparar-voz.js`) ou um som enviado por você (mp3/wav), espera 2 s (ajustável) e aí bipa e o tempo começa a correr. A voz gravada e o som enviado são normalizados e comprimidos para soar **no mesmo volume do bipe** e acompanham o "Volume dos bipes". Opcional: voz do computador (Windows), cujo volume não acompanha o bipe; ou desligado. O som enviado fica só naquele navegador. Configure em Config. → Sons e backup.
- **Destaque no telão:** cada marcação aparece grande ("+50", "+100") por um instante.
- **Falha técnica no Confronto:** **🔁 Repetir Round** zera o round atual (marcações e cronômetro), registrando o motivo.
- **Backup automático:** ao fim da Arena Livre, da fase preliminar e da final, o sistema baixa sozinho a planilha e o JSON na pasta Downloads (pode ser desligado).
- **Histórico de alterações:** sorteios, resultados, correções, anulações, repetições, ajustes de tempo e mudanças de configuração, com data e hora. Fica em Config. e na aba "Histórico" da planilha.

## Súmulas para imprimir (Word)
**Pelo sistema (recomendado):** em **Config. → 📝 Súmulas para imprimir**, os botões baixam o `.docx` da Arena Livre (uma página por rodada) e do Confronto Direto (uma página por confronto, mais semifinais, final e uma reserva). Sem internet. As súmulas saem com as equipes, as cores sorteadas, os confrontos já gerados e os tempos e pontos configurados no momento; se algo mudar, gere de novo. Antes de gerar a fase preliminar, as páginas dos confrontos saem em branco, na quantidade da configuração atual.

**Arquivos prontos (pasta `sumulas/`), com as 7 equipes da inscrição:**
- `Sumula-Confronto-Direto.docx`: uma página por confronto (Preliminar 1 a 21, Semifinais 1 e 2, Disputa de 3º lugar, Final e uma reserva). Imprima só as preliminares necessárias: 7, 14 ou 21.
- `Sumula-Arena-Livre.docx`: uma página por rodada (1 a 5), já com as 7 equipes e escolas.

Para regerar (ex.: mudou alguma equipe): `npm install docx` e depois `node sumulas/gerar-sumulas.js`.

## Extras (testes e registros fora da competição)
- Guia **🧪 Extras** no fim do menu. Escolha **Arena Livre** ou **Confronto Direto**, a finalidade (**Teste** ou **Registro fora da competição**), as equipes (as cadastradas ou "Equipe Teste A/B") e, se quiser, os tempos só para aquela sessão.
- Usa as mesmas telas e funções do jogo oficial: Iniciar, "Preparar", bipes, ±5 s, marcações, desfazer, Round 1 → intervalo → Round 2 (→ Round 3 de desempate), encerramento automático por balões/saída, conferência e resultado. Há uma prévia do telão só na própria tela.
- A faixa roxa **MODO EXTRAS — NÃO É RODADA OFICIAL** fica visível o tempo todo.
- **🏁 Finalizar sessão** para o cronômetro da sessão, guarda o resultado no **Histórico de Extras** e volta ao início de Extras. **🆕 Nova sessão** começa do zero (se houver uma sessão em andamento, ela é guardada como interrompida).
- **Isolamento:** a sessão trabalha numa cópia própria das equipes, cores e configurações. Nada vai para o placar, classificações, pódio, histórico oficial, planilha, súmulas, backup JSON, telão ou servidor do telão em rede. Os dados de Extras ficam numa chave separada do navegador (`robosapiens_estoura_baloes_EXTRAS_v1`), apagada também pelo "Zerar este computador".
- **Telão:** a sessão Extras só aparece no telão quando você escolhe (**📺 Mostrar no telão** na guia Extras, ou **Telão → 🧪 Sessão Extras**); o modo Automático (ao vivo) nunca mostra Extras. No telão aparece a etiqueta "EXTRAS · FORA DA COMPETIÇÃO OFICIAL". Ao chamar uma tentativa ou iniciar um confronto **oficial**, o telão volta sozinho ao automático. No telão em rede, a sessão vai ao servidor num campo separado, só em memória (não entra nos dados oficiais nem no `dados-competicao.json`).
- Se houver uma tentativa ou confronto **oficial** em andamento, ele continua normalmente em segundo plano (cronômetro e bipes); para operá-lo, volte à guia dele pelo menu.

## Ausência (W.O.), desclassificação e correções
- **Arena Livre:** com a equipe chamada e antes de iniciar, **🚫 Ausente (W.O.)** registra a tentativa com 0 ponto (aparece como "W.O." na fila).
- **Confronto Direto:** **🚫 Ausência / W.O.** (no próximo confronto) ou **🚫 W.O. / abandono** (no confronto em andamento): equipe ausente → a outra vence por 200 × 0 (os 2 balões do ausente contam como estourados); ambas ausentes → 0 × 0 na preliminar, comissão na eliminatória; abandono → os balões que restam ao robô que abandonou contam para o adversário, que vence.
- **Desclassificação** (tela Equipes, depois de a competição começar): motivo obrigatório; a equipe sai das classificações e do pódio, os pontos dos adversários contra ela ficam, os confrontos dela ainda não disputados viram W.O. e, se as semifinais ainda não começaram, a vaga vai para o próximo. Pode ser revertida (os W.O. já lançados ficam para corrigir com ✏️).
- **Correções** (✏️ Corrigir) exigem **motivo** e **operador**; anular tentativa exige motivo. O nome do operador deste PC (Config. → Sons e backup) vai em cada registro do histórico e na planilha.
- **Backup periódico:** JSON automático na pasta Downloads a cada 15 min (10/15/30 ou desligado), só quando algo mudou; o topo mostra "💾 Backup hh:mm" (amarelo se atrasado) e clicar salva na hora.
