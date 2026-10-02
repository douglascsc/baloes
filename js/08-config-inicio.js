"use strict";
/* RoboSapiens 2026 — Robô Estoura Balão · js/08-config-inicio.js: Configurações, modal, temporizadores, rede local e inicialização (carregar por último).
   Os arquivos js/01…08 são scripts comuns carregados em ordem pelo index.html e compartilham o escopo global. */
/* ============================ CONFIGURAÇÕES ============================ */
function config() {
  const s = state.settings;
  const tb = s.tiebreak.map((x, i) => `<div class="tb-row"><label class="check"><input type="checkbox" ${x.on ? "checked" : ""} onchange="toggleTb(${i})"> <b>${i + 1}. ${TIEBREAKS[x.key].label}</b></label><span class="muted small">${TIEBREAKS[x.key].desc}</span><span class="actions"><button class="btn tiny" onclick="moveTb(${i},-1)" ${i ? "" : "disabled"}>▲</button><button class="btn tiny" onclick="moveTb(${i},1)" ${i < s.tiebreak.length - 1 ? "" : "disabled"}>▼</button></span></div>`).join("");
  main().innerHTML = head("Configurações", "Parâmetros da competição, backup e reinício.") +
    `<div class="grid g2">
      <div class="card"><h2>📊 Planilha de resultados</h2><p class="muted small">Arquivo Excel (.xlsx) com todas as etapas: equipes, Arena Livre (classificação, tentativas e cada marcação), Confronto Direto (jogos, classificação e cada marcação) e Classificação Geral.</p><div class="actions mt-s"><button class="btn primary" onclick="exportXlsx()">📊 Exportar planilha (Excel)</button></div></div>
      <div class="card"><h2>💾 Backup</h2><div class="actions"><button class="btn primary" onclick="exportData()">⬇ Exportar JSON</button><label class="btn file">⬆ Importar JSON<input id="importFile" type="file" accept=".json,application/json" hidden></label></div><p class="muted small mt-s">Os dados ficam salvos neste navegador. Exporte um backup ao final de cada etapa.</p></div>
      <div class="card span-all"><h2>📝 Súmulas para imprimir (Word)</h2><p class="muted small">Arquivo .docx com uma página por rodada (Arena Livre) ou por confronto (Confronto Direto), já com as equipes, as cores sorteadas, os confrontos gerados, os tempos e as pontuações configurados agora. Se algo mudar, gere de novo.</p>
        <div class="actions mt-s"><button class="btn primary" onclick="exportSumula('arena')">🎈 Súmula da Arena Livre (${s.freeRounds} rodada${s.freeRounds > 1 ? "s" : ""})</button><button class="btn primary" onclick="exportSumula('cup')">⚔️ Súmula do Confronto Direto</button></div></div>
      <div class="card"><h2>🎈 Arena Livre</h2><div class="form-grid">
        <div><label>Rodadas por equipe</label><select onchange="setSetting('freeRounds',this.value)">${[1, 2, 3, 4, 5].map(n => `<option ${s.freeRounds === n ? "selected" : ""}>${n}</option>`).join("")}</select></div>
        <div><label>Tempo por tentativa (s)</label><input type="number" min="5" max="600" value="${s.freeSeconds}" onchange="setSetting('freeSeconds',this.value)"></div>
        <div class="full"><label>Classificação da Arena Livre</label><select onchange="setSetting('freeRankMode',this.value)"><option value="soma" ${s.freeRankMode === "soma" ? "selected" : ""}>Soma das rodadas</option><option value="melhor" ${s.freeRankMode === "melhor" ? "selected" : ""}>Melhor rodada</option></select></div>
        <div><label>Balão de outra cor (+ pontos)</label><input type="number" min="0" max="1000" value="${s.freeOther}" onchange="setSetting('freeOther',this.value)"></div>
        <div><label>Balão da própria cor (− pontos)</label><input type="number" min="0" max="1000" value="${s.freeOwn}" onchange="setSetting('freeOwn',this.value)"></div>
        <div><label>Saída da arena (− pontos)</label><input type="number" min="0" max="1000" value="${s.freeExit}" onchange="setSetting('freeExit',this.value)"></div>
        <div><label>Balões montados na arena (por tentativa)</label><input type="number" min="1" max="99" value="${s.freeArenaBalloons}" onchange="setSetting('freeArenaBalloons',this.value)"></div>
        <div class="full"><label class="check"><input type="checkbox" ${s.freeMinZero ? "checked" : ""} onchange="setSetting('freeMinZero',this.checked)"> Não permitir pontuação negativa em uma tentativa (mínimo 0)</label></div>
      </div>${balloonEstimate("free")}<p class="muted small mt-s">Padrão: 5 rodadas (de 1 a 5) · 30 s · 12 balões por tentativa · +50 / −50 / −30. A Arena Livre também pode ser encerrada antes, na própria tela, ao fim de uma rodada. Mudanças de pontuação valem para as próximas marcações.</p></div>
      <div class="card"><h2>⚔️ Confronto Direto</h2><div class="form-grid">
        <div><label>Round 1 (segundos)</label><input type="number" min="5" max="900" value="${s.cupR1}" onchange="setSetting('cupR1',this.value)"></div>
        <div><label>Intervalo (segundos)</label><input type="number" min="0" max="900" value="${s.cupBreak}" onchange="setSetting('cupBreak',this.value)"></div>
        <div><label>Round 2 (segundos)</label><input type="number" min="5" max="900" value="${s.cupR2}" onchange="setSetting('cupR2',this.value)"></div>
        <div><label>Balão adversário estourado (+ pontos)</label><input type="number" min="0" max="1000" value="${s.cupBalloon}" onchange="setSetting('cupBalloon',this.value)"></div>
        <div><label>Adversário saiu da arena (+ pontos)</label><input type="number" min="0" max="1000" value="${s.cupExit}" onchange="setSetting('cupExit',this.value)"></div>
        <div><label>Balões por robô (no confronto)</label><input type="number" min="1" max="10" value="${s.cupBalloons}" onchange="setSetting('cupBalloons',this.value)"></div>
        <div class="full"><p class="muted small">Os balões não são repostos entre os rounds: quando os balões de um robô acabam, o confronto encerra (sem Round 2, se for no Round 1). Se um robô sai da arena, só o round encerra e o Round 2 acontece normalmente (5.1.2.1 c). Se foi engano, ↶ Desfazer reabre o round.</p></div>
        <div class="full"><label>Fase preliminar</label><select onchange="setSetting('cupGames',this.value)">
          ${(() => { const N = teams().length, all = N * (N - 1) / 2;
            return `<option value="0" ${s.cupGames === 0 ? "selected" : ""}>${all} confrontos · todos contra todos (${Math.max(0, N - 1)} jogos por equipe) — padrão</option>` +
              [2, 4, 6].filter(k => k < N - 1).map(k => `<option value="${k}" ${s.cupGames === k ? "selected" : ""}>${N * k / 2} confrontos · ${k} jogos por equipe</option>`).join(""); })()}</select>
          <p class="muted small">Calculado com as ${teams().length} equipes cadastradas.</p>
          ${prelims().length ? `<p class="muted small">A fase preliminar atual tem ${prelims().length} confrontos. A mudança vale ao gerar a fase preliminar novamente.</p>` : ""}</div>
      </div>${balloonEstimate("cup")}<p class="muted small mt-s">Padrão: todos contra todos · Round 1 2 min · intervalo 2 min · Round 2 1 min · +100 / +30 · classificação pelo saldo. Tempos novos valem a partir do próximo round; pontos, para as próximas marcações.</p></div>
      <div class="card"><h2>🏅 Fase eliminatória e Classificação Geral</h2><div class="form-grid">
        <div class="full"><label>Chaveamento das semifinais (1º × 4º e 2º × 3º)</label><select onchange="setSetting('koSeed',this.value)">
          <option value="geral" ${s.koSeed === "geral" ? "selected" : ""}>Classificação Geral: Arena Livre + saldo da fase preliminar — padrão</option>
          <option value="cup" ${s.koSeed === "cup" ? "selected" : ""}>Só o Confronto Direto: saldo da fase preliminar (Arena Livre não conta)</option></select>
          <p class="muted small">${s.koSeed === "cup" ? "Empate entre os 4 primeiros: critérios de desempate do Confronto e, se persistir, decisão da comissão (▲▼ na classificação)." : "As semifinais só são geradas com a Arena Livre e a fase preliminar concluídas."}</p></div>
        <div class="full"><label>Disputa de 3º lugar</label><select onchange="setThird(this.value === '1')">
          <option value="1" ${s.cupThird ? "selected" : ""}>Sim — os perdedores das semifinais disputam o 3º lugar (antes da final) — padrão</option>
          <option value="0" ${s.cupThird ? "" : "selected"}>Não — 3º lugar fica com o perdedor de semifinal mais bem colocado no chaveamento</option></select></div>
        <div class="full"><label>Empate na fase eliminatória (Rounds 1 e 2 empatados)</label><select onchange="setSetting('koR3',this.value)">
          <option value="points" ${s.koR3 === "points" ? "selected" : ""}>Round 3 igual ao Round 2 (por pontuação: vence quem marcar mais) — padrão</option>
          <option value="sudden" ${s.koR3 === "sudden" ? "selected" : ""}>Round 3 MORTE SÚBITA — vence quem tirar o adversário da arena ou estourar os balões que restam dele</option>
          <option value="off" ${s.koR3 === "off" ? "selected" : ""}>Sem Round 3 — decisão da comissão</option></select></div>
        ${s.koR3 === "sudden" ? `<div><label>Round 3 morte súbita (segundos)</label><input type="number" min="5" max="900" value="${s.cupR3}" onchange="setSetting('cupR3',this.value)"></div>` : ""}
        ${s.koR3 !== "off" ? `<div class="${s.koR3 === "sudden" ? "" : "full"}"><p class="muted small">Só na fase eliminatória e só se empatar: intervalo (${durTxt(s.cupBreak)}) e Round 3 (${durTxt(r3Secs())}${s.koR3 === "points" ? ", o mesmo tempo do Round 2" : ""}). Os balões <b>não são repostos</b> (seguem os que sobraram). Empate de novo / sem decisão: decisão da comissão.</p></div>` : ""}
        <div class="full"><label>Classificação Geral: pontos do Confronto Direto</label><select onchange="setSetting('geralCup',this.value)">
          <option value="prelim" ${s.geralCup === "prelim" ? "selected" : ""}>Só a fase preliminar (semifinais, 3º lugar e final não contam) — padrão</option>
          <option value="all" ${s.geralCup === "all" ? "selected" : ""}>Também a fase eliminatória (semifinais, 3º lugar e final somam)</option></select>
          <p class="muted small">Não muda o chaveamento das semifinais (que usa só a fase preliminar).</p></div>
      </div></div>
      <div class="card"><h2>📱 Juízes pelo celular</h2>
        <p class="muted small">Os juízes usam a Arena Livre e o Confronto Direto pelo celular; o note executa cada ação, salva e mostra no telão. Sem limite de juízes.</p>
        <div class="beep-at"><label for="jPin">PIN dos juízes (4 a 8 números):</label><input id="jPin" inputmode="numeric" maxlength="8" value="${esc(s.judgePin)}" placeholder="desligado" onchange="setSetting('judgePin',this.value)"><button class="btn small" onclick="setSetting('judgePin',String(1000+Math.floor(Math.random()*9000)))">🎲 Gerar</button>${s.judgePin ? `<button class="btn small ghost" onclick="setSetting('judgePin','')">Desligar</button>` : ""}</div>
        ${!s.judgePin ? `<p class="muted small">Defina um PIN para ligar o acesso dos juízes.</p>`
          : !(NET.on && NET.local) ? `<div class="notice warn mt-s">Para os celulares acessarem, abra o sistema pelo <b>iniciar-servidor.bat</b> (endereço http://localhost:8000).</div>`
          : `<div class="notice mt-s">No celular (na mesma rede do note), abra:${NET.urls.map(u => `<br><b class="big-url">${esc(u)}#juiz</b>`).join("") || " <b>(nenhuma rede encontrada — ligue o Hotspot do note)</b>"}<br>e entre com o seu nome e o PIN <b>${esc(s.judgePin)}</b>.</div>
             <p class="small mt-s"><b>Juízes conectados:</b> ${(() => { const on = Object.entries(JUDGE.judges).filter(([, t]) => Date.now() - t < 60000).map(([n]) => esc(n)); return on.length ? on.join(" · ") : "nenhum ainda"; })()} <button class="btn tiny" onclick="render()">↻</button></p>`}
        <details class="mt-s"><summary class="small"><b>📶 Criar a rede no note (Hotspot do Windows)</b></summary><ol class="small">
          <li>Execute <b>ligar-rede-do-note.bat</b> (ou Configurações do Windows → Rede e Internet → <b>Hotspot móvel</b>) e ligue o Hotspot. Anote o nome da rede e a senha.</li>
          <li>Conecte os celulares dos juízes (e o PC do telão, se for outro) nessa rede.</li>
          <li>Abra o <b>iniciar-servidor.bat</b> no note. Na 1ª vez, se o Windows perguntar, permita o acesso do Python às redes <b>privadas e públicas</b>.</li>
          <li>No celular, abra o endereço acima (no Hotspot do Windows costuma ser <b>http://192.168.137.1:8000/#juiz</b>).</li></ol>
          <p class="muted small">Funciona sem internet. O som (bipes e "Preparar") continua tocando no note/telão.</p></details></div>
      <div class="card"><h2>🔊 Sons e backup</h2>
        <label class="check"><input type="checkbox" ${s.sound ? "checked" : ""} onchange="setSetting('sound',this.checked)"> Sons neste PC</label>
        <div class="vol-row"><label for="beepVol">🔊 Volume dos bipes: <b>${s.beepVol}</b> de 10</label><input id="beepVol" type="range" min="1" max="10" step="1" value="${s.beepVol}" onchange="setSetting('beepVol',this.value);getAudio();setTimeout(()=>beep('start'),80)"></div>
        <label class="check"><input type="checkbox" ${s.soundTv ? "checked" : ""} onchange="setSetting('soundTv',this.checked)"> Sons também no telão (clique uma vez na tela do telão para liberar o som)</label>
        <p class="muted small">Bipes (valem para este PC e para o telão):</p>
        ${[["free", "🎈 Arena Livre"], ["cup", "⚔️ Confronto Direto (Round 1 e Round 2)"]].map(([k, title]) => `<div class="beep-opts ${s.sound || s.soundTv ? "" : "off"}">
          <b class="beep-title">${title}</b>
          <label class="check"><input type="checkbox" ${s[k + "BeepStart"] ? "checked" : ""} onchange="setSetting('${k}BeepStart',this.checked)"> Bipe de início quando ${k === "cup" ? "cada round começar" : "a tentativa começar"}</label>
          <label class="check"><input type="checkbox" ${s[k + "BeepMid"] ? "checked" : ""} onchange="setSetting('${k}BeepMid',this.checked)"> Bipe intermediário (curto) quando faltarem</label>
          <div class="beep-at"><input type="text" inputmode="numeric" value="${esc(s[k + "BeepMidAt"])}" onchange="setSetting('${k}BeepMidAt',this.value)" aria-label="Segundos dos bipes intermediários — ${title}" ${s[k + "BeepMid"] ? "" : "disabled"}><span class="muted small">segundos (ex.: 30, 10, 5)</span></div>
          <label class="check"><input type="checkbox" ${s[k + "BeepEnd"] ? "checked" : ""} onchange="setSetting('${k}BeepEnd',this.checked)"> Bipe final (longo) quando o tempo acabar</label>
          ${k === "cup" ? `<label class="check"><input type="checkbox" ${s.cupBeepBreak ? "checked" : ""} onchange="setSetting('cupBeepBreak',this.checked)"> Bipar também no intervalo entre os rounds</label>` : ""}
        </div>`).join("")}
        <div class="beep-opts ${s.sound || s.soundTv ? "" : "off"}"><b class="beep-title">📣 "PREPARAR" antes do bipe de início (Arena Livre e cada round)</b>
          <select onchange="setSetting('prepMode',this.value)" aria-label="Som do Preparar">
            <option value="pc" ${s.prepMode === "pc" ? "selected" : ""}>Voz do computador falando "Preparar" (português) — padrão</option>
            <option value="som" ${s.prepMode === "som" ? "selected" : ""}>Som enviado por mim — ajustado ao volume do bipe</option>
            <option value="voz" ${s.prepMode === "voz" ? "selected" : ""}>Voz gravada embutida (sintética) — mesmo volume do bipe</option>
            <option value="off" ${s.prepMode === "off" ? "selected" : ""}>Desligado (bipe de início na hora)</option></select>
          ${s.prepMode !== "off" ? `<div class="beep-at"><input type="number" min="1" max="10" value="${s.prepDelay}" onchange="setSetting('prepDelay',this.value)" aria-label="Segundos entre o Preparar e o bipe de início"><span class="muted small">segundos entre o "Preparar" e o bipe de início (o tempo só começa a correr no bipe)</span></div>` : ""}
          ${s.prepMode === "pc" ? (() => { const v = ptVoice(); return v ? `<p class="muted small">Voz encontrada: <b>${esc(v.name)}</b>. O volume dela é o do Windows: se ficar mais baixa que o bipe, diminua o "Volume dos bipes" ou aumente o volume do Windows.</p>` : `<p class="muted small">⚠️ Nenhuma voz em português encontrada neste navegador${window.speechSynthesis ? " (pode demorar uns segundos para carregar)" : ""}. No Edge/Chrome do Windows costuma existir; se não falar, envie um som.</p>`; })() : ""}
          ${s.prepMode === "som" && !prepAudio() ? `<p class="muted small">⚠️ Nenhum som enviado ainda: enquanto isso, usa a voz do computador.</p>` : ""}
          ${s.prepMode === "voz" || s.prepMode === "som" ? `<p class="muted small">O "Preparar" é normalizado e comprimido para soar no mesmo volume do bipe e acompanha o controle "Volume dos bipes".</p>` : ""}
          <div class="actions mt-s"><label class="btn small file">⬆ ${prepAudio() ? "Trocar o som" : "Enviar um som"} (mp3, wav…)<input id="prepFile" type="file" accept="audio/*" hidden></label>${prepAudio() ? `<button class="btn small" onclick="removePrep()">🗑 Remover som enviado</button>` : ""}<button class="btn small" onclick="getAudio();playPrep(true)">🔈 Testar "Preparar"</button></div>
          <p class="muted small">O som enviado fica guardado só neste navegador (não vai no backup JSON; um telão em outro PC usa a voz gravada).</p></div>
        <div class="actions mt-s"><button class="btn small" onclick="getAudio();setTimeout(()=>beep('start'),60)">🔈 Testar bipe de início</button><button class="btn small" onclick="getAudio();setTimeout(()=>beep('warn'),60)">🔈 Testar bipe intermediário</button><button class="btn small" onclick="getAudio();setTimeout(()=>beep('end'),60)">🔈 Testar bipe final</button></div>
        <hr class="sep">
        <label class="check"><input type="checkbox" ${s.autoBackup ? "checked" : ""} onchange="setSetting('autoBackup',this.checked)"> Backup automático ao fim de cada etapa (planilha + JSON na pasta Downloads)</label>
        <div class="beep-at"><label for="bkMin">💾 Backup periódico (JSON na pasta Downloads):</label><select id="bkMin" onchange="setSetting('backupMin',this.value)">${[[15, "a cada 15 min — padrão"], [10, "a cada 10 min"], [30, "a cada 30 min"], [0, "desligado"]].map(([v, l]) => `<option value="${v}" ${s.backupMin === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>
        <p class="muted small">Só salva se algo mudou desde o último backup. Último backup deste PC: <b>${BK.last ? esc(fmtDate(new Date(BK.last).toISOString())) : "nenhum ainda"}</b>. Na 1ª vez o navegador pode perguntar se permite "baixar vários arquivos": clique em <b>Permitir</b>.</p>
        <hr class="sep">
        <label for="operName">👤 Operador deste computador (vai no histórico de cada registro)</label>
        <input id="operName" maxlength="60" value="${esc(operator())}" placeholder="nome de quem opera o sistema" onchange="setOperator(this.value);toast('Operador salvo')"></div>
      <div class="card"><h2>⚔️ Critérios de desempate (Confronto Direto)</h2><p class="muted small">Aplicados em ordem quando equipes empatam no saldo de pontos. Marque os previstos no regulamento. Se o empate persistir, a Comissão decide a ordem na própria classificação.</p><div class="tb-list">${tb}</div></div>
      <details class="card fold"><summary><b>📜 Histórico de alterações</b> <span class="muted small">(${state.log.length})</span></summary>
        <div class="log mt-s">${state.log.slice(-300).reverse().map(x => `<div class="log-item"><span><b>${esc(fmtDate(x.at))}</b>${x.by ? ` · <i>${esc(x.by)}</i>` : ""} · ${esc(x.msg)}</span></div>`).join("") || `<div class="muted small">Nenhum registro ainda.</div>`}</div>
        <p class="muted small mt-s">Registro de sorteios, resultados, correções, anulações, repetições e ajustes. Também vai na planilha Excel (aba Histórico).</p>
        ${state.log.length ? `<div class="actions mt-s"><button class="btn small danger" onclick="clearLog()">🗑 Limpar histórico</button></div>` : ""}</details>
      <div class="card"><h2>⚠️ Reiniciar</h2><div class="actions col">
        <button class="btn danger" onclick="resetFree()">Zerar Arena Livre (apaga tentativas)</button>
        ${prelims().length ? `<button class="btn danger" onclick="generatePrelim()">↻ Gerar novamente a fase preliminar (apaga confrontos e resultados)</button>` : ""}
        <button class="btn danger" onclick="resetCup()">Zerar Confronto Direto (apaga confrontos e resultados)</button>
        <button class="btn danger" onclick="resetAll()">Resetar tudo (volta ao cadastro inicial das ${INITIAL_TEAMS.length} equipes)</button>
        <button class="btn danger" onclick="factoryReset()">🧹 Zerar este computador (sistema como recém-instalado)</button></div>
        <p class="muted small mt-s"><b>Zerar este computador</b> apaga tudo o que o sistema guardou neste navegador (equipes, resultados, cores, cronograma, configurações e histórico)${NET.on && NET.local ? " e também a cópia do servidor (dados-competicao.json)" : ""}. Não mexe em outros sites. Exporte um backup antes, se quiser guardar.</p></div>
    </div>`;
  document.getElementById("importFile").onchange = importData;
  document.getElementById("prepFile").onchange = uploadPrep;
}
function setSetting(k, v) {
  if (k === "freeRounds") {
    const n = Math.round(num(v, 4)), extra = state.free.attempts.filter(a => a.round > n).length;
    if (extra && !confirm(`Existem ${extra} tentativa(s) registradas acima da rodada ${n}. Elas ficarão fora da classificação (não são apagadas). Continuar?`)) return render();
  }
  const old = state.settings[k];
  state.settings[k] = v; state = normalize(state);
  if (String(old) !== String(state.settings[k])) logEv(`Configuração alterada: ${k} = ${state.settings[k]} (antes: ${old})`);
  // chaveamento mudou: semifinais ainda não jogadas são refeitas (ou geradas, se a preliminar já acabou)
  if (k === "koSeed" && String(old) !== String(state.settings[k])) { if (semis().length) resyncSemis(); else checkProgress(); }
  save(); toast("Configuração salva"); render();
}
// Liga/desliga a disputa de 3º lugar (uma disputa ainda não jogada é apagada ao desligar)
function setThird(on) {
  const th = thirdMatch();
  if (!on && th) {
    if (th.status !== "pending") { warn("A disputa de 3º lugar já começou ou foi disputada: corrija ou cancele o jogo antes de desligar."); return render(); }
    state.cup.matches = state.cup.matches.filter(m => m !== th);
  }
  state.settings.cupThird = on;
  logEv(`Configuração alterada: disputa de 3º lugar ${on ? "ligada" : "desligada"}`);
  if (on) checkProgress();
  save(); toast("Configuração salva"); render();
}
function toggleTb(i) { state.settings.tiebreak[i].on = !state.settings.tiebreak[i].on; save(); render(); }
function moveTb(i, d) { const a = state.settings.tiebreak, j = i + d; if (j < 0 || j >= a.length) return;[a[i], a[j]] = [a[j], a[i]]; save(); render(); }
function exportData() { downloadBlob(new Blob([JSON.stringify(officialState(), null, 2)], { type: "application/json" }), `robosapiens-estoura-baloes-${stamp()}.json`); if (!XMODE) markBackup(); }
function importData(e) {
  const input = e.target, file = input.files[0]; if (!file) return;
  input.value = ""; // permite importar o mesmo arquivo de novo
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = JSON.parse(r.result);
      if (!data || !Array.isArray(data.teams)) throw new Error("formato");
      if (!confirm("Substituir todos os dados atuais pelos do arquivo?")) return;
      state = normalize(data); logEv("Dados importados de arquivo JSON"); save(); toast("Dados importados"); render();
    } catch (err) { warn("Arquivo JSON inválido ou de outro sistema."); }
  };
  r.readAsText(file);
}
function resetFree() { if (!confirm("Apagar TODAS as tentativas da Arena Livre?")) return; state.free = { current: null, attempts: [], draws: {} }; logEv("Arena Livre zerada (tentativas e cores apagadas)"); save(); toast("Arena Livre zerada"); render(); }
function resetCup() { if (!confirm("Apagar TODOS os confrontos e resultados?")) return; state.cup = { matches: [], liveId: null, manualOrder: [] }; logEv("Confronto Direto zerado"); save(); toast("Confronto Direto zerado"); render(); }
// Volta o sistema ao estado de recém-instalado: apaga só o que ESTE sistema guardou no navegador
// (e a cópia do servidor local, se estiver em uso). Outros sites não são afetados.
async function factoryReset() {
  const ans = prompt("ZERAR ESTE COMPUTADOR\n\nApaga TUDO do sistema neste navegador: equipes, resultados, cores, cronograma, configurações e histórico" + (NET.on && NET.local ? ", e também a cópia do servidor" : "") + ".\nO sistema volta como recém-instalado. Exporte um backup antes, se quiser guardar.\n\nPara confirmar, digite ZERAR:", "");
  if (ans === null) return;
  if (str(ans).toUpperCase() !== "ZERAR") return warn("Nada foi apagado (é preciso digitar ZERAR).");
  RESETTING = true; clearTimeout(NET.timer);
  if (NET.on && NET.local) {
    // o servidor também precisa ficar vazio, senão o sistema e o telão recarregariam os dados antigos dele
    try { const r = await fetchT("/api/estado", 4000, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: normalize(fresh()) }) }); if (!r.ok) throw new Error(r.status); }
    catch (e) { RESETTING = false; return warn("Não foi possível zerar a cópia do servidor. Confira se o iniciar-servidor.bat está aberto e tente de novo. Nada foi apagado."); }
  }
  try { Object.keys(localStorage).filter(k => k.startsWith("robosapiens")).forEach(k => localStorage.removeItem(k)); sessionStorage.clear(); } catch (e) { /* segue */ }
  location.reload();
}
// Apaga só o histórico (ex.: registros dos testes antes da competição); dados da competição não mudam
function clearLog() {
  if (!confirm(`Apagar os ${state.log.length} registros do histórico?\nEquipes, resultados e configurações NÃO mudam.\nSe quiser guardar, exporte a planilha antes.`)) return;
  state.log = []; logEv("Histórico limpo"); save(); toast("Histórico limpo"); render();
}
function resetAll() { if (!confirm("Apagar tudo e voltar ao cadastro inicial das equipes?")) return; const log = state.log; state = normalize(fresh()); state.log = log; logEv("Competição reiniciada (tudo apagado, cadastro inicial restaurado)"); save(); toast("Competição reiniciada"); render(); }

/* ============================ MODAL / EVENTOS GLOBAIS ============================ */
let modalReturn = null;
function openModal(html) {
  modalReturn = document.activeElement;
  const box = document.getElementById("modalContent");
  box.innerHTML = `<button type="button" class="modal-x" onclick="closeModal()" aria-label="Fechar">✕</button>${html}`;
  const h = box.querySelector("h2"); if (h) h.id = "modalTitle";
  document.getElementById("modal").classList.remove("hidden");
  (box.querySelector("input,select,textarea") || box.querySelector("button"))?.focus();
}
function closeModal() {
  const m = document.getElementById("modal"); if (m.classList.contains("hidden")) return;
  m.classList.add("hidden");
  if (modalReturn && document.body.contains(modalReturn)) modalReturn.focus();
  modalReturn = null;
}
function trapModal(e) {
  const m = document.getElementById("modal"); if (m.classList.contains("hidden") || e.key !== "Tab") return;
  const f = [...m.querySelectorAll("button,input,select,textarea,[href]")].filter(x => !x.disabled && x.offsetParent !== null);
  if (!f.length) return;
  if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
  else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
}
// Mostra o erro abaixo do campo (sem argumentos: limpa os erros do formulário)
function fieldErr(form, name, msg) {
  form.querySelectorAll(".field-error").forEach(x => x.remove());
  form.querySelectorAll("[aria-invalid]").forEach(x => { x.removeAttribute("aria-invalid"); x.removeAttribute("aria-describedby"); });
  if (!name) return;
  const inp = form.querySelector(`[name="${name}"]`); if (!inp) return warn(msg);
  const d = document.createElement("div"); d.className = "field-error"; d.id = `err-${name}`; d.setAttribute("role", "alert"); d.textContent = msg;
  inp.setAttribute("aria-invalid", "true"); inp.setAttribute("aria-describedby", d.id); inp.insertAdjacentElement("afterend", d); inp.focus();
}

function updateTimers() {
  document.querySelectorAll("[data-timer]").forEach(el => {
    const k = el.dataset.timer, t = k === "free" ? state.free.current?.timer : k === "match" ? liveMatch()?.timer : xTimer(k);
    if (!t) return;
    const l = left(t); el.textContent = fmt(l);
    el.classList.toggle("warn", t.status === "running" && l <= 5 && l > 0);
    el.classList.toggle("over", t.status === "over" || (t.status === "running" && l <= 0));
  });
}
function refreshTelaoFull() { const s = document.getElementById("tvScene"); if (s && document.body.classList.contains("telao-full")) { s.innerHTML = telaoScene(); tvPops(); updateTimers(); } }

const lastPrep = { main: false, bg: false, x: false };
// bg = cronômetro OFICIAL rodando em segundo plano enquanto a guia Extras está aberta (sem redesenhar a tela)
function timerTick(bg = false) {
  countdownBeep(state.free.current?.timer, "free"); countdownBeep(liveMatch()?.timer, "cup", liveMatch()?.phase);
  // fim do "Preparar": redesenha (status e botões de pontuação)
  const k = bg ? "bg" : "main", pr = inPrep(state.free.current?.timer) || inPrep(liveMatch()?.timer), prChanged = pr !== lastPrep[k]; lastPrep[k] = pr;
  if (TELAO_WINDOW || JUIZ) {
    let xch = false;
    if (TELAO_WINDOW && state.display.mode === "extras" && XVIEW) withXState(XVIEW, () => { // bipes e "Preparar" da sessão Extras mostrada no telão
      countdownBeep(state.free.current?.timer, "free"); countdownBeep(liveMatch()?.timer, "cup", liveMatch()?.phase);
      const xp = inPrep(state.free.current?.timer) || inPrep(liveMatch()?.timer); xch = xp !== lastPrep.x; lastPrep.x = xp;
    });
    if (prChanged || xch) render(); else updateTimers(); return;
  }
  let changed = false;
  const cur = state.free.current, pre = bg ? "Competição oficial: " : "";
  if (cur && cur.timer.status === "running" && left(cur.timer) <= 0) {
    cur.timer.status = "over"; cur.timer.remaining = 0; changed = true; toast(`⏱ ${pre}Tempo esgotado — registre o resultado`);
  }
  const m = liveMatch();
  if (m && m.timer.status === "running" && left(m.timer) <= 0) {
    m.timer.status = "over"; m.timer.remaining = 0; changed = true;
    toast(`⏱ ${pre}` + (m.phase === "break" ? `Fim do intervalo — vá para o Round ${m.toR3 ? 3 : 2}` : `Fim do Round ${phRound(m.phase) || 2}`));
  }
  if (bg) { if (changed) save(); return; }
  if (changed) { save(); render(); refreshTelaoFull(); } else if (prChanged) { render(); refreshTelaoFull(); } else updateTimers();
}
setInterval(() => { timerTick(); if (XMODE) withOfficial(() => timerTick(true)); }, 200);

/* ---------- Backup automático periódico (sempre do estado OFICIAL, também com a guia Extras aberta) ---------- */
function periodicBackup() {
  if (TELAO_WINDOW || RESETTING || JUIZ) return;
  const o = officialState(), min = o.settings.backupMin;
  if (!min || !o.settings.autoBackup || !BK.dirty || Date.now() - BK.last < min * 60000) return;
  try {
    downloadBlob(new Blob([JSON.stringify(o, null, 2)], { type: "application/json" }), `robosapiens-estoura-baloes-backup-auto-${stamp()}.json`);
    markBackup(); toast(`💾 Backup automático salvo (${nowHHMM()})`);
  } catch (e) { console.error(e); }
}
setInterval(periodicBackup, 30000);
function updateBkPill() {
  const el = document.getElementById("bkPill"); if (!el || TELAO_WINDOW) return;
  const o = officialState(), min = o?.settings.backupMin || 0, late = BK.dirty && (!BK.last || (min && Date.now() - BK.last > min * 2 * 60000));
  el.classList.remove("hidden"); el.classList.toggle("late", !!late);
  el.textContent = BK.last ? `💾 Backup ${(d => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`)(new Date(BK.last))}` : "💾 Sem backup";
  el.title = `Último backup deste PC: ${BK.last ? fmtDate(new Date(BK.last).toISOString()) : "nenhum"}${min ? ` · automático a cada ${min} min` : " · automático periódico desligado"}. Clique para salvar um backup (JSON) agora.`;
}
setInterval(updateBkPill, 30000);

/* ---------- Rede local ---------- */
function fetchT(url, ms, opt = {}) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
  return fetch(url, { cache: "no-store", ...opt, signal: c.signal }).finally(() => clearTimeout(t));
}
function setNet(ok) {
  if (ok) NET.lastOk = Date.now();
  if (NET.ok !== ok) { NET.ok = ok; updateNetPill(); if (!TELAO_WINDOW && state.view === "telao") render(); }
  const w = document.getElementById("netWarn"); if (w) w.classList.toggle("hidden", ok);
}
async function pushState() {
  if (NET.busy) { NET.again = true; return; }
  NET.busy = true;
  try {
    const r = await fetchT("/api/estado", 4000, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: officialState(), extras: xPayload() }) });
    if (!r.ok) throw new Error(r.status);
    NET.rev = (await r.json()).rev; setNet(true);
  } catch (e) { setNet(false); }
  NET.busy = false;
  if (NET.again) { NET.again = false; pushState(); }
}
async function pollState() {
  const t0 = Date.now();
  try {
    const r = await fetchT(`/api/estado?since=${JUIZ && JUDGE.pending.length ? "x" : NET.rev}`, 3000);
    const j = await r.json(), t1 = Date.now();
    if (Number.isFinite(j.now)) NET.offset = j.now - (t0 + t1) / 2;
    if (JUIZ) {
      await judgeResults();
      // enquanto há ação enviada esperando o note, mantém na tela o efeito simulado
      if (!JUDGE.pending.length && j.rev !== NET.rev && j.data) { NET.rev = j.rev; const v = state.view; state = normalize(j.data); state.view = JUDGE_VIEWS.includes(v) ? v : "arena"; if (document.getElementById("modal").classList.contains("hidden")) render(); else updateTimers(); }
    } else if (j.rev !== NET.rev && j.data) { NET.rev = j.rev; state = normalize(j.data); XVIEW = xFromRaw(j.extras); render(); }
    setNet(true);
  } catch (e) { if (Date.now() - NET.lastOk > 3000) setNet(false); }
  setTimeout(pollState, 500);
}
// Operador: se o servidor parar, tenta reenviar periodicamente
setInterval(() => { if (NET.on && NET.local && !TELAO_WINDOW && !NET.ok) pushState(); }, 3000);
function updateNetPill() {
  const el = document.getElementById("netPill"); if (!el) return;
  if (JUIZ) { el.classList.remove("hidden"); el.className = `net-pill ${NET.ok ? "ok" : "bad"}`; el.textContent = `👨‍⚖️ ${JUDGE.name || "Juiz"} · ${!NET.ok ? "🟠 sem conexão" : JUDGE.pending.length ? "⏳ enviando…" : "🟢 conectado"}`; el.title = "Juiz pelo celular — clique para trocar de juiz"; return; }
  if (!NET.on || !NET.local || TELAO_WINDOW) { el.classList.add("hidden"); return; }
  el.classList.remove("hidden");
  el.className = `net-pill ${NET.ok ? "ok" : "bad"}`;
  el.textContent = NET.ok ? "🟢 Telão em rede" : "🟠 Servidor sem resposta";
}
async function detectServer() {
  if (!/^https?:$/.test(location.protocol) || /github\.io$/.test(location.hostname)) return;
  try {
    const r = await fetchT("/api/info", 1500);
    if (!r.ok) return;
    const j = await r.json(); if (!j || j.server !== true) return;
    NET.on = true; NET.local = !!j.local; NET.urls = Array.isArray(j.urls) ? j.urls : [];
    if (!NET.local && !JUIZ) TELAO_WINDOW = true;
    const e = await (await fetchT("/api/estado", 3000)).json();
    NET.rev = e.rev || 0; NET.lastOk = Date.now();
    if (Number.isFinite(e.now)) NET.offset = e.now - Date.now();
    if (JUIZ) { if (e.data) { state = normalize(e.data); state.view = "arena"; } }
    else if (TELAO_WINDOW) { if (e.data) state = normalize(e.data); XVIEW = xFromRaw(e.extras); }
    else if (e.data) { state = normalize(e.data); state.display.reveal = false; save(); }
    else save(); // servidor vazio: envia os dados deste PC
  } catch (err) { NET.on = false; }
}

function spaceTarget(e) {
  if (e.code !== "Space" && e.key !== " ") return false;
  if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) || !document.getElementById("modal").classList.contains("hidden")) return false;
  if (state.view === "arena") { const t = state.free.current?.timer; return !!t && t.status !== "over"; }
  if (state.view === "confrontos" || (state.view === "extras" && !state.free.current)) { const m = liveMatch(); return !!m && LIVE_PH.includes(m.phase) && m.timer.status !== "over"; }
  if (state.view === "extras") { const t = state.free.current?.timer; return !!t && t.status !== "over"; }
  return false;
}
/* ============================ JUÍZES PELO CELULAR ============================ */
/* Celulares na rede do note (Hotspot do Windows ou Wi-Fi) abrem http://IP-do-note:porta/#juiz e entram com o PIN.
   O celular mostra as mesmas telas da Arena e do Confronto, com os dados vindos do note. Cada ação do juiz é
   simulada no próprio celular (para coletar as confirmações e mostrar o efeito na hora) e enviada ao note como
   um comando { função, argumentos, respostas }. O NOTE executa o comando com as mesmas funções do jogo, salva e
   transmite o novo estado — então vários juízes (sem limite fixo) podem agir ao mesmo tempo sem apagar um ao outro. */
const JUDGE_ACTIONS = ["callTeam", "callNext", "freeToggle", "freeEvent", "freeUndo", "freeRemoveEvent", "freeFinish", "freeCancel", "freeRepeat", "freeWO", "freeVoid", "freeEditApply",
  "closeArena", "reopenArena", "drawColors", "drawMissing", "startMatch", "matchToggle", "endRound", "startRound2", "startRound3", "repeatRound", "matchEvent", "matchUndo",
  "matchRemoveEvent", "pickWinner", "confirmResult", "cancelMatch", "cupEditApply", "woApply", "adjTimer", "generatePrelim", "confirmTieOrder", "moveInTie", "clearManualOrder",
  "setDisplay", "toggleTvReveal", "showOnTv", "scheduleSave", "deleteActivity", "restoreSchedule", "drawNumbers", "clearNumbers"];
const JUDGE_VIEWS = ["inicio", "equipes", "arena", "confrontos", "geral", "podio", "crono", "telao"];
const JKEY = "robosapiens_estoura_baloes_juiz";
const JUDGE = { name: "", pin: "", pending: [], judges: {} };
try { const j = JSON.parse(localStorage.getItem(JKEY) || "{}"); JUDGE.name = str(j.name).slice(0, 40); JUDGE.pin = str(j.pin).slice(0, 8); } catch (e) { /* segue */ }
function saveJudge() { try { localStorage.setItem(JKEY, JSON.stringify({ name: JUDGE.name, pin: JUDGE.pin })); } catch (e) { /* segue */ } }

/* ---- No NOTE: busca e executa os comandos dos juízes ---- */
let cmdLast = 0, cmdBusy = false;
function runJudgeCmd(c) {
  if (!JUDGE_ACTIONS.includes(c.fn) || typeof window[c.fn] !== "function") return { ok: false, msgs: ["Ação não permitida pelo celular."] };
  const answers = Array.isArray(c.answers) ? [...c.answers] : [], warns = [];
  const oc = window.confirm, op = window.prompt, ot = window.toast;
  // as confirmações já foram respondidas no celular; se faltar resposta, a ação é cancelada (seguro)
  window.confirm = () => answers.length ? !!answers.shift() : false;
  window.prompt = () => { if (!answers.length) return null; const v = answers.shift(); return v === null ? null : String(v); };
  window.toast = (m, type = "ok") => { if (type === "warn") warns.push(String(m)); ot(`📱 ${c.judge || "Juiz"}: ${m}`, type); };
  CMD_RUN = true; OPER_OVERRIDE = `Juiz ${c.judge || ""}`.trim();
  const rr = reviewRound;
  const exec = () => { if ([1, 2, 3].includes(c.review)) reviewRound = c.review; window[c.fn](...(Array.isArray(c.args) ? c.args : [])); };
  try {
    if (XMODE) { reviewRound = officialReviewRound; withOfficial(exec); officialReviewRound = reviewRound; reviewRound = rr; } else exec();
    return { ok: true, msgs: warns };
  } catch (e) { console.error(e); return { ok: false, msgs: [...warns, "Erro no note ao executar: " + e.message] }; }
  finally { window.confirm = oc; window.prompt = op; window.toast = ot; CMD_RUN = false; OPER_OVERRIDE = ""; }
}
async function pollCmds() {
  if (!NET.on || !NET.local || TELAO_WINDOW || JUIZ || RESETTING || cmdBusy || !officialState().settings.judgePin) return;
  cmdBusy = true;
  try {
    const j = await (await fetchT(`/api/cmd?after=${cmdLast}`, 2500)).json(), done = [];
    JUDGE.judges = j.judges || {};
    for (const c of j.cmds || []) {
      cmdLast = Math.max(cmdLast, c.id);
      done.push(j.now - c.t > 60000 ? { id: c.id, ok: false, msgs: ["Comando expirado: o note ficou mais de 1 min sem receber."] } : { id: c.id, ...runJudgeCmd(c) });
    }
    if (done.length) await fetchT("/api/cmd/done", 3000, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ done }) });
  } catch (e) { /* tenta de novo no próximo ciclo */ }
  cmdBusy = false;
}
setInterval(pollCmds, 400);

/* ---- No CELULAR do juiz ---- */
function judgeSetup() {
  document.body.classList.add("juiz-mode");
  JUDGE_ACTIONS.forEach(name => {
    const orig = window[name]; if (typeof orig !== "function") return;
    window[name] = function (...args) { return SIM ? orig.apply(this, args) : judgeAct(name, args, orig); };
  });
  if (!JUDGE_VIEWS.includes(state.view)) state.view = "arena";
  if (!NET.on) { main().innerHTML = `<div class="card stage center"><h2>📱 Modo juiz</h2><p>Abra pelo endereço do note mostrado na janela do <b>iniciar-servidor.bat</b> (ex.: <b>http://192.168.137.1:8000/#juiz</b>), com o celular na rede do note.</p></div>`; return false; }
  if (!JUDGE.pin || !JUDGE.name) judgeLogin();
  setInterval(() => { if (JUDGE.pin) fetchT("/api/juiz/login", 3000, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: JUDGE.pin, judge: JUDGE.name }) }).then(r => { if (r.status === 401) judgeLost(); }).catch(() => {}); }, 20000);
  return true;
}
function judgeLost() { JUDGE.pin = ""; saveJudge(); warn("PIN inválido ou juízes desligados no note. Entre de novo."); judgeLogin(); NET.rev = -1; }
function judgeLogin() {
  openModal(`<h2>👨‍⚖️ Entrar como juiz</h2><p class="muted small">Use o PIN definido no note (Config. → Juízes pelo celular).</p>
    <form id="jLogin"><div class="form-grid"><div><label>Seu nome</label><input name="name" maxlength="40" required value="${esc(JUDGE.name)}" placeholder="ex.: Ana"></div>
    <div><label>PIN</label><input name="pin" inputmode="numeric" maxlength="8" required value="" placeholder="PIN do note"></div></div>
    <div class="actions mt"><button class="btn primary big">Entrar</button></div></form>`);
  document.getElementById("jLogin").onsubmit = async e => {
    e.preventDefault(); const F = e.target, name = str(F.elements.name.value).slice(0, 40), pin = str(F.elements.pin.value).replace(/\D/g, "");
    if (!name || !pin) return;
    try {
      const r = await fetchT("/api/juiz/login", 4000, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin, judge: name }) });
      if (!r.ok) return fieldErr(F, "pin", r.status === 401 ? "PIN incorreto (ou juízes desligados no note)." : "O note recusou a conexão.");
      Object.assign(JUDGE, { name, pin }); saveJudge(); closeModal(); toast(`Conectado como juiz: ${name}`); render();
    } catch (err) { fieldErr(F, "pin", "Sem conexão com o note. Confira se o celular está na rede do note."); }
  };
}
// Ação do juiz: simula aqui (confirmações + efeito na tela) e manda o comando para o note
function judgeAct(fn, args, orig) {
  if (!JUDGE.pin) return judgeLogin();
  const strip = o => { const c = { ...o }; delete c.view; return JSON.stringify(c); };
  const real = state, before = strip(real), answers = [], simMsgs = [];
  const oc = window.confirm, op = window.prompt, ot = window.toast;
  window.confirm = m => { const r = oc.call(window, m); answers.push(r); return r; };
  window.prompt = (m, d) => { const r = op.call(window, m, d); answers.push(r); return r; };
  window.toast = (m, type) => { simMsgs.push(String(m)); ot(m, type); };
  state = JSON.parse(JSON.stringify(real)); SIM = true;
  try { orig(...args); } catch (e) { console.error(e); }
  finally { SIM = false; window.confirm = oc; window.prompt = op; window.toast = ot; }
  if (strip(state) === before) { const v = state.view; state = real; state.view = v; render(); return; } // cancelado ou só um aviso: nada a enviar
  judgeSendCmd(fn, args, answers, simMsgs);
}
async function judgeSendCmd(fn, args, answers, simMsgs) {
  const p = { t: Date.now(), id: null, simMsgs }; JUDGE.pending.push(p); updateNetPill();
  try {
    const r = await fetchT("/api/cmd", 4000, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: JUDGE.pin, judge: JUDGE.name, fn, args, answers, review: reviewRound }) });
    if (r.status === 401) { JUDGE.pending = JUDGE.pending.filter(x => x !== p); return judgeLost(); }
    if (!r.ok) throw new Error(r.status);
    p.id = (await r.json()).id;
  } catch (e) { JUDGE.pending = JUDGE.pending.filter(x => x !== p); NET.rev = -1; warn("Não foi possível enviar ao note. Confira a rede e tente de novo."); }
}
// Resultado dos comandos enviados (chamado antes de cada atualização do estado no celular)
async function judgeResults() {
  const ids = JUDGE.pending.filter(p => p.id).map(p => p.id);
  if (ids.length) {
    const j = await (await fetchT(`/api/cmd/res?ids=${ids.join(",")}`, 2500)).json();
    Object.entries(j.res || {}).forEach(([id, res]) => {
      const p = JUDGE.pending.find(x => x.id === Number(id)); JUDGE.pending = JUDGE.pending.filter(x => x !== p);
      (res.msgs || []).filter(m => !p?.simMsgs.includes(m)).forEach(m => warn(`Note: ${m}`));
      if (!res.ok) NET.rev = -1;
    });
  }
  const late = JUDGE.pending.filter(p => Date.now() - p.t > 8000);
  if (late.length) { JUDGE.pending = JUDGE.pending.filter(p => !late.includes(p)); NET.rev = -1; warn("O note não respondeu a uma ação. Confira se o sistema está aberto no note."); }
  updateNetPill();
}
function startUI() {
  if (TELAO_WINDOW) {
    // O Chrome/Edge tira da tela cheia uma janela aberta por outra quando se clica na janela que a abriu.
    // Cortar esse vínculo mantém o telão em tela cheia enquanto o operador usa o sistema (a sincronização não depende dele).
    try { if (window.opener) window.opener = null; } catch (e) { /* segue */ }
    window.addEventListener("storage", e => {
      if (NET.on) return;
      if (e.key === KEY) { state = load(); render(); }
      if (e.key === XKEY) { XVIEW = xFromRaw(loadExtrasStore()?.session); if (state.display.mode === "extras") render(); }
    });
    if (!NET.on) XVIEW = xFromRaw(loadExtrasStore()?.session);
    document.addEventListener("dblclick", e => { if (e.target.closest?.("#fsBtn")) return; if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); });
    document.addEventListener("fullscreenchange", updateFsBtn);
    if (NET.on) pollState();
  } else {
    // menu lateral: qualquer guia que não seja Extras sai de Extras e volta à competição oficial
    document.querySelectorAll(".nav-btn").forEach(b => b.onclick = () => { if (XMODE && b.dataset.view !== "extras") exitExtras(); nav(b.dataset.view); });
    document.getElementById("btnTelao").onclick = () => openTelaoWindow();
    document.getElementById("btnFullscreen").onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); };
    document.getElementById("netPill").onclick = () => JUIZ ? judgeLogin() : nav("telao");
    document.getElementById("tvPill").onclick = () => nav("telao");
    document.getElementById("bkPill").onclick = () => { exportData(); toast("💾 Backup (JSON) salvo na pasta Downloads"); };
    document.getElementById("modal").addEventListener("click", e => { if (e.target.id === "modal") closeModal(); });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") { closeModal(); if (document.body.classList.contains("telao-full")) exitTelao(); }
      trapModal(e);
      if (spaceTarget(e)) { e.preventDefault(); if (!e.repeat) { if (state.view === "arena" || (state.view === "extras" && state.free.current)) freeToggle(); else matchToggle(); } }
    });
    // impede que o Espaço "clique" de novo no último botão de pontuação focado
    document.addEventListener("keyup", e => { if (spaceTarget(e)) e.preventDefault(); });
    document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && document.body.classList.contains("telao-full")) exitTelao(); });
    // Mantém o telão em tela cheia (na mesma janela) atualizado a cada ação
    const _render = render;
    render = function () { _render(); refreshTelaoFull(); };
    // outra aba salvou: pega os dados, mas continua na tela em que este operador está
    window.addEventListener("storage", e => {
      if (e.key !== KEY) return;
      // em Extras: atualiza só a cópia oficial guardada (a sessão Extras não é tocada)
      if (XMODE) { const v = OFFICIAL.view; OFFICIAL = load(); OFFICIAL.view = v; updateTvPill(); return; }
      const v = state.view; state = load(); state.view = v; render();
    });
  }
  if (JUIZ) { if (judgeSetup()) { updateNetPill(); pollState(); render(); } return; } // celular do juiz: só mostra e envia comandos
  updateNetPill();
  // semifinais ainda não jogadas que foram geradas pela regra antiga (só a preliminar) passam a seguir a Classificação Geral
  // semifinais já jogadas antes desta versão: cria a disputa de 3º lugar ao abrir
  if (!TELAO_WINDOW && cfg().cupThird && semis().length === 2 && semis().every(m => winnerOf(m)) && !thirdMatch()) checkProgress();
  if (!TELAO_WINDOW && semis().length && !state.cup.matches.some(x => x.stage !== "prelim" && x.status !== "pending")) { const before = semis().map(m => m.a + m.b).join(); resyncSemis(); if (semis().map(m => m.a + m.b).join() !== before) { logEv("Semifinais refeitas pela Classificação Geral"); save(); } }
  render();
}
let lastMinute = "";
setInterval(() => { const m = nowHHMM(); if (m !== lastMinute) { const first = !lastMinute; lastMinute = m; if (!first && (state.view === "crono" || state.view === "inicio" || TELAO_WINDOW)) render(); } }, 5000);
["pointerdown", "keydown"].forEach(ev => document.addEventListener(ev, () => { getAudio(); preloadPrep(); document.getElementById("soundHint")?.classList.add("hidden"); }, { once: true }));
detectServer().finally(startUI);
