# RoboSapiens 2026 — Robô Estoura Balão

Aplicação web estática para operar a modalidade Robô Estoura Balão (Ensino Fundamental).
Abra `index.html` no navegador (Chrome/Edge recomendados). Os dados ficam salvos no `localStorage` do navegador.

## Arquivos
- `index.html`, `style.css`, `script.js`
- `assets/robosapiens.png`, `assets/ifsul.svg`

## Telas
| Tela | Função |
|---|---|
| **Início** | Situação atual, próximos da Arena Livre e do Confronto Direto, atalhos. |
| **Equipes** | Incluir, editar e excluir equipes (nome, escola, robô, professor, integrantes). As equipes começam sem número (**Equipe XX**) até o **sorteio da numeração**. |
| **Cores** | Cores dos balões numeradas de 1 a 8. O sistema começa com 4 (Vermelho, Azul, Verde, Amarelo); dá para incluir até 8, editar, excluir e restaurar o padrão. Mostra também as cores sorteadas para as equipes. |
| **Arena Livre** | Tudo da Arena Livre numa tela só: sorteio das cores, fila por rodada, chamada da equipe, cronômetro, pontuação, desfazer, classificação. |
| **Confronto Direto** | Tudo do Confronto Direto numa tela só: geração da fase preliminar, confronto ao vivo, classificação, semifinais, final e campeão. |
| **Classificação Geral** | Soma da Arena Livre com os pontos marcados no Confronto Direto (todas as fases, ou só a preliminar, em Configurações). |
| **Telão** | Tela para o público. Abra em outra janela (📺) e arraste para o projetor: ela acompanha tudo ao vivo. |
| **Config.** | Rodadas e tempo da Arena Livre, critérios de desempate, **planilha Excel**, backup (JSON) e reinício. |

## Arena Livre
- **Passo 1 — Sorteio das cores:** feito uma única vez, antes de chamar as equipes. Cada equipe recebe uma cor, que vale para todas as rodadas. As cores só se repetem entre equipes quando há mais equipes que cores: com 4 cores e 7 equipes, cada cor fica com até 2 equipes. A cor pode ser ajustada manualmente, e o telão mostra o quadro equipe → cor.
- **Passo 2 — Chamar para a arena:** uma equipe por vez, até 4 rodadas (configurável de 1 a 4), 30 s por tentativa.
- +50 por balão de outra cor · −50 por balão da própria cor · −30 por sair da arena.
- Toda tentativa começa em **0**. A pontuação é calculada somente a partir das marcações da tentativa.
- **↶ Desfazer última** e **✕** em cada marcação corrigem erros. Uma tentativa registrada pode ser **anulada** no histórico.
- Classificação por soma das rodadas (ou melhor rodada, em Configurações). Ela é separada da classificação do Confronto Direto.

## Classificação Geral
- **Total** = pontuação da Arena Livre (soma das rodadas, ou melhor rodada) + pontos marcados no Confronto Direto (+100 por balão, +30 por saída do adversário).
- **Desempate:** mais pontos no Confronto Direto, depois mais pontos na Arena Livre. Persistindo, decisão da comissão.
- O campeão do Confronto Direto continua sendo o vencedor da final. A Classificação Geral pode ser exibida no telão.

## Confronto Direto
- **Fase preliminar:** funciona com qualquer número de equipes (mínimo 4). N equipes geram N confrontos: 6 → 6, 7 → 7, 8 → 8, 10 → 10. Cada equipe joga exatamente 2 vezes, sem repetir confrontos e sem jogar duas vezes seguidas. A exceção é com 4 equipes, em que isso é matematicamente impossível; o sistema avisa. Os 4 primeiros vão às semifinais.
- Confronto: Round 1 (2 min) → intervalo (2 min, automático) → Round 2 (1 min) → conferência do resultado.
- +100 por balão adversário · +30 quando o adversário sai da arena.
- **↶ Desfazer última** de cada equipe e **✕** em cada marcação para corrigir erros. **✏️ Corrigir** reabre um confronto encerrado.
- Classificação: vitória 3, empate 1, derrota 0.
- **Semifinais** geradas automaticamente: 1º × 4º e 2º × 3º. **Final:** vencedores das semifinais.
- Empate em semifinal ou final: o operador seleciona o vencedor definido pela Comissão Organizadora.

## Desempate (fase preliminar)
Configurável em **Configurações** (ordem e ativação). Padrão: **1. saldo de pontos → 2. pontos marcados → 3. confronto direto**. Vitórias, resultado da Arena Livre e numeração do sorteio ficam disponíveis, mas desligados.
Com 2 jogos por equipe, as equipes empatadas raramente se enfrentaram, por isso o confronto direto vem depois do saldo. O número de vitórias não diferencia ninguém nesse formato (3/1/0 com 2 jogos).
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
- Cópia automática a cada alteração: `dados-competicao.json`, na pasta do sistema.
- Se a rede cair, o registro continua normalmente. O telão mostra um aviso e volta sozinho quando a conexão retornar.
- Rede da escola bloqueando a comunicação entre computadores? Use o roteador do celular ou um cabo de rede direto entre os dois PCs.
- No Mac ou Linux, use `python3 servidor.py` no lugar do `.bat`.

## Planilha de resultados (Excel)
Em **Config. → 📊 Exportar planilha (Excel)**, ou pelo botão na Classificação Geral, é gerado um arquivo `.xlsx`, sem precisar de internet, com as abas:
Resumo · Equipes · Arena - Classificação · Arena - Tentativas · Arena - Marcações · Confronto - Jogos · Confronto - Classificação · Confronto - Marcações · Classificação Geral.
Os números vão como números, prontos para somar ou filtrar. O cabeçalho fica fixo e com filtro.

## Operação (atalhos e avisos)
- **Barra de espaço:** inicia e pausa o cronômetro da Arena Livre ou do round em andamento.
- **Topo da tela:** o indicador **📺 Telão** mostra o que o público está vendo e se a pontuação está visível.
- **Ações recusadas** (por exemplo, marcar pontos antes de iniciar) aparecem em destaque no topo, sem cobrir os botões.
