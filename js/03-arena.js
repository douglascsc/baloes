"use strict";
/* RoboSapiens 2026 — Robô Estoura Balão · js/03-arena.js: Etapa 1 — Arena Livre (lógica e tela).
   Os arquivos js/01…08 são scripts comuns carregados em ordem pelo index.html e compartilham o escopo global. */
/* ============================ ARENA LIVRE: LÓGICA ============================ */
function attemptTotal(a) {
  const t = (a.events || []).reduce((s, e) => s + e.pts, 0);
  return state.settings.freeMinZero ? Math.max(0, t) : t;
}
function attemptOf(teamId, round) { return state.free.attempts.find(a => a.teamId === teamId && a.round === round) || null; }
function freeQueue() {
  const R = state.settings.freeRounds, list = [];
  for (let r = 1; r <= R; r++) sortedTeams().filter(t => !t.disq).forEach(t => {
    const att = attemptOf(t.id, r), cur = state.free.current;
    list.push({ teamId: t.id, round: r, attempt: att, current: !!(cur && cur.teamId === t.id && cur.round === r) });
  });
  return list;
}
function nextFree() { return freeQueue().find(q => !q.attempt && !q.current) || null; }
function freeSummary() {
  const total = activeTeams().length * state.settings.freeRounds;
  const done = state.free.attempts.filter(a => a.round <= state.settings.freeRounds && findTeam(a.teamId) && !isDisq(a.teamId)).length;
  return { total, done };
}
function currentFreeRound() { const q = freeQueue().find(x => !x.attempt); return q ? q.round : state.settings.freeRounds; }
/* Sorteio das cores: feito uma vez, ANTES de chamar as equipes. Cada
   equipe recebe uma cor diferente (quando há cores suficientes), que vale
   para todas as rodadas da Arena Livre. */
const snap = c => c ? { id: c.id, number: c.number, name: c.name, hex: c.hex } : null;
function drawOf(teamId) { return state.free.draws?.[teamId] || null; }
function allDrawn() { return teams().length > 0 && teams().every(t => drawOf(t.id)); }
function drawColors() {
  if (!state.colors.length) { warn("Cadastre as cores antes."); return nav("cores"); }
  if (!teams().length) return warn("Cadastre as equipes antes.");
  if (state.free.current) return warn("Há uma equipe na arena. Registre ou cancele a tentativa antes.");
  const started = state.free.attempts.length > 0, has = teams().some(t => drawOf(t.id));
  if (has && !confirm(`Sortear novamente as cores de todas as equipes?${started ? "\n\nAs tentativas já registradas mantêm a cor com que foram disputadas; a nova cor vale para as próximas rodadas." : ""}`)) return;
  if (teams().length > state.colors.length) toast(`Há mais equipes (${teams().length}) que cores (${state.colors.length}): algumas cores vão se repetir.`);
  let pool = [];
  while (pool.length < teams().length) pool = pool.concat(shuffle(state.colors));
  state.free.draws = {};
  sortedTeams().forEach((t, i) => { state.free.draws[t.id] = snap(pool[i]); });
  startDrawAnim("cores", sortedTeams().map(t => t.id));
  logEv(`Cores sorteadas: ${sortedTeams().map(t => `${t.name} = ${state.free.draws[t.id].name}`).join(", ")}`);
  save(); toast(teams().length > state.colors.length ? `Cores sorteadas (${state.colors.length} cores para ${teams().length} equipes: algumas se repetem)` : "Cores sorteadas — valem para todas as rodadas"); render();
}
function drawMissing() {
  if (!state.colors.length) { warn("Cadastre as cores antes."); return nav("cores"); }
  const used = new Set(Object.values(state.free.draws).map(c => c.id));
  const free = shuffle(state.colors.filter(c => !used.has(c.id)));
  startDrawAnim("cores", sortedTeams().filter(t => !drawOf(t.id)).map(t => t.id));
  sortedTeams().filter(t => !drawOf(t.id)).forEach((t, i) => { state.free.draws[t.id] = snap(free[i] || state.colors[Math.floor(Math.random() * state.colors.length)]); });
  save(); toast("Cores sorteadas para as equipes sem cor"); render();
}
function setDrawColor(teamId, colorId) {
  const c = state.colors.find(x => x.id === colorId); if (!c) return;
  const other = teams().find(t => t.id !== teamId && drawOf(t.id)?.id === c.id);
  if (other && !confirm(`A cor ${c.name} já é de ${other.name}. Usar mesmo assim?`)) return render();
  state.free.draws[teamId] = snap(c); logEv(`Cor de ${teamName(teamId)} alterada para ${c.name}`); save(); toast("Cor alterada"); render();
}
function teamColorsCard(inArena = false) {
  const has = teams().some(t => drawOf(t.id)), missing = has && !allDrawn();
  if (inArena && !has) return "";
  const rows = sortedTeams().map(t => { const c = drawOf(t.id); return `<div class="q-row">${c ? `<span class="q-color" title="Cor ${esc(c.name)}" style="--c:${esc(c.hex)};--t:${textOn(c.hex)}">${numIn(t)}</span>` : `<span class="q-color none" title="Cor não sorteada">${numIn(t) || "?"}</span>`}${teamCell(t)}${c ? `<select class="mini-select" onchange="setDrawColor('${esc(t.id)}',this.value)" aria-label="Cor de ${esc(t.name)}">${sortedColors().map(x => `<option value="${esc(x.id)}" ${x.id === c.id ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select>` : `<span class="chip wait">sem cor</span>`}</div>`; }).join("");
  return `<div class="card"><div class="card-head"><h2>🎨 Cores das equipes (Arena Livre)</h2>
    <span class="actions"><button class="btn small ghost" onclick="showOnTv('cores')">📺 Mostrar no telão</button>${has ? `<button class="btn small ghost" onclick="drawColors()">↻ Sortear de novo</button>` : ""}</span></div>
    <p class="muted small">Sorteio único antes de chamar as equipes. A cor vale para todas as rodadas.</p>
    ${has ? "" : `<button class="btn primary big mt-s" onclick="drawColors()">🎲 Sortear cores das equipes</button>`}
    ${missing ? `<div class="notice warn mt-s">Há equipe sem cor. <button class="btn tiny" onclick="drawMissing()">Sortear para quem falta</button></div>` : ""}
    <div class="mt-s">${rows}</div></div>`;
}
function callTeam(teamId, round) {
  if (state.free.current) return warn("Já existe uma equipe na arena. Registre ou cancele a tentativa atual.");
  if (liveMatch()) return warn("Há um Confronto Direto em andamento. Finalize-o antes.");
  if (!state.colors.length) { warn("Cadastre as cores antes."); return nav("cores"); }
  if (attemptOf(teamId, round)) return warn("Essa tentativa já foi registrada.");
  const color = drawOf(teamId);
  if (!color) return warn("Sorteie as cores das equipes antes de chamar para a arena.");
  const cr = currentFreeRound();
  if (round > cr && !confirm(`A Rodada ${cr} ainda não terminou.\nChamar ${teamName(teamId)} para a Rodada ${round} mesmo assim?`)) return;
  state.free.current = { id: uid(), teamId, round, color, events: [], repeats: [], timer: newTimer(state.settings.freeSeconds) };
  leaveDrawScreen();
  logEv(`Arena Livre: ${teamName(teamId)} chamada para a Rodada ${round} (cor ${color.name})`);
  save(); render();
}
function callNext() { const n = nextFree(); if (!n) return warn("Todas as tentativas já foram realizadas."); callTeam(n.teamId, n.round); }
function freeToggle() {
  const t = state.free.current?.timer; if (!t) return;
  if (t.status === "running") tPause(t); else if (t.status !== "over") { tStartFresh(t); countdownBeep(t, "free"); }
  save(); render();
}
function freeEvent(i) {
  const cur = state.free.current, ev = freeEvents()[i]; if (!cur || !ev) return;
  if (cur.timer.status === "idle") return warn("Inicie o cronômetro antes de marcar pontos.");
  if (inPrep(cur.timer)) return warn("Aguarde o bipe de início.");
  cur.events.push({ id: uid(), pts: ev.pts, label: ev.label, t: elapsed(cur.timer), seq: Date.now() });
  save(); render();
}
function freeUndo() {
  const cur = state.free.current; if (!cur || !cur.events.length) return warn("Nenhuma marcação para desfazer.");
  const e = cur.events.pop(); save(); toast(`Desfeito: ${signed(e.pts)} ${e.label}`); render();
}
function freeRemoveEvent(id) {
  const cur = state.free.current; if (!cur) return;
  cur.events = cur.events.filter(e => e.id !== id); save(); render();
}
function freeFinish() {
  const cur = state.free.current; if (!cur) return;
  if (cur.timer.status === "idle") return warn("A tentativa ainda não começou.");
  const total = attemptTotal(cur);
  if (!confirm(`Registrar o resultado de ${teamName(cur.teamId)} na Rodada ${cur.round}?\n\nPontuação: ${signed(total)}`)) return;
  state.free.attempts.push({ id: cur.id, teamId: cur.teamId, round: cur.round, color: cur.color, events: cur.events, repeats: cur.repeats || [], at: new Date().toISOString() });
  const c = l => cur.events.filter(e => e.label === l).length;
  logEv(`Arena Livre: ${teamName(cur.teamId)} — Rodada ${cur.round} registrada: ${signed(total)} (${c("Balão de outra cor")} de outra cor, ${c("Balão da própria cor")} da própria cor, ${c("Saiu da arena")} saída(s))`);
  state.free.current = null; save(); toast("Resultado registrado"); render();
  const fs = freeSummary();
  if (fs.total && fs.done >= fs.total) { autoBackup("apos-arena-livre", "Arena Livre concluída"); checkProgress(); render(); }
}
// Ausência na chamada (5.7.5): tentativa registrada com 0 ponto
function freeWO() {
  const cur = state.free.current; if (!cur) return;
  if (cur.timer.status !== "idle") return warn("A tentativa já começou: registre o resultado normalmente.");
  const reason = prompt(`${teamName(cur.teamId)} AUSENTE (W.O.) na Rodada ${cur.round}?\nA tentativa será registrada com 0 ponto.\n\nMotivo / observação:`, "equipe não se apresentou");
  if (reason === null) return;
  state.free.attempts.push({ id: cur.id, teamId: cur.teamId, round: cur.round, color: cur.color, events: [], repeats: cur.repeats || [], at: new Date().toISOString(), wo: { reason: str(reason) } });
  logEv(`Arena Livre: ${teamName(cur.teamId)} — Rodada ${cur.round}: ausente (W.O.), 0 ponto${str(reason) ? `. Motivo: ${str(reason)}` : ""}`);
  state.free.current = null; save(); toast("Ausência registrada (0 ponto)"); render();
  const fs = freeSummary();
  if (fs.total && fs.done >= fs.total) { autoBackup("apos-arena-livre", "Arena Livre concluída"); checkProgress(); render(); }
}
function freeCancel() {
  const cur = state.free.current; if (!cur) return;
  if ((cur.events.length || cur.timer.status !== "idle") && !confirm("Cancelar esta tentativa? As marcações dela serão descartadas e a equipe volta para a fila.")) return;
  logEv(`Arena Livre: tentativa de ${teamName(cur.teamId)} (Rodada ${cur.round}) cancelada — equipe voltou para a fila`);
  state.free.current = null; save(); render();
}
// Falha técnica: zera as marcações e o cronômetro da tentativa atual, registrando o motivo
function freeRepeat() {
  const cur = state.free.current; if (!cur) return;
  const reason = prompt(`Repetir a tentativa de ${teamName(cur.teamId)} (Rodada ${cur.round}) por falha técnica.\nAs marcações e o cronômetro serão zerados.\n\nMotivo:`, "");
  if (reason === null) return;
  const why = str(reason) || "não informado";
  cur.repeats = [...(cur.repeats || []), { at: new Date().toISOString(), reason: why }];
  logEv(`Arena Livre: tentativa de ${teamName(cur.teamId)} (Rodada ${cur.round}) repetida por falha técnica — marcações descartadas: ${signed(attemptTotal(cur))}. Motivo: ${why}`);
  cur.events = []; cur.timer = newTimer(state.settings.freeSeconds);
  save(); toast("Tentativa zerada para repetição"); render();
}
// Campos obrigatórios das correções: motivo e quem está corrigindo (o nome fica salvo neste PC)
const fixFields = () => `<div class="form-grid mt-s"><div><label>Motivo da correção (obrigatório)</label><input name="fixWhy" maxlength="200" required placeholder="ex.: súmula assinada mostra 3 balões"></div>
  <div><label>Operador (quem está corrigindo)</label><input name="fixBy" maxlength="60" required value="${esc(operator())}" placeholder="seu nome"></div></div>`;
function fixRead(F) {
  const why = str(F.elements.fixWhy.value), by = str(F.elements.fixBy.value);
  if (!why) { fieldErr(F, "fixWhy", "Informe o motivo da correção."); return null; }
  if (!by) { fieldErr(F, "fixBy", "Informe quem está corrigindo."); return null; }
  setOperator(by); return why;
}
// Corrige uma tentativa já registrada: o operador informa as quantidades certas de cada marcação
function freeEdit(id) {
  const a = state.free.attempts.find(x => x.id === id); if (!a) return;
  const evs = freeEvents(), cnt = l => a.events.filter(e => e.label === l).length;
  openModal(`<h2>Corrigir tentativa</h2><p class="muted">${esc(teamName(a.teamId))} · Rodada ${a.round} · atual: <b>${signed(attemptTotal(a))}</b></p>
    <form id="freeEditF"><div class="form-grid">${evs.map((e, i) => `<div><label>${e.icon} ${esc(e.label)} (${e.short})</label><input name="e${i}" type="number" min="0" max="99" value="${cnt(e.label)}"></div>`).join("")}</div>
    <p class="mt-s">Nova pontuação: <b id="freeEditTot"></b></p>${fixFields()}
    <div class="actions mt"><button class="btn primary big">Salvar correção</button><button type="button" class="btn big" onclick="closeModal()">Cancelar</button></div></form>`);
  const F = document.getElementById("freeEditF");
  const counts = () => evs.map((_, i) => Math.max(0, Math.min(99, Math.round(num(F.elements["e" + i].value, 0)))));
  const build = () => {
    const out = [];
    evs.forEach((e, i) => {
      const keep = a.events.filter(x => x.label === e.label).slice(0, counts()[i]);
      while (keep.length < counts()[i]) keep.push({ id: uid(), pts: e.pts, label: e.label, t: "correção", seq: Date.now() + keep.length });
      out.push(...keep);
    });
    return out.sort((x, y) => x.seq - y.seq);
  };
  const upd = () => { document.getElementById("freeEditTot").textContent = signed(attemptTotal({ ...a, events: build() })); };
  F.oninput = upd; upd();
  F.onsubmit = ev => {
    ev.preventDefault(); const why = fixRead(F); if (why === null) return; const before = attemptTotal(a);
    a.events = build(); if (a.events.length) delete a.wo;
    logEv(`Arena Livre: tentativa de ${teamName(a.teamId)} (Rodada ${a.round}) corrigida: ${signed(before)} → ${signed(attemptTotal(a))}. Motivo: ${why}`);
    resyncSemis();
    save(); closeModal(); toast("Tentativa corrigida"); render();
  };
}
// A Classificação Geral mudou (correção na Arena): se as semifinais ainda não foram jogadas, refaz com os novos 4 primeiros
function resyncSemis() {
  const [s1, s2] = semis(); if (!s1 || !s2) return;
  const sd = seeds(); if (s1.a === sd[0] && s1.b === sd[3] && s2.a === sd[1] && s2.b === sd[2]) return;
  if (state.cup.matches.some(x => x.stage !== "prelim" && x.status !== "pending")) return warn("A Classificação Geral mudou, mas as semifinais já começaram: confira os confrontos com a Comissão.");
  state.cup.matches = state.cup.matches.filter(x => x.stage === "prelim"); checkProgress(); toast("Classificação Geral mudou: semifinais refeitas");
}
function freeVoid(id) {
  const a = state.free.attempts.find(x => x.id === id); if (!a) return;
  const reason = prompt(`Anular a tentativa de ${teamName(a.teamId)} na Rodada ${a.round} (${signed(attemptTotal(a))})?\nA equipe volta para a fila dessa rodada.\n\nMotivo (ex.: falha técnica):`, "");
  if (reason === null) return;
  if (!str(reason)) return warn("Informe o motivo para anular a tentativa.");
  logEv(`Arena Livre: tentativa de ${teamName(a.teamId)} (Rodada ${a.round}, ${signed(attemptTotal(a))}) anulada. Motivo: ${str(reason)}`);
  state.free.attempts = state.free.attempts.filter(x => x.id !== id); save(); toast("Tentativa anulada"); render();
}
function roundComplete(r) { return activeTeams().length > 0 && activeTeams().every(t => attemptOf(t.id, r)); }
function lastCompleteRound() { let r = 0; while (r < 5 && roundComplete(r + 1)) r++; return r; }
function closeArena() {
  const r = lastCompleteRound();
  if (!r) return warn("Nenhuma rodada foi concluída ainda.");
  if (state.free.current) return warn("Há uma equipe na arena. Registre ou cancele a tentativa antes.");
  const extra = state.free.attempts.filter(a => a.round > r).length;
  if (!confirm(`Encerrar a Arena Livre com ${r} rodada${r > 1 ? "s" : ""}?${extra ? `\n\n${extra} tentativa(s) da Rodada ${r + 1} ficarão fora da classificação (não são apagadas).` : ""}\n\nDá para reabrir depois, se necessário.`)) return;
  state.settings.freeRounds = r;
  logEv(`Arena Livre encerrada com ${r} rodada(s)`);
  checkProgress(); save(); render();
  autoBackup("apos-arena-livre", "Arena Livre concluída");
}
function reopenArena() {
  const n = Math.min(5, state.settings.freeRounds + 1);
  if (n === state.settings.freeRounds) return;
  if (!confirm(`Reabrir a Arena Livre para a Rodada ${n}?`)) return;
  state.settings.freeRounds = n; logEv(`Arena Livre reaberta: agora com ${n} rodada(s)`); save(); render();
}
function freeRanking() {
  const R = state.settings.freeRounds;
  return sortedTeams().filter(t => !t.disq).map(t => {
    const scores = []; for (let r = 1; r <= R; r++) { const a = attemptOf(t.id, r); scores.push(a ? attemptTotal(a) : null); }
    const vals = scores.filter(v => v !== null);
    const sum = vals.reduce((s, v) => s + v, 0), best = vals.length ? Math.max(...vals) : 0;
    return { team: t, scores, done: vals.length, sum, best, total: state.settings.freeRankMode === "melhor" ? best : sum };
  }).sort((a, b) => b.total - a.total || b.best - a.best || b.sum - a.sum || byNum(a.team, b.team));
}

/* ============================ TELA: ARENA LIVRE ============================ */
function arena() {
  const cur = state.free.current, fs = freeSummary(), R = state.settings.freeRounds;
  main().innerHTML = head("Arena Livre", `Uma equipe por vez · ${R} rodada${R > 1 ? "s" : ""} · ${state.settings.freeSeconds} s por tentativa · arena 2,70 × 2,70 m · <b>${fs.done}/${fs.total} tentativas</b>`,
    `<button class="btn" onclick="openTelaoWindow()">📺 Abrir telão</button>`, "arena", !!cur) +
    `<div class="arena-layout">
      <div>${cur ? freeStage(cur) : freeIdle()}</div>
      <div>${freeQueueCard()}<div class="mt">${teamColorsCard(true)}</div></div>
    </div>
    ${freeRankingCard()}`;
}
function freeIdle() {
  const n = nextFree(), fs = freeSummary();
  if (!teams().length) return `<div class="card stage"><div class="empty">Cadastre as equipes para começar.</div></div>`;
  if (!state.colors.length) return `<div class="card stage"><div class="notice warn">Nenhuma cor cadastrada. <button class="btn small" onclick="nav('cores')">Cadastrar cores</button></div></div>`;
  if (!n) return `<div class="card stage center"><div class="big-check">✓</div><h2>Arena Livre concluída</h2><p class="muted">${state.settings.freeRounds} rodada${state.settings.freeRounds > 1 ? "s" : ""} · ${fs.done} tentativas registradas. Veja a classificação abaixo.</p>
    <div class="actions center-actions mt"><button class="btn primary huge" onclick="nav('confrontos')">⚔️ Ir para o Confronto Direto</button></div>
    ${state.settings.freeRounds < 5 ? `<p class="mt-s"><button class="btn small ghost" onclick="reopenArena()">↺ Reabrir para a Rodada ${state.settings.freeRounds + 1}</button></p>` : ""}</div>`;
  // Rodada concluída: escolher entre continuar ou encerrar a Arena Livre
  const prevDone = n.round > 1 && roundComplete(n.round - 1) && !state.free.attempts.some(a => a.round === n.round);
  const choice = prevDone ? `<div class="card round-done mb"><div><b>✓ Rodada ${n.round - 1} concluída.</b> Continuar para a Rodada ${n.round} ou encerrar a Arena Livre aqui?</div>
    <div class="actions"><button class="btn primary" onclick="document.getElementById('callBtn')?.focus()">▶ Continuar para a Rodada ${n.round}</button><button class="btn" onclick="closeArena()">🏁 Encerrar a Arena Livre com ${n.round - 1} rodada${n.round - 1 > 1 ? "s" : ""}</button></div></div>` : "";
  const t = findTeam(n.teamId), c = drawOf(n.teamId);
  if (!c) return `<div class="card stage center">
    <div class="eyebrow">PASSO 1 DE 2</div>
    <h2>Sorteio das cores</h2>
    <p class="muted">Antes de chamar as equipes, sorteie a cor de cada equipe. A cor vale para todas as rodadas.<br>Os balões da cor sorteada são da própria equipe (−${cfg().freeOwn} se estourar).</p>
    ${teams().some(x => drawOf(x.id)) ? `<button class="btn primary huge mt" onclick="drawMissing()">🎲 Sortear cor para quem falta</button>` : `<button class="btn primary huge mt" onclick="drawColors()">🎲 Sortear cores das equipes</button>`}
  </div>`;
  return `${choice}<div class="card stage center">
    <div class="eyebrow">PRÓXIMA NA ARENA · RODADA ${n.round} DE ${state.settings.freeRounds} · PASSO 2 DE 2</div>
    <div class="stage-team">${esc(t.name)}</div><div class="stage-school">${esc(schoolText(t))}</div>
    <div class="stage-color center-flex"><span class="muted small">COR SORTEADA DA EQUIPE</span>${colorChip(c, true)}
      </div>
    <button class="btn primary huge mt" id="callBtn" onclick="callNext()">📣 Chamar para a arena</button>
    ${!prevDone && lastCompleteRound() >= 1 ? `<p class="mt-s"><button class="btn small ghost" onclick="closeArena()">🏁 Encerrar a Arena Livre com ${lastCompleteRound()} rodada${lastCompleteRound() > 1 ? "s" : ""}</button></p>` : ""}
  </div>`;
}
function freeStage(cur) {
  const t = findTeam(cur.teamId), tm = cur.timer, total = attemptTotal(cur);
  const toggle = tm.status === "running" ? `❚❚ Pausar` : tm.status === "paused" ? `▶ Retomar` : `▶ Iniciar ${state.settings.freeSeconds} s`;
  const statusTxt = inPrep(tm) ? "PREPARAR…" : { idle: "PRONTA PARA INICIAR", running: "EM ANDAMENTO", paused: "PAUSADA", over: "TEMPO ESGOTADO" }[tm.status];
  return `<div class="card stage live-${tm.status}">
    <div class="stage-top"><span class="pill">RODADA ${cur.round} DE ${state.settings.freeRounds}</span><span class="pill">${teamNo(t)}</span></div>
    <div class="stage-team">${esc(t.name)}</div><div class="stage-school">${esc(schoolText(t))}</div>
    <div class="stage-color"><span class="muted small">COR DA EQUIPE (própria)</span>${colorChip(cur.color, true)}</div>
    <div class="stage-mid">
      <div><div class="timer" data-timer="free">${fmt(left(tm))}</div>${adjBtns("free", tm)}<div class="status-txt s-${tm.status}">${tm.status === "running" ? '<i class="dot-live"></i>' : ""}${statusTxt}</div></div>
      <div class="stage-score"><span>PONTOS</span><b class="${total < 0 ? "minus" : ""}">${signed(total)}</b></div>
    </div>
    <div class="score-btns">${freeEvents().map((e, i) => `<button class="btn score ${e.cls}" onclick="freeEvent(${i})" ${tm.status === "idle" || inPrep(tm) ? "disabled" : ""}><b>${e.short}</b><span>${e.icon} ${e.label}</span></button>`).join("")}</div>
    ${tm.status === "idle" ? `<p class="hint">Inicie o cronômetro para liberar a pontuação. <kbd>Espaço</kbd> inicia/pausa.</p>` : ""}
    <div class="ctrl-row">
      <button class="btn ${tm.status === "running" ? "" : "primary"} big grow" onclick="freeToggle()" ${tm.status === "over" ? "disabled" : ""}>${toggle}</button>
      <button class="btn big" onclick="freeUndo()" ${cur.events.length ? "" : "disabled"}>↶ Desfazer última</button>
      <button class="btn warning big grow" onclick="freeFinish()" ${tm.status === "idle" ? "disabled" : ""}>✓ Registrar resultado</button>
    </div>
    <div class="log">${cur.events.slice().reverse().map(e => `<div class="log-item"><span>${esc(e.t)} · ${esc(e.label)}</span><b class="${e.pts >= 0 ? "plus" : "minus"}">${signed(e.pts)}</b><button class="x" title="Remover esta marcação" aria-label="Remover esta marcação" onclick="freeRemoveEvent('${esc(e.id)}')">✕</button></div>`).join("") || `<div class="muted small">Nenhuma marcação ainda.</div>`}</div>
    <div class="right">${tm.status === "idle" && !XMODE ? `<button class="btn small ghost" onclick="freeWO()">🚫 Ausente (W.O.)</button>` : ""}<button class="btn small ghost" onclick="freeRepeat()">🔁 Repetir tentativa (falha técnica)</button><button class="btn small ghost" onclick="freeCancel()">✕ Cancelar tentativa</button></div>
  </div>`;
}
function freeQueueCard() {
  const R = state.settings.freeRounds, q = freeQueue(), cur = state.free.current, next = nextFree(), cr = currentFreeRound();
  let html = "";
  for (let r = 1; r <= R; r++) {
    const items = q.filter(x => x.round === r), done = items.filter(x => x.attempt).length;
    const rows = items.map(x => {
      const t = findTeam(x.teamId);
      let chip, act = "";
      if (x.current) chip = `<span class="chip live">● Em arena</span>`;
      else if (x.attempt) { chip = x.attempt.wo ? `<span class="chip out">W.O. (ausente)</span>` : `<span class="chip done">✓ ${reveal ? signed(attemptTotal(x.attempt)) : "Jogou"}</span>`; act = `<button class="btn tiny" onclick="freeEdit('${esc(x.attempt.id)}')" title="Corrigir esta tentativa" aria-label="Corrigir a tentativa de ${esc(t?.name)} na Rodada ${r}">✏️</button>`; }
      else {
        chip = next && next.teamId === x.teamId && next.round === r ? `<span class="chip next">Próxima</span>` : `<span class="chip wait">Na fila</span>`;
        if (!cur && drawOf(x.teamId)) act = `<button class="btn tiny" onclick="callTeam('${esc(x.teamId)}',${r})">Chamar</button>`;
      }
      const dc = x.attempt ? x.attempt.color : x.current ? state.free.current.color : drawOf(x.teamId);
      return `<div class="q-row ${x.current ? "is-live" : ""}">${dc ? `<span class="q-color" title="Cor ${esc(dc.name)}" style="--c:${esc(dc.hex)};--t:${textOn(dc.hex)}">${numIn(t)}</span>` : `<span class="q-color none" title="Cor não sorteada">${numIn(t) || "?"}</span>`}${teamCell(t)}${chip}${act}</div>`;
    }).join("");
    html += `<details class="q-round" ${r === cr ? "open" : ""}><summary><b>Rodada ${r}</b><span class="muted">${done}/${items.length}</span></summary>${rows || `<div class="muted small">Sem equipes.</div>`}</details>`;
  }
  return `<div class="card"><h2>Fila da Arena Livre</h2>${html}</div>`;
}
function freeRankingCard() {
  const R = state.settings.freeRounds, rk = freeRanking();
  const rows = (reveal ? rk : [...rk].sort((a, b) => byNum(a.team, b.team))).map((x, i) => `<tr>
      ${reveal ? `<td class="pos">${i + 1}º</td>` : ""}<td>${teamCell(x.team)}</td>
      ${x.scores.map(v => `<td class="num">${v === null ? `<span class="muted">—</span>` : hide(signed(v), v < 0 ? "minus" : "")}</td>`).join("")}
      <td class="num total">${x.done ? hide(signed(x.total), x.total < 0 ? "minus" : "") : `<span class="muted">—</span>`}</td></tr>`).join("");
  const hist = [...state.free.attempts].sort((a, b) => str(b.at).localeCompare(str(a.at))).map(a => `<div class="log-item"><span><b>${esc(teamName(a.teamId, "Equipe removida"))}</b> · Rodada ${a.round} · ${colorChip(a.color)}</span><b>${hide(signed(attemptTotal(a)))}</b><button class="btn tiny" onclick="freeEdit('${esc(a.id)}')">✏️ Corrigir</button><button class="btn tiny danger" onclick="freeVoid('${esc(a.id)}')">Anular</button></div>`).join("");
  return `<div class="card mt"><div class="card-head"><h2>🏆 Classificação da Arena Livre</h2>${eyeBtn()}</div>
    ${reveal ? "" : `<p class="muted small">Pontuação oculta — equipes listadas pela numeração. Clique no 👁️ para revelar.</p>`}
    <div class="table-wrap"><table class="table" aria-label="Classificação da Arena Livre"><thead><tr>${reveal ? "<th>Pos.</th>" : ""}<th>Equipe</th>${Array.from({ length: R }, (_, i) => `<th class="num">R${i + 1}</th>`).join("")}<th class="num">${state.settings.freeRankMode === "melhor" ? "Melhor" : "Total"}</th></tr></thead><tbody>${rows || `<tr><td colspan="${R + (reveal ? 3 : 2)}">Nenhuma equipe cadastrada.</td></tr>`}</tbody></table></div>
    <details class="mt-s"><summary class="muted">✏️ Histórico de tentativas — corrigir ou anular (${state.free.attempts.length})</summary><div class="log">${hist || `<div class="muted small">Nenhuma tentativa registrada.</div>`}</div></details>
  </div>`;
}
