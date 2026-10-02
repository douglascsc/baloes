"use strict";
/* RoboSapiens 2026 — Robô Estoura Balão · js/06-exportar.js: Planilha Excel e súmulas Word.
   Os arquivos js/01…08 são scripts comuns carregados em ordem pelo index.html e compartilham o escopo global. */
/* ============================ PLANILHA EXCEL (.xlsx) ============================ */
/* Gera o .xlsx no próprio navegador (sem internet e sem bibliotecas):
   planilhas em XML (Office Open XML) empacotadas num ZIP sem compressão. */
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function zipStore(files, type) {
  const enc = new TextEncoder(), parts = [], central = []; let offset = 0;
  const d = new Date(), time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  files.forEach(f => {
    const name = enc.encode(f.name), data = f.data instanceof Uint8Array ? f.data : enc.encode(f.data), crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, time, true); h.setUint16(12, date, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true);
    h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
    parts.push(new Uint8Array(h.buffer), name, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, time, true); c.setUint16(14, date, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
    c.setUint16(28, name.length, true); c.setUint16(30, 0, true); c.setUint16(32, 0, true); c.setUint16(34, 0, true); c.setUint16(36, 0, true);
    c.setUint32(38, 0, true); c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), name);
    offset += 30 + name.length + data.length;
  });
  const size = central.reduce((s, a) => s + a.length, 0), e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, size, true); e.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type });
}
function xesc(v) { return String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function colName(i) { let s = ""; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
function sheetXml(rows) {
  const ncol = Math.max(1, ...rows.map(r => r.length));
  const widths = Array.from({ length: ncol }, (_, c) => Math.min(60, Math.max(8, ...rows.map(r => String(r[c] ?? "").length + 2))));
  const body = rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => {
    if (v === null || v === undefined || v === "") return "";
    const ref = `${colName(ci)}${ri + 1}`, st = ri === 0 ? ' s="1"' : "";
    return typeof v === "number" && Number.isFinite(v) ? `<c r="${ref}"${st}><v>${v}</v></c>` : `<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${xesc(v)}</t></is></c>`;
  }).join("")}</row>`).join("");
  const last = `${colName(ncol - 1)}${Math.max(1, rows.length)}`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${last}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols><sheetData>${body}</sheetData>${rows.length > 1 ? `<autoFilter ref="A1:${last}"/>` : ""}</worksheet>`;
}
function buildXlsx(sheets) {
  const wb = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${xesc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0F7A3A"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const types = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`;
  const root = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  return zipStore([
    { name: "[Content_Types].xml", data: types }, { name: "_rels/.rels", data: root },
    { name: "xl/workbook.xml", data: wb }, { name: "xl/_rels/workbook.xml.rels", data: rels }, { name: "xl/styles.xml", data: styles },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s.rows) }))
  ], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}
const stageName = m => ({ prelim: "Fase preliminar", semi: "Semifinal", third: "Disputa de 3º lugar", final: "Final" })[m.stage];
const matchName = m => m.stage === "prelim" ? `Confronto ${m.order}` : m.stage === "semi" ? `Semifinal ${m.order}` : m.stage === "third" ? "Disputa de 3º lugar" : "Final";
const fmtDate = iso => { const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleString("pt-BR"); };
function resultSheets() {
  const R = state.settings.freeRounds, fs = freeSummary(), cs = cupSummary(), champ = champion(), f = finalMatch();
  const vice = f && winnerOf(f) ? findTeam(winnerOf(f) === f.a ? f.b : f.a) : null;
  const gr = generalRanking(), st = standings(), fr = freeRanking(), done = prelimDone();
  const crits = state.settings.tiebreak.filter(x => x.on).map(x => TIEBREAKS[x.key].label).join(" → ") || "nenhum";
  const countL = (a, label) => a.events.filter(e => e.label === label).length;
  const situation = id => {
    if (champ && champ.id === id) return "Vencedor - Confronto Direto";
    if (vice && vice.id === id) return "2º lugar - Confronto Direto";
    if (cupPlaces()[2] === id) return "3º lugar - Confronto Direto";
    if (cupPlaces()[3] === id) return "4º lugar - Confronto Direto";
    if (semis().some(m => (m.a === id || m.b === id) && winnerOf(m) && winnerOf(m) !== id)) return "Semifinalista";
    if (semis().length) return semis().some(m => m.a === id || m.b === id) ? (f ? "Finalista" : "Semifinalista") : "Eliminado na fase preliminar";
    return done ? "" : "Em disputa";
  };
  const allMatches = matches();
  return [
    { name: "Resumo", rows: [["Item", "Valor"],
      ["Competição", "RoboSapiens 2026 — Robô Estoura Balão"], ["Exportado em", new Date().toLocaleString("pt-BR")],
      ["Equipes", teams().length], ["Cores de balão cadastradas", state.colors.length],
      ["Arena Livre — rodadas por equipe", R], ["Arena Livre — tentativas registradas", `${fs.done} de ${fs.total}`],
      ["Arena Livre — critério da classificação", state.settings.freeRankMode === "melhor" ? "Melhor rodada" : "Soma das rodadas"],
      ["Arena Livre — 1º lugar", fs.done ? fr[0]?.team.name || "" : "A definir"],
      ["Confronto Direto — confrontos encerrados", `${cs.done} de ${cs.total}`],
      ["Confronto Direto — pontuação", `${rulesCup()} · ${rulesCupTime()} · classificação pelo saldo de pontos`], ["Arena Livre — pontuação", `${rulesFree()} · ${cfg().freeSeconds} s por tentativa`], ["Confronto Direto — classificação", `Saldo de pontos; desempate: ${crits} → decisão da comissão`],
      ["Vencedor - Confronto Direto", champ ? champ.name : "A definir"], ["2º lugar - Confronto Direto", vice ? vice.name : "A definir"],
      ["Classificação Geral — critério", `Arena Livre + Confronto Direto: ${geralCupTxt()}`], ["Fase eliminatória — chaveamento das semifinais", seedTxt()], ["Fase eliminatória — disputa de 3º lugar", cfg().cupThird ? "Sim" : "Não (3º lugar: perdedor de semifinal mais bem colocado no chaveamento)"], ["Fase eliminatória — empate", cfg().koR3 === "off" ? "Decisão da comissão" : `${R3_DESC[cfg().koR3]}: intervalo + Round 3 até ${durTxt(r3Secs())}, sem repor balões; depois, decisão da comissão`],
      ["Classificação Geral — 1º lugar", gr[0] && (fs.done || cs.done) ? gr[0].team.name : "A definir"]] },
    { name: "Equipes", rows: [["Nº", "Equipe", "Escola", "Robô", "Professor(a)", "Integrantes", "Cor Arena Livre (nº)", "Cor Arena Livre"],
      ...sortedTeams().map(t => [noLabel(t), t.name, schoolText(t), t.robot, t.professor, t.members, drawOf(t.id)?.number ?? "", drawOf(t.id)?.name ?? ""])] },
    { name: "Arena - Classificação", rows: [["Posição", "Nº", "Equipe", "Escola", ...Array.from({ length: R }, (_, i) => `Rodada ${i + 1}`), "Tentativas", "Soma", "Melhor rodada", state.settings.freeRankMode === "melhor" ? "Pontuação (melhor rodada)" : "Pontuação (soma)"],
      ...fr.map((x, i) => [i + 1, noLabel(x.team), x.team.name, schoolText(x.team), ...x.scores.map(v => v === null ? "" : v), x.done, x.sum, x.done ? x.best : "", x.total])] },
    { name: "Arena - Tentativas", rows: [["Rodada", "Nº", "Equipe", "Escola", "Cor", "Balões de outra cor", "Balões da própria cor", "Saídas da arena", "Pontos", "Repetições (falha técnica)", "Registrado em", "Ausência (W.O.)"],
      ...[...state.free.attempts].sort((a, b) => a.round - b.round || byNum(findTeam(a.teamId) || { name: "" }, findTeam(b.teamId) || { name: "" })).map(a => { const t = findTeam(a.teamId); return [a.round, noLabel(t), t?.name || "Equipe removida", schoolText(t), a.color?.name ?? "", countL(a, "Balão de outra cor"), countL(a, "Balão da própria cor"), countL(a, "Saiu da arena"), attemptTotal(a), (a.repeats || []).map(x => `${fmtDate(x.at)}: ${x.reason}`).join(" | "), fmtDate(a.at), a.wo ? `Sim${a.wo.reason ? " — " + a.wo.reason : ""}` : ""]; })] },
    { name: "Arena - Marcações", rows: [["Rodada", "Equipe", "Escola", "Tempo", "Evento", "Pontos"],
      ...[...state.free.attempts].sort((a, b) => a.round - b.round || byNum(findTeam(a.teamId) || { name: "" }, findTeam(b.teamId) || { name: "" })).flatMap(a => { const t = findTeam(a.teamId); return a.events.map(e => [a.round, t?.name || "Equipe removida", schoolText(t), e.t, e.label, e.pts]); })] },
    { name: "Confronto - Jogos", rows: [["Fase", "Confronto", "Equipe A", "Escola A", "A · Round 1", "A · Round 2", "A · Round 3", "A · Total", "Equipe B", "Escola B", "B · Round 1", "B · Round 2", "B · Round 3", "B · Total", "Resultado", "Vencedor", "Decisão da comissão", "Desempate (Round 3)", "Situação", "Repetições (falha técnica)"],
      ...allMatches.map(m => { const a = findTeam(m.a), b = findTeam(m.b), fin = m.status === "done"; return [stageName(m), matchName(m), a?.name || "A definir", schoolText(a), fin ? sideScore(m, "a", 1) : "", fin ? sideScore(m, "a", 2) : "", fin && m.r3 ? sideScore(m, "a", 3) : "", fin ? sideScore(m, "a") : "", b?.name || "A definir", schoolText(b), fin ? sideScore(m, "b", 1) : "", fin ? sideScore(m, "b", 2) : "", fin && m.r3 ? sideScore(m, "b", 3) : "", fin ? sideScore(m, "b") : "", fin ? (m.wo ? `W.O. (${WO_TXT[m.wo.type]})` : m.winner === "draw" ? "Empate" : "Vitória") : "", fin ? (m.winner === "draw" ? "—" : teamName(m.winner)) : "", fin && m.byDecision ? "Sim" : "", fin && m.r3 ? R3_NAME[m.r3] : "", fin ? "Encerrado" : m.status === "live" ? "Em andamento" : "A disputar", (m.repeats || []).map(x => `Round ${x.round} — ${fmtDate(x.at)}: ${x.reason}`).join(" | ")]; })] },
    { name: "Confronto - Classificação", rows: [["Posição", "Nº", "Equipe", "Escola", "Jogos", "Vitórias", "Empates", "Derrotas", "Pontos marcados", "Pontos sofridos", "Saldo", "Situação"],
      ...st.map(r => [r.pos, noLabel(r.team), r.team.name, schoolText(r.team), r.J, r.V, r.E, r.D, r.PM, r.PS, r.SG, situation(r.team.id) || (done ? (seeds().includes(r.team.id) ? "Classificado para a semifinal" : "Eliminado na fase preliminar") : "")])] },
    { name: "Confronto - Marcações", rows: [["Fase", "Confronto", "Round", "Tempo", "Equipe", "Escola", "Evento", "Pontos"],
      ...allMatches.filter(m => m.status === "done").flatMap(m => [1, 2, 3].flatMap(r => (m.rounds[r]?.events || []).map(e => { const t = findTeam(e.side === "a" ? m.a : m.b); return [stageName(m), matchName(m), r, e.t, t?.name || "", schoolText(t), e.label, e.pts]; })))] },
    { name: "Classificação Geral", rows: [["Posição", "Nº", "Equipe", "Escola", "Arena Livre", "Confronto Direto (pontos marcados)", "Total"],
      ...gr.map((r, i) => [i + 1, noLabel(r.team), r.team.name, schoolText(r.team), r.arena, r.cup, r.total])] },
    { name: "Cronograma", rows: [["Início", "Fim", "Horário", "Atividade", "Detalhamento"], ...state.schedule.map(x => [x.start, x.end, `${hFmt(x.start)} às ${hFmt(x.end)}`, x.title, x.detail.replace(/\*\*/g, "")])] },
    { name: "Histórico", rows: [["Data e hora", "Operador", "Registro"], ...state.log.map(x => [fmtDate(x.at), x.by || "", x.msg])] }
  ];
}
function downloadBlob(blob, name) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const stamp = () => { const d = new Date(), z = n => String(n).padStart(2, "0"); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}_${z(d.getHours())}h${z(d.getMinutes())}`; };
function exportXlsx() {
  try { downloadBlob(buildXlsx(resultSheets()), `robosapiens-estoura-baloes-resultados-${stamp()}.xlsx`); toast("Planilha exportada"); }
  catch (e) { console.error(e); warn("Não foi possível gerar a planilha"); }
}
// Ao fim de cada etapa, baixa sozinho a planilha e o backup JSON (pasta Downloads)
function autoBackup(label, title) {
  if (TELAO_WINDOW || XMODE || JUIZ || !cfg().autoBackup) return;
  logEv(`Backup automático: ${title}`);
  save();
  setTimeout(() => {
    try {
      downloadBlob(buildXlsx(resultSheets()), `robosapiens-estoura-baloes-${label}-${stamp()}.xlsx`);
      setTimeout(() => { downloadBlob(new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }), `robosapiens-estoura-baloes-${label}-${stamp()}.json`); markBackup(); }, 600);
      toast(`💾 Backup automático (${title}) salvo na pasta Downloads`);
    } catch (e) { console.error(e); warn("Não foi possível gerar o backup automático"); }
  }, 500);
}

/* ============================ SÚMULAS EM WORD (.docx) ============================ */
/* Mesma ideia da planilha: o .docx (WordprocessingML) é montado aqui e empacotado
   pelo zipStore. Usa as equipes, cores sorteadas, confrontos e regras atuais. */
const DX = { green: "0F7A3A", gray: "5F6B64", light: "EEF6F0", total: "DFF3E4", border: "7A857F" };
const dRun = (text, o = {}) => `<w:r><w:rPr>${o.bold ? "<w:b/>" : ""}${o.color ? `<w:color w:val="${o.color}"/>` : ""}<w:sz w:val="${o.size || 20}"/></w:rPr><w:t xml:space="preserve">${xesc(text)}</w:t></w:r>`;
const dPara = (runs, o = {}) => `<w:p><w:pPr>${o.rule ? `<w:pBdr><w:bottom w:val="single" w:sz="12" w:space="4" w:color="${DX.green}"/></w:pBdr>` : ""}<w:spacing w:before="${o.before || 0}" w:after="${o.after ?? 80}"/>${o.align ? `<w:jc w:val="${o.align}"/>` : ""}</w:pPr>${[].concat(runs).join("")}</w:p>`;
const dLine = (label, w = 3000) => [dRun(label + " ", { bold: true }), dRun("_".repeat(Math.round(w / 110)), { color: DX.gray })];
const dBox = label => dRun(`☐ ${label}     `);
const dPageBreak = () => `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
function dCell(content, w, o = {}) {
  const b = `w:val="single" w:sz="6" w:space="0" w:color="${DX.border}"`;
  const paras = [].concat(content).map(c => c.startsWith("<w:p>") ? c : dPara(dRun(c, { bold: o.bold, size: o.size, color: o.color }), { align: o.align, after: 0 })).join("");
  return `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${o.span ? `<w:gridSpan w:val="${o.span}"/>` : ""}<w:tcBorders><w:top ${b}/><w:left ${b}/><w:bottom ${b}/><w:right ${b}/></w:tcBorders>${o.fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${o.fill}"/>` : ""}<w:tcMar><w:top w:w="60" w:type="dxa"/><w:left w:w="90" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>${paras}</w:tc>`;
}
const dRow = (cells, h) => `<w:tr><w:trPr><w:cantSplit/>${h ? `<w:trHeight w:val="${h}" w:hRule="atLeast"/>` : ""}</w:trPr>${cells.join("")}</w:tr>`;
const dTable = (widths, rows) => `<w:tbl><w:tblPr><w:tblW w:w="${widths.reduce((a, b) => a + b, 0)}" w:type="dxa"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${widths.map(w => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>${rows.join("")}</w:tbl>`;
let dPicId = 0;
function dHeader(title, subtitle) {
  // logo 300×200 px → 75×50 px no documento (1 px = 9525 EMU)
  const id = ++dPicId, cx = 714375, cy = 476250;
  const logo = window.SUMULA_LOGO ? `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="Logo ${id}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="logo.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdLogo"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>` : "";
  return dPara([logo, dRun(`${logo ? "     " : ""}ROBOSAPIENS 2026 · IFSul Campus Sapiranga · Robô Estoura Balão`, { bold: true, color: DX.gray })], { after: 60 }) +
    dPara(dRun(title, { bold: true, size: 34, color: DX.green }), { after: 20, rule: true }) +
    dPara(dRun(subtitle, { size: 18, color: DX.gray }), { after: 140 });
}
function buildDocx(body, landscape, footerText) {
  const NS = `xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"`;
  const X = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`;
  const pg = landscape ? `<w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>` : `<w:pgSz w:w="11906" w:h="16838"/>`;
  const doc = `${X}<w:document ${NS}><w:body>${body}<w:sectPr><w:footerReference w:type="default" r:id="rIdFooter"/>${pg}<w:pgMar w:top="850" w:right="850" w:bottom="850" w:left="850" w:header="425" w:footer="425" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const styles = `${X}<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:lang w:val="pt-BR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>`;
  const footer = `${X}<w:ftr ${NS}>${dPara(dRun(footerText, { size: 14, color: DX.gray }), { align: "center", after: 0 })}</w:ftr>`;
  const logo = window.SUMULA_LOGO ? Uint8Array.from(atob(window.SUMULA_LOGO), ch => ch.charCodeAt(0)) : null;
  const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const files = [
    { name: "[Content_Types].xml", data: `${X}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>` },
    { name: "_rels/.rels", data: `${X}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/officeDocument" Target="word/document.xml"/></Relationships>` },
    { name: "word/_rels/document.xml.rels", data: `${X}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="${R}/styles" Target="styles.xml"/><Relationship Id="rIdFooter" Type="${R}/footer" Target="footer1.xml"/>${logo ? `<Relationship Id="rIdLogo" Type="${R}/image" Target="media/logo.png"/>` : ""}</Relationships>` },
    { name: "word/document.xml", data: doc }, { name: "word/styles.xml", data: styles }, { name: "word/footer1.xml", data: footer }
  ];
  if (logo) files.push({ name: "word/media/logo.png", data: logo });
  return zipStore(files, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
}
function sumulaArena() {
  const s = cfg(), W = [700, 2500, 2700, 1300, 1450, 1450, 1450, 1250, 2190]; // A4 paisagem, soma 14990
  const H = (txt, i, size = 18) => dCell(txt, W[i], { bold: true, fill: DX.light, align: i === 1 || i === 2 ? undefined : "center", size });
  const head = dRow([H("Ordem", 0), H("Equipe", 1), H("Escola", 2), H("Cor", 3), H(["Balões de", "outra cor", `(+${s.freeOther} cada)`], 4), H(["Balões da", "própria cor", `(−${s.freeOwn} cada)`], 5), H(["Saídas da", "arena", `(−${s.freeExit} cada)`], 6), H("PONTOS", 7), H(["Falha técnica / repetição", "(motivo) · rubrica do juiz"], 8, 16)]);
  const list = sortedTeams(), blanks = list.length ? 2 : 8;
  const body = [...list.map((t, i) => {
    const c = drawOf(t.id);
    return dRow([dCell(String(i + 1), W[0], { align: "center" }), dCell([dPara(dRun(t.name, { bold: true }), { after: 0 }), dPara(dRun(teamNo(t), { size: 16, color: DX.gray }), { after: 0 })], W[1]), dCell(t.school || "", W[2], { size: 16, color: DX.gray }), dCell(c ? c.name : "", W[3], { align: "center", size: 18 }), ...[4, 5, 6, 7, 8].map(k => dCell("", W[k]))], 620);
  }), ...Array.from({ length: blanks }, () => dRow(W.map(w => dCell("", w)), 620))];
  dPicId = 0;
  const pages = Array.from({ length: s.freeRounds }, (_, i) => dHeader(`SÚMULA — ARENA LIVRE · RODADA ${i + 1}`, `Arena 2,70 × 2,70 m · uma equipe por vez · tempo máximo de ${s.freeSeconds} s por tentativa · a cor da equipe vale para todas as rodadas`) +
    dPara([...dLine("Data:", 1800), dRun("     "), ...dLine("Juiz:", 3800), dRun("     "), ...dLine("Operador do sistema:", 3800)], { after: 140 }) +
    dTable(W, [head, ...body]) +
    dPara([dRun("Pontos da tentativa = ", { bold: true, size: 18 }), dRun(`(balões de outra cor × ${s.freeOther}) − (balões da própria cor × ${s.freeOwn}) − (saídas da arena × ${s.freeExit}). `, { size: 18 }), dRun("Marque os balões com tracinhos (|||) e some ao final. A equipe com falha técnica pode repetir a tentativa, registrando o motivo.", { size: 18, color: DX.gray })], { before: 120, after: 160 }) +
    dPara([...dLine("Assinatura do juiz:", 4200), dRun("          "), ...dLine("Comissão Organizadora:", 4200)], { before: 200, after: 0 }));
  return buildDocx(pages.join(dPageBreak()), true, "RoboSapiens 2026 · Robô Estoura Balão · Súmula da Arena Livre — registrar também no sistema");
}
function sumulaCup() {
  const s = cfg(), W = [3690, 3000, 3000]; // A4 retrato, soma 9690
  const ph = { prelim: "Fase preliminar", semi: "Semifinal", final: "Final" };
  const pages = [], p = prelims();
  if (p.length) p.forEach(m => pages.push({ phase: ph.prelim, ko: false, label: `Confronto ${m.order} de ${p.length}`, a: m.a, b: m.b }));
  else {
    // fase preliminar ainda não gerada: páginas em branco na quantidade que a configuração atual vai gerar
    const n = teams().length, total = n >= 2 ? Math.round(n * gamesPerTeam(n) / 2) : 21;
    for (let i = 1; i <= total; i++) pages.push({ phase: ph.prelim, ko: false, label: `Confronto ${i} de ${total}` });
  }
  const [s1, s2] = semis(), f = finalMatch();
  const sp = seedByCup() ? "do Confronto" : "da Geral";
  pages.push({ phase: ph.semi, ko: true, label: `Semifinal 1 · 1º ${sp} × 4º ${sp}`, a: s1?.a, b: s1?.b });
  pages.push({ phase: ph.semi, ko: true, label: `Semifinal 2 · 2º ${sp} × 3º ${sp}`, a: s2?.a, b: s2?.b });
  const th = thirdMatch();
  if (s.cupThird || th) pages.push({ phase: "Disputa de 3º lugar", ko: true, label: "3º lugar · perdedor SF1 × perdedor SF2", a: th?.a, b: th?.b });
  pages.push({ phase: ph.final, ko: true, label: "Final · vencedor SF1 × vencedor SF2", a: f?.a, b: f?.b });
  pages.push({ phase: "", label: "Confronto nº ____ (reserva / repetição)" });
  const teamHdr = (side, id) => {
    const t = findTeam(id);
    return [dPara(dRun(`EQUIPE ${side}`, { bold: true, size: 18, color: DX.gray }), { after: 20, align: "center" }),
      t ? dPara(dRun(t.name, { bold: true, size: 22 }), { after: 20, align: "center" }) : dPara(dRun("_".repeat(26), { color: DX.gray }), { after: 20, align: "center" }),
      dPara(dRun(t ? `${teamNo(t)} · ${t.school || "Escola não informada"}` : "Escola: ____________________", { size: 16, color: DX.gray }), { after: 0, align: "center" })];
  };
  const qty = (lbl, mult) => dRow([dCell([dPara(dRun(lbl, { size: 19 }), { after: 0 }), dPara(dRun(`quantidade × ${mult}`, { size: 16, color: DX.gray }), { after: 0 })], W[0]),
    ...[1, 2].map(k => dCell(dPara(dRun("qtd ____   =   ______ pts", { size: 19 }), { after: 0, align: "center" }), W[k]))], 560);
  const sub = lbl => dRow([dCell(lbl, W[0], { bold: true, fill: DX.light }), dCell("", W[1], { fill: DX.light }), dCell("", W[2], { fill: DX.light })], 480);
  const sec = lbl => dRow([dCell(lbl, W[0] + W[1] + W[2], { bold: true, color: DX.green, span: 3 })], 360);
  const sign = who => dCell([dPara(dRun(" "), { after: 300 }), dPara(dRun(who, { size: 18, color: DX.gray }), { align: "center", after: 0 })], 3230);
  dPicId = 0;
  const body = pages.map(pg => dHeader("SÚMULA — CONFRONTO DIRETO", `Arena 1,20 × 1,20 m · ${rulesCupTime()} · +${s.cupBalloon} por balão adversário estourado · +${s.cupExit} quando o adversário sai da arena`) +
    dPara([dRun("Fase: ", { bold: true }), ...(pg.phase ? [dRun(pg.phase, { bold: true, color: DX.green })] : [dBox("Preliminar"), dBox("Semifinal"), dBox("Final")]), dRun("      "), dRun(pg.label, { bold: true })], { after: 100 }) +
    dPara([...dLine("Data:", 1800), dRun("     "), ...dLine("Horário:", 1400), dRun("     "), ...dLine("Juiz:", 3600)], { after: 160 }) +
    dTable(W, [
      dRow([dCell("", W[0], { fill: DX.light }), dCell(teamHdr("A", pg.a), W[1], { fill: DX.light }), dCell(teamHdr("B", pg.b), W[2], { fill: DX.light })], 900),
      sec(`ROUND 1 (até ${durTxt(s.cupR1)})`), qty("Balões do adversário estourados", s.cupBalloon), qty("Adversário saiu da arena", s.cupExit), sub("Subtotal Round 1"),
      sec(`ROUND 2 (até ${durTxt(s.cupR2)})`), qty("Balões do adversário estourados", s.cupBalloon), qty("Adversário saiu da arena", s.cupExit), sub("Subtotal Round 2"),
      dRow([dCell("TOTAL", W[0], { bold: true, size: 24, fill: DX.total }), dCell("", W[1], { fill: DX.total }), dCell("", W[2], { fill: DX.total })], 640)
    ]) +
    dPara([dRun("Resultado:  ", { bold: true }), dBox("Vitória da Equipe A"), dBox("Vitória da Equipe B"), dBox("Empate (só na fase preliminar)")], { before: 180, after: 80 }) +
    (s.koR3 !== "off" && pg.ko !== false ? dPara([dRun(`Empate nos Rounds 1 e 2 (fase eliminatória) → intervalo e Round 3 ${s.koR3 === "sudden" ? "MORTE SÚBITA" : "igual ao Round 2 (por pontuação)"} (até ${durTxt(r3Secs())}, sem repor balões). Vencedor do Round 3: `, { size: 19 }), dRun("_".repeat(26), { color: DX.gray })], { after: 60 }) : "") +
    dPara([dRun(`Empate em semifinal/final${s.koR3 !== "off" ? " (depois do Round 3)" : ""} — vencedor por decisão da Comissão: `, { size: 19 }), dRun("_".repeat(30), { color: DX.gray })], { after: 140 }) +
    dPara(dRun("Ocorrências / falha técnica (round repetido? motivo):", { bold: true, size: 19 }), { after: 40 }) +
    dPara(dRun("_".repeat(84), { color: DX.gray }), { after: 40 }) + dPara(dRun("_".repeat(84), { color: DX.gray }), { after: 200 }) +
    dTable([3230, 3230, 3230], [dRow([sign("Juiz"), sign("Representante Equipe A"), sign("Representante Equipe B")])]));
  return buildDocx(body.join(dPageBreak()), false, "RoboSapiens 2026 · Robô Estoura Balão · Súmula do Confronto Direto — registrar também no sistema");
}
function exportSumula(kind) {
  try {
    if (kind === "arena") downloadBlob(sumulaArena(), `Sumula-Arena-Livre-${stamp()}.docx`);
    else downloadBlob(sumulaCup(), `Sumula-Confronto-Direto-${stamp()}.docx`);
    toast("Súmula gerada (Word)");
  } catch (e) { console.error(e); warn("Não foi possível gerar a súmula"); }
}

/* Previsão MÁXIMA de balões para comprar/encher (se todos os balões possíveis forem estourados) */
function balloonEstimate(kind) {
  const s = cfg(), n = teams().length;
  if (kind === "free") {
    const total = s.freeRounds * n * s.freeArenaBalloons, nc = state.colors.length;
    return `<div class="notice mt-s">🎈 <b>Previsão máxima de balões: ${total}</b><br><span class="small">${s.freeRounds} rodada${s.freeRounds > 1 ? "s" : ""} × ${n} equipes × ${s.freeArenaBalloons} balões na arena${nc ? ` · cerca de ${Math.ceil(total / nc)} de cada cor (${sortedColors().map(c => c.name).join(", ")})` : ""}</span></div>`;
  }
  const th = s.cupThird ? 1 : 0, pre = prelims().length || Math.round(n * gamesPerTeam(n) / 2), games = pre + 3 + th, per = s.cupBalloons + 1;
  return `<div class="notice cup mt-s">⚔️ <b>Previsão máxima de balões: ${games * per}</b><br><span class="small">(${pre} confrontos da fase preliminar + 2 semifinais${th ? " + 3º lugar" : ""} + 1 final) = ${games} confrontos × ${per} balões (máximo que pode ser estourado por confronto)</span></div>`;
}
