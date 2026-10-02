"use strict";
/* RoboSapiens 2026 — Robô Estoura Balão · js/04-confronto.js: Etapa 2 — Confronto Direto (lógica, W.O., correções e tela).
   Os arquivos js/01…08 são scripts comuns carregados em ordem pelo index.html e compartilham o escopo global. */
/* ============================ CONFRONTOS: LÓGICA ============================ */
const STAGE_ORDER = { prelim: 0, semi: 1, third: 2, final: 3 }; // a disputa de 3º lugar acontece antes da final
const matches = () => [...state.cup.matches].sort((a, b) => STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage] || a.order - b.order);
const prelims = () => matches().filter(m => m.stage === "prelim");
const semis = () => matches().filter(m => m.stage === "semi");
const finalMatch = () => state.cup.matches.find(m => m.stage === "final") || null;
const thirdMatch = () => state.cup.matches.find(m => m.stage === "third") || null;
const liveMatch = () => state.cup.matches.find(m => m.id === state.cup.liveId && m.status === "live") || null;
const nextMatch = () => matches().find(m => m.status === "pending") || null;
function matchLabel(m) {
  if (XMODE) return `EXTRAS · ${m.stage === "prelim" ? "regras da fase preliminar" : "regras da fase eliminatória"}`;
  if (m.stage === "prelim") return `Fase preliminar · Confronto ${m.order} de ${prelims().length}`;
  if (m.stage === "semi") return `Semifinal ${m.order} · ${m.order === 1 ? "1º × 4º" : "2º × 3º"}`;
  if (m.stage === "third") return "DISPUTA DE 3º LUGAR";
  return "FINAL";
}
function sideScore(m, side, round) {
  const rs = round ? [round] : [1, 2, 3];
  return rs.reduce((s, r) => s + (m.rounds[r]?.events || []).filter(e => e.side === side).reduce((x, e) => x + e.pts, 0), 0);
}
function cupSummary() {
  const ms = state.cup.matches, done = ms.filter(m => m.status === "done").length;
  const n = prelims().length, total = n ? n + 3 + (cfg().cupThird || thirdMatch() ? 1 : 0) : 0;
  let stageText = "fase preliminar";
  if (finalMatch()) stageText = finalMatch().status === "done" ? "encerrado" : "final";
  else if (thirdMatch()) stageText = "disputa de 3º lugar";
  else if (semis().length) stageText = "semifinais";
  else if (!n) stageText = "não gerados";
  return { done, total, stageText };
}

/* Gera a fase preliminar: cada equipe joga exatamente k vezes (2 ou 4), sem
   repetir confrontos (cada equipe enfrenta as vizinhas na numeração do sorteio,
   a 1 e a 2 posições de distância), ordenado para que nenhuma equipe jogue
   dois confrontos seguidos e os jogos de cada equipe fiquem espaçados. */
// 2, 4 ou 6 jogos por equipe (N, 2N ou 3N confrontos). Cada equipe precisa ter adversárias suficientes: k ≤ N − 1.
// 0 = todos contra todos (N − 1 jogos por equipe)
const gamesPerTeam = n => { if (cfg().cupGames === 0) return Math.max(1, n - 1); let k = cfg().cupGames; while (k > 2 && k > n - 1) k -= 2; return k; };
function buildPrelimPairs(ids, k = 2) {
  const n = ids.length, edges = [];
  if (k >= n - 1) { for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) edges.push([ids[i], ids[j]]); } // todos contra todos
  else for (let d = 1; d <= k / 2; d++) for (let i = 0; i < n; i++) edges.push([ids[i], ids[(i + d) % n]]);
  let order = [];
  if (k === 2 && k < n - 1) { for (let s = 0; s < 2; s++) for (let i = s; i < n; i += 2) order.push(edges[i]); }
  else order = greedyOrder(edges);
  if (conflicts(order) === 0) return order;
  const best = searchOrder(edges);
  return best && conflicts(best) < conflicts(order) ? best : order;
}
// Escolhe sempre o confronto cujas equipes estão há mais tempo sem jogar
function greedyOrder(edges) {
  const rest = new Map(), left = [...edges], out = [];
  edges.flat().forEach(t => rest.set(t, -99));
  while (left.length) {
    const step = out.length, prev = out[step - 1] || [];
    let bi = 0, bs = Infinity;
    left.forEach((e, i) => {
      const sc = (e.some(t => prev.includes(t)) ? 1000 : 0) - Math.min(step - rest.get(e[0]), step - rest.get(e[1])) * 10 - (step - rest.get(e[0]) + step - rest.get(e[1]));
      if (sc < bs) { bs = sc; bi = i; }
    });
    const e = left.splice(bi, 1)[0]; out.push(e); e.forEach(t => rest.set(t, step));
  }
  return out;
}
function conflicts(list) {
  let c = 0;
  for (let i = 1; i < list.length; i++) if (list[i].some(x => list[i - 1].includes(x))) c++;
  return c;
}
function searchOrder(edges) {
  const n = edges.length, used = Array(n).fill(false), path = [];
  let steps = 0;
  const dfs = () => {
    if (path.length === n) return true;
    if (++steps > 200000) return false;
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      const last = path[path.length - 1];
      if (last && edges[i].some(x => last.includes(x))) continue;
      used[i] = true; path.push(edges[i]);
      if (dfs()) return true;
      used[i] = false; path.pop();
    }
    return false;
  };
  return dfs() ? path : null;
}
function emptyMatch(stage, order, a, b) {
  return { id: uid(), stage, order, a, b, status: "pending", phase: "r1", timer: newTimer(cfg().cupR1), rounds: { 1: { events: [] }, 2: { events: [] }, 3: { events: [] } }, winner: null, pick: null, byDecision: false };
}
function generatePrelim() {
  const list = sortedTeams().filter(t => !t.disq);
  if (list.length < 4) return warn("São necessárias pelo menos 4 equipes.");
  if (list.some(t => !t.number) && !confirm("Há equipes sem numeração (Equipe XX).\nRecomendado: sortear a numeração antes (tela Equipes).\n\nGerar mesmo assim? A ordem seguirá a ordem alfabética das equipes sem número.")) return;
  if (state.cup.matches.length && !confirm("Gerar a fase preliminar novamente?\n\nTODOS os confrontos e resultados (incluindo semifinais e final) serão apagados.")) return;
  const k = gamesPerTeam(list.length);
  const reduced = cfg().cupGames && k !== cfg().cupGames ? ` Com ${list.length} equipes não é possível cada uma jogar ${cfg().cupGames} vezes sem repetir adversário: foram usados ${k} jogos por equipe.` : "";
  const pairs = buildPrelimPairs(list.map(t => t.id), k);
  state.cup = { matches: pairs.map((p, i) => emptyMatch("prelim", i + 1, p[0], p[1])), liveId: null, manualOrder: [] };
  logEv(`Fase preliminar gerada: ${pairs.length} confrontos, ${k} por equipe (${pairs.map(p => `${teamName(p[0])} × ${teamName(p[1])}`).join("; ")})`);
  save(); reduced ? warn(`${pairs.length} confrontos gerados.${reduced}`) : toast(`${pairs.length} confrontos gerados`); render();
}

/* ---- Classificação da fase preliminar ---- */
function prelimStats() {
  const ids = new Set(); prelims().forEach(m => { ids.add(m.a); ids.add(m.b); });
  const map = {};
  [...ids].forEach(id => { map[id] = { team: findTeam(id), J: 0, V: 0, E: 0, D: 0, PM: 0, PS: 0, SG: 0, total: prelims().filter(m => m.a === id || m.b === id).length }; });
  prelims().filter(m => m.status === "done").forEach(m => {
    const sa = sideScore(m, "a"), sb = sideScore(m, "b"), A = map[m.a], B = map[m.b], o = outcome(m);
    A.J++; B.J++; A.PM += sa; A.PS += sb; B.PM += sb; B.PS += sa;
    if (o === "a") { A.V++; B.D++; }
    else if (o === "b") { B.V++; A.D++; }
    else { A.E++; B.E++; }
  });
  // Saldo (definido pela organização) = soma dos pontos marcados pela equipe nos confrontos (não desconta os sofridos)
  Object.values(map).forEach(s => { s.SG = s.PM; });
  return Object.values(map).filter(s => s.team && !s.team.disq);
}
// quem venceu a partida: pelo placar; no W.O. (abandono/desclassificação) vale o vencedor registrado
function outcome(m) {
  if (m.wo && m.winner) return m.winner === "draw" ? "draw" : m.winner === m.a ? "a" : "b";
  const sa = sideScore(m, "a"), sb = sideScore(m, "b"); return sa > sb ? "a" : sb > sa ? "b" : "draw";
}
function critValue(key, s, group) {
  if (key === "direto") {
    const g = new Set(group.map(x => x.team.id)); let p = 0;
    prelims().filter(m => m.status === "done" && g.has(m.a) && g.has(m.b) && (m.a === s.team.id || m.b === s.team.id)).forEach(m => {
      const mine = m.a === s.team.id ? "a" : "b", other = mine === "a" ? "b" : "a";
      if (outcome(m) === mine) p++; // vitórias nos jogos entre as equipes empatadas
    });
    return p;
  }
  if (key === "saldo") return s.SG;
  if (key === "pro") return s.PM;
  if (key === "vitorias") return s.V;
  if (key === "arena") return freeRanking().find(r => r.team.id === s.team.id)?.total || 0;
  if (key === "sorteio") return -numKey(s.team);
  return 0;
}
function splitBy(group, crits) {
  if (group.length <= 1) return [{ list: group, tied: false }];
  if (!crits.length) return [{ list: group, tied: true }];
  const [c, ...rest] = crits;
  const vals = new Map(group.map(s => [s, critValue(c, s, group)]));
  const sorted = [...group].sort((a, b) => vals.get(b) - vals.get(a));
  const parts = [];
  sorted.forEach(s => { const last = parts[parts.length - 1]; if (last && vals.get(last[0]) === vals.get(s)) last.push(s); else parts.push([s]); });
  return parts.flatMap(p => splitBy(p, rest));
}
function standings() {
  const stats = prelimStats();
  const crits = state.settings.tiebreak.filter(x => x.on).map(x => x.key);
  // critério principal: saldo = pontos marcados nos confrontos; os demais só desempatam
  const bySG = [...stats].sort((a, b) => b.SG - a.SG);
  const groups = [];
  bySG.forEach(s => { const g = groups[groups.length - 1]; if (g && g[0].SG === s.SG) g.push(s); else groups.push([s]); });
  const mo = state.cup.manualOrder, rows = [];
  groups.flatMap(g => splitBy(g, crits)).forEach(part => {
    let list = [...part.list].sort((a, b) => byNum(a.team, b.team)), tied = part.tied, manual = false;
    if (tied && list.every(s => mo.includes(s.team.id))) { list.sort((a, b) => mo.indexOf(a.team.id) - mo.indexOf(b.team.id)); tied = false; manual = true; }
    const gid = list.map(s => s.team.id).join("|");
    list.forEach(s => rows.push({ ...s, tied, manual, gid, groupSize: list.length }));
  });
  rows.forEach((r, i) => { r.pos = i + 1; });
  return rows;
}
function prelimDone() { const p = prelims(); return p.length > 0 && p.every(m => m.status === "done"); }
function blockingTie(rows) { return rows.some(r => r.tied && r.pos <= 4); }
function moveInTie(id, dir) {
  const rows = standings(), i = rows.findIndex(r => r.team.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= rows.length || rows[i].gid !== rows[j].gid) return;
  const ids = rows.map(r => r.team.id);[ids[i], ids[j]] = [ids[j], ids[i]];
  state.cup.manualOrder = ids; save(); render();
}
function confirmTieOrder(gid) {
  const rows = standings(); state.cup.manualOrder = rows.map(r => r.team.id);
  logEv(`Desempate definido pela comissão: ${rows.map((r, i) => `${i + 1}º ${r.team.name}`).join(", ")}`);
  save(); toast("Ordem definida pela Comissão Organizadora"); checkProgress(); render();
}
function clearManualOrder() {
  if (!confirm("Remover as decisões manuais de desempate?")) return;
  state.cup.manualOrder = []; save(); render();
}

/* ---- Avanço automático de fase ---- */
function loserOf(m) { const w = winnerOf(m); return w ? (w === m.a ? m.b : m.a) : null; }
function winnerOf(m) { return m && m.status === "done" && m.winner && m.winner !== "draw" ? m.winner : null; }
// Semifinais: os 4 primeiros da CLASSIFICAÇÃO GERAL = Arena Livre + saldo da fase preliminar
// (desempate: mais pontos no Confronto, depois na Arena Livre, depois a numeração do sorteio)
function seedRanking() {
  const pre = new Map(standings().map(r => [r.team.id, r.SG])), fr = freeRanking();
  return sortedTeams().filter(t => pre.has(t.id) && !t.disq).map(t => { const arena = fr.find(r => r.team.id === t.id)?.total || 0, cup = pre.get(t.id); return { team: t, arena, cup, total: arena + cup }; })
    .sort((a, b) => b.total - a.total || b.cup - a.cup || b.arena - a.arena || byNum(a.team, b.team));
}
// Config. "Fase eliminatória": chaveamento pela Classificação Geral (Arena + saldo da preliminar) ou só pelo saldo da preliminar
const seedByCup = () => cfg().koSeed === "cup";
const seedTxt = (short = false) => seedByCup() ? (short ? "Confronto Direto (só o saldo da preliminar)" : "classificação do Confronto Direto — só o saldo da fase preliminar (a Arena Livre não conta)") : (short ? "Arena Livre + saldo da preliminar" : "Classificação Geral — Arena Livre + saldo da fase preliminar do Confronto Direto");
const seedPh = () => seedByCup() ? "do Confronto" : "da Geral";
function seedOrder() { return seedByCup() ? standings().map(r => r.team.id) : seedRanking().map(r => r.team.id); }
function seeds() { return seedOrder().slice(0, 4); }
function checkProgress() {
  if (prelimDone() && !semis().length) {
    const rows = standings();
    if (rows.length < 4) return;
    const fs = freeSummary();
    if (seedByCup()) { if (blockingTie(rows)) { save(); return; } }
    else if (fs.done < fs.total) { warn(`Fase preliminar concluída. As semifinais usam a Classificação Geral: termine a Arena Livre (${fs.done}/${fs.total} tentativas) para gerá-las.`); return; }
    const s = seeds();
    state.cup.matches.push(emptyMatch("semi", 1, s[0], s[3]), emptyMatch("semi", 2, s[1], s[2]));
    toast(`Semifinais geradas (${seedTxt(true)}): 1º × 4º e 2º × 3º`);
    logEv(`Semifinais geradas (${seedTxt(true)}): ${teamName(s[0])} × ${teamName(s[3])}; ${teamName(s[1])} × ${teamName(s[2])}`);
  }
  const [s1, s2] = semis();
  if (s1 && s2 && winnerOf(s1) && winnerOf(s2) && !thirdMatch() && cfg().cupThird) {
    state.cup.matches.push(emptyMatch("third", 1, loserOf(s1), loserOf(s2)));
    logEv(`Disputa de 3º lugar gerada: ${teamName(loserOf(s1))} × ${teamName(loserOf(s2))}`);
  }
  if (s1 && s2 && winnerOf(s1) && winnerOf(s2) && !finalMatch()) {
    state.cup.matches.push(emptyMatch("final", 1, winnerOf(s1), winnerOf(s2)));
    toast(thirdMatch() ? "Disputa de 3º lugar e final geradas" : "Final gerada"); logEv(`Final gerada: ${teamName(winnerOf(s1))} × ${teamName(winnerOf(s2))}`);
  }
  save();
}
function champion() { const f = finalMatch(); return winnerOf(f) ? findTeam(f.winner) : null; }
/* Colocações do Confronto Direto: 1º e 2º pela final; 3º e 4º pela disputa de 3º lugar ou, sem ela,
   pela melhor posição na classificação usada no chaveamento das semifinais */
function cupPlaces() {
  const f = finalMatch(), th = thirdMatch(), [s1, s2] = semis();
  const p = [winnerOf(f), loserOf(f), null, null];
  if (th) { p[2] = winnerOf(th); p[3] = loserOf(th); }
  else if (s1 && s2 && winnerOf(s1) && winnerOf(s2)) {
    const ord = seedOrder(), ls = [loserOf(s1), loserOf(s2)].sort((x, y) => ord.indexOf(x) - ord.indexOf(y));
    if (f && f.status === "done") { p[2] = ls[0]; p[3] = ls[1]; }
  }
  return p;
}
/* Fase eliminatória: quem vence. R1+R2 empatados → Round 3 de desempate (se ligado, sem repor balões):
   morte súbita (vence quem tirar o adversário da arena ou estourar os balões que restam dele) ou pela pontuação do Round 3.
   Ainda empatado (ou sem Round 3): decisão da comissão. */
function koResult(m) {
  const a = sideScore(m, "a", 1) + sideScore(m, "a", 2), b = sideScore(m, "b", 1) + sideScore(m, "b", 2);
  if (a !== b) return { winner: a > b ? m.a : m.b };
  if (m.r3 === "sudden" && m.r3Winner) return { winner: m.r3Winner, r3: true };
  if (m.r3 === "points") { const a3 = sideScore(m, "a", 3), b3 = sideScore(m, "b", 3); if (a3 !== b3) return { winner: a3 > b3 ? m.a : m.b, r3: true }; }
  return { winner: null, needR3: !m.r3 && cfg().koR3 !== "off" };
}
const R3_NAME = { sudden: "morte súbita", points: "por pontuação" };
// tempo do Round 3: igual ao Round 2 (por pontuação) ou o tempo próprio da morte súbita
const r3Secs = mode => (mode || cfg().koR3) === "sudden" ? cfg().cupR3 : cfg().cupR2;
const R3_DESC = { points: "Round 3 igual ao Round 2 (por pontuação)", sudden: "Round 3 morte súbita", off: "decisão da comissão" };
const r3Label = m => `Round 3 · ${R3_NAME[m?.r3 || cfg().koR3] || "desempate"}`;

/* ---- Condução do confronto ---- */
function startMatch(id) {
  const m = state.cup.matches.find(x => x.id === id); if (!m) return;
  if (liveMatch()) return warn("Já existe um confronto em andamento.");
  if (state.free.current) return warn("Há uma equipe na Arena Livre. Registre ou cancele a tentativa antes.");
  if (m.status !== "pending") return;
  leaveDrawScreen();
  Object.assign(m, { status: "live", phase: "r1", timer: newTimer(cfg().cupR1), rounds: { 1: { events: [] }, 2: { events: [] }, 3: { events: [] } }, winner: null, pick: null, byDecision: false, r3: undefined, r3Winner: undefined, toR3: false, wo: undefined });
  state.cup.liveId = m.id; logEv(`${matchLabel(m)} iniciado: ${teamName(m.a)} × ${teamName(m.b)}`); save(); nav("confrontos");
}
function matchToggle() {
  const m = liveMatch(); if (!m || m.phase === "review") return;
  const t = m.timer;
  if (t.status === "running") tPause(t); else if (t.status !== "over") { if (m.phase === "break") tStart(t); else { tStartFresh(t); countdownBeep(t, "cup", m.phase); } }
  save(); render();
}
const LIVE_PH = ["r1", "r2", "r3"];
const phRound = ph => ({ r1: 1, r2: 2, r3: 3 })[ph] || null;
const playedRounds = m => m.r3 || m.rounds[3]?.events.length ? [1, 2, 3] : [1, 2];
function endRound() {
  const m = liveMatch(); if (!m || !LIVE_PH.includes(m.phase)) return;
  const r = phRound(m.phase);
  if (m.timer.status === "idle") return warn(`O Round ${r} ainda não começou.`);
  if (!confirm(r === 1 ? "Encerrar o Round 1 e iniciar o intervalo?" : `Encerrar o Round ${r}?`)) return;
  closeRound(m, "");
  save(); render();
}
// Encerra o round atual (manual, tempo ou regra 5.1.2.1 b/c) e passa ao intervalo ou à conferência
function closeRound(m, why, endMatch = false) {
  const r = phRound(m.phase);
  logEv(`${matchLabel(m)} — ${endMatch && r === 1 ? "Confronto encerrado no Round 1" : `Round ${r} encerrado`}${why ? ` (${why})` : ""}: ${teamName(m.a)} ${sideScore(m, "a", r)} × ${sideScore(m, "b", r)} ${teamName(m.b)}`);
  if (r === 1 && !endMatch) { m.phase = "break"; m.timer = newTimer(cfg().cupBreak); if (cfg().cupBreak > 0) tStart(m.timer); else m.timer.status = "over"; }
  else { m.phase = "review"; m.timer = newTimer(0); m.timer.status = "over"; reviewRound = r; }
}
/* Cada robô tem N balões (padrão 2) no confronto inteiro: não são repostos entre os rounds.
   Balões de um robô acabaram: o confronto termina (sem Round 2, se for no Round 1).
   Robô saiu da arena (5.1.2.1 c): +30 ao adversário e só o round termina; o Round 2 acontece normalmente. */
const isBalloonEv = e => e.label === matchEvents()[0].label;
const isExitEv = e => e.label === matchEvents()[1].label;
// balões do adversário que "side" já estourou (no round r, ou no confronto todo)
const poppedBy = (m, side, r) => (r ? [r] : [1, 2, 3]).reduce((n, k) => n + (m.rounds[k]?.events || []).filter(e => e.side === side && isBalloonEv(e)).length, 0);
function autoCloseRound(m, side, ev) {
  const r = phRound(m.phase), loser = teamName(side === "a" ? m.b : m.a);
  const why = isExitEv(ev) ? `${loser} saiu da arena` : `os ${cfg().cupBalloons} balões de ${loser} foram estourados`;
  if (m.timer.status === "running") tPause(m.timer);
  const exit = isExitEv(ev), endMatch = !exit;
  m.autoEnd = { round: r, eventId: ev.id, remaining: left(m.timer), duration: m.timer.duration, exit };
  if (r === 3 && m.r3 === "sudden") m.r3Winner = side === "a" ? m.a : m.b; // morte súbita: decidiu
  closeRound(m, why, endMatch);
  const what = r === 3 ? (m.r3 === "sudden" ? `Morte súbita: ${teamName(m.r3Winner)} vence` : "Round 3 encerrado") : endMatch ? `Confronto encerrado${r === 1 ? " no Round 1 (sem Round 2)" : ""}` : r === 1 ? "Round 1 encerrado (segue para o intervalo e o Round 2)" : "Round 2 encerrado";
  warn(`${what}: ${why}. Se foi engano, use ↶ Desfazer para reabrir o round.`);
}
// Desfez/removeu a marcação que encerrou o confronto sozinho: volta ao round, pausado no tempo em que parou
function maybeReopenRound(m, removedId) {
  const a = m.autoEnd; if (!a || a.eventId !== removedId) return false;
  m.autoEnd = undefined;
  if (m.phase !== (a.round === 1 && a.exit ? "break" : "review")) return false;
  m.phase = "r" + a.round;
  if (a.round === 3) m.r3Winner = undefined;
  m.timer = { status: a.remaining > 0 ? "paused" : "over", duration: a.duration, remaining: a.remaining, endsAt: 0 };
  logEv(`${matchLabel(m)} — Round ${a.round} reaberto (marcação que encerrou o round foi desfeita)`);
  return true;
}
function startRound2() {
  const m = liveMatch(); if (!m || m.phase !== "break") return;
  if (m.toR3) { m.toR3 = false; m.phase = "r3"; m.timer = newTimer(r3Secs(m.r3)); save(); render(); return; } // intervalo antes do Round 3
  m.phase = "r2"; m.timer = newTimer(cfg().cupR2); save(); render();
}
// Empate na fase eliminatória: intervalo e Round 3 de desempate, com os balões que sobraram (não são repostos)
function startRound3() {
  const m = liveMatch(); if (!m || m.phase !== "review" || m.stage === "prelim" || m.r3 || !koResult(m).needR3) return;
  m.r3 = cfg().koR3; m.r3Winner = undefined; m.pick = null; m.autoEnd = undefined;
  m.phase = "break"; m.toR3 = true; m.timer = newTimer(cfg().cupBreak); if (cfg().cupBreak > 0) tStart(m.timer); else m.timer.status = "over";
  logEv(`${matchLabel(m)} — empate: intervalo e Round 3 de desempate (${R3_NAME[m.r3]})`);
  save(); render();
}
// Falha técnica: repete o round atual (zera as marcações e o cronômetro dele), registrando o motivo
function repeatRound() {
  const m = liveMatch(); if (!m || !LIVE_PH.includes(m.phase)) return;
  const r = phRound(m.phase);
  const reason = prompt(`Repetir o Round ${r} (${teamName(m.a)} × ${teamName(m.b)}) por falha técnica.\nAs marcações deste round e o cronômetro serão zerados.\n\nMotivo:`, "");
  if (reason === null) return;
  const why = str(reason) || "não informado";
  logEv(`${matchLabel(m)} — Round ${r} repetido por falha técnica (descartado: ${sideScore(m, "a", r)} × ${sideScore(m, "b", r)}). Motivo: ${why}`);
  m.repeats = [...(m.repeats || []), { at: new Date().toISOString(), round: r, reason: why }];
  m.rounds[r].events = []; m.timer = newTimer(r === 1 ? cfg().cupR1 : r === 2 ? cfg().cupR2 : r3Secs(m.r3));
  if (r === 3) m.r3Winner = undefined;
  save(); toast(`Round ${r} zerado para repetição`); render();
}
function activeRound(m) { return phRound(m.phase) || (m.phase === "review" ? (reviewRound === 3 && !m.r3 ? 2 : reviewRound) : null); }
function matchEvent(side, i) {
  const m = liveMatch(), ev = matchEvents()[i]; if (!m || !ev) return;
  const r = activeRound(m);
  if (!r) return warn("Intervalo: registro de pontos fechado. Use ↶ Desfazer para corrigir.");
  const live = LIVE_PH.includes(m.phase);
  if (live && m.timer.status === "idle") return warn("Inicie o round antes de marcar pontos.");
  if (live && inPrep(m.timer)) return warn("Aguarde o bipe de início.");
  const N = cfg().cupBalloons;
  if (i === 0 && poppedBy(m, side) >= N) return warn(`${teamName(side === "a" ? m.b : m.a)} só tem ${N} ${N > 1 ? "balões" : "balão"} no confronto: todos já foram estourados.`);
  const e = { id: uid(), side, pts: ev.pts, label: ev.label, t: m.phase === "review" ? "correção" : elapsed(m.timer), seq: Date.now() };
  m.rounds[r].events.push(e);
  if (live && (isExitEv(e) || poppedBy(m, side) >= N)) autoCloseRound(m, side, e);
  save(); render();
}
function matchUndo(side) {
  const m = liveMatch(); if (!m) return;
  let best = null;
  [1, 2, 3].forEach(r => (m.rounds[r]?.events || []).forEach((e, idx) => { if (e.side === side && (!best || e.seq >= best.e.seq)) best = { r, idx, e }; }));
  if (!best) return warn(`Nenhuma marcação de ${teamName(side === "a" ? m.a : m.b)} para desfazer.`);
  m.rounds[best.r].events.splice(best.idx, 1);
  const reopened = maybeReopenRound(m, best.e.id);
  save(); toast(`Desfeito: ${signed(best.e.pts)} de ${teamName(side === "a" ? m.a : m.b)}${reopened ? ` · Round ${best.r} reaberto (pausado)` : ""}`); render();
}
function matchRemoveEvent(r, id) {
  const m = liveMatch(); if (!m) return;
  m.rounds[r].events = m.rounds[r].events.filter(e => e.id !== id);
  if (maybeReopenRound(m, id)) toast(`Round ${r} reaberto (pausado)`);
  save(); render();
}
function setReviewRound(r) { reviewRound = r; render(); }
function pickWinner(id) { const m = liveMatch(); if (!m) return; m.pick = id; save(); render(); }
function confirmResult() {
  const m = liveMatch(); if (!m || m.phase !== "review") return;
  const sa = sideScore(m, "a"), sb = sideScore(m, "b");
  let winner = sa > sb ? m.a : sb > sa ? m.b : "draw", byDecision = false, viaR3 = false;
  if (m.stage !== "prelim") {
    const kr = koResult(m);
    if (kr.winner) { winner = kr.winner; viaR3 = !!kr.r3; }
    else if (kr.needR3) return warn("Empate na fase eliminatória: jogue o Round 3 de desempate (botão ▶ Jogar o Round 3).");
    else if (!m.pick) return warn("Empate em fase eliminatória: selecione o vencedor definido pela comissão.");
    else { winner = m.pick; byDecision = true; }
  }
  const txt = winner === "draw" ? "EMPATE" : `Vencedor: ${teamName(winner)}${byDecision ? " (decisão da comissão)" : viaR3 ? ` (${r3Label(m)})` : ""}`;
  // Se o confronto for uma correção, verificar impacto nas fases seguintes
  const ko = state.cup.matches.filter(x => x.stage !== "prelim");
  if (m.stage === "prelim" && ko.length) {
    const prev = { status: m.status, winner: m.winner };
    m.status = "done"; m.winner = winner;
    const s = seeds(), rows = standings(); const [s1, s2] = semis();
    const same = s1 && s2 && s1.a === s[0] && s1.b === s[3] && s2.a === s[1] && s2.b === s[2];
    m.status = prev.status; m.winner = prev.winner;
    if (!same) {
      if (!confirm(`${txt}\n\nCom essa correção a classificação muda: semifinais e final serão apagadas e geradas novamente. Continuar?`)) return;
      state.cup.matches = state.cup.matches.filter(x => x.stage === "prelim");
    } else if (!confirm(`${sa} × ${sb}\n${txt}\n\nConfirmar resultado?`)) return;
  } else if (m.stage === "semi" && finalMatch() && finalMatch().id !== m.id) {
    const other = semis().find(x => x.id !== m.id), f = finalMatch();
    const expect = m.order === 1 ? [winner, winnerOf(other)] : [winnerOf(other), winner];
    if (f.a !== expect[0] || f.b !== expect[1]) {
      if (!confirm(`${txt}\n\nO vencedor mudou: a disputa de 3º lugar e a final serão apagadas e geradas novamente. Continuar?`)) return;
      state.cup.matches = state.cup.matches.filter(x => x.stage !== "final" && x.stage !== "third");
    } else if (!confirm(`${sa} × ${sb}\n${txt}\n\nConfirmar resultado?`)) return;
  } else if (!confirm(`${teamName(m.a)} ${sa} × ${sb} ${teamName(m.b)}\n${txt}\n\nConfirmar resultado?`)) return;
  const before = m._backup ? JSON.parse(m._backup) : null;
  const beforeTxt = before ? (() => { const tmp = { rounds: before.rounds }; const sc = side => [1, 2, 3].reduce((x, r) => x + (tmp.rounds[r]?.events || []).filter(e => e.side === side).reduce((y, e) => y + e.pts, 0), 0); return ` (correção; antes: ${sc("a")} × ${sc("b")})`; })() : "";
  logEv(`${matchLabel(m)} — resultado: ${teamName(m.a)} ${sa} × ${sb} ${teamName(m.b)} · ${winner === "draw" ? "empate" : `vencedor ${teamName(winner)}${byDecision ? " (decisão da comissão)" : viaR3 ? ` (${r3Label(m)})` : ""}`}${beforeTxt}`);
  Object.assign(m, { status: "done", winner, byDecision, phase: "review", timer: newTimer(0) }); delete m._backup;
  state.cup.liveId = null; save();
  // o aviso de fase gerada (semifinais/final/empate) vem depois e fica visível
  toast(m.stage === "final" ? `🏆 ${teamName(winner)} é o Vencedor - Confronto Direto!` : m.stage === "third" ? `🥉 ${teamName(winner)} fica com o 3º lugar!` : "Resultado registrado");
  checkProgress();
  render();
  if (m.stage === "prelim" && prelimDone() && !before) autoBackup("apos-fase-preliminar", "fase preliminar concluída");
  if (m.stage === "final") autoBackup("final", "competição encerrada");
}
function cancelMatch() {
  const m = liveMatch(); if (!m) return;
  if (m.winner) { // era uma correção: volta ao resultado anterior
    if (!confirm("Descartar a correção? As alterações feitas agora serão perdidas.")) return;
    Object.assign(m, { r3: undefined, r3Winner: undefined }, JSON.parse(m._backup || "{}"), { status: "done" }); delete m._backup;
    if (!m.rounds[3]) m.rounds[3] = { events: [] };
    logEv(`${matchLabel(m)} — correção descartada`);
  } else {
    if (!confirm("Cancelar este confronto? As marcações serão descartadas e ele volta para a fila.")) return;
    logEv(`${matchLabel(m)} cancelado (${teamName(m.a)} × ${teamName(m.b)}) — voltou para a fila`);
    Object.assign(m, { status: "pending", phase: "r1", timer: newTimer(cfg().cupR1), rounds: { 1: { events: [] }, 2: { events: [] }, 3: { events: [] } }, pick: null, r3: undefined, r3Winner: undefined, toR3: false });
  }
  state.cup.liveId = null; save(); render();
}
/* ---- W.O. (5.7.5): ausência, ambas ausentes, abandono; e desclassificação (5.7.6) ----
   Os balões da equipe ausente (ou os que restam ao robô que abandonou) contam como estourados a favor da adversária. */
const WO_TXT = { absent: "ausência", both: "ambas ausentes", abandon: "abandono", disq: "desclassificação" };
function applyWO(m, type, lostSide, reason, pick) {
  const EB = matchEvents()[0], N = cfg().cupBalloons, other = lostSide === "a" ? "b" : "a";
  const add = (side, n, r) => { for (let i = 0; i < n; i++) m.rounds[r].events.push({ id: uid(), side, pts: EB.pts, label: EB.label, t: "W.O.", seq: Date.now() + i }); };
  let winner;
  if (type === "abandon") { add(other, Math.max(0, N - poppedBy(m, other)), phRound(m.phase) || 2); winner = m[other]; }
  else {
    m.rounds = { 1: { events: [] }, 2: { events: [] }, 3: { events: [] } };
    if (type === "both") winner = m.stage === "prelim" ? "draw" : pick;
    else { add(other, N, 1); winner = m[other]; }
  }
  const byDecision = type === "both" && m.stage !== "prelim";
  if (state.cup.liveId === m.id) state.cup.liveId = null;
  delete m._backup;
  Object.assign(m, { status: "done", phase: "review", timer: newTimer(0), winner, byDecision, pick: null, r3: undefined, r3Winner: undefined, toR3: false, autoEnd: undefined, wo: { type, side: type === "both" ? null : lostSide, reason: str(reason) } });
  m.timer.status = "over";
  logEv(`${matchLabel(m)} — W.O. (${WO_TXT[type]}${type === "both" ? "" : `: ${teamName(m[lostSide])}`}): ${teamName(m.a)} ${sideScore(m, "a")} × ${sideScore(m, "b")} ${teamName(m.b)} · ${winner === "draw" ? "empate" : `vencedor ${teamName(winner)}${byDecision ? " (decisão da comissão)" : ""}`}${reason ? `. Motivo: ${reason}` : ""}`);
}
function cupWO(id) {
  const m = state.cup.matches.find(x => x.id === id); if (!m || m.status === "done") return;
  if (m.status === "pending" && liveMatch()) return warn("Finalize o confronto em andamento antes.");
  const live = m.status === "live", A = esc(teamName(m.a)), B = esc(teamName(m.b));
  const opt = (v, l, chk) => `<label class="check"><input type="radio" name="wo" value="${v}" ${chk ? "checked" : ""}> ${l}</label>`;
  openModal(`<h2>🚫 W.O. — ${esc(matchLabel(m))}</h2><p class="muted">${A} × ${B}. Os balões da equipe ausente (ou os que restam ao robô que abandonou) contam como estourados a favor da adversária.</p>
    <form id="woF"><div class="actions col">${live ? opt("ab:a", `<b>${A}</b> abandonou — ${B} vence`, true) + opt("ab:b", `<b>${B}</b> abandonou — ${A} vence`) : ""}
      ${opt("ab-a", `<b>${A}</b> ausente — ${B} vence por W.O. (${cfg().cupBalloons * cfg().cupBalloon} × 0)`, !live)}${opt("ab-b", `<b>${B}</b> ausente — ${A} vence por W.O.`)}${opt("both", `Ambas ausentes — ${m.stage === "prelim" ? "empate 0 × 0" : "vencedor por decisão da comissão"}`)}</div>
      ${m.stage !== "prelim" ? `<div class="mt-s"><label>Se ambas ausentes, vencedor (decisão da comissão)<select name="pick"><option value="${esc(m.a)}">${A}</option><option value="${esc(m.b)}">${B}</option></select></label></div>` : ""}
      <div class="mt-s"><label>Motivo / observação<input name="reason" maxlength="200" placeholder="ex.: equipe não se apresentou em 2 min"></label></div>
      <div class="actions mt"><button class="btn danger big">Registrar W.O.</button><button type="button" class="btn big" onclick="closeModal()">Cancelar</button></div></form>`);
  document.getElementById("woF").onsubmit = e => {
    e.preventDefault(); const F = e.target, v = F.elements.wo.value;
    const type = v === "both" ? "both" : v.startsWith("ab:") ? "abandon" : "absent", side = v.slice(-1);
    if (!confirm("Registrar o W.O.? O resultado fica valendo (pode ser corrigido depois com ✏️ Corrigir).")) return;
    applyWO(m, type, side, F.elements.reason.value, F.elements.pick?.value);
    save(); closeModal(); toast("W.O. registrado"); checkProgress(); render();
  };
}
// Desclassificação (5.7.6): sai das classificações; jogos ainda não disputados viram W.O. para os adversários
function disqualify(id) {
  const t = findTeam(id); if (!t || t.disq) return;
  if (state.free.current?.teamId === id || [liveMatch()].some(m => m && (m.a === id || m.b === id))) return warn("A equipe está jogando agora. Termine ou cancele a tentativa/confronto antes.");
  const reason = prompt(`DESCLASSIFICAR ${t.name}\n\nA equipe sai das classificações e da premiação. Os pontos dos adversários contra ela ficam, e os confrontos dela ainda não disputados viram W.O. para os adversários.\n\nMotivo (obrigatório):`, "");
  if (reason === null) return; if (!str(reason)) return warn("Informe o motivo da desclassificação.");
  t.disq = { at: new Date().toISOString(), reason: str(reason) };
  logEv(`Equipe DESCLASSIFICADA: ${t.name}. Motivo: ${str(reason)}`);
  const ko = state.cup.matches.filter(m => m.stage !== "prelim");
  if (ko.length && ko.every(m => m.status === "pending") && ko.some(m => m.a === id || m.b === id)) resyncSemis(); // semifinais não começaram: vaga para o próximo
  state.cup.matches.filter(m => m.status === "pending" && (m.a === id || m.b === id)).forEach(m => applyWO(m, "disq", m.a === id ? "a" : "b", "desclassificação de " + t.name));
  checkProgress(); save(); toast(`${t.name} desclassificada`); render();
}
function undoDisqualify(id) {
  const t = findTeam(id); if (!t?.disq) return;
  if (!confirm(`Reverter a desclassificação de ${t.name}?\nOs W.O. já registrados por causa dela continuam; corrija-os com ✏️ Corrigir, se for o caso.`)) return;
  delete t.disq; logEv(`Desclassificação revertida: ${t.name}`); resyncSemis(); checkProgress(); save(); render();
}
// Corrige um confronto já encerrado direto pelos números (funciona mesmo com outro confronto em andamento)
function cupEdit(id) {
  const m = state.cup.matches.find(x => x.id === id); if (!m || m.status !== "done") return;
  const [EB, EX] = matchEvents(), N = cfg().cupBalloons, ko = m.stage !== "prelim";
  // Round 3 aparece se foi jogado ou se o desempate por Round 3 está ligado (fase eliminatória)
  if (!m.rounds[3]) m.rounds[3] = { events: [] };
  const R3 = ko && (m.r3 || m.rounds[3].events.length || cfg().koR3 !== "off"), RS = R3 ? [1, 2, 3] : [1, 2];
  const r3Mode = m.r3 || cfg().koR3;
  const cnt = (r, side, ev) => m.rounds[r].events.filter(e => e.side === side && e.label === ev.label).length;
  const f = (r, side) => `<div class="ce-cell"><b>${esc(teamName(side === "a" ? m.a : m.b))}</b>
      <label>🎈 Balões do adversário estourados (+${EB.pts})<input type="number" min="0" max="${N}" name="b${r}${side}" value="${cnt(r, side, EB)}"></label>
      <label>↗ Adversário saiu da arena (+${EX.pts})<input type="number" min="0" max="1" name="x${r}${side}" value="${cnt(r, side, EX)}"></label></div>`;
  const pickLbl = R3 && r3Mode === "sudden" ? "Se empatar nos Rounds 1 e 2: vencedor da morte súbita (Round 3) ou decisão da comissão" : "Se empatar, vencedor (decisão da comissão)";
  openModal(`<h2>Corrigir confronto</h2><p class="muted">${esc(matchLabel(m))} · ${esc(teamName(m.a))} × ${esc(teamName(m.b))} · atual: <b>${sideScore(m, "a")} × ${sideScore(m, "b")}</b></p>
    <form id="cupEditF">${RS.map(r => `<h3 class="mt-s">${r === 3 ? `${r3Label(m)} <span class="muted small">(desempate, só se empatar)</span>` : `Round ${r}`}</h3><div class="ce-grid">${f(r, "a")}${f(r, "b")}</div>`).join("")}
    ${ko ? `<div class="mt-s"><label>${pickLbl}<select name="pick"><option value="${esc(m.a)}" ${(m.r3Winner || m.pick || m.winner) === m.a ? "selected" : ""}>${esc(teamName(m.a))}</option><option value="${esc(m.b)}" ${(m.r3Winner || m.pick || m.winner) === m.b ? "selected" : ""}>${esc(teamName(m.b))}</option></select></label></div>` : ""}
    <p class="mt-s">Novo placar: <b id="cupEditTot"></b></p>${fixFields()}
    <div class="actions mt"><button class="btn primary big">Salvar correção</button><button type="button" class="btn big" onclick="closeModal()">Cancelar</button></div></form>`);
  const F = document.getElementById("cupEditF");
  const val = (k, max) => F.elements[k] ? Math.max(0, Math.min(max, Math.round(num(F.elements[k].value, 0)))) : 0;
  const rs = (side, r) => val(`b${r}${side}`, N) * EB.pts + val(`x${r}${side}`, 1) * EX.pts;
  const total = side => RS.reduce((t, r) => t + rs(side, r), 0);
  // quem vence com os números do formulário (mesma regra do jogo: R1+R2; empate → Round 3; ainda empatado → comissão)
  const decide = () => {
    const a12 = rs("a", 1) + rs("a", 2), b12 = rs("b", 1) + rs("b", 2);
    if (!ko) { const a = total("a"), b = total("b"); return { winner: a > b ? m.a : b > a ? m.b : "draw" }; }
    if (a12 !== b12) return { winner: a12 > b12 ? m.a : m.b };
    const r3played = R3 && (m.r3 || ["a", "b"].some(sd => val(`b3${sd}`, N) || val(`x3${sd}`, 1)));
    if (r3played && r3Mode === "points" && rs("a", 3) !== rs("b", 3)) return { winner: rs("a", 3) > rs("b", 3) ? m.a : m.b, r3: "points" };
    if (r3played && r3Mode === "sudden") return { winner: F.elements.pick.value, r3: "sudden" };
    return { winner: F.elements.pick.value, byDecision: true, r3: r3played ? r3Mode : undefined };
  };
  const upd = () => { const a = total("a"), b = total("b"), d = decide(); document.getElementById("cupEditTot").textContent = `${teamName(m.a)} ${a} × ${b} ${teamName(m.b)} · ${d.winner === "draw" ? "empate" : `vence ${teamName(d.winner)}${d.byDecision ? " (decisão da comissão)" : d.r3 ? ` (Round 3 · ${R3_NAME[d.r3]})` : ""}`}`; };
  F.oninput = upd; upd();
  F.onsubmit = e => {
    e.preventDefault();
    const why = fixRead(F); if (why === null) return;
    const tb = RS.reduce((t, r) => t + val(`b${r}a`, N), 0), ta = RS.reduce((t, r) => t + val(`b${r}b`, N), 0);
    if (tb > N || ta > N) return warn(`Cada robô tem ${N} balões no confronto: a soma dos rounds não pode passar de ${N}.`);
    const sa = total("a"), sb = total("b"), d = decide(), winner = d.winner, byDecision = !!d.byDecision;
    const before = `${sideScore(m, "a")} × ${sideScore(m, "b")}`;
    const rebuild = r => {
      const out = [];
      ["a", "b"].forEach(side => [[EB, val(`b${r}${side}`, N)], [EX, val(`x${r}${side}`, 1)]].forEach(([ev, n]) => {
        const keep = m.rounds[r].events.filter(x => x.side === side && x.label === ev.label).slice(0, n);
        while (keep.length < n) keep.push({ id: uid(), side, pts: ev.pts, label: ev.label, t: "correção", seq: Date.now() + out.length + keep.length });
        out.push(...keep);
      }));
      return out.sort((x, y) => x.seq - y.seq);
    };
    const newRounds = { 1: { events: rebuild(1) }, 2: { events: rebuild(2) }, 3: { events: R3 ? rebuild(3) : [] } };
    const old = { rounds: m.rounds, winner: m.winner, r3: m.r3, r3Winner: m.r3Winner };
    m.rounds = newRounds; m.winner = winner;
    let drop = null;
    if (m.stage === "prelim" && state.cup.matches.some(x => x.stage !== "prelim")) {
      const sd = seeds(), [s1, s2] = semis();
      const same = s1 && s2 && s1.a === sd[0] && s1.b === sd[3] && s2.a === sd[1] && s2.b === sd[2];
      if (!same) drop = "ko";
    } else if (m.stage === "semi" && (finalMatch() || thirdMatch()) && winner !== old.winner) drop = "final";
    if (drop && !confirm(drop === "ko" ? "Com essa correção a classificação muda: semifinais e final serão apagadas e geradas novamente. Continuar?" : "O vencedor da semifinal mudou: a disputa de 3º lugar e a final serão apagadas e geradas novamente. Continuar?")) { Object.assign(m, old); return; }
    if (drop === "ko") state.cup.matches = state.cup.matches.filter(x => x.stage === "prelim");
    if (drop === "final") state.cup.matches = state.cup.matches.filter(x => x.stage !== "final" && x.stage !== "third");
    Object.assign(m, { byDecision, pick: byDecision ? winner : null, r3: d.r3 || (ko && newRounds[3].events.length ? r3Mode : undefined), r3Winner: d.r3 === "sudden" ? winner : undefined, wo: undefined });
    if (m.r3 === "off") m.r3 = undefined;
    logEv(`${matchLabel(m)} — corrigido: ${teamName(m.a)} ${sa} × ${sb} ${teamName(m.b)} (antes: ${before}) · ${winner === "draw" ? "empate" : `vencedor ${teamName(winner)}${byDecision ? " (decisão da comissão)" : d.r3 ? ` (Round 3 · ${R3_NAME[d.r3]})` : ""}`}. Motivo: ${why}`);
    save(); closeModal(); toast("Confronto corrigido"); resyncSemis(); checkProgress(); render();
  };
}
function reopenMatch(id) {
  const m = state.cup.matches.find(x => x.id === id); if (!m || m.status !== "done") return;
  if (liveMatch()) return warn("Finalize o confronto em andamento antes de corrigir outro.");
  if (m.stage === "semi" && finalMatch()?.status === "done") return warn("A final já foi disputada. Corrija a final primeiro ou gere novamente a fase.");
  if (m.stage === "prelim" && state.cup.matches.some(x => x.stage !== "prelim" && x.status === "done") && !confirm("Já existem jogos eliminatórios disputados. Se a correção mudar a classificação, eles serão apagados. Continuar?")) return;
  m._backup = JSON.stringify({ rounds: m.rounds, winner: m.winner, pick: m.pick, byDecision: m.byDecision, phase: m.phase, r3: m.r3, r3Winner: m.r3Winner });
  Object.assign(m, { status: "live", phase: "review", timer: newTimer(0) }); m.timer.status = "over";
  logEv(`${matchLabel(m)} — correção iniciada`);
  state.cup.liveId = m.id; reviewRound = 2; save(); render();
  document.querySelector(".live-panel")?.scrollIntoView({ behavior: "smooth" });
}

/* ============================ TELA: CONFRONTOS ============================ */
function confrontos() {
  const live = liveMatch(), champ = champion(), n = prelims().length;
  const kNow = n ? Math.round(n * 2 / Math.max(1, new Set(prelims().flatMap(m => [m.a, m.b])).size)) : gamesPerTeam(teams().length);
  main().innerHTML = head("Confronto Direto", `Duas equipes por vez · arena 1,20 × 1,20 m · Fase preliminar (cada equipe joga ${kNow} vezes) → Semifinais (1º×4º, 2º×3º pela ${seedByCup() ? "classificação do Confronto Direto" : "Classificação Geral"}) → ${cfg().cupThird ? "Disputa de 3º lugar e Final" : "Final"}`,
    `<button class="btn" onclick="openTelaoWindow()">📺 Abrir telão</button>`, "cup", !!live) +
    (champ ? `<div class="champion-banner"><div class="trophy">🏆</div><div><div class="eyebrow">VENCEDOR - CONFRONTO DIRETO</div><h2>${esc(champ.name)}</h2><p>${esc(schoolText(champ))}</p></div></div>` : "") +
    (!n ? `<div class="card center stage"><h2>Fase preliminar</h2><p class="muted">${teams().length} equipes · cada equipe disputa exatamente ${kNow} confrontos, sem repetição · ${teams().length >= 4 ? `<b>${teams().length * kNow / 2} confrontos</b>` : "mínimo 4 equipes"}</p><p class="muted small">Quantidade de jogos por equipe: em <b>Configurações → Confronto Direto</b>.</p><button class="btn primary huge" onclick="generatePrelim()" ${teams().length < 4 ? "disabled" : ""}>🔀 Gerar fase preliminar</button></div>`
      : `${live ? livePanel(live) : phaseTracker() + nextPanel()}
      <div class="cup-layout mt">${prelimCard()}${standingsCard()}</div>
      ${bracketCard()}`);
}
function phaseTracker() {
  const p = prelims(), pd = p.filter(m => m.status === "done").length, s = semis(), sd = s.filter(m => m.status === "done").length, f = finalMatch(), th = thirdMatch();
  const st = (label, info, state_) => `<div class="phase ${state_}"><b>${label}</b><span>${info}</span></div>`;
  return `<div class="phases">
    ${st("Fase preliminar", `${pd}/${p.length}`, pd === p.length ? "done" : "active")}
    ${st("Semifinais", s.length ? `${sd}/2` : "aguardando", !s.length ? "" : sd === 2 ? "done" : "active")}
    ${cfg().cupThird || th ? st("3º lugar", th ? (th.status === "done" ? "encerrada" : "a disputar") : "aguardando", !th ? "" : th.status === "done" ? "done" : "active") : ""}
    ${st("Final", f ? (f.status === "done" ? "encerrada" : "a disputar") : "aguardando", !f ? "" : f.status === "done" ? "done" : "active")}
  </div>`;
}
function nextPanel() {
  const m = nextMatch();
  if (!m) {
    if (champion()) return "";
    if (prelimDone() && !semis().length) return `<div class="card stage center"><h2>Fase preliminar encerrada</h2><p class="muted">Há empate na classificação que precisa ser resolvido. Use as setas ▲▼ na classificação e confirme.</p></div>`;
    return `<div class="card stage center muted">Aguardando…</div>`;
  }
  const a = findTeam(m.a), b = findTeam(m.b);
  return `<div class="card stage">
    <div class="center"><div class="eyebrow">PRÓXIMO CONFRONTO · ${esc(matchLabel(m)).toUpperCase()}</div></div>
    <div class="versus"><div class="vs-team">${teamCell(a)}</div><div class="vs">×</div><div class="vs-team">${teamCell(b)}</div></div>
    <div class="center"><button class="btn primary huge" onclick="startMatch('${esc(m.id)}')" ${state.free.current ? "disabled" : ""}>▶ Chamar e iniciar confronto</button>
    ${state.free.current ? `<p class="muted small">Há uma tentativa da Arena Livre em andamento.</p>` : ""}
    <p class="mt-s"><button class="btn small ghost" onclick="cupWO('${esc(m.id)}')">🚫 Ausência / W.O.</button></p></div>
  </div>`;
}
function livePanel(m) {
  const a = findTeam(m.a), b = findTeam(m.b), t = m.timer, ph = m.phase, fix = !!m._backup;
  const phases = [["r1", `Round 1 · ${fmt(cfg().cupR1)}`], ["break", `Intervalo · ${fmt(cfg().cupBreak)}`], ["r2", `Round 2 · ${fmt(cfg().cupR2)}`], ...(m.r3 ? [["break3", `Intervalo · ${fmt(cfg().cupBreak)}`], ["r3", `${r3Label(m)} · ${fmt(r3Secs(m.r3))}`]] : []), ["review", "Resultado"]];
  const idx = phases.findIndex(p => p[0] === (ph === "break" && m.toR3 ? "break3" : ph)), live = LIVE_PH.includes(ph), rn = phRound(ph), kr = m.stage !== "prelim" ? koResult(m) : null;
  const bar = `<div class="roundbar">${phases.map((p, i) => `<span class="round-pill ${i === idx ? "active" : i < idx ? "past" : ""}">${p[1]}</span>`).join("")}</div>`;
  const statusTxt = ph === "review" ? (fix ? "CORRIGINDO RESULTADO" : "CONFERÊNCIA DO RESULTADO") : ph === "break" ? (t.status === "over" ? "INTERVALO ENCERRADO" : "INTERVALO PARA AJUSTES") : inPrep(t) ? "PREPARAR…" : { idle: "PRONTO PARA INICIAR", running: rn === 3 ? `${r3Label(m).toUpperCase()} EM ANDAMENTO` : `ROUND ${rn} EM ANDAMENTO`, paused: "PAUSADO", over: "TEMPO ESGOTADO" }[t.status];
  const sa = sideScore(m, "a"), sb = sideScore(m, "b");
  const canScore = ph === "review" || (live && t.status !== "idle" && !inPrep(t));
  const winSide = kr ? (kr.winner === m.a ? "a" : kr.winner === m.b ? "b" : null) : sa > sb ? "a" : sb > sa ? "b" : null;
  const fighter = (side, tm, sc) => `<div class="fighter ${ph === "review" && winSide === side ? "win" : ""}">
      ${teamCell(tm)}
      <div class="pts">${sc}</div>
      <div class="muted small">Round 1: ${sideScore(m, side, 1)} · Round 2: ${sideScore(m, side, 2)}${m.r3 ? ` · Round 3: ${sideScore(m, side, 3)}` : ""}</div>
      ${(() => { const c = tm && drawOf(tm.id); return `<div class="f-color">${c ? `<span class="q-color" style="--c:${esc(c.hex)};--t:${textOn(c.hex)}">${numIn(tm)}</span><span>Balões <b>${esc(c.name)}</b></span>` : `<span class="muted small">Cor não sorteada (Arena Livre)</span>`}</div>`; })()}
      ${live ? (() => { const N = cfg().cupBalloons, lost = poppedBy(m, side === "a" ? "b" : "a"), c = tm && drawOf(tm.id); return `<div class="balloons" title="Balões restantes deste robô no confronto (não são repostos entre os rounds)">${Array.from({ length: N }, (_, k) => c ? `<i class="bl ${k < N - lost ? "" : "lost"}" style="--c:${esc(c.hex)}"></i>` : `<span class="${k < N - lost ? "" : "lost"}">🎈</span>`).join("")}<small>${N - lost} de ${N} balões</small></div>`; })() : ""}
      <div class="fighter-btns">${matchEvents().map((e, i) => `<button class="btn score ${i === 0 ? "good" : ""}" onclick="matchEvent('${side}',${i})" ${canScore ? "" : "disabled"} aria-label="${esc(e.short)} para ${esc(tm?.name)}: ${esc(e.label)}"><b>${e.short}</b><span>${e.icon} ${e.label}</span></button>`).join("")}</div>
      <button class="btn undo" onclick="matchUndo('${side}')" aria-label="Desfazer a última marcação de ${esc(tm?.name)}">↶ Desfazer última</button>
    </div>`;
  let ctrl = "";
  if (live) {
    const toggle = t.status === "running" ? "❚❚ Pausar" : t.status === "paused" ? "▶ Retomar" : `▶ Iniciar Round ${rn}`;
    ctrl = `<button class="btn ${t.status === "running" ? "" : "primary"} big" onclick="matchToggle()" ${t.status === "over" ? "disabled" : ""}>${toggle}</button><button class="btn warning big" onclick="endRound()" ${t.status === "idle" ? "disabled" : ""}>✓ Encerrar Round ${rn}</button>${t.status === "idle" ? `<p class="hint">Inicie o round para liberar a pontuação. <kbd>Espaço</kbd> inicia/pausa.</p>` : ""}
      ${rn === 3 ? `<p class="hint">${m.r3 === "sudden" ? "<b>Morte súbita:</b> vence quem tirar o adversário da arena ou estourar os balões que restam dele (não são repostos). Se o tempo acabar sem decisão, a comissão decide." : "<b>Round 3 igual ao Round 2 (por pontuação):</b> vence quem marcar mais neste round (balões não são repostos). Empate de novo: decisão da comissão."}</p>` : ""}`;
  } else if (ph === "break") ctrl = `<button class="btn primary big" onclick="startRound2()">▶ Ir para o Round ${m.toR3 ? 3 : 2}</button><p class="hint">Intervalo para ajustes nos robôs. Os pontos só podem ser corrigidos (↶ ou ✕).</p>`;
  else {
    const draw = kr ? !kr.winner : sa === sb;
    const r3btn = kr?.needR3 ? `<div class="notice warn">Empate nos Rounds 1 e 2. Desempate: <b>${esc(R3_DESC[cfg().koR3])}</b> — intervalo e Round 3 (até ${durTxt(r3Secs())}), com os balões que sobraram (não são repostos).<div class="actions mt-s"><button class="btn primary big" onclick="startRound3()">▶ Intervalo e Round 3 (${R3_NAME[cfg().koR3]})</button></div></div>` : "";
    const pick = draw && m.stage !== "prelim" && !kr?.needR3 ? `<div class="notice warn">${m.r3 ? `Round 3 sem decisão.` : "Empate em fase eliminatória."} Selecione o vencedor conforme decisão da Comissão Organizadora:<div class="actions mt-s">${[m.a, m.b].map(id => `<button class="btn ${m.pick === id ? "primary" : ""}" onclick="pickWinner('${esc(id)}')">${m.pick === id ? "✓ " : ""}${esc(teamName(id))}</button>`).join("")}</div></div>` : "";
    ctrl = `<div class="review">
      <div class="review-res">${draw ? "EMPATE" : `Vencedor: <b>${esc(teamName(kr ? kr.winner : sa > sb ? m.a : m.b))}</b>${kr?.r3 ? ` <span class="chip">${esc(r3Label(m))}</span>` : ""}`}</div>
      ${r3btn}${pick}
      <div class="review-round muted small">Nova marcação (correção) entra no: ${playedRounds(m).map(r => `<button class="btn tiny ${activeRound(m) === r ? "primary" : ""}" onclick="setReviewRound(${r})">Round ${r}</button>`).join("")}</div>
      <button class="btn primary huge" onclick="confirmResult()" ${kr?.needR3 ? "disabled" : ""}>✓ Confirmar resultado</button></div>`;
  }
  const logs = [1, 2, 3].map(r => (m.rounds[r]?.events || []).slice().reverse().map(e => `<div class="log-item"><span>R${r} · ${esc(e.t)} · <b>${esc(teamName(e.side === "a" ? m.a : m.b))}</b> · ${esc(e.label)}</span><b class="plus">+${e.pts}</b><button class="x" title="Remover esta marcação" aria-label="Remover esta marcação" onclick="matchRemoveEvent(${r},'${esc(e.id)}')">✕</button></div>`).join("")).reverse().join("");
  return `<div class="card live-panel">
    <div class="live-top"><span class="eyebrow">${fix ? "CORREÇÃO · " : "EM ANDAMENTO · "}${esc(matchLabel(m)).toUpperCase()}</span>${bar}</div>
    <div class="live-grid">${fighter("a", a, sa)}
      <div class="live-center">
        ${ph === "review" ? "" : `<div class="timer" data-timer="match">${fmt(left(t))}</div>${adjBtns("match", t)}`}
        <span class="status-txt s-${ph === "review" ? "over" : t.status}">${t.status === "running" ? '<i class="dot-live"></i>' : ""}${statusTxt}</span>
        <div class="live-ctrl">${ctrl}</div>
      </div>
    ${fighter("b", b, sb)}</div>
    <details class="mt-s" ${logs && ph === "review" ? "open" : ""}><summary class="muted">Marcações (${m.rounds[1].events.length + m.rounds[2].events.length + (m.rounds[3]?.events.length || 0)}) — clique em ✕ para remover uma específica</summary><div class="log">${logs || `<div class="muted small">Nenhuma marcação.</div>`}</div></details>
    <div class="right">${live ? `<button class="btn small ghost" onclick="repeatRound()">🔁 Repetir Round ${rn} (falha técnica)</button>` : ""}${fix || XMODE ? "" : `<button class="btn small ghost" onclick="cupWO('${esc(m.id)}')">🚫 W.O. / abandono</button>`}<button class="btn small ghost" onclick="cancelMatch()">${fix ? "✕ Descartar correção" : "✕ Cancelar confronto"}</button></div>
  </div>`;
}
function matchRow(m) {
  const live = liveMatch(), nm = nextMatch();
  let chip = `<span class="chip wait">Na fila</span>`;
  if (m.status === "live") chip = `<span class="chip live">● Jogando</span>`;
  else if (m.status === "done") chip = m.wo ? `<span class="chip out">W.O.</span>` : `<span class="chip done">✓ Encerrado</span>`;
  else if (nm && nm.id === m.id) chip = `<span class="chip next">Próximo</span>`;
  const act = m.status === "pending" && !live ? `<button class="btn tiny primary" onclick="startMatch('${esc(m.id)}')">Iniciar</button>`
    : m.status === "done" ? `<button class="btn tiny" onclick="cupEdit('${esc(m.id)}')" title="Corrigir resultado">✏️ Corrigir</button>` : "";
  const w = id => reveal && m.status === "done" && m.winner === id ? "win" : "";
  const sc = side => m.status !== "done" ? "" : reveal ? `<b>${sideScore(m, side)}</b>` : `<span class="score-hidden">••</span>`;
  return `<div class="m-row ${m.status}"><span class="m-no">${m.stage === "prelim" ? m.order : ""}</span>
    <div class="m-teams"><div class="${w(m.a)}"><span>${esc(teamName(m.a))}</span>${sc("a")}</div><div class="${w(m.b)}"><span>${esc(teamName(m.b))}</span>${sc("b")}</div></div>
    <div class="m-side">${chip}${act}</div></div>`;
}
function prelimCard() {
  return `<div class="card"><h2>Fase preliminar · ${prelims().length} confrontos</h2><div class="m-list">${prelims().map(matchRow).join("")}</div>
    <p class="muted small mt-s">Cada equipe joga exatamente ${Math.round(prelims().length * 2 / Math.max(1, new Set(prelims().flatMap(m => [m.a, m.b])).size))} vezes, sem confrontos repetidos${conflicts(prelims().map(m => [m.a, m.b])) ? ". Com este número de equipes não é possível evitar que alguma equipe jogue dois confrontos seguidos." : " e sem jogar duas vezes seguidas."}</p></div>`;
}
function teamStatus(id, rows) {
  const live = liveMatch(), nm = nextMatch(), c = champion(), f = finalMatch();
  if (isDisq(id)) return `<span class="chip out">🚫 Desclassificada</span>`;
  if (live && (live.a === id || live.b === id)) return `<span class="chip live">● Jogando</span>`;
  if (c && c.id === id) return `<span class="chip gold">🏆 Vencedor - Confronto Direto</span>`;
  if (nm && (nm.a === id || nm.b === id)) return `<span class="chip next">Próximo</span>`;
  if (semis().length) {
    const inKo = semis().some(m => m.a === id || m.b === id);
    if (!inKo) return `<span class="chip out">Eliminado</span>`;
    const lostSemi = semis().some(m => (m.a === id || m.b === id) && winnerOf(m) && winnerOf(m) !== id), th = thirdMatch(), pl = cupPlaces();
    if (lostSemi && pl[2] === id) return `<span class="chip done">🥉 3º lugar - Confronto Direto</span>`;
    if (lostSemi && pl[3] === id) return `<span class="chip out">4º lugar - Confronto Direto</span>`;
    if (lostSemi) return `<span class="chip out">${th ? "Disputa de 3º lugar" : "Semifinalista"}</span>`;
    if (f && f.status === "done") return `<span class="chip done">2º lugar - Confronto Direto</span>`;
    return `<span class="chip ok">${f ? "Finalista" : "Semifinal"}</span>`;
  }
  const s = rows.find(r => r.team.id === id);
  if (s && s.J >= s.total) return `<span class="chip done">Jogou ${s.J}/${s.total}</span>`;
  return `<span class="chip wait">Na fila · ${s ? s.J : 0}/${s ? s.total : 2}</span>`;
}
function standingsCard() {
  const rows = standings(), done = prelimDone(), crits = state.settings.tiebreak.filter(x => x.on).map(x => TIEBREAKS[x.key].label);
  const list = reveal ? rows : [...rows].sort((a, b) => byNum(a.team, b.team));
  const Q = new Set(done ? seeds() : []);
  const body = list.map(r => {
    const cls = reveal && done ? (Q.has(r.team.id) ? "qual" : "elim") : "";
    const arrows = reveal && done && r.tied ? `<span class="tie-arrows"><button class="btn tiny" onclick="moveInTie('${esc(r.team.id)}',-1)" title="Subir">▲</button><button class="btn tiny" onclick="moveInTie('${esc(r.team.id)}',1)" title="Descer">▼</button></span>` : "";
    const tag = reveal && done && r.tied ? `<span class="chip warn">empate</span>` : reveal && r.manual ? `<span class="chip">decisão da comissão</span>` : "";
    return `<tr class="${cls}">${reveal ? `<td class="pos">${r.pos}º</td>` : ""}<td>${teamCell(r.team, `<div class="row-tags">${teamStatus(r.team.id, rows)}${tag}${arrows}</div>`)}</td>
      <td class="num">${r.J}</td><td class="num">${hide(r.V)}</td><td class="num">${hide(r.E)}</td><td class="num">${hide(r.D)}</td><td class="num total">${hide(r.SG > 0 ? "+" + r.SG : r.SG)}</td></tr>`;
  }).join("");
  // chaveamento pela classificação do Confronto: empate entre os 4 primeiros precisa da decisão da comissão (▲▼)
  const blocking = seedByCup() && done && !semis().length && blockingTie(rows);
  return `<div class="card"><div class="card-head"><h2>Classificação · fase preliminar</h2>${eyeBtn()}</div>
    ${reveal ? "" : `<p class="muted small">Resultados ocultos — equipes listadas pela numeração. Clique no 👁️ para revelar.</p>`}
    <div class="table-wrap"><table class="table standings" aria-label="Classificação da fase preliminar"><thead><tr>${reveal ? "<th>Pos.</th>" : ""}<th>Equipe</th><th class="num">J</th><th class="num">V</th><th class="num">E</th><th class="num">D</th><th class="num">Saldo</th></tr></thead><tbody>${body}</tbody></table></div>
    ${blocking ? `<div class="notice warn mt-s"><b>Empate não resolvido entre os 4 primeiros.</b> ${reveal ? `Ajuste a ordem com ▲▼ conforme a decisão da Comissão Organizadora e confirme:` : "Revele a pontuação (👁️) para resolver."} ${reveal ? `<div class="mt-s"><button class="btn primary" onclick="confirmTieOrder()">✓ Confirmar ordem e gerar semifinais</button></div>` : ""}</div>` : ""}
    <p class="muted small mt-s"><b>Classificação pelo saldo</b> = soma dos pontos marcados pela equipe nos confrontos. Desempate: ${crits.length ? crits.join(" → ") : "nenhum critério ativo"} → decisão da comissão. Semifinais: os 4 primeiros da <b>${seedByCup() ? "classificação do Confronto Direto (só o saldo da fase preliminar; a Arena Livre não conta)" : "Classificação Geral (Arena Livre + saldo da fase preliminar)"}</b>, 1º × 4º e 2º × 3º.
    ${state.cup.manualOrder.length ? `<button class="btn tiny ghost" onclick="clearManualOrder()">Limpar decisões manuais</button>` : ""}</p></div>`;
}
function bracketCard() {
  const [s1, s2] = semis(), f = finalMatch(), th = thirdMatch(), champ = champion();
  const slot = (m, side, ph) => {
    const id = m ? m[side] : null, t = findTeam(id), win = m && winnerOf(m) === id && id;
    return `<div class="b-team ${win ? "winner" : ""} ${t ? "" : "ph"}"><span>${t ? esc(t.name) : ph}</span>${m && m.status === "done" ? `<b>${reveal ? sideScore(m, side) : "••"}</b>` : ""}${win ? "<em>✓</em>" : ""}</div>`;
  };
  const box = (m, title, pa, pb) => `<div class="b-match ${m?.status || ""}"><div class="b-title">${title}${m ? ` · ${m.status === "live" ? "● jogando" : m.status === "done" ? (m.wo ? `W.O. (${WO_TXT[m.wo.type]})` : m.byDecision ? "decisão da comissão" : koResult(m).r3 ? esc(r3Label(m)) : "encerrada") : "a disputar"}` : ""}</div>${slot(m, "a", pa)}${slot(m, "b", pb)}${m && m.status === "pending" && !liveMatch() ? `<button class="btn tiny primary" onclick="startMatch('${esc(m.id)}')">Iniciar</button>` : m && m.status === "done" ? `<button class="btn tiny" onclick="cupEdit('${esc(m.id)}')">✏️ Corrigir</button>` : ""}</div>`;
  const third = cupPlaces()[2], sp = seedPh();
  return `<div class="card mt ko"><div class="card-head"><h2>🏅 Fase eliminatória</h2><span class="pill">mata-mata</span></div>
    <p class="muted small seed-note">📋 Chaveamento das semifinais pela <b>${esc(seedTxt())}</b>.${cfg().koR3 !== "off" ? ` Empate: <b>${esc(r3Label({ r3: cfg().koR3 }))}</b> (sem repor balões).` : " Empate: decisão da comissão."}</p>
    <div class="bracket">
      <div class="b-col">${box(s1, "Semifinal 1", `1º ${sp}`, `4º ${sp}`)}${box(s2, "Semifinal 2", `2º ${sp}`, `3º ${sp}`)}</div>
      <div class="b-col mid">${box(f, "FINAL", "Vencedor Semifinal 1", "Vencedor Semifinal 2")}${cfg().cupThird || th ? box(th, "DISPUTA DE 3º LUGAR", "Perdedor Semifinal 1", "Perdedor Semifinal 2") : `<div class="b-match"><div class="b-title">SEM DISPUTA DE 3º LUGAR</div><p class="muted small">3º lugar: o perdedor de semifinal mais bem colocado na classificação do chaveamento.</p></div>`}</div>
      <div class="b-col"><div class="b-champ ${champ ? "on" : ""}"><div class="trophy">🏆</div><div class="eyebrow">VENCEDOR - CONFRONTO DIRETO</div><b>${champ ? esc(champ.name) : "A definir"}</b>${champ ? `<small>${esc(schoolText(champ))}</small>` : ""}</div>${third ? `<div class="b-third">🥉 3º lugar: <b>${esc(teamName(third))}</b></div>` : ""}</div>
    </div></div>`;
}
