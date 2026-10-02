"use strict";
/* RoboSapiens 2026 — Robô Estoura Balão · js/07-extras.js: Extras (testes e registros fora da competição, isolados).
   Os arquivos js/01…08 são scripts comuns carregados em ordem pelo index.html e compartilham o escopo global. */
/* ============================ EXTRAS ============================ */
/* Sessões independentes de Arena Livre ou Confronto Direto para testes e registros fora da
   competição. Usam as mesmas funções do jogo oficial (callTeam, freeToggle, freeEvent, freeFinish,
   startMatch, matchToggle, matchEvent, endRound, startRound2/3, confirmResult…) e as mesmas telas
   (freeStage, livePanel, cenas do telão), mas sobre um estado próprio — ver XMODE no início do arquivo.
   Persistência: só na chave XKEY = { session, history }. Nada vai para a chave oficial, o servidor,
   a planilha, o JSON de backup ou o histórico oficial. */
const X_TEST_TEAMS = [
  { id: "x-teste-a", name: "Equipe Teste A", school: "Teste (Extras)", robot: "", professor: "", members: "" },
  { id: "x-teste-b", name: "Equipe Teste B", school: "Teste (Extras)", robot: "", professor: "", members: "" }];
const X_PURPOSE = { teste: "🧪 Teste", registro: "📝 Registro fora da competição" };
const xClone = v => JSON.parse(JSON.stringify(v));
function loadExtrasStore() { try { const j = JSON.parse(localStorage.getItem(XKEY) || "null"); return j && typeof j === "object" ? j : null; } catch (e) { return null; } }
function saveExtras() {
  if (!XMODE) return;
  try { localStorage.setItem(XKEY, JSON.stringify({ v: 1, session: state, history: XHIST })); } catch (e) { warn("Não foi possível salvar os Extras neste navegador (espaço cheio). Limpe o histórico de Extras."); }
  // telão em rede mostrando a sessão Extras: envia (em campo separado; os dados oficiais vão iguais)
  if (NET.on && NET.local && OFFICIAL?.display.mode === "extras") { clearTimeout(NET.timer); NET.timer = setTimeout(pushState, 120); }
}
/* ---- Extras no telão: só quando o operador escolhe "Sessão Extras" (nunca no automático) ---- */
let XVIEW = null, xCache = { raw: null, xs: null }; // telão: sessão recebida deste PC (localStorage) ou do servidor
function xFromRaw(raw) { try { return raw && typeof raw === "object" && raw.x ? xRestore(raw) : null; } catch (e) { return null; } }
function extrasView() {
  if (XMODE) return state;
  if (TELAO_WINDOW) return XVIEW;
  let raw = null; try { raw = localStorage.getItem(XKEY); } catch (e) { /* segue */ }
  if (raw !== xCache.raw) { xCache = { raw, xs: xFromRaw(loadExtrasStore()?.session) }; }
  return xCache.xs;
}
// o que vai para o servidor junto com o oficial: a sessão Extras só se o telão estiver em "Sessão Extras"
function xPayload() { if (officialState().display.mode !== "extras") return null; const xs = extrasView(); return xs ? JSON.parse(JSON.stringify(xs)) : null; }
// desenha com o estado da sessão (somente leitura, sem salvar)
function withXState(xs, fn) { const o = state, ox = XMODE; state = xs; XMODE = true; try { return fn(); } finally { state = o; XMODE = ox; } }
function xTimer(k) { const xs = extrasView(); if (!xs) return null; return withXState(xs, () => k === "xfree" ? state.free.current?.timer : k === "xmatch" ? liveMatch()?.timer : null); }
function sceneExtras() {
  const xs = extrasView(), tag = `<div class="tv-xtag">🧪 EXTRAS · FORA DA COMPETIÇÃO OFICIAL</div>`;
  const wait = `<div class="tv tv-idle"><img src="assets/robosapiens.png" alt="RoboSapiens" class="tv-logo"><div class="tv-title">Extras</div><div class="tv-next"><span>AGUARDANDO</span><b>Sessão Extras</b><small>fora da competição oficial</small></div></div>`;
  const html = !xs ? wait : withXState(xs, () => {
    const cur = state.free.current, live = liveMatch(), a = state.free.attempts[state.free.attempts.length - 1], m = state.cup.matches[0];
    if (cur) return sceneFree(cur);
    if (live) return sceneMatch(live);
    if (state.x?.kind === "free" && a) { const t = findTeam(a.teamId), tot = attemptTotal(a); return `<div class="tv tv-champ"><div class="tv-label">ARENA LIVRE · RESULTADO</div><div class="tv-team">${esc(t?.name)}</div><div class="tv-school">${esc(schoolText(t))}</div><div class="tv-score"><span>PONTOS</span><b class="${tot < 0 ? "minus" : ""}">${signed(tot)}</b></div></div>`; }
    if (state.x?.kind === "cup" && m && m.status === "done") return sceneMatch(m).replace("RESULTADO", m.winner === "draw" ? "RESULTADO · EMPATE" : `RESULTADO · VENCEDOR: ${esc(teamName(m.winner)).toUpperCase()}`);
    return wait;
  });
  return `<div class="tv-xwrap">${html.replace(/data-timer="free"/g, 'data-timer="xfree"').replace(/data-timer="match"/g, 'data-timer="xmatch"')}${tag}</div>`;
}
// botão em Extras: escolhe (ou tira) a sessão Extras no telão — muda só a exibição do telão
function xTvToggle() {
  if (!XMODE) return;
  const on = OFFICIAL.display.mode === "extras";
  withOfficial(() => { state.display.mode = on ? "auto" : "extras"; save(); });
  toast(on ? "Telão de volta ao automático (competição oficial)" : "Telão mostrando a sessão Extras"); render();
}
// Nova sessão em branco: CÓPIA das equipes, cores, cores sorteadas e configurações oficiais (nunca referências)
function xBlank(kind = null) {
  const o = OFFICIAL;
  const s = normalize({
    dataV: 1, colorV: 2, schedV: 3, teams: [...xClone(o.teams), ...xClone(X_TEST_TEAMS)], colors: xClone(o.colors),
    settings: { ...xClone(o.settings), freeRounds: 1, autoBackup: false },
    free: { current: null, attempts: [], draws: xClone(o.free.draws || {}) }, cup: { matches: [], liveId: null, manualOrder: [] },
    schedule: [], log: [], display: { mode: "auto", reveal: true }
  });
  s.x = { id: "x-" + uid(), kind: kind === "free" || kind === "cup" ? kind : null, purpose: "teste", note: "", startedAt: "", last: null };
  s.view = "extras";
  return s;
}
function xRestore(raw) {
  const x = raw.x && typeof raw.x === "object" ? raw.x : {};
  const s = normalize(raw);
  s.x = { id: sid(x.id) || "x-" + uid(), kind: x.kind === "free" || x.kind === "cup" ? x.kind : null, purpose: X_PURPOSE[x.purpose] ? x.purpose : "teste", note: str(x.note), startedAt: str(x.startedAt), last: sid(x.last) || null };
  s.settings.autoBackup = false; s.view = "extras";
  return s;
}
// Roda fn com o estado OFICIAL (usado só pelo tique do cronômetro oficial em segundo plano), sem redesenhar a tela
function withOfficial(fn) {
  if (!XMODE) return fn();
  const xs = state; state = OFFICIAL; XMODE = false; NO_RENDER = true;
  try { return fn(); } finally { OFFICIAL = state; state = xs; XMODE = true; NO_RENDER = false; }
}
function enterExtras() {
  if (XMODE || TELAO_WINDOW) return;
  closeModal();
  const st = loadExtrasStore();
  OFFICIAL = state; officialReviewRound = reviewRound;
  XHIST = Array.isArray(st?.history) ? st.history.filter(r => r && typeof r === "object").slice(-200) : [];
  let xs = null;
  try { if (st?.session && st.session.x) xs = xRestore(st.session); } catch (e) { xs = null; }
  XMODE = true;
  state = xs || xBlank(); reviewRound = 2;
  save(); render(); window.scrollTo({ top: 0 });
}
function exitExtras() {
  if (!XMODE) return;
  closeModal(); save();
  state = OFFICIAL; OFFICIAL = null; XMODE = false; reviewRound = officialReviewRound;
  document.body.classList.remove("x-mode");
}
const xActive = () => !!(state.free.current || state.free.attempts.length || state.cup.matches.length);
// Resultado da sessão (para o histórico de Extras); para o cronômetro da sessão
function xRecord() {
  const x = state.x, base = { id: x.id, kind: x.kind, purpose: x.purpose, note: x.note, startedAt: x.startedAt, at: new Date().toISOString() };
  if (x.kind === "free") {
    const cur = state.free.current, a = cur || state.free.attempts[state.free.attempts.length - 1]; if (!a) return null;
    if (cur) tPause(cur.timer);
    const c = l => a.events.filter(e => e.label === l).length;
    return { ...base, team: teamName(a.teamId), color: a.color?.name || "", total: attemptTotal(a), done: !cur, seconds: cfg().freeSeconds,
      result: `${cur ? "Interrompida antes de registrar" : "Registrada"} · ${signed(attemptTotal(a))} pontos`,
      detail: freeEvents().map(e => `${c(e.label)}× ${e.label}`).join(" · "), events: a.events.map(e => ({ t: e.t, label: e.label, pts: e.pts })) };
  }
  const m = state.cup.matches[0]; if (!m) return null;
  const evs = [1, 2, 3].flatMap(r => (m.rounds[r]?.events || []).map(e => ({ r, t: e.t, label: e.label, pts: e.pts, team: teamName(e.side === "a" ? m.a : m.b) })));
  if (m.status === "pending" && !evs.length) return null;
  if (m.status === "live" && m.timer.status === "running") tPause(m.timer);
  const sa = sideScore(m, "a"), sb = sideScore(m, "b"), rs = side => [1, 2, 3].filter(r => r < 3 || m.r3).map(r => sideScore(m, side, r)).join(" / ");
  const result = m.status === "done" ? (m.winner === "draw" ? "Empate" : `Vencedor: ${teamName(m.winner)}${m.byDecision ? " (decisão da comissão)" : m.r3 && koResult(m).r3 ? ` (${r3Label(m)})` : ""}`)
    : `Interrompido (${{ r1: "Round 1", break: "intervalo", r2: "Round 2", r3: "Round 3", review: "conferência" }[m.phase] || "antes de começar"}) — sem resultado confirmado`;
  return { ...base, team: `${teamName(m.a)} × ${teamName(m.b)}`, rules: m.stage === "prelim" ? "fase preliminar" : "fase eliminatória", done: m.status === "done",
    score: `${sa} × ${sb}`, result: `${sa} × ${sb} · ${result}`, detail: `Rounds: ${teamName(m.a)} ${rs("a")} · ${teamName(m.b)} ${rs("b")}`, events: evs };
}
function xFinish() {
  if (!XMODE) return;
  if (xActive() && !confirm("Finalizar esta sessão de Extras?\nO cronômetro da sessão para e o resultado vai para o histórico de Extras.\nA competição oficial não é alterada.")) return;
  closeModal();
  const rec = xActive() ? xRecord() : null;
  if (rec) XHIST.push(rec);
  state = xBlank(); state.x.last = rec ? rec.id : null; reviewRound = 2;
  save(); toast(rec ? "Sessão de Extras finalizada · resultado no histórico de Extras" : "Sessão de Extras encerrada"); render(); window.scrollTo({ top: 0 });
}
// Nova sessão: a atual (se tiver algo) é finalizada e guardada; a nova começa do zero (nada é reaproveitado)
function xNew(kind) {
  if (!XMODE) return;
  if (xActive()) {
    if (!confirm("Iniciar uma nova sessão?\nA sessão atual será finalizada e guardada no histórico de Extras.")) return;
    const rec = xRecord(); if (rec) XHIST.push(rec);
  }
  closeModal();
  state = xBlank(kind); reviewRound = 2;
  save(); render(); window.scrollTo({ top: 0 });
}
function xStart(e) {
  e.preventDefault();
  const F = e.target, x = state.x, v = n => F.elements[n]?.value;
  x.purpose = X_PURPOSE[v("purpose")] ? v("purpose") : "teste"; x.note = str(v("note")).slice(0, 200); x.startedAt = new Date().toISOString();
  const S = state.settings, clamp = (n, lo, hi, d) => Math.min(hi, Math.max(lo, Math.round(num(v(n), d))));
  if (x.kind === "free") {
    const teamId = v("team"), color = state.colors.find(c => c.id === v("color"));
    if (!findTeam(teamId) || !color) return warn("Escolha a equipe e a cor.");
    S.freeSeconds = clamp("secs", 5, 600, S.freeSeconds);
    state.free.attempts = []; state.free.draws[teamId] = snap(color);
    if (state.free.current) return warn("Já há uma tentativa nesta sessão.");
    callTeam(teamId, 1);
  } else {
    const a = v("a"), b = v("b");
    if (!findTeam(a) || !findTeam(b) || a === b) return warn("Escolha duas equipes diferentes.");
    S.cupR1 = clamp("r1", 5, 900, S.cupR1); S.cupBreak = clamp("brk", 0, 900, S.cupBreak); S.cupR2 = clamp("r2", 5, 900, S.cupR2); S.cupR3 = clamp("r3", 5, 900, S.cupR3);
    S.koR3 = ["off", "sudden", "points"].includes(v("koR3")) ? v("koR3") : "off";
    state.cup.matches = [emptyMatch(v("rules") === "ko" ? "semi" : "prelim", 1, a, b)]; state.cup.liveId = null;
    startMatch(state.cup.matches[0].id);
  }
}
function xSetupForm() {
  const x = state.x, S = state.settings, tOpts = sel => sortedTeams().map(t => `<option value="${esc(t.id)}" ${t.id === sel ? "selected" : ""}>${esc(t.number ? pad2(t.number) + " · " : "")}${esc(t.name)}</option>`).join("");
  const common = `<div><label>Finalidade</label><select name="purpose">${Object.entries(X_PURPOSE).map(([k, l]) => `<option value="${k}" ${x.purpose === k ? "selected" : ""}>${l}</option>`).join("")}</select></div>
    <div><label>Observação (opcional)</label><input name="note" maxlength="200" value="${esc(x.note)}" placeholder="ex.: teste do bipe, partida extra da equipe X"></div>`;
  if (x.kind === "free") {
    const opts = sortedColors().map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
    return `<form id="xSetup" class="card"><h2>🎈 Nova sessão · Arena Livre</h2><div class="form-grid">${common}
      <div><label>Equipe</label><select name="team" onchange="const c=state.free.draws[this.value];if(c)this.form.color.value=c.id">${`<option value="" selected disabled>Escolha…</option>` + tOpts("")}</select></div>
      <div><label>Cor dos balões da equipe</label><select name="color">${opts}</select></div>
      <div><label>Tempo da tentativa (s)</label><input name="secs" type="number" min="5" max="600" value="${S.freeSeconds}"></div></div>
      <p class="muted small mt-s">Pontuação, bipes e "Preparar" iguais aos da competição (${esc(rulesFree())}). A cor já vem com a sorteada da equipe, se houver.</p>
      <div class="actions mt"><button class="btn primary big">📣 Chamar para a arena (sessão Extras)</button><button type="button" class="btn big" onclick="xNew(null)">← Voltar</button></div></form>`;
  }
  return `<form id="xSetup" class="card"><h2>⚔️ Nova sessão · Confronto Direto</h2><div class="form-grid">${common}
    <div><label>Equipe A</label><select name="a"><option value="" selected disabled>Escolha…</option>${tOpts("")}</select></div>
    <div><label>Equipe B</label><select name="b"><option value="" selected disabled>Escolha…</option>${tOpts("")}</select></div>
    <div class="full"><label>Regras do confronto</label><select name="rules"><option value="prelim">Como na fase preliminar (pode terminar empatado)</option><option value="ko">Como na fase eliminatória (empate → desempate abaixo)</option></select></div>
    <div class="full"><label>Empate na fase eliminatória</label><select name="koR3"><option value="points" ${S.koR3 === "points" ? "selected" : ""}>Round 3 igual ao Round 2 (por pontuação)</option><option value="sudden" ${S.koR3 === "sudden" ? "selected" : ""}>Round 3 morte súbita</option><option value="off" ${S.koR3 === "off" ? "selected" : ""}>Decisão da comissão</option></select></div>
    <div><label>Round 1 (s)</label><input name="r1" type="number" min="5" max="900" value="${S.cupR1}"></div><div><label>Intervalo (s)</label><input name="brk" type="number" min="0" max="900" value="${S.cupBreak}"></div>
    <div><label>Round 2 (s)</label><input name="r2" type="number" min="5" max="900" value="${S.cupR2}"></div><div><label>Round 3 morte súbita (s)</label><input name="r3" type="number" min="5" max="900" value="${S.cupR3}"></div></div>
    <p class="muted small mt-s">Tempos iniciais = configuração da competição (mudar aqui vale só para esta sessão). Pontuação e bipes iguais aos oficiais (${esc(rulesCup())}).</p>
    <div class="actions mt"><button class="btn primary big">▶ Chamar e iniciar confronto (sessão Extras)</button><button type="button" class="btn big" onclick="xNew(null)">← Voltar</button></div></form>`;
}
function xRecordHtml(r, open = false) {
  return `<details class="x-rec" ${open ? "open" : ""}><summary><b>${r.kind === "free" ? "🎈 Arena Livre" : "⚔️ Confronto Direto"}</b> · ${esc(r.team)} · <b>${esc(r.result)}</b> <span class="muted small">· ${esc(X_PURPOSE[r.purpose] || "")} · ${esc(fmtDate(r.at))}</span></summary>
    <div class="small mt-s">${r.note ? `<p>📝 ${esc(r.note)}</p>` : ""}<p>${esc(r.detail || "")}${r.kind === "free" ? ` · cor ${esc(r.color)} · ${r.seconds} s` : ` · regras da ${esc(r.rules)}`}</p>
    <div class="log">${(r.events || []).map(e => `<div class="log-item"><span>${e.r ? `R${e.r} · ` : ""}${esc(e.t)} · ${e.team ? `<b>${esc(e.team)}</b> · ` : ""}${esc(e.label)}</span><b>${signed(e.pts)}</b></div>`).join("") || `<div class="muted small">Nenhuma marcação.</div>`}</div></div></details>`;
}
const xTvBtn = () => OFFICIAL?.display.mode === "extras" ? `<button class="btn primary" onclick="xTvToggle()" title="O telão está mostrando esta sessão. Clique para voltar ao automático (competição oficial).">📺 No telão · voltar ao automático</button>` : `<button class="btn" onclick="xTvToggle()" title="Mostrar esta sessão Extras no telão (só quando você escolher; o automático nunca mostra Extras)">📺 Mostrar no telão</button>`;
function xClearHistory() {
  if (!XHIST.length || !confirm(`Apagar os ${XHIST.length} registros do histórico de Extras?\nA competição oficial não é afetada.`)) return;
  XHIST = []; save(); render();
}
function extras() {
  if (!XMODE) return enterExtras();
  const x = state.x, cur = state.free.current, m = state.cup.matches[0], live = liveMatch(), O = OFFICIAL;
  const offLive = O.free.current ? `Arena Livre — ${esc(O.teams.find(t => t.id === O.free.current.teamId)?.name || "")}` : (() => { const lm = O.cup.matches.find(mm => mm.id === O.cup.liveId && mm.status === "live"); return lm ? "Confronto Direto em andamento" : ""; })();
  const banner = `<div class="x-banner"><b>🧪 MODO EXTRAS — NÃO É RODADA OFICIAL</b><span>Nada feito aqui altera a competição: placar, resultados, classificação, histórico, rodada atual e cronômetros oficiais ficam intactos.</span></div>
    ${!x.kind && OFFICIAL.display.mode === "extras" ? `<div class="notice mb">📺 O telão está em <b>Sessão Extras</b> (aguardando uma sessão). ${xTvBtn()}</div>` : ""}
    ${offLive ? `<div class="notice warn mb">⚠️ Há uma atividade OFICIAL em andamento (${offLive}). Ela continua normalmente em segundo plano (cronômetro e bipes); para operá-la, volte à guia dela.</div>` : ""}`;
  const ctrl = x.kind ? `<div class="x-ctrl"><span class="pill">${x.kind === "free" ? "🎈 Arena Livre" : "⚔️ Confronto Direto"} · ${X_PURPOSE[x.purpose]}${x.note ? ` · ${esc(x.note)}` : ""}</span><span class="grow"></span>${xTvBtn()}<button class="btn" onclick="xNew(null)">🆕 Nova sessão</button><button class="btn warning" onclick="xFinish()">🏁 Finalizar sessão</button></div>` : "";
  let body = "";
  if (!x.kind) {
    const last = x.last && XHIST.find(r => r.id === x.last);
    body = `${last ? `<div class="card mb"><h2>✓ Resultado da sessão finalizada</h2>${xRecordHtml(last, true)}</div>` : ""}
      <div class="grid g2"><button class="card x-pick" onclick="xNew('free')"><span>🎈</span><b>Arena Livre</b><small>Uma equipe, cronômetro da tentativa, "Preparar", bipes e marcações como na competição.</small></button>
        <button class="card x-pick cup" onclick="xNew('cup')"><span>⚔️</span><b>Confronto Direto</b><small>Duas equipes, Round 1, intervalo, Round 2 (e Round 3 de desempate), bipes e marcações como na competição.</small></button></div>`;
  } else if (x.kind === "free") {
    const a = state.free.attempts[state.free.attempts.length - 1];
    body = cur ? freeStage(cur) : a ? `<div class="card stage center"><div class="big-check">✓</div><h2>Tentativa registrada (Extras)</h2><div class="stage-team">${esc(teamName(a.teamId))}</div><div class="stage-score"><span>PONTOS</span><b class="${attemptTotal(a) < 0 ? "minus" : ""}">${signed(attemptTotal(a))}</b></div><p class="muted">Clique em <b>🏁 Finalizar sessão</b> para guardar no histórico de Extras ou em <b>🆕 Nova sessão</b>.</p></div>` : xSetupForm();
  } else {
    body = live ? livePanel(live) : m && m.status === "done" ? `<div class="card stage center"><div class="big-check">✓</div><h2>Resultado confirmado (Extras)</h2><div class="versus"><div class="vs-team">${teamCell(findTeam(m.a))}<div class="pts">${sideScore(m, "a")}</div></div><div class="vs">×</div><div class="vs-team">${teamCell(findTeam(m.b))}<div class="pts">${sideScore(m, "b")}</div></div></div><p><b>${m.winner === "draw" ? "Empate" : `Vencedor: ${esc(teamName(m.winner))}`}</b></p><p class="muted">Clique em <b>🏁 Finalizar sessão</b> para guardar no histórico de Extras ou em <b>🆕 Nova sessão</b>.</p></div>`
      : m ? `<div class="card stage center"><h2>Confronto cancelado</h2><div class="versus"><div class="vs-team">${teamCell(findTeam(m.a))}</div><div class="vs">×</div><div class="vs-team">${teamCell(findTeam(m.b))}</div></div><button class="btn primary huge" onclick="startMatch('${esc(m.id)}')">▶ Iniciar de novo</button></div>` : xSetupForm();
  }
  const preview = (cur || live) ? `<details class="card mt" open><summary class="muted">📺 Prévia do telão para esta sessão (${OFFICIAL.display.mode === "extras" ? "o telão está mostrando esta sessão" : "só nesta tela — o telão continua na competição oficial; use 📺 Mostrar no telão"})</summary><div class="tv-preview mt-s"><div class="tv-frame">${telaoScene()}</div></div></details>` : "";
  const hist = `<details class="card mt fold" ${!x.kind && XHIST.length ? "open" : ""}><summary><b>🗂️ Histórico de Extras</b> <span class="muted small">(${XHIST.length}) — separado do histórico oficial</span></summary>
    <div class="mt-s">${XHIST.slice().reverse().slice(0, 100).map(r => xRecordHtml(r)).join("") || `<div class="muted small">Nenhuma sessão finalizada ainda.</div>`}</div>
    ${XHIST.length ? `<div class="actions mt-s"><button class="btn small danger" onclick="xClearHistory()">🗑 Limpar histórico de Extras</button></div>` : ""}</details>`;
  main().innerHTML = head("Extras", "Testes e registros fora da competição oficial · mesmos cronômetros, bipes, regras e controles do jogo") + banner + ctrl + body + preview + hist;
  document.getElementById("xSetup")?.addEventListener("submit", xStart);
}
