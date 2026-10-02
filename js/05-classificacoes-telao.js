"use strict";
/* RoboSapiens 2026 — Robô Estoura Balão · js/05-classificacoes-telao.js: Classificação Geral, Pódio e Telão.
   Os arquivos js/01…08 são scripts comuns carregados em ordem pelo index.html e compartilham o escopo global. */
/* ============================ CLASSIFICAÇÃO GERAL ============================ */
/* Soma a pontuação da Arena Livre com os pontos marcados no Confronto
   Direto (balões e saídas do adversário). */
// Config. "Classificação Geral": só a fase preliminar (padrão) ou também a fase eliminatória
const geralAll = () => cfg().geralCup === "all";
const geralCupTxt = () => geralAll() ? "pontos marcados em todos os jogos (fase preliminar + semifinais, 3º lugar e final)" : "saldo da fase preliminar (semifinais, 3º lugar e final não contam)";
function cupPointsOf(id) {
  return state.cup.matches.filter(m => m.status === "done" && (geralAll() || m.stage === "prelim")).reduce((s, m) => s + (m.a === id ? sideScore(m, "a") : 0) + (m.b === id ? sideScore(m, "b") : 0), 0);
}
function generalRanking() {
  const fr = freeRanking();
  return sortedTeams().filter(t => !t.disq).map(t => {
    const arena = fr.find(r => r.team.id === t.id)?.total || 0, cup = cupPointsOf(t.id);
    return { team: t, arena, cup, total: arena + cup };
  }).sort((a, b) => b.total - a.total || b.cup - a.cup || b.arena - a.arena || byNum(a.team, b.team));
}
function geral() {
  const rk = generalRanking(), list = reveal ? rk : [...rk].sort((a, b) => byNum(a.team, b.team));
  const medal = i => reveal ? (["🥇", "🥈", "🥉"][i] || "") : "";
  const fs = freeSummary(), cs = cupSummary();
  const Q = new Set(!seedByCup() && prelimDone() ? seeds() : []);
  const ties = reveal ? rk.map((r, i) => i > 0 && rk[i - 1].total === r.total && rk[i - 1].cup === r.cup && rk[i - 1].arena === r.arena) : [];
  main().innerHTML = head("Classificação Geral", "Soma da pontuação da Arena Livre com os pontos marcados no Confronto Direto.", `<button class="btn" onclick="setDisplay('geral');openTelaoWindow()">📺 Mostrar no telão</button><button class="btn" onclick="exportXlsx()">📊 Exportar Excel</button>`, "geral") +
    `<div class="grid g2 mb"><div class="notice"><b>🎈 Arena Livre</b> — ${state.settings.freeRankMode === "melhor" ? "melhor rodada" : "soma das rodadas"} · ${fs.done}/${fs.total} tentativas</div>
      <div class="notice cup"><b>⚔️ Confronto Direto</b> — ${geralCupTxt()} · ${cs.done}/${cs.total || 0} confrontos</div></div>
    ${fs.done < fs.total || !cs.total || cs.done < cs.total ? `<div class="notice warn mb">Classificação parcial — ainda há provas a disputar.</div>` : ""}
    <div class="card"><div class="card-head"><h2>Classificação Geral</h2>${eyeBtn()}</div>
    ${reveal ? "" : `<p class="muted small">Pontuação oculta — equipes listadas pela numeração. Clique no 👁️ para revelar.</p>`}
    <div class="table-wrap"><table class="table geral" aria-label="Classificação Geral"><thead><tr>${reveal ? "<th>Pos.</th>" : ""}<th>Equipe</th><th class="num">🎈 Arena Livre</th><th class="num">⚔️ Confronto Direto</th><th class="num">Total</th></tr></thead><tbody>
    ${list.map((r, i) => `<tr class="${reveal && Q.has(r.team.id) ? "qual" : ""}">${reveal ? `<td class="pos">${i + 1}º ${medal(i)}</td>` : ""}<td>${teamCell(r.team, ties[i] ? `<div class="row-tags"><span class="chip warn">empate com a equipe acima</span></div>` : "")}</td>
      <td class="num">${hide(signed(r.arena), r.arena < 0 ? "minus" : "")}</td><td class="num">${hide(r.cup)}</td><td class="num total">${hide(signed(r.total), r.total < 0 ? "minus" : "")}</td></tr>`).join("") || `<tr><td colspan="5">Nenhuma equipe.</td></tr>`}
    </tbody></table></div>
    <p class="muted small mt-s">${seedByCup() ? `<b>Semifinais:</b> pela classificação do Confronto Direto (só o saldo da fase preliminar) — esta Classificação Geral não define o chaveamento.` : `<b>Os 4 primeiros vão às semifinais</b> (1º × 4º e 2º × 3º), considerando a Arena Livre + o saldo da fase preliminar${geralAll() ? " (os pontos da fase eliminatória somam aqui depois, mas não mudam o chaveamento)" : ""}; destacados em verde.`} Empate no total: fica à frente quem marcou mais no Confronto Direto; depois, mais na Arena Livre; depois, a menor numeração do sorteio. O Vencedor - Confronto Direto continua definido pela final. As opções ficam em Configurações.</p></div>`;
}
/* ============================ PÓDIO ============================ */
/* Três pódios separados (Confronto Direto, Classificação Geral, Arena Livre); cada um pode ir para o telão */
const PODIUMS = { cup: "⚔️ Confronto Direto", geral: "🏆 Classificação Geral", arena: "🎈 Arena Livre" };
let podioSel = "cup";
function podiumData(kind) {
  if (kind === "cup") {
    const p = cupPlaces(), done = !!champion();
    return { title: "PÓDIO · CONFRONTO DIRETO", cls: "cup", partial: !done, note: done ? "" : "Pódio definido pela final" + (cfg().cupThird ? " e pela disputa de 3º lugar" : " (3º lugar: perdedor de semifinal mais bem colocado no chaveamento)"),
      items: [0, 1, 2].map(i => ({ t: findTeam(p[i]), sub: ["Vencedor - Confronto Direto", "2º lugar", "3º lugar"][i] })) };
  }
  if (kind === "geral") {
    const rk = generalRanking(), fs = freeSummary(), cs = cupSummary(), any = fs.done || cs.done, partial = fs.done < fs.total || !cs.total || cs.done < cs.total;
    return { title: "PÓDIO · CLASSIFICAÇÃO GERAL", cls: "gold", partial, note: partial ? "Classificação parcial — ainda há provas a disputar" : "",
      items: [0, 1, 2].map(i => ({ t: any ? rk[i]?.team : null, sub: any && rk[i] ? `${signed(rk[i].total)} pontos` : "" })) };
  }
  const rk = freeRanking().filter(x => x.done), fs = freeSummary(), partial = fs.done < fs.total;
  return { title: "PÓDIO · ARENA LIVRE", cls: "arena", partial, note: partial ? "Classificação parcial — a Arena Livre ainda não terminou" : "",
    items: [0, 1, 2].map(i => ({ t: rk[i]?.team || null, sub: rk[i] ? `${signed(rk[i].total)} pontos` : "" })) };
}
function podiumHtml(kind) {
  const d = podiumData(kind), medal = ["🥇", "🥈", "🥉"];
  const col = i => { const it = d.items[i]; if (it.t?.disq) { it.t = null; it.sub = ""; it.vago = true; } return `<div class="pd-col p${i + 1}"><div class="pd-medal">${medal[i]}</div><div class="pd-name">${it.t ? esc(it.t.name) : it.vago ? "Vago (desclassificada)" : "A definir"}</div>${it.t ? `<div class="pd-school">${esc(schoolText(it.t))}</div>` : ""}${it.sub && it.t ? `<div class="pd-sub">${esc(it.sub)}</div>` : ""}<div class="pd-step">${i + 1}º</div></div>`; };
  return `<div class="podium ${d.cls}">${col(1)}${col(0)}${col(2)}</div>${d.note ? `<p class="pd-note">${esc(d.note)}</p>` : ""}`;
}
function podio() {
  const tab = k => `<button class="btn ${podioSel === k ? "primary" : ""}" onclick="podioSel='${k}';render()">${PODIUMS[k]}</button>`;
  const onTv = state.display.mode === "podio-" + podioSel;
  main().innerHTML = head("Pódio", "Os 3 primeiros de cada classificação. Escolha o pódio e mostre no telão.",
    `<button class="btn ${onTv ? "primary" : ""} big" onclick="setDisplay('podio-${podioSel}');toast('Telão: pódio ${PODIUMS[podioSel].replace(/^\S+ /, "")}')">📺 ${onTv ? "No telão agora" : "Mostrar no telão"}</button>`) +
    `<div class="actions mb">${tab("cup")}${tab("geral")}${tab("arena")}</div>
    <div class="card pd-card"><h2>🥇 Pódio · ${PODIUMS[podioSel]}</h2>${podiumHtml(podioSel)}</div>
    <p class="muted small mt-s">No telão o pódio aparece mesmo com a pontuação oculta. Para voltar ao ao vivo, use <b>Telão → Automático</b>.</p>`;
}
function scenePodium(kind) {
  const d = podiumData(kind);
  return `<div class="tv tv-podium"><div class="tv-mode ${d.cls}">🏆 ${d.title}</div>${podiumHtml(kind)}</div>`;
}
function sceneCrono() {
  const n = nowHHMM();
  return `<div class="tv tv-rank tv-crono ${state.schedule.length > 10 ? "dense" : ""}"><div class="tv-mode">🗓️ CRONOGRAMA · ROBÔ ESTOURA BALÃO</div><div class="tv-table">${state.schedule.map(x => { const st = scheduleStatus(x, n); return `<div class="tv-row st-${st} ${st === "now" ? "top" : ""}"><span class="p tv-h">${hFmt(x.start)}–${hFmt(x.end)}</span><span class="n">${esc(x.title)}</span><b>${st === "now" ? "● AGORA" : ""}</b></div>`; }).join("")}</div></div>`;
}
function sceneGeral() {
  if (!state.display.reveal) return tvHidden("🏆 CLASSIFICAÇÃO GERAL");
  const rk = generalRanking();
  return `<div class="tv tv-rank" style="--f:${tvFit()}"><div class="tv-mode gold">🏆 CLASSIFICAÇÃO GERAL</div><div class="tv-table">${rk.map((x, i) => `<div class="tv-row ${i < 3 ? "top" : ""}"><span class="p">${["🥇", "🥈", "🥉"][i] || `${i + 1}º`}</span><span class="n">${esc(x.team.name)}<small>${esc(schoolText(x.team))} · Arena ${signed(x.arena)} · Confronto ${x.cup}</small></span><b>${signed(x.total)}</b></div>`).join("")}</div></div>`;
}

/* ============================ TELÃO ============================ */
/* ---- Telão dos sorteios: ANTES (Equipe XX / sem cor) → animação → DEPOIS ----
   Contagem 3, 2, 1; depois uma equipe a cada 3 s: "roleta" por 2 s e para no resultado (bipe curto),
   bipe longo na última. A linha do tempo usa o horário do sorteio, então telões em outros PCs ficam juntos. */
const ANIM = { count: 3000, step: 3000, spin: 2000 };
function startDrawAnim(kind, order) {
  state.display.anim = order.length ? { kind, at: Date.now(), order } : null;
  if (order.length) state.display.mode = kind;
}
function drawAnim(kind) {
  const a = state.display.anim; if (!a || a.kind !== kind || !a.order.length) return null;
  const t = now() - a.at, t0 = ANIM.count, end = t0 + a.order.length * ANIM.step;
  if (t < 0 || t > end + 4000) return null; // terminou há tempo (ou relógio estranho): mostra o resultado
  const st = id => { const i = a.order.indexOf(id); if (i < 0) return "done"; const s = t0 + i * ANIM.step; return t < s ? "wait" : t < s + ANIM.spin ? "spin" : t < s + ANIM.step ? "just" : "done"; };
  return { a, t, t0, end, st, count: t < t0 ? Math.ceil((t0 - t) / 1000) : 0, revealed: a.order.filter(id => ["just", "done"].includes(st(id))).length, finished: t >= end };
}
function animSub(an, total, idle, doneTxt) {
  if (!an) return null;
  if (an.count) return `Sorteio começando em ${an.count}…`;
  return an.finished ? doneTxt : `Sorteando… ${Math.min(an.revealed + 1, total)} de ${total}`;
}
function sceneNumbers() {
  const an = drawAnim("numeros");
  // durante a animação, os cards ficam na ordem do "antes"; no fim, em ordem 01 a 07
  const list = an && !(an.finished && an.t > an.end + 2500) ? [...an.a.order.map(findTeam).filter(Boolean), ...sortedTeams().filter(t => !an.a.order.includes(t.id))] : sortedTeams();
  const done = list.length && list.every(t => t.number), n = list.length;
  const sub = animSub(an, an?.a.order.length, "", "Resultado do sorteio") || (done ? "Resultado do sorteio" : list.some(t => t.number) ? "Sorteio em andamento…" : "Aguardando o sorteio…");
  const card = t => {
    const s = an ? an.st(t.id) : (t.number ? "done" : "none");
    const shown = s === "wait" || s === "none" || an?.count ? "XX" : s === "spin" ? pad2(1 + Math.floor(an.t / 90 + t.name.length) % Math.max(n, 2)) : noLabel(t);
    const cls = an?.count ? "wait" : s === "spin" ? "cur spin" : s === "just" ? "cur got" : s === "done" ? "got" : s === "wait" ? "wait" : "";
    return `<div class="tv-dc ${cls}"><span class="tv-num">${shown}</span><span class="n">${esc(t.name)}<small>${esc(schoolText(t))}</small></span></div>`;
  };
  return `<div class="tv tv-rank tv-draw"><div class="tv-mode">🎲 SORTEIO DA NUMERAÇÃO</div><div class="tv-draw-sub">${sub}</div>
    <div class="tv-draw-grid">${list.map(card).join("")}</div>${an?.count ? `<div class="tv-count">${an.count}</div>` : ""}</div>`;
}
function sceneColors() {
  const an = drawAnim("cores"), list = sortedTeams(), cols = sortedColors();
  const all = list.length && list.every(t => drawOf(t.id)), any = list.some(t => drawOf(t.id));
  const showGroups = all && (!an || an.finished);
  const groups = showGroups ? cols.map(c => ({ c, ts: list.filter(t => drawOf(t.id)?.id === c.id) })).filter(g => g.ts.length) : [];
  const sub = animSub(an, an?.a.order.length, "", "Resultado do sorteio · a cor vale para todas as rodadas") || (all ? "Resultado do sorteio · a cor vale para todas as rodadas" : any ? "Sorteio em andamento…" : "Aguardando o sorteio…");
  const card = t => {
    const real = drawOf(t.id), s = an ? an.st(t.id) : (real ? "done" : "none");
    const c = s === "spin" && cols.length ? cols[Math.floor(an.t / 140 + t.name.length) % cols.length] : (s === "done" || s === "just") && !an?.count ? real : null;
    const cls = an?.count ? "wait" : s === "spin" ? "cur spin" : s === "just" ? "cur got" : s === "done" ? (real ? "got" : "") : s === "wait" ? "wait" : "";
    return `<div class="tv-dc ${cls}">${c ? `<span class="tv-dot big" style="--c:${esc(c.hex)};--t:${textOn(c.hex)}">${numIn(t)}</span>` : `<span class="tv-dot big none">${numIn(t) || "?"}</span>`}<span class="n">${esc(t.name)}<small>${s === "spin" ? "sorteando…" : c ? esc(c.name) : "sem cor"}</small></span></div>`;
  };
  return `<div class="tv tv-rank tv-draw"><div class="tv-mode arena">🎨 SORTEIO DAS CORES · ARENA LIVRE</div><div class="tv-draw-sub">${sub}</div>
    <div class="tv-draw-grid">${list.map(card).join("")}</div>
    ${groups.length ? `<div class="tv-groups">${groups.map(g => `<div class="tv-group"><span class="tv-dot" style="--c:${esc(g.c.hex)};--t:${textOn(g.c.hex)}"></span><b>${esc(g.c.name)}:</b> ${g.ts.map(t => esc(t.name)).join(" · ")}</div>`).join("")}</div>` : ""}
    ${an?.count ? `<div class="tv-count">${an.count}</div>` : ""}</div>`;
}
// Roda a cada ~90 ms enquanto há animação: redesenha a cena do sorteio e toca os bipes
function animTick() {
  const a = state.display.anim; if (!a) return;
  const an = drawAnim(a.kind); if (!an) return;
  // bipes: contagem (curto), cada revelação (agudo curto) e a última (longo)
  const key = k => `anim:${a.at}:${k}`, hit = k => { if (beeped.has(key(k))) return false; beeped.add(key(k)); return true; };
  if (an.count && an.t > 0 && hit("c" + an.count)) beep("warn");
  a.order.forEach((id, i) => { const s = an.t0 + i * ANIM.step + ANIM.spin; if (an.t >= s && an.t < s + 1200 && hit("r" + i)) beep(i === a.order.length - 1 ? "end" : "start"); });
  if (state.display.mode !== a.kind) return;
  const html = telaoScene();
  ["tvScene"].forEach(idv => { const el = document.getElementById(idv); if (el && (TELAO_WINDOW || document.body.classList.contains("telao-full"))) el.innerHTML = html; });
  const pv = document.querySelector(".tv-preview .tv-frame"); if (pv && !TELAO_WINDOW) pv.innerHTML = html;
}
setInterval(animTick, 90);
function telaoScene() {
  const d = state.display, cur = state.free.current, live = liveMatch();
  if (d.mode === "extras") return sceneExtras(); // só quando escolhido (nunca no automático)
  if (d.mode === "numeros") return sceneNumbers();
  if (d.mode === "cores") return sceneColors();
  if (d.mode === "arena") return sceneFreeRank();
  if (d.mode === "cup") return sceneCupRank();
  if (d.mode === "bracket") return sceneBracket();
  if (d.mode === "geral") return sceneGeral();
  if (d.mode === "crono") return sceneCrono();
  if (d.mode.startsWith("podio-")) return scenePodium(d.mode.slice(6));
  if (cur) return sceneFree(cur);
  if (live) return sceneMatch(live);
  const champ = champion();
  if (champ) return `<div class="tv tv-champ"><div class="tv-trophy">🏆</div><div class="tv-label">VENCEDOR - CONFRONTO DIRETO · ROBÔ ESTOURA BALÃO</div><div class="tv-team">${esc(champ.name)}</div><div class="tv-school">${esc(schoolText(champ))}</div></div>`;
  const nf = nextFree(), nm = nextMatch();
  return `<div class="tv tv-idle"><img src="assets/robosapiens.png" alt="RoboSapiens" class="tv-logo"><div class="tv-title">Robô Estoura Balão</div>
    <div class="tv-next">${nm && prelims().some(m => m.status !== "pending") || (nm && !nf) ? `<span>PRÓXIMO CONFRONTO</span><b>${esc(teamName(nm.a))} × ${esc(teamName(nm.b))}</b><small>${esc(matchLabel(nm))}</small>`
      : nf ? `<span>PRÓXIMA NA ARENA LIVRE · RODADA ${nf.round}</span><b>${esc(teamName(nf.teamId))}</b><small>${esc(schoolText(findTeam(nf.teamId)))}</small>${drawOf(nf.teamId) ? `<small>${colorChip(drawOf(nf.teamId))}</small>` : ""}` : `<span>AGUARDE</span><b>Em instantes</b>`}</div>${nf && teams().some(t => drawOf(t.id)) && !(nm && prelims().some(m => m.status !== "pending")) ? `<div class="tv-colors">${sortedTeams().map(t => { const c = drawOf(t.id); return c ? `<div class="tv-ci ${nf.teamId === t.id ? "next" : ""}"><span class="tv-dot" style="--c:${esc(c.hex)};--t:${textOn(c.hex)}">${numIn(t)}</span><b>${esc(t.name)}</b><small>${esc(c.name)}</small></div>` : ""; }).join("")}</div>` : ""}</div>`;
}
function sceneFree(cur) {
  const t = findTeam(cur.teamId), total = attemptTotal(cur), tm = cur.timer;
  const nx = nextFree();
  return `<div class="tv tv-free" style="--c:${esc(cur.color?.hex || "#159447")}">
    <div class="tv-mode arena">🎈 ARENA LIVRE · RODADA ${cur.round} DE ${state.settings.freeRounds}</div>
    <div class="tv-team">${esc(t.name)}</div><div class="tv-school">${esc(schoolText(t))}</div>
    <div class="tv-grid">
      <div class="tv-color"><div class="tv-balloon" style="--c:${esc(cur.color?.hex || "#999")};--t:${textOn(cur.color?.hex || "#999")}">${numIn(findTeam(cur.teamId))}</div><span>COR DA EQUIPE</span><b>${esc(cur.color?.name || "")}</b></div>
      <div class="tv-timer ${tm.status}" data-timer="free">${fmt(left(tm))}</div>${inPrep(tm) ? `<div class="tv-prep">PREPARAR</div>` : ""}
      <div class="tv-score"><span>PONTOS</span><b class="${total < 0 ? "minus" : ""}">${signed(total)}</b></div>
    </div>
    <div class="tv-rules">${rulesFree()}</div>
    ${nx && !XMODE ? `<div class="tv-foot">A seguir: <b>${esc(teamName(nx.teamId))}</b> · Rodada ${nx.round}</div>` : ""}
  </div>`;
}
function sceneMatch(m) {
  const a = findTeam(m.a), b = findTeam(m.b), sa = sideScore(m, "a"), sb = sideScore(m, "b");
  const ph = { r1: "ROUND 1", break: "INTERVALO", r2: "ROUND 2", r3: `ROUND 3 · ${(R3_NAME[m.r3] || "desempate").toUpperCase()}`, review: "RESULTADO" }[m.phase];
  return `<div class="tv tv-match">
    <div class="tv-mode cup">⚔️ CONFRONTO DIRETO · ${esc(matchLabel(m)).toUpperCase()}</div>
    <div class="tv-phase">${ph}${m.timer.status === "paused" ? " · PAUSADO" : ""}${inPrep(m.timer) ? " · PREPARAR" : ""}</div>
    ${m.phase === "review" ? "" : `<div class="tv-timer ${m.timer.status}" data-timer="match">${fmt(left(m.timer))}</div>`}
    <div class="tv-vs">
      <div class="tv-side a"><div class="tv-team">${esc(a?.name)}</div><div class="tv-school">${esc(schoolText(a))}</div><div class="tv-big">${sa}</div></div>
      <div class="tv-x">×</div>
      <div class="tv-side b"><div class="tv-team">${esc(b?.name)}</div><div class="tv-school">${esc(schoolText(b))}</div><div class="tv-big">${sb}</div></div>
    </div>
    <div class="tv-rules">${rulesCup()}</div>
    ${inPrep(m.timer) ? `<div class="tv-prep">PREPARAR</div>` : ""}
  </div>`;
}
function tvHidden(title) { return `<div class="tv tv-rank" style="--f:${tvFit()}"><div class="tv-mode">${title}</div><div class="tv-hidden">🔒<b>Resultado será revelado em instantes</b></div></div>`; }
function sceneFreeRank() {
  if (!state.display.reveal) return tvHidden("🎈 CLASSIFICAÇÃO · ARENA LIVRE");
  const rk = freeRanking();
  return `<div class="tv tv-rank" style="--f:${tvFit()}"><div class="tv-mode arena">🎈 CLASSIFICAÇÃO · ARENA LIVRE</div><div class="tv-table">${rk.map((x, i) => `<div class="tv-row ${i < 3 ? "top" : ""}"><span class="p">${i + 1}º</span><span class="n">${esc(x.team.name)}<small>${esc(schoolText(x.team))}</small></span><b>${x.done ? signed(x.total) : "—"}</b></div>`).join("")}</div></div>`;
}
// Classificações no telão: todas as equipes sempre cabem na tela (16:9); acima de 7, as linhas encolhem
function tvFit() { return Math.min(1, 7 / Math.max(1, teams().length)).toFixed(3); }
function sceneCupRank() {
  if (!state.display.reveal) return tvHidden("⚔️ CLASSIFICAÇÃO · CONFRONTO DIRETO");
  const rows = standings(), done = prelimDone();
  if (!rows.length) return tvHidden("⚔️ CLASSIFICAÇÃO · CONFRONTO DIRETO");
  return `<div class="tv tv-rank" style="--f:${tvFit()}"><div class="tv-mode cup">⚔️ CLASSIFICAÇÃO · FASE PRELIMINAR</div><div class="tv-table">${(Q => rows.map(r => `<div class="tv-row ${done && Q.has(r.team.id) ? "top" : ""} ${done && !Q.has(r.team.id) ? "out" : ""}"><span class="p">${r.pos}º</span><span class="n">${esc(r.team.name)}<small>${esc(schoolText(r.team))} · ${r.J}J ${r.V}V ${r.E}E ${r.D}D</small></span><b>${signed(r.SG)}</b></div>`).join(""))(new Set(done ? seeds() : []))}</div></div>`;
}
function sceneBracket() {
  const [s1, s2] = semis(), f = finalMatch(), th = thirdMatch(), champ = champion(), rv = state.display.reveal, third = cupPlaces()[2], sp = seedByCup() ? "Confronto" : "Geral";
  const line = (m, side, ph) => { const id = m?.[side], w = m && winnerOf(m) === id && id; return `<div class="tv-bt ${w ? "w" : ""}"><span>${id ? esc(teamName(id)) : ph}</span>${m?.status === "done" && rv ? `<b>${sideScore(m, side)}</b>` : ""}</div>`; };
  return `<div class="tv tv-bracket"><div class="tv-mode cup">🏅 FASE ELIMINATÓRIA</div><div class="tv-seed">Semifinais pela ${esc(seedByCup() ? "classificação do Confronto Direto (saldo da fase preliminar)" : "Classificação Geral (Arena Livre + saldo da fase preliminar)")}</div><div class="tv-bk">
    <div class="tv-col"><div class="tv-bm"><small>SEMIFINAL 1</small>${line(s1, "a", `1º ${sp}`)}${line(s1, "b", `4º ${sp}`)}</div><div class="tv-bm"><small>SEMIFINAL 2</small>${line(s2, "a", `2º ${sp}`)}${line(s2, "b", `3º ${sp}`)}</div></div>
    <div class="tv-col"><div class="tv-bm final"><small>FINAL</small>${line(f, "a", "Vencedor SF1")}${line(f, "b", "Vencedor SF2")}</div>${cfg().cupThird || th ? `<div class="tv-bm"><small>DISPUTA DE 3º LUGAR</small>${line(th, "a", "Perdedor SF1")}${line(th, "b", "Perdedor SF2")}</div>` : ""}</div>
    <div class="tv-col"><div class="tv-bm champ"><div class="tv-trophy sm">🏆</div><small>VENCEDOR - CONFRONTO DIRETO</small><b>${champ ? esc(champ.name) : "A definir"}</b>${third ? `<small class="tv-third">🥉 3º lugar: ${esc(teamName(third))}</small>` : ""}</div></div>
  </div></div>`;
}
function telao() {
  const d = state.display;
  const opt = (v, l) => `<button class="btn ${d.mode === v ? "primary" : ""}" onclick="setDisplay('${v}')">${l}</button>`;
  main().innerHTML = head("Telão", "O que o público vê. Abra numa segunda janela e arraste para o projetor/TV.",
    JUIZ ? "" : `<button class="btn primary big" onclick="openTelaoWindow()">📺 Abrir janela do telão</button><button class="btn big" onclick="fullTelao()">⛶ Tela cheia aqui</button>`) +
    (JUIZ ? `<div class="notice mb">📱 Você controla o telão do note: o que escolher aqui aparece no telão na hora.</div>` : "") +
    `<div class="card"><h2>Exibir no telão</h2><div class="actions">${opt("auto", "⚡ Automático (ao vivo)")}${opt("arena", "🎈 Classificação Arena Livre")}${opt("cup", "⚔️ Classificação Confronto Direto")}${opt("bracket", "🏅 Chaveamento")}${opt("numeros", "🎲 Sorteio da numeração")}${opt("cores", "🎨 Sorteio das cores")}${opt("geral", "🏆 Classificação Geral")}${opt("crono", "🗓️ Cronograma")}${opt("podio-cup", "🥇 Pódio Confronto Direto")}${opt("podio-geral", "🥇 Pódio Classificação Geral")}${opt("podio-arena", "🥇 Pódio Arena Livre")}${opt("extras", "🧪 Sessão Extras (fora da competição)")}</div>
      <div class="actions mt-s"><button class="btn ${d.reveal ? "primary" : ""}" onclick="toggleTvReveal()">${d.reveal ? "🙈 Ocultar pontuação no telão" : "👁️ Revelar pontuação no telão"}</button><span class="muted small">No modo automático o telão mostra a equipe na Arena Livre ou o confronto em andamento. Classificações só aparecem quando reveladas.</span></div></div>
    ${netCard()}
    <div class="tv-preview mt"><div class="tv-frame">${telaoScene()}</div></div>`;
}
function netCard() {
  if (NET.on && NET.local) return `<details class="card mt fold"><summary><b>🖥️ Telão em outro PC (rede local)</b> ${NET.ok ? `<span class="chip done">🟢 ativo</span>` : `<span class="chip live">🟠 servidor sem resposta</span>`}</summary>
    <p class="muted small mt-s">No PC do telão (mesma rede/Wi-Fi), abra no navegador um destes endereços e dê duplo clique para tela cheia:</p>
    <div class="net-urls">${NET.urls.length ? NET.urls.map(u => `<code>${esc(u)}</code>`).join("") : `<span class="muted">Nenhum endereço de rede encontrado — confira se este PC está conectado à rede.</span>`}</div></details>`;
  return `<details class="card mt fold"><summary><b>🖥️ Telão em outro PC</b></summary><p class="muted small mt-s">Para usar dois computadores (um registra, outro exibe), abra o sistema pelo <b>iniciar-servidor.bat</b> neste PC. Ele mostra o endereço para abrir no PC do telão. Veja o README.</p></details>`;
}
// Topo: deixa sempre visível o que o público está vendo no telão
function updateTvPill() {
  const el = document.getElementById("tvPill"); if (!el) return;
  const d = officialState().display; // o telão mostra sempre a competição oficial
  const mode = { auto: "automático", arena: "classif. Arena Livre", cup: "classif. Confronto", bracket: "chaveamento", geral: "classif. Geral", crono: "cronograma", numeros: "sorteio da numeração", cores: "sorteio das cores", "podio-cup": "pódio Confronto", "podio-geral": "pódio Geral", "podio-arena": "pódio Arena", extras: "🧪 sessão Extras" }[d.mode];
  el.innerHTML = `📺 Telão: ${mode} · ${d.reveal ? "<b>pontuação VISÍVEL</b>" : "pontuação oculta"}`;
  el.classList.toggle("on", !!d.reveal);
}
function setDisplay(mode) { state.display.mode = mode; save(); render(); }
// Coloca no telão a tela do sorteio (antes de sortear já mostra as equipes; ao sortear, atualiza sozinha)
function showOnTv(mode) { setDisplay(mode); toast(mode === "numeros" ? "Telão: sorteio da numeração" : "Telão: sorteio das cores"); }
// Ao começar a prova, o telão sai da tela de sorteio e volta ao automático
// uma tentativa/confronto OFICIAL começando tira o telão dos sorteios e da sessão Extras (volta ao automático)
function leaveDrawScreen() { if (["numeros", "cores", "extras"].includes(state.display.mode)) state.display.mode = "auto"; }
function toggleTvReveal() { state.display.reveal = !state.display.reveal; save(); render(); }
function openTelaoWindow() {
  const w = window.open(location.pathname + "#telao", "telao_estoura_baloes", "width=1280,height=720");
  if (!w) warn("O navegador bloqueou a janela. Permita pop-ups ou use “Tela cheia aqui”.");
}
function fullTelao() {
  document.body.classList.add("telao-full");
  const box = document.getElementById("tvFull"); box.classList.remove("hidden"); box.innerHTML = `<button class="tv-exit" onclick="exitTelao()">✕ Sair</button><div id="tvScene">${telaoScene()}</div><div id="tvPops" aria-hidden="true"></div>`;
  tvPops();
  document.documentElement.requestFullscreen?.().catch(() => { });
  updateTimers();
}
function exitTelao() {
  document.body.classList.remove("telao-full"); document.getElementById("tvFull").classList.add("hidden");
  if (document.fullscreenElement) document.exitFullscreen?.();
}
// Botão do telão: entra em tela cheia (some enquanto estiver em tela cheia)
function tvFullscreen() { document.documentElement.requestFullscreen?.().catch(() => warn("O navegador não permitiu a tela cheia. Use F11.")); }
function updateFsBtn() { document.getElementById("fsBtn")?.classList.toggle("hidden", !!document.fullscreenElement); }
function renderTelaoWindow() {
  document.body.classList.add("telao-window");
  const box = document.getElementById("tvFull"); box.classList.remove("hidden");
  if (!document.getElementById("tvScene")) {
    box.innerHTML = `<div id="tvScene"></div><div id="tvPops" aria-hidden="true"></div><div class="tv-hint">Duplo clique ou F11 = tela cheia</div><button id="fsBtn" class="tv-fs" onclick="tvFullscreen()">⛶ Tela cheia</button><button id="soundHint" class="tv-sound hidden" onclick="getAudio();this.classList.add('hidden')">🔈 Clique aqui para ativar o som do telão</button><div id="netWarn" class="net-warn hidden">⚠ Sem conexão com o PC de registro — tentando novamente…</div>`;
  }
  document.getElementById("tvScene").innerHTML = telaoScene();
  document.getElementById("netWarn").classList.toggle("hidden", !(NET.on && !NET.ok));
  document.getElementById("soundHint").classList.toggle("hidden", !cfg().soundTv || getAudio()?.state === "running");
  tvPops(); updateTimers();
}
/* Mostra um "+50"/"+100" grande no telão a cada nova marcação */
const popSeen = new Set(); let popInit = false;
// no telão em "Sessão Extras" os destaques são os da sessão (os oficiais só são marcados como vistos)
function tvPops() {
  if (state.display.mode !== "extras") return tvPopsCore();
  tvPopsCore(true); const xs = extrasView(); if (xs) withXState(xs, () => tvPopsCore());
}
function tvPopsCore(silent = false) {
  const layer = document.getElementById("tvPops"); if (!layer) return;
  const evs = [];
  const cur = state.free.current;
  if (cur) cur.events.forEach(e => evs.push({ e, side: "c", color: cur.color?.hex }));
  const m = liveMatch();
  if (m) [1, 2, 3].forEach(r => (m.rounds[r]?.events || []).forEach(e => evs.push({ e, side: e.side, color: e.pts >= 0 ? "#2463c9" : "#d33434" })));
  const novos = evs.filter(x => !popSeen.has(x.e.id));
  evs.forEach(x => popSeen.add(x.e.id));
  if (!popInit || silent) { popInit = true; return; }
  novos.slice(-3).forEach(x => {
    const d = document.createElement("div");
    d.className = `tv-pop ${x.side} ${x.e.pts < 0 ? "neg" : "pos"}`;
    d.style.setProperty("--c", x.color || "#159447");
    d.innerHTML = `<b>${esc(signed(x.e.pts))}</b><span>${esc(x.e.label)}</span>`;
    layer.appendChild(d); setTimeout(() => d.remove(), 1900);
  });
}
