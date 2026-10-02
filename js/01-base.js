"use strict";
/* =====================================================================
   RoboSapiens 2026 — Robô Estoura Balão
   Aplicação estática (index.html + style.css + js/01…08), dados no
   localStorage do navegador. O "Telão" pode ser aberto numa segunda
   janela (index.html#telao), que acompanha tudo em tempo real.
   O código fica em js/01-base.js … js/08-config-inicio.js: scripts comuns
   carregados nessa ordem pelo index.html, no mesmo escopo global.
   ===================================================================== */

const KEY = "robosapiens_estoura_baloes_v3";
const OLD_KEY = "robosapiens_estoura_baloes_v2";
// Janela só de exibição: "#telao" ou outro PC acessando pela rede local
let TELAO_WINDOW = location.hash === "#telao";
/* Juiz pelo celular (index.html#juiz, pela rede do note): mostra as telas da Arena e do Confronto com os dados do note,
   e cada ação vira um comando que o note executa (o note continua dono dos dados). Ver js/08-config-inicio.js. */
const JUIZ = location.hash === "#juiz";
let CMD_RUN = false, OPER_OVERRIDE = "", SIM = false; // CMD_RUN: o note executando um comando de juiz; SIM: celular simulando a ação

/* Modo rede local (servidor.py): o PC que registra envia o estado ao
   servidor; o PC do telão consulta o servidor e atualiza sozinho. */
const NET = { on: false, local: false, urls: [], rev: 0, offset: 0, ok: true, lastOk: 0, timer: null, busy: false, again: false };

/* ---------- EXTRAS (testes e registros fora da competição) ----------
   Enquanto a guia Extras está aberta (XMODE), a variável global `state` aponta para o estado
   de uma SESSÃO EXTRAS (cópia isolada de equipes, cores e configurações) e o estado oficial
   fica guardado em OFFICIAL, intocado. Assim toda a lógica do jogo (cronômetros, bipes,
   marcações, rounds) é a mesma, mas só mexe na sessão. Os pontos de saída desviam no XMODE:
   save() grava só em XKEY (nunca na chave oficial nem no servidor), pushState() envia sempre
   o oficial, autoBackup() não roda, e o cronômetro oficial continua em segundo plano. */
const XKEY = "robosapiens_estoura_baloes_EXTRAS_v1";
let XMODE = false, OFFICIAL = null, XHIST = [], NO_RENDER = false, officialReviewRound = 2;
const officialState = () => XMODE ? OFFICIAL : state;

/* ---------- Regras (Regulamento RoboSapiens 2026, seção 5) ---------- */
// Valores padrão do regulamento; podem ser ajustados em Configurações.
// Cada marcação guarda os pontos do momento: mudar a regra não altera o que já foi registrado.
const ROUND1_SECONDS = 120, BREAK_SECONDS = 120, ROUND2_SECONDS = 60;
const cfg = () => state.settings;
function freeEvents() {
  const s = cfg();
  return [
    { pts: s.freeOther, label: "Balão de outra cor", short: signed(s.freeOther), icon: "🎈", cls: "good" },
    { pts: -s.freeOwn, label: "Balão da própria cor", short: signed(-s.freeOwn), icon: "💥", cls: "bad" },
    { pts: -s.freeExit, label: "Saiu da arena", short: signed(-s.freeExit), icon: "↗", cls: "bad" }
  ];
}
function matchEvents() {
  const s = cfg();
  return [
    { pts: s.cupBalloon, label: "Estourou balão adversário", short: signed(s.cupBalloon), icon: "🎈" },
    { pts: s.cupExit, label: "Adversário saiu da arena", short: signed(s.cupExit), icon: "↗" }
  ];
}
// "2 min", "90 s", "1 min 30 s"
function rulesFree() { const s = cfg(); return `+${s.freeOther} balão de outra cor · −${s.freeOwn} balão da própria cor · −${s.freeExit} saída da arena`; }
function rulesCup() { const s = cfg(); return `+${s.cupBalloon} por balão adversário estourado · +${s.cupExit} quando o adversário sai da arena`; }
function rulesCupTime() { const s = cfg(); return `Round 1 até ${durTxt(s.cupR1)} · intervalo até ${durTxt(s.cupBreak)} · Round 2 até ${durTxt(s.cupR2)}`; }
function durTxt(sec) { sec = Math.round(num(sec)); const m = Math.floor(sec / 60), r = sec % 60; return m && r ? `${m} min ${r} s` : m ? `${m} min` : `${r} s`; }

const TIEBREAKS = {
  direto: { label: "Confronto direto", desc: "Vitórias nos jogos entre as equipes empatadas" },
  saldo: { label: "Saldo de pontos", desc: "Pontos marcados − pontos sofridos nos confrontos" },
  pro: { label: "Pontos marcados", desc: "Total de pontos marcados nos confrontos" },
  vitorias: { label: "Número de vitórias", desc: "Mais vitórias na fase preliminar" },
  arena: { label: "Resultado da Arena Livre", desc: "Pontuação na classificação da Arena Livre" },
  sorteio: { label: "Numeração do sorteio", desc: "Menor número sorteado fica à frente" }
};

// Começa com 3 cores cadastradas; outras (até 8) podem ser incluídas na tela Cores
const DEFAULT_COLORS = [
  ["Azul", "#1e88e5"], ["Preto", "#212121"], ["Laranja", "#fb8c00"]
];

const INITIAL_TEAMS = [
  { id: "byte-force", number: null, name: "Byte Force", school: "Senai RS", robot: "Gaara", members: "Antônia Pires Beckenkamp · Pietro Chiele Ott · Samuel Appolo · Sarah Zamin Sant'Anna", professor: "Francisco da Silva Brandão" },
  { id: "metalbots", number: null, name: "MetalBots", school: "Senai RS", robot: "Zóio", members: "Isaque da Silva Simon · Braian de Oliveira Pereira · Vitor Scapin · Yasmin Borges Bittencort", professor: "Renata Taís Lunkes" },
  { id: "equipe-decio", number: null, name: "Equipe Décio", school: "CME Dr. Décio Gomes Pereira - UEB", robot: "Gladiador", members: "Lucas Matheus Sartori da Silva · Peterson Phorlan Blankenhiem Alves · Asafe Junior Mendez dos Reis Schoenardie · Want Arthur Haag", professor: "Marco Joel Berghan" },
  { id: "ayrton-bots", number: null, name: "Ayrton Bots", school: "CME Ayrton Senna - UEB", robot: "Gladiador", members: "Rebecca Karloh Soares · Luiz Henrique dos Santos Pescador · Miguel Abbady Flôr Machado · Brayan Gustavo Soares dos Santos", professor: "Elci Uylson Farias Ferreira" },
  { id: "robotech-pastor3", number: null, name: "RoboTech Pastor3", school: "EMEB Pastor Rodolfo Saenger", robot: "RoboTech Pastor3", members: "Eduarda Deobald Girelli · Felipe Wauskiez Schimitt · Gustavo Lupschinski Wendling · Mateus Gabriel Kuhn Blaszczekievicz", professor: "Eliana Kuhn Blaszczekievicz" },
  { id: "robotech-pastor1", number: null, name: "RoboTech Pastor1", school: "EMEB Pastor Rodolfo Saenger", robot: "RoboTech Pastor1", members: "Joao Affonso Felin · Gustavo Mendes dos Reis · Murilo Eduardo Gabriele · Victor Trintin Petry", professor: "Eliana Kuhn Blaszczekievicz" },
  { id: "robotech-pastor2", number: null, name: "RoboTech Pastor2", school: "EMEB Pastor Rodolfo Saenger", robot: "RoboTech Pastor2", members: "Artur Traichel Hendges · Pyetro Augusto Siebert Wiedemann · Leonardo Bergmann Garcia Oliveira · Gabriel da Silva Gulart", professor: "Eliana Kuhn Blaszczekievicz" }
];

// Cronograma padrão (editável na aba Cronograma). **texto** aparece em negrito.
const LUNCH_SCHEDULE = [
  ["11:30", "12:00", "Almoço/Treino Livre", "Início do intervalo para almoço, com a arena liberada para treino livre das equipes."],
  ["12:00", "13:00", "Almoço", "Pausa para almoço e descanso das equipes."],
  ["13:00", "13:30", "Almoço/Treino Livre", "Final do intervalo para almoço, com a arena liberada para treino livre das equipes."]
];
const DEFAULT_SCHEDULE = [
  ["08:00", "09:30", "Credenciamento e Treino Livre", "Credenciamento das equipes, identificação dos participantes, montagem e testes dos robôs e treino livre na arena."],
  ["09:30", "10:00", "Abertura Oficial", "Boas-vindas, apresentação da modalidade, orientações gerais e início oficial da competição."],
  ["10:00", "10:15", "Reunião Técnica e Sorteio", "Apresentação das regras, critérios de pontuação e orientações de segurança. Sorteio da numeração das equipes, definição das cores e esclarecimento de dúvidas."],
  ["10:15", "10:30", "Preparação para a Etapa 1", "Organização das equipes, conferência dos robôs, identificação das equipes e preparação da arena."],
  ["10:30", "11:30", "Etapa 1 — Arena Livre", "Cada equipe terá **até 30 segundos** para estourar o maior número possível de balões das demais equipes, conforme as regras da modalidade."],
  ...LUNCH_SCHEDULE,
  ["13:30", "13:45", "Preparação para a Etapa 2", "Organização das equipes classificadas, conferência dos robôs, definição dos confrontos e preparação da arena."],
  ["13:45", "16:00", "Etapa 2 — Confronto Direto", "Confrontos entre duas equipes. Cada partida será disputada em **2 rounds**, com intervalo de até **2 minutos** entre eles."],
  ["16:00", "17:00", "Apuração e Premiação", "Conferência dos resultados, definição da classificação final e entrega das premiações às equipes."],
  ["17:00", "17:30", "Encerramento", "Agradecimentos, registro final e encerramento oficial da competição."]
];

/* ============================ ESTADO ============================ */
function uid() {
  try { if (crypto.randomUUID) return crypto.randomUUID(); } catch (e) { /* segue */ }
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}
function defaultSchedule() { return DEFAULT_SCHEDULE.map(([start, end, title, detail]) => ({ id: uid(), start, end, title, detail })); }
function defaultColors() { return DEFAULT_COLORS.map(([name, hex], i) => ({ id: uid(), number: i + 1, name, hex })); }
function defaultSettings() {
  return {
    freeRounds: 5, freeSeconds: 30, freeRankMode: "soma", freeMinZero: false, geralCup: "prelim",
    freeOther: 50, freeOwn: 50, freeExit: 30,
    cupR1: ROUND1_SECONDS, cupBreak: BREAK_SECONDS, cupR2: ROUND2_SECONDS, cupBalloon: 100, cupExit: 30, cupBalloons: 2, freeArenaBalloons: 12, balV: 1,
    sound: true, soundTv: false, beepVol: 10, autoBackup: true, cupGames: 0, cupV: 2,
    // bipes separados por prova; no Confronto Direto o intervalo não bipa (padrão)
    freeBeepStart: true, freeBeepMid: true, freeBeepMidAt: "5", freeBeepEnd: true,
    cupBeepStart: true, cupBeepMid: true, cupBeepMidAt: "15", cupBeepEnd: true, cupBeepBreak: false,
    defV: 1,
    // Fase eliminatória: disputa de 3º lugar; chaveamento das semifinais ("geral" = Arena Livre + saldo da preliminar, "cup" = só o saldo da preliminar);
    // Round 3 de desempate só se empatar, sem repor balões: "points" = igual ao Round 2 (intervalo antes, tempo do Round 2,
    // vence quem marcar mais) — padrão; "sudden" = morte súbita (tempo cupR3); "off" = decisão da comissão
    cupThird: true, koSeed: "geral", koR3: "points", cupR3: 60, r3V: 1,
    // "Preparar" antes do bipe de início: "voz" (voz do computador em português), "som" (arquivo enviado) ou "off"; espera em segundos até o bipe
    prepMode: "pc", prepDelay: 2, prepV: 1, // "pc" = voz do computador (padrão), "voz" = voz gravada embutida, "som" = arquivo enviado
    // backup automático periódico (JSON na pasta Downloads), em minutos; 0 = desligado
    backupMin: 15,
    // PIN dos juízes pelo celular (vazio = desligado); o servidor nunca envia o PIN para a rede
    judgePin: "",
    // Classificação Geral: geralCup "prelim" = só a fase preliminar do Confronto; "all" = também semifinais, 3º lugar e final
    // Classificação pelo SALDO de pontos (não há pontos de vitória/empate/derrota).
    // Desempate definido pela organização: confronto direto → número de vitórias → numeração do sorteio → decisão da comissão
    tiebreak: [{ key: "direto", on: true }, { key: "vitorias", on: true }, { key: "sorteio", on: true },
      { key: "pro", on: false }, { key: "arena", on: false }], tbV: 8
  };
}
function fresh(teamsList) {
  return {
    version: 3,
    view: "inicio",
    teams: (teamsList || INITIAL_TEAMS).map(t => ({ ...t })),
    colors: defaultColors(),
    settings: defaultSettings(),
    free: { current: null, attempts: [], draws: {} },
    cup: { matches: [], liveId: null, manualOrder: [] },
    display: { mode: "auto", reveal: false }
  };
}
const str = v => (v === undefined || v === null) ? "" : String(v).trim();
// IDs entram em atributos onclick: aceita só letras, números, _ e - (mesma troca em todas as referências)
const sid = v => str(v).replace(/[^\w-]/g, "_");
const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

function normTeam(t, i) {
  return {
    id: sid(t.id) || uid(), number: Number.isFinite(Number(t.number)) && Number(t.number) >= 1 && t.number !== null && t.number !== "" ? Math.round(Number(t.number)) : null,
    name: str(t.name) || `Equipe ${String(i + 1).padStart(2, "0")}`, school: str(t.school),
    robot: str(t.robot), professor: str(t.professor), members: str(t.members),
    // desclassificação (5.7.6): a equipe sai das classificações; os pontos dos adversários contra ela ficam
    disq: t.disq && typeof t.disq === "object" ? { at: str(t.disq.at), reason: str(t.disq.reason) || "não informado" } : undefined
  };
}
function normTimer(t, dur) {
  t = t || {};
  const status = ["idle", "running", "paused", "over"].includes(t.status) ? t.status : "idle";
  return { status, duration: num(t.duration, dur), remaining: num(t.remaining, dur), endsAt: num(t.endsAt, 0) };
}
function normEvents(list) {
  return (Array.isArray(list) ? list : []).filter(e => e && Number.isFinite(Number(e.pts)))
    .map(e => ({ id: sid(e.id) || uid(), pts: Number(e.pts), label: str(e.label) || "Pontuação", t: str(e.t) || "00:00", side: e.side === "b" ? "b" : e.side === "a" ? "a" : undefined, seq: num(e.seq, 0) }));
}
function normalize(raw) {
  const base = fresh([]);
  const s = { ...base, ...(raw && typeof raw === "object" ? raw : {}) };
  s.version = 3;
  s.teams = (Array.isArray(s.teams) ? s.teams : []).filter(t => t && typeof t === "object").map(normTeam);
  // Correção única do cadastro: nome conforme a inscrição ("Joao", sem acento)
  if (!(num(s.dataV, 0) >= 1)) s.teams.forEach(t => { if (t.id === "robotech-pastor1") t.members = t.members.replace("João Affonso Felin", "Joao Affonso Felin"); });
  s.dataV = 1;
  s.colors = (Array.isArray(s.colors) && s.colors.length ? s.colors : defaultColors())
    .filter(c => c && typeof c === "object")
    .map((c, i) => ({ id: sid(c.id) || uid(), number: Math.max(1, Math.round(num(c.number, i + 1))), name: str(c.name) || `Cor ${i + 1}`, hex: /^#[0-9a-f]{6}$/i.test(str(c.hex)) ? str(c.hex) : "#9e9e9e" }));
  // Atualização única: quem ainda tem as 4 cores padrão antigas, sem nenhum sorteio nem tentativa, passa às 3 atuais
  if (!(num(s.colorV, 0) >= 2)) {
    const old = ["Vermelho", "Azul", "Verde", "Amarelo"], f0 = s.free || {};
    const untouched = s.colors.length === 4 && s.colors.every((c, i) => c.name === old[i] && c.number === i + 1);
    const unused = !Object.keys(f0.draws || {}).length && !(f0.attempts || []).length && !f0.current;
    if (untouched && unused) s.colors = defaultColors();
  }
  s.colorV = 2;
  const st = { ...defaultSettings(), ...(s.settings || {}) };
  st.freeRounds = Math.min(5, Math.max(1, Math.round(num(st.freeRounds, 5))));
  st.freeSeconds = Math.min(600, Math.max(5, Math.round(num(st.freeSeconds, 30))));
  st.freeRankMode = st.freeRankMode === "melhor" ? "melhor" : "soma";
  st.freeMinZero = !!st.freeMinZero;
  st.geralCup = st.geralCup === "all" ? "all" : "prelim";
  st.cupThird = st.cupThird !== false; st.koSeed = st.koSeed === "cup" ? "cup" : "geral";
  st.koR3 = ["sudden", "points", "off"].includes(st.koR3) ? st.koR3 : "points";
  // Atualização única: o padrão passou a ser o Round 3 igual ao Round 2 (antes era decisão da comissão)
  if (!(num(s.settings?.r3V, 0) >= 1)) { if (st.koR3 === "off") st.koR3 = "points"; } st.r3V = 1;
  st.prepMode = ["voz", "som", "pc", "off"].includes(st.prepMode) ? st.prepMode : "pc";
  // Atualização única: o padrão voltou a ser a voz do computador (a voz gravada ficou estranha); quem estava nela volta
  if (!(num(s.settings?.prepV, 0) >= 1)) { if (st.prepMode === "voz") st.prepMode = "pc"; } st.prepV = 1;
  const clampI = (v, lo, hi, d) => Math.min(hi, Math.max(lo, Math.round(num(v, d))));
  st.freeOther = clampI(st.freeOther, 0, 1000, 50); st.freeOwn = clampI(st.freeOwn, 0, 1000, 50); st.freeExit = clampI(st.freeExit, 0, 1000, 30);
  st.cupR1 = clampI(st.cupR1, 5, 900, ROUND1_SECONDS); st.cupBreak = clampI(st.cupBreak, 0, 900, BREAK_SECONDS); st.cupR2 = clampI(st.cupR2, 5, 900, ROUND2_SECONDS);
  st.cupBalloon = clampI(st.cupBalloon, 0, 1000, 100); st.cupExit = clampI(st.cupExit, 0, 1000, 30); st.cupBalloons = clampI(st.cupBalloons, 1, 10, 2); st.beepVol = clampI(st.beepVol, 1, 10, 10); st.freeArenaBalloons = clampI(st.freeArenaBalloons, 1, 99, 12);
  // Atualização única: a Arena Livre passou a usar 12 balões por tentativa (antes o padrão era 9)
  if (!(num(s.settings?.balV, 0) >= 1)) { if (st.freeArenaBalloons === 9) st.freeArenaBalloons = 12; } st.balV = 1;
  st.backupMin = [0, 10, 15, 30].includes(Number(st.backupMin)) ? Number(st.backupMin) : 15;
  st.judgePin = str(st.judgePin).replace(/\D/g, "").slice(0, 8);
  st.cupR3 = clampI(st.cupR3, 5, 900, 60); st.prepDelay = clampI(st.prepDelay, 1, 10, 2);
  delete st.winPts; delete st.drawPts; delete st.lossPts; // a fase preliminar não usa pontos de vitória/empate/derrota
  st.cupGames = [0, 2, 4, 6].includes(Number(st.cupGames)) ? Number(st.cupGames) : 0;
  // Padrão passou a ser "todos contra todos": quem estava no padrão antigo (2) migra uma vez
  if (!(s.settings && s.settings.cupV === 2)) { if (Number(s.settings?.cupGames ?? 2) === 2) st.cupGames = 0; st.cupV = 2; }
  st.sound = st.sound !== false; st.soundTv = !!st.soundTv; st.autoBackup = st.autoBackup !== false;
  // Versão anterior tinha uma configuração única de bipes: vale para as duas provas
  const rawSt = s.settings || {};
  if (rawSt.beepMid !== undefined && rawSt.freeBeepMid === undefined) { ["Mid", "MidAt", "End"].forEach(k => { st["freeBeep" + k] = rawSt["beep" + k]; st["cupBeep" + k] = rawSt["beep" + k]; }); }
  delete st.beepMid; delete st.beepMidAt; delete st.beepEnd;
  // segundos dos bipes intermediários: "10, 5" (de 1 a 600, sem repetir, do maior para o menor)
  const secs = v => [...new Set(String(v ?? "10, 5").split(/[^\d]+/).map(Number).filter(n => n >= 1 && n <= 600))].sort((a, b) => b - a).slice(0, 10).join(", ");
  ["free", "cup"].forEach(p => { st[p + "BeepStart"] = st[p + "BeepStart"] !== false; st[p + "BeepMid"] = st[p + "BeepMid"] !== false; st[p + "BeepEnd"] = st[p + "BeepEnd"] !== false; st[p + "BeepMidAt"] = secs(st[p + "BeepMidAt"]); });
  st.cupBeepBreak = !!st.cupBeepBreak;
  // Atualização única dos padrões (5 rodadas; bipe intermediário: Arena aos 5 s, Confronto aos 10 s).
  // Só troca o que ainda estava no padrão anterior; as rodadas só mudam se a Arena ainda não começou.
  if (!(num(rawSt.defV, 0) >= 1)) {
    if (st.freeRounds === 4 && !((s.free && s.free.attempts) || []).length) st.freeRounds = 5;
    if (st.freeBeepMidAt === "10, 5") st.freeBeepMidAt = "5";
    if (st.cupBeepMidAt === "10, 5") st.cupBeepMidAt = "10";
  }
  // Atualização única: aviso do Confronto Direto passou de 10 s para 15 s (regulamento 5.4.3); valor personalizado não muda
  if (!(num(rawSt.defV, 0) >= 2)) { if (st.cupBeepMidAt === "10") st.cupBeepMidAt = "15"; }
  st.defV = 2;
  const rawTb = Array.isArray(st.tiebreak) ? st.tiebreak.filter(x => x && TIEBREAKS[x.key]) : [];
  // chave da lista como estava salva (inclui critérios que não existem mais), para reconhecer padrões antigos
  const rawKey = (Array.isArray(st.tiebreak) ? st.tiebreak : []).filter(x => x && x.key).map(x => x.key + (x.on ? 1 : 0)).join();
  // o saldo passou a ser o critério principal: sai da lista de desempate
  const tb = rawTb.filter(x => x.key !== "saldo");
  Object.keys(TIEBREAKS).forEach(k => { if (k !== "saldo" && !tb.some(x => x.key === k)) tb.push({ key: k, on: false }); });
  st.tiebreak = tb.map(x => ({ key: x.key, on: !!x.on }));
  // Quem ainda usa uma ordem padrão anterior (não personalizada) passa para a atual
  const OLD_TBS = ["direto1,saldo1,pro1,vitorias0,arena0,sorteio0", "saldo1,pro1,direto1,vitorias0,arena0,sorteio0", "saldo1,direto1,pro1,vitorias0,arena0,sorteio0", "pontos1,direto1,pro1,vitorias0,arena0,sorteio0", "direto1,pontos1,pro0,vitorias0,arena0,sorteio0", "direto1,vitorias1,pro0,arena0,sorteio0"];
  if (!(s.settings && num(s.settings.tbV, 0) >= 8)) { if (OLD_TBS.includes(rawKey)) st.tiebreak = defaultSettings().tiebreak; st.tbV = 8; }
  s.settings = st;
  const ids = new Set(s.teams.map(t => t.id));
  const f = s.free && typeof s.free === "object" ? s.free : {};
  s.free = {
    attempts: (Array.isArray(f.attempts) ? f.attempts : []).filter(a => a && ids.has(sid(a.teamId))).map(a => ({
      id: sid(a.id) || uid(), teamId: sid(a.teamId), round: Math.max(1, Math.round(num(a.round, 1))),
      color: normColorSnap(a.color), events: normEvents(a.events), at: str(a.at), repeats: normRepeats(a.repeats),
      wo: a.wo && typeof a.wo === "object" ? { reason: str(a.wo.reason) } : undefined // ausência (W.O.): 0 ponto
    })),
    current: null, draws: {}
  };
  Object.entries(f.draws && typeof f.draws === "object" ? f.draws : {}).forEach(([tid, c]) => {
    const cs = normColorSnap(c); if (ids.has(sid(tid)) && cs) s.free.draws[sid(tid)] = cs;
  });
  if (f.current && ids.has(sid(f.current.teamId))) {
    s.free.current = { id: sid(f.current.id) || uid(), teamId: sid(f.current.teamId), round: Math.max(1, Math.round(num(f.current.round, 1))), color: normColorSnap(f.current.color), events: normEvents(f.current.events), repeats: normRepeats(f.current.repeats), timer: normTimer(f.current.timer, st.freeSeconds) };
  }
  const c = s.cup && typeof s.cup === "object" ? s.cup : {};
  s.cup = {
    matches: (Array.isArray(c.matches) ? c.matches : []).filter(m => m && ["prelim", "semi", "third", "final"].includes(m.stage)).map(m => ({
      id: sid(m.id) || uid(), stage: m.stage, order: Math.round(num(m.order, 1)),
      a: ids.has(sid(m.a)) ? sid(m.a) : null, b: ids.has(sid(m.b)) ? sid(m.b) : null,
      status: ["pending", "live", "done"].includes(m.status) ? m.status : "pending",
      phase: ["r1", "break", "r2", "r3", "review"].includes(m.phase) ? m.phase : "r1",
      timer: normTimer(m.timer, ROUND1_SECONDS),
      rounds: { 1: { events: normEvents(m.rounds?.[1]?.events) }, 2: { events: normEvents(m.rounds?.[2]?.events) }, 3: { events: normEvents(m.rounds?.[3]?.events) } },
      // Round 3 de desempate (fase eliminatória): modo jogado e quem venceu na morte súbita
      r3: ["sudden", "points"].includes(m.r3) ? m.r3 : undefined, r3Winner: ids.has(sid(m.r3Winner)) ? sid(m.r3Winner) : undefined,
      toR3: !!m.toR3 && m.phase === "break", // intervalo antes do Round 3
      // W.O.: ausência, ambas ausentes, abandono ou desclassificação (o vencedor fica em m.winner)
      wo: m.wo && ["absent", "both", "abandon", "disq"].includes(m.wo.type) ? { type: m.wo.type, side: ["a", "b"].includes(m.wo.side) ? m.wo.side : null, reason: str(m.wo.reason) } : undefined,
      winner: m.winner === "draw" ? "draw" : ids.has(sid(m.winner)) ? sid(m.winner) : null,
      pick: ids.has(sid(m.pick)) ? sid(m.pick) : null, byDecision: !!m.byDecision,
      _backup: typeof m._backup === "string" ? m._backup : undefined, repeats: normRepeats(m.repeats),
      autoEnd: m.autoEnd && [1, 2, 3].includes(m.autoEnd.round) ? { round: m.autoEnd.round, eventId: sid(m.autoEnd.eventId), remaining: Math.max(0, num(m.autoEnd.remaining, 0)), duration: Math.max(0, num(m.autoEnd.duration, 0)), exit: !!m.autoEnd.exit } : undefined
    })).filter(m => m.a && m.b),
    liveId: sid(c.liveId) || null,
    manualOrder: (Array.isArray(c.manualOrder) ? c.manualOrder : []).map(sid).filter(id => ids.has(id))
  };
  if (!s.cup.matches.some(m => m.id === s.cup.liveId && m.status === "live")) {
    s.cup.liveId = null;
    s.cup.matches.forEach(m => { if (m.status === "live") m.status = "pending"; });
  }
  const hhmm = v => /^([01]\d|2[0-3]):[0-5]\d$/.test(str(v)) ? str(v) : "";
  s.schedule = (Array.isArray(s.schedule) ? s.schedule : defaultSchedule()).filter(x => x && typeof x === "object")
    .map(x => ({ id: sid(x.id) || uid(), start: hhmm(x.start), end: hhmm(x.end), title: str(x.title) || "Atividade", detail: str(x.detail) }))
    .sort((a, b) => (a.start || "99").localeCompare(b.start || "99") || (a.end || "").localeCompare(b.end || ""));
  // Atualização única do cronograma padrão (Etapa 2 começa às 13h45); atividades editadas não mudam
  if (!(num(s.schedV, 0) >= 2)) {
    s.schedule.forEach(x => {
      if (x.title === "Preparação para a Etapa 2" && x.start === "13:30" && x.end === "14:00") x.end = "13:45";
      if (x.title === "Etapa 2 — Confronto Direto" && x.start === "14:00" && x.end === "16:00") x.start = "13:45";
    });
    s.schedule.sort((a, b) => (a.start || "99").localeCompare(b.start || "99") || (a.end || "").localeCompare(b.end || ""));
  }
  // Atualização única: o almoço de 11h30 às 13h30 vira Almoço/Treino Livre · Almoço · Almoço/Treino Livre
  if (!(num(s.schedV, 0) >= 3)) {
    const i = s.schedule.findIndex(x => x.title === "Intervalo para Almoço" && x.start === "11:30" && x.end === "13:30");
    if (i >= 0) s.schedule.splice(i, 1, ...LUNCH_SCHEDULE.map(([start, end, title, detail]) => ({ id: uid(), start, end, title, detail })));
  }
  s.schedV = 3;
  s.log = (Array.isArray(s.log) ? s.log : []).filter(x => x && x.msg).map(x => ({ at: str(x.at), msg: str(x.msg), by: str(x.by) || undefined })).slice(-3000);
  const an = s.display?.anim;
  s.display = { mode: ["auto", "arena", "cup", "bracket", "geral", "crono", "numeros", "cores", "podio-cup", "podio-geral", "podio-arena", "extras"].includes(s.display?.mode) ? s.display.mode : "auto", reveal: !!s.display?.reveal,
    anim: an && ["numeros", "cores"].includes(an.kind) && Array.isArray(an.order) ? { kind: an.kind, at: num(an.at, 0), order: an.order.map(sid).filter(id => ids.has(id)) } : null };
  s.view = ["inicio", "crono", "equipes", "cores", "arena", "confrontos", "geral", "podio", "telao", "config"].includes(s.view) ? s.view : "inicio";
  return s;
}
function normRepeats(list) { return (Array.isArray(list) ? list : []).filter(x => x && typeof x === "object").map(x => ({ at: str(x.at), reason: str(x.reason) || "não informado", round: Math.round(num(x.round, 0)) || undefined })); }
function normColorSnap(c) {
  if (!c || typeof c !== "object") return null;
  return { id: sid(c.id), number: Math.round(num(c.number, 0)), name: str(c.name) || "Cor", hex: /^#[0-9a-f]{6}$/i.test(str(c.hex)) ? str(c.hex) : "#9e9e9e" };
}
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
    // Migração da versão anterior: aproveita apenas o cadastro das equipes
    // (pontuações antigas acumuladas eram a origem de valores como −140).
    const old = localStorage.getItem(OLD_KEY);
    if (old) {
      const o = JSON.parse(old);
      if (Array.isArray(o.teams) && o.teams.length) return normalize(fresh(o.teams.map(t => ({ id: t.id, number: t.number, name: t.name, school: t.school, robot: t.robot, professor: t.professor, members: t.members }))));
    }
  } catch (e) { console.warn("Falha ao ler dados salvos", e); }
  return normalize(fresh());
}
let state = load();
state.view = "inicio"; // o sistema sempre abre no Início (não volta para a última tela usada)
let RESETTING = false;
/* Backup automático periódico: guarda o horário do último backup (deste PC) e se houve mudança desde então */
const BK_KEY = "robosapiens_estoura_baloes_backup";
const BK = { last: (() => { try { return num(JSON.parse(localStorage.getItem(BK_KEY) || "{}").last, 0); } catch (e) { return 0; } })(), dirty: false };
function markBackup() { BK.last = Date.now(); BK.dirty = false; try { localStorage.setItem(BK_KEY, JSON.stringify({ last: BK.last })); } catch (e) { /* segue */ } updateBkPill(); }
function save() {
  if (TELAO_WINDOW || RESETTING || JUIZ) return; // o celular do juiz nunca grava: só envia comandos
  if (XMODE) return saveExtras(); // sessão Extras: nunca grava na chave oficial nem envia ao servidor
  BK.dirty = true;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { warn("Não foi possível salvar no navegador (armazenamento cheio ou bloqueado). Exporte um backup em Configurações."); }
  if (NET.on && NET.local) { clearTimeout(NET.timer); NET.timer = setTimeout(pushState, 120); }
}

/* Ocultar/revelar pontuação (sempre começa oculto) */
let reveal = false;
if (!TELAO_WINDOW) { state.display.reveal = false; save(); }
let reviewRound = 2;

/* ============================ UTILITÁRIOS ============================ */
function esc(s) { return str(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function signed(n) { n = num(n); return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0"; }
function pad2(n) { return String(Math.max(0, Math.round(num(n)))).padStart(2, "0"); }
function fmt(sec) { sec = Math.max(0, Math.ceil(num(sec))); return `${pad2(Math.floor(sec / 60))}:${pad2(sec % 60)}`; }
let toastTimer = null;
function toast(msg, type = "ok") {
  const e = document.getElementById("toast"); if (!e) return;
  e.textContent = msg; e.className = `show ${type}`; clearTimeout(toastTimer);
  toastTimer = setTimeout(() => e.classList.remove("show"), type === "warn" ? 3600 : 2400);
}
// Aviso (ação recusada/atenção): fica mais tempo e com cor de alerta
const warn = msg => toast(msg, "warn");
// Histórico de alterações (vai também para a planilha Excel)
/* Operador deste computador (Config. e janelas de correção): vai junto em cada registro do histórico */
const OPER_KEY = "robosapiens_estoura_baloes_operador";
function operator() { if (OPER_OVERRIDE) return OPER_OVERRIDE; if (JUIZ && typeof JUDGE !== "undefined" && JUDGE.name) return `Juiz ${JUDGE.name}`; try { return str(localStorage.getItem(OPER_KEY)).slice(0, 60); } catch (e) { return ""; } }
function setOperator(v) { try { const n = str(v).slice(0, 60); if (n) localStorage.setItem(OPER_KEY, n); else localStorage.removeItem(OPER_KEY); } catch (e) { /* segue */ } }
function logEv(msg) {
  if (TELAO_WINDOW) return;
  state.log.push({ at: new Date().toISOString(), msg, by: operator() || undefined });
  if (state.log.length > 3000) state.log.splice(0, state.log.length - 3000);
}
/* Sons: bipe de início, bipe curto intermediário (Arena aos 5 s, Confronto aos 15 s), sinal longo no fim. O navegador só libera
   o áudio depois de um clique na página. */
let audioCtx = null;
function getAudio() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  } catch (e) { return null; }
}
// Volume dos bipes (Config., 1 a 10): padrão 10 = volume máximo da página (o antigo era 0,09)
const beepGain = () => 0.1 * Math.min(10, Math.max(1, Math.round(num(cfg().beepVol, 10))));
function tone(freq, dur, vol = beepGain()) {
  const c = getAudio(); if (!c) return;
  const play = () => {
    const o = c.createOscillator(), g = c.createGain(); o.type = "square"; o.frequency.value = freq;
    o.connect(g); g.connect(c.destination); g.gain.value = vol; o.start(); o.stop(c.currentTime + dur);
  };
  if (c.state === "running") return play();
  // áudio ainda "acordando" (1º som depois de abrir a página): toca assim que liberar, se for logo em seguida
  const asked = Date.now();
  c.resume().then(() => { if (c.state === "running" && Date.now() - asked < 1500) play(); }).catch(() => {});
}
function beep(kind = "end") {
  if (JUIZ || (TELAO_WINDOW ? !cfg().soundTv : !cfg().sound)) return; // celular do juiz: o som toca no note/telão
  if (kind === "warn") tone(660, 0.14); else if (kind === "start") tone(1046, 0.45); else { tone(880, 0.9); }
}
/* "PREPARAR" antes do bipe de início: voz gravada embutida (assets/preparar-voz.js) ou um som enviado nas Configurações,
   tocados pelo Web Audio com normalização + compressão + limitador para soar no MESMO volume do bipe;
   ou a voz do computador (Web Speech: o volume dela é o do Windows e não acompanha o bipe).
   O som enviado fica só neste navegador (não vai no JSON nem para o telão de outro PC, que usa a voz gravada). */
const PREP_KEY = "robosapiens_estoura_baloes_preparar";
function prepAudio() { try { return localStorage.getItem(PREP_KEY) || ""; } catch (e) { return ""; } }
function ptVoice() { const v = window.speechSynthesis?.getVoices?.() || []; return v.find(x => /^pt[-_]BR/i.test(x.lang)) || v.find(x => /^pt\b/i.test(x.lang)) || null; }
try { window.speechSynthesis?.getVoices(); window.speechSynthesis && (window.speechSynthesis.onvoiceschanged = () => { if (!TELAO_WINDOW && state.view === "config") render(); }); } catch (e) { /* sem voz */ }
const PREP_DRIVE = 3, PREP_MAKEUP = 2.8; // ajuste de volume percebido (medido contra o bipe quadrado)
const prepBuffers = new Map();
function b64Bytes(b64) { const s = atob(b64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
// qual áudio usar: o som enviado (modo "som", se houver) ou a voz gravada embutida
function prepSource() {
  const up = cfg().prepMode === "som" ? prepAudio() : "";
  if (up) return { key: "up:" + up.length + ":" + up.slice(-40), bytes: () => b64Bytes(up.slice(up.indexOf(",") + 1)) };
  return cfg().prepMode === "voz" && window.PREP_VOZ ? { key: "voz", bytes: () => b64Bytes(window.PREP_VOZ) } : null; // sem som: voz do computador
}
function prepBuffer(c, src) {
  if (!prepBuffers.has(src.key)) prepBuffers.set(src.key, new Promise(res => {
    try {
      c.decodeAudioData(src.bytes().buffer, b => {
        let pk = 0; for (let ch = 0; ch < b.numberOfChannels; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > pk) pk = v; } }
        b._peak = pk || 1; res(b);
      }, () => res(null));
    } catch (e) { res(null); }
  }));
  return prepBuffers.get(src.key);
}
let tanhCurve = null;
// cadeia: normaliza o pico → compressor → ganho → limitador suave → volume do bipe
function loudChain(c, buf, vol) {
  if (!tanhCurve) { tanhCurve = new Float32Array(2048); for (let i = 0; i < 2048; i++) { const x = i / 1023.5 - 1; tanhCurve[i] = Math.tanh(x * 3) / Math.tanh(3); } }
  const node = (n, f) => { f(n); return n; };
  const src = node(c.createBufferSource(), n => { n.buffer = buf; });
  const pre = node(c.createGain(), n => { n.gain.value = PREP_DRIVE / buf._peak; });
  const comp = node(c.createDynamicsCompressor(), n => { n.threshold.value = -24; n.knee.value = 6; n.ratio.value = 12; n.attack.value = 0.002; n.release.value = 0.12; });
  const make = node(c.createGain(), n => { n.gain.value = PREP_MAKEUP; });
  const sh = node(c.createWaveShaper(), n => { n.curve = tanhCurve; });
  const out = node(c.createGain(), n => { n.gain.value = vol; });
  src.connect(pre); pre.connect(comp); comp.connect(make); make.connect(sh); sh.connect(out); out.connect(c.destination);
  return src;
}
function preloadPrep() { const c = getAudio(), s = prepSource(); if (c && s && cfg().prepMode !== "pc") prepBuffer(c, s); }
function playPrep(force = false) {
  if (JUIZ || (!force && (TELAO_WINDOW ? !cfg().soundTv : !cfg().sound))) return;
  const mode = cfg().prepMode, vol = Math.min(1, beepGain());
  if (mode === "off" && !force) return;
  if (mode !== "pc") {
    const c = getAudio(), s = prepSource();
    if (c && s) { const asked = Date.now(); prepBuffer(c, s).then(b => { if (b && Date.now() - asked < 1500) { if (c.state !== "running") c.resume(); loudChain(c, b, vol).start(); } else if (!b) speakPrep(vol); }); return; }
  }
  speakPrep(vol);
}
function speakPrep(vol) {
  try {
    const ss = window.speechSynthesis; if (!ss) return;
    const u = new SpeechSynthesisUtterance("Preparar"), v = ptVoice();
    u.lang = "pt-BR"; if (v) u.voice = v; u.volume = vol; u.rate = 1;
    ss.cancel(); ss.speak(u);
  } catch (e) { /* segue */ }
}
function uploadPrep(e) {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  if (!/^audio\//.test(f.type) && !/\.(mp3|wav|ogg|m4a|aac|webm)$/i.test(f.name)) return warn("Escolha um arquivo de áudio (mp3, wav, ogg, m4a).");
  if (f.size > 1500000) return warn("Arquivo grande demais: use um áudio curto (até 1,5 MB).");
  const r = new FileReader();
  r.onload = () => {
    try { localStorage.setItem(PREP_KEY, r.result); } catch (err) { return warn("Não foi possível guardar o som neste navegador (espaço cheio). Use um arquivo menor."); }
    state.settings.prepMode = "som"; logEv(`Som do "Preparar" enviado: ${f.name}`); save(); toast("Som do Preparar salvo"); render(); playPrep(true);
  };
  r.readAsDataURL(f);
}
function removePrep() { try { localStorage.removeItem(PREP_KEY); } catch (e) { /* segue */ } if (state.settings.prepMode === "som") state.settings.prepMode = "pc"; logEv("Som do \"Preparar\" removido (volta à voz gravada)"); save(); render(); }
const beeped = new Set();
// kind: "free" (Arena Livre) ou "cup" (Confronto Direto); phase: fase do confronto
function countdownBeep(t, kind = "free", phase = "") {
  if (!t || t.status !== "running") return;
  const s = cfg(), marks = [];
  if (kind === "cup" && phase === "break" && !s.cupBeepBreak) return;
  const L = left(t);
  if (inPrep(t)) { // "Preparar" (uma vez por início); o bipe de início vem quando a espera acabar
    const k = `prep:${t.endsAt}`; if (!beeped.has(k)) { beeped.add(k); if (prepLeft(t) > 0.6) playPrep(); }
    return;
  }
  // bipe de início: logo após iniciar a tentativa/round do zero (não ao retomar uma pausa); intervalo não tem
  if (s[kind + "BeepStart"] && phase !== "break" && t.remaining >= t.duration - 0.01 && t.duration - L < 3) {
    const k = `start:${Math.round(t.endsAt - t.duration * 1000)}`; if (!beeped.has(k)) { beeped.add(k); beep("start"); }
  }
  if (s[kind + "BeepMid"]) String(s[kind + "BeepMidAt"]).split(/[^\d]+/).map(Number).filter(n => n > 0).forEach(n => marks.push([n, "warn"]));
  if (s[kind + "BeepEnd"]) marks.push([0, "end"]);
  marks.forEach(([th, sound]) => {
    if (L <= th && L > th - 1.5 && t.duration > th + 1) { const k = `${t.endsAt}:${th}`; if (!beeped.has(k)) { beeped.add(k); beep(sound); } }
  });
}
function textOn(hex) {
  const h = str(hex).replace("#", ""); if (h.length !== 6) return "#111";
  // escolhe preto ou branco pelo maior contraste (WCAG)
  const L = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const lum = 0.2126 * L[0] + 0.7152 * L[1] + 0.0722 * L[2];
  return (lum + 0.05) / 0.05 >= 1.05 / (lum + 0.05) ? "#111" : "#fff";
}
const main = () => document.getElementById("main");

/* Timers baseados em horário: sobrevivem a recarregar a página e
   sincronizam com a janela do telão. */
// No PC do telão, corrige a diferença de relógio em relação ao PC que registra
const now = () => Date.now() + ((TELAO_WINDOW || JUIZ) && NET.on ? NET.offset : 0);
// durante o "Preparar" o cronômetro já está rodando, mas parado no tempo cheio até o bipe de início
function left(t) { if (!t) return 0; return t.status === "running" ? Math.max(0, Math.min(t.duration, (t.endsAt - now()) / 1000)) : Math.max(0, t.remaining); }
const inPrep = t => !!t && t.status === "running" && (t.endsAt - now()) / 1000 > t.duration + 0.05;
const prepLeft = t => inPrep(t) ? (t.endsAt - now()) / 1000 - t.duration : 0;
function newTimer(sec) { return { status: "idle", duration: sec, remaining: sec, endsAt: 0 }; }
function tStart(t, prep = 0) { if (t.status === "running" || t.status === "over") return; t.endsAt = Date.now() + (t.remaining + prep) * 1000; t.status = "running"; }
// Iniciar do zero (Arena Livre e rounds do Confronto): "Preparar" → espera → bipe de início e o tempo corre
const prepSecs = () => cfg().prepMode === "off" ? 0 : cfg().prepDelay;
function tStartFresh(t) { tStart(t, t.remaining >= t.duration - 0.01 ? prepSecs() : 0); }
function tPause(t) { if (t.status !== "running") return; t.remaining = left(t); t.status = "paused"; }
function elapsed(t) { return fmt(t.duration - left(t)); }
// Ajuste manual do cronômetro (ex.: o juiz iniciou atrasado). Nunca passa do tempo máximo.
function adjTimer(kind, d) {
  const m = kind === "match" ? liveMatch() : null;
  const t = kind === "free" ? state.free.current?.timer : m?.timer;
  if (!t || (m && m.phase === "review")) return;
  const nl = Math.max(0, Math.min(t.duration, left(t) + d));
  if (Math.abs(nl - left(t)) < 0.5) return warn(d > 0 ? "O cronômetro já está no tempo máximo." : "O cronômetro já está zerado.");
  if (t.status === "running") t.endsAt = Date.now() + nl * 1000;
  else { t.remaining = nl; if (t.status === "over" && nl > 0) t.status = "paused"; }
  const ctx = kind === "free" ? `Arena Livre — ${teamName(state.free.current.teamId)}, Rodada ${state.free.current.round}` : `${matchLabel(m)} — ${{ r1: "Round 1", break: "Intervalo", r2: "Round 2", r3: "Round 3" }[m.phase]}`;
  logEv(`Cronômetro ajustado ${d > 0 ? "+" : "−"}${Math.abs(d)} s (${ctx}) → ${fmt(nl)}`);
  save(); render();
}
function adjBtns(kind, t) {
  if (!t || t.status === "idle") return "";
  return `<div class="adj"><button class="btn tiny" onclick="adjTimer('${kind}',-5)" aria-label="Tirar 5 segundos">−5 s</button><button class="btn tiny" onclick="adjTimer('${kind}',5)" aria-label="Acrescentar 5 segundos">+5 s</button></div>`;
}
