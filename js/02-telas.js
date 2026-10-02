"use strict";
/* RoboSapiens 2026 — Robô Estoura Balão · js/02-telas.js: Equipes, navegação, Início, Cronograma, telas de Equipes e Cores.
   Os arquivos js/01…08 são scripts comuns carregados em ordem pelo index.html e compartilham o escopo global. */
/* ============================ EQUIPES / CORES ============================ */
const teams = () => state.teams;
// equipes em disputa (sem as desclassificadas): usadas nas filas, classificações e chaveamento
const activeTeams = () => state.teams.filter(t => !t.disq);
const isDisq = id => !!findTeam(id)?.disq;
// Equipes sem numeração (antes do sorteio) ficam por último, em ordem alfabética
const numKey = t => (t && t.number) ? t.number : 1e9;
const byNum = (a, b) => numKey(a) - numKey(b) || a.name.localeCompare(b.name);
const sortedTeams = () => [...state.teams].sort(byNum);
const findTeam = id => state.teams.find(t => t.id === id) || null;
const teamName = (id, fb = "A definir") => findTeam(id)?.name || fb;
const schoolText = t => t && t.school ? t.school : "Escola não informada";
const numIn = t => t?.number ? pad2(t.number) : ""; // número do sorteio dentro do círculo da cor
const teamNo = t => t?.number ? `Equipe ${pad2(t.number)}` : "Equipe XX";
const noLabel = t => t?.number ? pad2(t.number) : "XX";
const sortedColors = () => [...state.colors].sort((a, b) => a.number - b.number);
function colorChip(c, big = false) {
  if (!c) return `<span class="muted">Sem cor</span>`;
  return `<span class="cchip ${big ? "big" : ""}" style="--c:${esc(c.hex)};--t:${textOn(c.hex)}"><i></i><span>${esc(c.name)}</span></span>`;
}
function teamCell(t, extra = "") {
  return `<div class="tcell"><b>${esc(t?.name || "A definir")}</b><small>${esc(t ? schoolText(t) : "")}</small>${extra}</div>`;
}
const hide = (v, cls = "") => reveal ? `<b class="${cls}">${v}</b>` : `<span class="score-hidden" aria-label="Oculto">••</span>`;
function eyeBtn() {
  return `<button class="btn eye ${reveal ? "on" : ""}" onclick="toggleReveal()" aria-pressed="${reveal}" title="${reveal ? "Ocultar" : "Revelar"} pontuação">${reveal ? "🙈 Ocultar pontuação" : "👁️ Pontuação"}</button>`;
}
function toggleReveal() { reveal = !reveal; render(); }

/* ============================ NAVEGAÇÃO ============================ */
function nav(view) {
  if (CMD_RUN) { render(); return; } // comando de juiz no note: não troca a tela de quem está no note
  if (JUIZ && !JUDGE_VIEWS.includes(view)) return warn("No celular do juiz: Início, Cronograma, Equipes (sorteio), Arena Livre, Confronto Direto, classificações, Pódio e Telão.");
  if (XMODE) {
    // dentro de Extras, as funções do jogo pedem a tela da Arena/Confronto: fica na guia Extras
    if (["arena", "confrontos", "extras"].includes(view)) { state.view = "extras"; save(); render(); window.scrollTo({ top: 0 }); return; }
    exitExtras(); // qualquer outra guia: volta ao estado oficial antes de abrir
  }
  if (view === "extras") return enterExtras();
  state.view = view; save(); render(); window.scrollTo({ top: 0 });
}
function render() {
  if (NO_RENDER) return; // tique do cronômetro oficial em segundo plano (durante Extras)
  if (TELAO_WINDOW) { renderTelaoWindow(); return; }
  document.body.classList.toggle("x-mode", XMODE);
  const v = state.view;
  document.querySelectorAll(".nav-btn").forEach(b => { b.classList.toggle("active", b.dataset.view === v); if (b.dataset.view === v) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  ({ inicio, crono, equipes, cores, arena, confrontos, geral, podio, telao, config, extras })[v]();
  document.querySelectorAll("#main thead th").forEach(th => th.setAttribute("scope", "col"));
  updateTvPill(); updateBkPill();
  updateTimers();
}
const MODE_TAGS = { arena: "🎈 ARENA LIVRE · classificação própria", cup: "⚔️ CONFRONTO DIRETO · classificação própria", geral: "🏆 ARENA LIVRE + CONFRONTO DIRETO" };
function head(title, sub, action = "", mode = "", compact = false) {
  return `<div class="page-head ${compact ? "compact" : ""}"><div>${mode ? `<span class="mode-tag ${mode}">${MODE_TAGS[mode]}</span>` : ""}<h1>${title}</h1>${sub && !compact ? `<p>${sub}</p>` : ""}</div>${action ? `<div class="head-actions">${action}</div>` : ""}</div>`;
}

/* ============================ INÍCIO ============================ */
function inicio() {
  const fs = freeSummary(), cs = cupSummary(), champ = champion();
  const cur = state.free.current, live = liveMatch();
  let now = `<div class="empty-sm">Nada em andamento.</div>`;
  if (cur) now = `<div class="now-item"><span class="tag arena">ARENA LIVRE</span><b>${esc(teamName(cur.teamId))}</b><span>Rodada ${cur.round} · ${colorChip(cur.color)}</span><button class="btn primary" onclick="nav('arena')">Abrir Arena Livre</button></div>`;
  else if (live) now = `<div class="now-item"><span class="tag cup">CONFRONTO DIRETO</span><b>${esc(teamName(live.a))} × ${esc(teamName(live.b))}</b><span>${esc(matchLabel(live))}</span><button class="btn primary" onclick="nav('confrontos')">Abrir Confronto Direto</button></div>`;
  const nf = nextFree(), nm = nextMatch();
  main().innerHTML = head("Central da Competição", "Modalidade Robô Estoura Balão · Ensino Fundamental") +
    (champ ? `<div class="champion-banner"><div class="trophy">🏆</div><div><div class="eyebrow">VENCEDOR - CONFRONTO DIRETO</div><h2>${esc(champ.name)}</h2><p>${esc(schoolText(champ))}</p></div></div>` : "") +
    `<div class="grid g4">
      ${stat("Equipes", teams().length, "👥", "cadastradas")}
      ${stat("Cores", state.colors.length, "🎨", "de balões")}
      ${stat("Arena Livre", `${fs.done}/${fs.total}`, "🎈", "tentativas realizadas")}
      ${stat("Confronto Direto", cs.total ? `${cs.done}/${cs.total}` : "—", "⚔️", cs.total ? cs.stageText : "fase preliminar não gerada")}
    </div>
    <div class="grid g2 mt">
      <div class="card"><h2>Agora</h2>${now}${(() => { const a = currentActivity(), nx = nextActivity(); return a || nx ? `<div class="sch-now mt-s" onclick="nav('crono')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();nav('crono')}" role="button" tabindex="0">🗓️ ${a ? `<b>${hFmt(a.start)} às ${hFmt(a.end)} · ${esc(a.title)}</b>` : "Nenhuma atividade agora"}${nx ? `<span class="muted small">A seguir: ${hFmt(nx.start)} · ${esc(nx.title)}</span>` : ""}</div>` : ""; })()}</div>
      <div class="card"><h2>Próximos</h2>
        <div class="next-list">
          <div><span class="tag arena">ARENA LIVRE</span> ${nf ? `<b>${esc(teamName(nf.teamId))}</b> · Rodada ${nf.round}` : `<span class="muted">${fs.total ? "Concluída ✓" : "Cadastre equipes"}</span>`}</div>
          <div><span class="tag cup">CONFRONTO DIRETO</span> ${nm ? `<b>${esc(teamName(nm.a))} × ${esc(teamName(nm.b))}</b> · ${esc(matchLabel(nm))}` : `<span class="muted">${cs.total ? (champ ? "Competição encerrada ✓" : "Aguardando próxima fase") : "Gere a fase preliminar"}</span>`}</div>
        </div>
      </div>
    </div>
    <div class="steps mt">
      <button class="step" onclick="nav('equipes')"><i>1</i><b>Equipes</b><span>Confira nomes e escolas</span></button>
      <button class="step" onclick="nav('cores')"><i>2</i><b>Cores</b><span>Cores dos balões (até 8)</span></button>
      <button class="step" onclick="nav('arena')"><i>3</i><b>Arena Livre</b><span>Uma equipe por vez · até ${state.settings.freeRounds} rodadas</span></button>
      <button class="step" onclick="nav('confrontos')"><i>4</i><b>Confronto Direto</b><span>Preliminar → Semifinais → Final</span></button>
      <button class="step" onclick="nav('geral')"><i>5</i><b>Classificação Geral</b><span>Arena Livre + Confronto Direto</span></button>
      <button class="step" onclick="nav('telao')"><i>📺</i><b>Telão</b><span>Tela para o público</span></button>
    </div>
    <div class="card mt"><h2>Regras essenciais</h2>
      <div class="grid g2">
        <div class="notice"><b>🎈 Arena Livre</b> — 2,70 × 2,70 m · uma equipe por vez · ${state.settings.freeSeconds} s por tentativa · ${rulesFree()}</div>
        <div class="notice cup"><b>⚔️ Confronto Direto</b> — 1,20 × 1,20 m · ${rulesCupTime()} · ${rulesCup()}</div>
      </div>
      <p class="muted small mt-s">A Arena Livre e o Confronto Direto têm classificações separadas.</p>
    </div>`;
}
function stat(label, value, icon, sub) { return `<div class="card stat"><div class="icon">${icon}</div><div class="label">${label}</div><div class="value">${value}</div><div class="sub">${sub}</div></div>`; }

/* ============================ TELA: CRONOGRAMA ============================ */
// "08:00" -> "8h" · "09:30" -> "9h30"
function hFmt(v) { if (!v) return "—"; const [h, m] = v.split(":").map(Number); return `${h}h${m ? pad2(m) : ""}`; }
const rich = t => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
const nowHHMM = () => { const d = new Date(Date.now() + (TELAO_WINDOW && NET.on ? NET.offset : 0)); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
function scheduleStatus(x, now = nowHHMM()) { if (!x.start || !x.end) return ""; return now >= x.end ? "past" : now >= x.start ? "now" : "future"; }
function currentActivity() { const n = nowHHMM(); return state.schedule.find(x => scheduleStatus(x, n) === "now") || null; }
function nextActivity() { const n = nowHHMM(); return state.schedule.find(x => x.start && x.start > n) || null; }
function crono() {
  const cur = currentActivity();
  const rows = state.schedule.map(x => { const st = scheduleStatus(x); return `<tr class="st-${st}">
      <td class="sch-time"><b>${hFmt(x.start)} às ${hFmt(x.end)}</b>${st === "now" ? `<span class="chip live">● agora</span>` : ""}</td>
      <td><b>${esc(x.title)}</b></td><td class="sch-detail">${rich(x.detail)}</td>
      <td class="sch-act"><button class="btn tiny" onclick="scheduleForm('${esc(x.id)}')" aria-label="Editar ${esc(x.title)}">✏️ Editar</button><button class="btn tiny danger" onclick="deleteActivity('${esc(x.id)}')" aria-label="Excluir ${esc(x.title)}">🗑</button></td></tr>`; }).join("");
  main().innerHTML = head("Cronograma", `${state.schedule.length} atividades · ${state.schedule.length ? `${hFmt(state.schedule[0].start)} às ${hFmt(state.schedule[state.schedule.length - 1].end)}` : ""}${cur ? ` · agora: <b>${esc(cur.title)}</b>` : ""}`,
    `<button class="btn" onclick="setDisplay('crono');openTelaoWindow()">📺 Mostrar no telão</button><button class="btn primary" onclick="scheduleForm()">+ Nova atividade</button>`) +
    `<div class="card"><div class="table-wrap"><table class="table sched" aria-label="Cronograma"><thead><tr><th>Horário</th><th>Atividade</th><th>Detalhamento</th><th></th></tr></thead><tbody>${rows || `<tr><td colspan="4">Nenhuma atividade. Clique em <b>+ Nova atividade</b>.</td></tr>`}</tbody></table></div>
    <p class="muted small mt-s">As atividades ficam em ordem de horário. A atividade em andamento é destacada pelo relógio deste computador. Para negrito no detalhamento, use **texto**.</p>
    <div class="actions mt-s"><button class="btn small ghost" onclick="restoreSchedule()">↻ Restaurar cronograma padrão</button></div></div>`;
}
function scheduleForm(id) {
  const x = id ? state.schedule.find(a => a.id === id) : null;
  const last = state.schedule[state.schedule.length - 1];
  openModal(`<h2>${x ? "Editar atividade" : "Nova atividade"}</h2><form id="schF"><div class="form-grid">
      <div><label>Início *</label><input name="start" type="time" required value="${esc(x ? x.start : last?.end || "08:00")}"></div>
      <div><label>Fim *</label><input name="end" type="time" required value="${esc(x?.end || "")}"></div>
      <div class="full"><label>Atividade *</label><input name="title" required maxlength="80" value="${esc(x?.title)}" placeholder="Ex.: Etapa 1 — Arena Livre"></div>
      <div class="full"><label>Detalhamento</label><textarea name="detail" rows="4" maxlength="600" placeholder="Descrição da atividade (use **texto** para negrito)">${esc(x?.detail)}</textarea></div>
    </div><div class="actions mt"><button class="btn primary big">Salvar</button><button type="button" class="btn big" onclick="closeModal()">Cancelar</button></div></form>`);
  document.getElementById("schF").onsubmit = e => {
    e.preventDefault(); const f = new FormData(e.target), F = e.target; fieldErr(F);
    const data = { start: str(f.get("start")), end: str(f.get("end")), title: str(f.get("title")), detail: str(f.get("detail")) };
    if (!data.start) return fieldErr(F, "start", "Informe o horário de início.");
    if (!data.end) return fieldErr(F, "end", "Informe o horário de fim.");
    if (data.end <= data.start) return fieldErr(F, "end", "O fim precisa ser depois do início.");
    if (!data.title) return fieldErr(F, "title", "Informe o nome da atividade.");
    scheduleSave(id || null, data);
  };
}
// Grava a atividade (separada da janela para poder vir do celular do juiz)
function scheduleSave(id, data) {
  const hh = v => /^([01]\d|2[0-3]):[0-5]\d$/.test(str(v)) ? str(v) : "";
  data = { start: hh(data?.start), end: hh(data?.end), title: str(data?.title).slice(0, 80), detail: str(data?.detail).slice(0, 600) };
  if (!data.start || !data.end || data.end <= data.start || !data.title) return warn("Atividade inválida: confira os horários e o nome.");
  const x = id ? state.schedule.find(a => a.id === id) : null;
  if (id && !x) return warn("Essa atividade não existe mais no cronograma.");
  {
    logEv(x ? `Cronograma: atividade editada — ${hFmt(data.start)} às ${hFmt(data.end)} ${data.title}${x.title !== data.title || x.start !== data.start || x.end !== data.end ? ` (antes: ${hFmt(x.start)} às ${hFmt(x.end)} ${x.title})` : ""}` : `Cronograma: atividade incluída — ${hFmt(data.start)} às ${hFmt(data.end)} ${data.title}`);
    if (x) Object.assign(x, data); else state.schedule.push({ id: uid(), ...data });
    state = normalize(state); save(); if (!CMD_RUN) closeModal(); toast(x ? "Atividade atualizada" : "Atividade incluída"); render();
  }
}
function deleteActivity(id) {
  const x = state.schedule.find(a => a.id === id); if (!x) return;
  if (!confirm(`Excluir a atividade "${x.title}" (${hFmt(x.start)} às ${hFmt(x.end)})?`)) return;
  state.schedule = state.schedule.filter(a => a.id !== id); logEv(`Cronograma: atividade excluída — ${hFmt(x.start)} às ${hFmt(x.end)} ${x.title}`);
  save(); toast("Atividade excluída"); render();
}
function restoreSchedule() {
  if (!confirm("Substituir o cronograma atual pelo cronograma padrão?")) return;
  state.schedule = defaultSchedule(); logEv("Cronograma restaurado para o padrão"); save(); toast("Cronograma restaurado"); render();
}

/* ============================ TELA: EQUIPES ============================ */
function equipes() {
  const started = state.free.attempts.length || state.free.current || state.cup.matches.length;
  const cards = sortedTeams().map(t => `<div class="card team-card">
      <div class="team-top"><span class="team-num">${teamNo(t)}</span></div>
      <div class="team-name">${esc(t.name)}</div>
      <div class="team-school"><span class="school-label">ESCOLA</span>${esc(schoolText(t))}</div>
      ${t.robot || t.professor ? `<div class="team-meta">${t.robot ? `<span>🤖 Robô: ${esc(t.robot)}</span>` : ""}${t.professor ? `<span>👨‍🏫 ${esc(t.professor)}</span>` : ""}</div>` : ""}
      ${t.members ? `<div class="team-members"><span class="school-label">INTEGRANTES</span>${esc(t.members)}</div>` : ""}
      ${t.disq ? `<div class="notice warn mt-s">🚫 <b>Desclassificada</b> · ${esc(t.disq.reason)} <span class="muted small">(${esc(fmtDate(t.disq.at))})</span></div>` : ""}
      ${JUIZ ? "" : `<div class="team-actions"><button class="btn small" onclick="editTeam('${esc(t.id)}')">✏️ Editar</button>${started ? (t.disq ? `<button class="btn small" onclick="undoDisqualify('${esc(t.id)}')">↺ Reverter desclassificação</button>` : `<button class="btn small danger" onclick="disqualify('${esc(t.id)}')">🚫 Desclassificar</button>`) : ""}<button class="btn small danger" onclick="deleteTeam('${esc(t.id)}')">🗑 Excluir</button></div>`}
    </div>`).join("");
  main().innerHTML = head("Equipes", `${teams().length} equipes cadastradas.`,
    `${teams().some(t => t.number) ? `<button class="btn small ghost" onclick="clearNumbers()">Limpar numeração</button>` : ""}<button class="btn" onclick="showOnTv('numeros')">📺 Mostrar no telão</button><button class="btn" onclick="drawNumbers()">🎲 Sortear numeração</button>${JUIZ ? "" : `<button class="btn primary" onclick="teamForm()">+ Nova equipe</button>`}`) +
    (JUIZ ? `<div class="notice mb">📱 Pelo celular do juiz: sorteio da numeração e telão. Cadastro, edição e desclassificação de equipes ficam no note.</div>` : "") +
    (teams().length && !teams().every(t => t.number) ? `<div class="notice mb">Equipes sem numeração aparecem como <b>Equipe XX</b>. Use <b>🎲 Sortear numeração</b> antes de gerar os confrontos.</div>` : "") +
    (started ? `<div class="notice warn mb">A competição já começou. Alterar nomes é seguro; excluir equipes ou refazer o sorteio pode exigir reiniciar etapas.</div>` : "") +
    `<div class="grid g3">${cards || `<div class="empty span-all">Nenhuma equipe cadastrada. Clique em <b>+ Nova equipe</b>.</div>`}</div>`;
}
function teamForm(id) {
  const t = id ? findTeam(id) : null;
  openModal(`<h2>${t ? "Editar equipe" : "Nova equipe"}</h2>
    <form id="teamF"><div class="form-grid">
      <div><label>Nome da equipe *</label><input name="name" required maxlength="60" value="${esc(t?.name)}"></div>
      <div><label>Escola *</label><input name="school" required maxlength="90" value="${esc(t?.school)}"></div>
      <div><label>Robô</label><input name="robot" maxlength="60" value="${esc(t?.robot)}"></div>
      <div><label>Professor(a) orientador(a)</label><input name="professor" maxlength="80" value="${esc(t?.professor)}"></div>
      <div class="full"><label>Integrantes (separe por · ou vírgula)</label><input name="members" maxlength="400" value="${esc(t?.members)}"></div>
      <div><label>Numeração (vazio = Equipe XX, até o sorteio)</label><input name="number" type="number" min="1" max="99" placeholder="XX" value="${t?.number ?? ""}"></div>
    </div>
    <div class="actions mt"><button class="btn primary big">Salvar</button><button type="button" class="btn big" onclick="closeModal()">Cancelar</button></div></form>`);
  document.getElementById("teamF").onsubmit = e => {
    e.preventDefault(); const f = new FormData(e.target);
    const data = { name: str(f.get("name")), school: str(f.get("school")), robot: str(f.get("robot")), professor: str(f.get("professor")), members: str(f.get("members")), number: str(f.get("number")) ? Math.max(1, Math.round(num(f.get("number"), 1))) : null };
    const F = e.target; fieldErr(F);
    if (!data.name) return fieldErr(F, "name", "Informe o nome da equipe.");
    if (!data.school) return fieldErr(F, "school", "Informe o nome da escola.");
    if (teams().some(x => x !== t && x.name.toLowerCase() === data.name.toLowerCase())) return fieldErr(F, "name", "Já existe uma equipe com esse nome.");
    if (data.number && teams().some(x => x !== t && x.number === data.number)) return fieldErr(F, "number", `A numeração ${pad2(data.number)} já está em uso por ${teams().find(x => x !== t && x.number === data.number).name}.`);
    logEv(t ? `Equipe editada: ${t.name}${t.name !== data.name ? ` → ${data.name}` : ""}` : `Equipe incluída: ${data.name} (${data.school})`);
    if (t) Object.assign(t, data); else state.teams.push({ id: uid(), ...data });
    save(); closeModal(); toast(t ? "Equipe atualizada" : "Equipe adicionada"); render();
  };
}
const editTeam = id => teamForm(id);
function clearNumbers() {
  if (!teams().some(t => t.number)) return warn("As equipes já estão sem numeração.");
  if (!confirm("Remover a numeração de todas as equipes? Elas voltam a aparecer como “Equipe XX” até um novo sorteio.")) return;
  teams().forEach(t => { t.number = null; }); logEv("Numeração das equipes removida"); save(); toast("Numeração removida"); render();
}
function deleteTeam(id) {
  const t = findTeam(id); if (!t) return;
  if (state.free.current?.teamId === id) return warn("A equipe está na arena agora. Cancele a tentativa antes.");
  if (state.cup.matches.some(m => m.a === id || m.b === id)) return warn("A equipe está nos confrontos. Reinicie os confrontos em Configurações para excluí-la.");
  const n = state.free.attempts.filter(a => a.teamId === id).length;
  if (!confirm(`Excluir a equipe "${t.name}"?${n ? `\n\nAs ${n} tentativa(s) dela na Arena Livre também serão apagadas.` : ""}`)) return;
  logEv(`Equipe excluída: ${t.name}`);
  state.teams = state.teams.filter(x => x.id !== id);
  state.free.attempts = state.free.attempts.filter(a => a.teamId !== id);
  delete state.free.draws[id];
  state.cup.manualOrder = state.cup.manualOrder.filter(x => x !== id);
  save(); toast("Equipe excluída"); render();
}
function drawNumbers() {
  if (!teams().length) return warn("Cadastre as equipes primeiro.");
  const note = state.cup.matches.length ? "\n\nOs confrontos já gerados NÃO mudam; para usar a nova numeração, gere a fase preliminar novamente." : "";
  if (!confirm("Sortear a numeração de todas as equipes?" + note)) return;
  const order = sortedTeams().map(t => t.id); // ordem dos cards no "antes" = ordem da revelação
  const nums = shuffle(teams().map((_, i) => i + 1));
  teams().forEach((t, i) => { t.number = nums[i]; });
  startDrawAnim("numeros", order);
  logEv(`Numeração sorteada: ${sortedTeams().map(t => `${pad2(t.number)} ${t.name}`).join(", ")}`);
  save(); toast("Numeração sorteada"); render();
}
function shuffle(a) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* ============================ TELA: CORES ============================ */
function cores() {
  const rows = sortedColors().map(c => `<div class="card color-card">
      <div class="swatch" style="--c:${esc(c.hex)};--t:${textOn(c.hex)}"></div>
      <div class="color-info"><b>${esc(c.name)}</b></div>
      <div class="actions"><button class="btn small" onclick="colorForm('${esc(c.id)}')">✏️ Editar</button><button class="btn small danger" onclick="deleteColor('${esc(c.id)}')">🗑</button></div>
    </div>`).join("");
  main().innerHTML = head("Cores dos balões", "Até 8 cores. Na Arena Livre, a cor de cada equipe é sorteada entre estas.",
    `<button class="btn primary" onclick="colorForm()" ${state.colors.length >= 8 ? "disabled" : ""}>+ Nova cor</button>`) +
    `<div class="grid g4">${rows || `<div class="empty span-all">Nenhuma cor cadastrada. A Arena Livre precisa de pelo menos uma cor.</div>`}</div>
     <div class="actions mt"><button class="btn small" onclick="restoreColors()">↻ Restaurar as ${DEFAULT_COLORS.length} cores padrão</button></div>
     <div class="mt">${teamColorsCard()}</div>`;
}
function colorForm(id) {
  const c = id ? state.colors.find(x => x.id === id) : null;
  if (!c && state.colors.length >= 8) return warn("Limite de 8 cores atingido.");
  const used = new Set(state.colors.map(x => x.number)), next = [1, 2, 3, 4, 5, 6, 7, 8].find(n => !used.has(n)) || 8;
  openModal(`<h2>${c ? "Editar cor" : "Nova cor"}</h2><form id="colorF"><div class="form-grid">
      <div><label>Nome *</label><input name="name" required maxlength="30" value="${esc(c?.name)}" placeholder="Ex.: Vermelho"></div>
      <div><label>Cor</label><input name="hex" type="color" value="${esc(c?.hex || "#e53935")}"></div>
    </div><div class="actions mt"><button class="btn primary big">Salvar</button><button type="button" class="btn big" onclick="closeModal()">Cancelar</button></div></form>`);
  document.getElementById("colorF").onsubmit = e => {
    e.preventDefault(); const f = new FormData(e.target);
    const data = { number: c ? c.number : next, name: str(f.get("name")), hex: str(f.get("hex")) || "#9e9e9e" };
    const F = e.target; fieldErr(F);
    if (!data.name) return fieldErr(F, "name", "Informe o nome da cor.");
    if (state.colors.some(x => x !== c && x.name.toLowerCase() === data.name.toLowerCase())) return fieldErr(F, "name", `Já existe a cor ${data.name}.`);
    logEv(c ? `Cor editada: ${c.name} → ${data.name}` : `Cor incluída: ${data.name}`);
    if (c) {
      Object.assign(c, data);
      // equipes com esta cor sorteada passam a mostrar o nome/tom novos (tentativas já registradas não mudam)
      Object.keys(state.free.draws).forEach(tid => { if (state.free.draws[tid]?.id === c.id) state.free.draws[tid] = snap(c); });
      if (state.free.current?.color?.id === c.id && state.free.current.timer.status === "idle") state.free.current.color = snap(c);
    } else state.colors.push({ id: uid(), ...data });
    save(); closeModal(); toast(c ? "Cor atualizada" : "Cor adicionada"); render();
  };
}
function deleteColor(id) {
  const c = state.colors.find(x => x.id === id); if (!c) return;
  const inUse = teams().filter(t => drawOf(t.id)?.id === id).map(t => t.name);
  if (!confirm(`Excluir a cor ${c.name}?\nResultados já registrados não mudam.${inUse.length ? `\n\nEsta cor está sorteada para: ${inUse.join(", ")}. Elas continuam com ela até um novo sorteio ou troca manual.` : ""}`)) return;
  logEv(`Cor excluída: ${c.name}`);
  state.colors = state.colors.filter(x => x.id !== id); save(); toast("Cor excluída"); render();
}
function restoreColors() {
  if (!confirm(`Substituir a lista atual pelas ${DEFAULT_COLORS.length} cores padrão (${DEFAULT_COLORS.map(c => c[0]).join(", ")})?`)) return;
  state.colors = defaultColors(); logEv("Cores restauradas para o padrão"); save(); toast("Cores restauradas"); render();
}
