const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType,
  BorderStyle, ShadingType, PageOrientation, ImageRun, VerticalAlign, PageBreak, Header, Footer, TableLayoutType
} = require("docx");

const path = require("path");
const LOGO = fs.readFileSync(path.join(__dirname, "..", "assets", "robosapiens.png"));
// Uso: npm install docx && node sumulas/gerar-sumulas.js  (gera os .docx nesta pasta)
process.chdir(__dirname);
const TEAMS = [
  ["Byte Force", "Senai RS"], ["MetalBots", "Senai RS"], ["Equipe Décio", "CME Dr. Décio Gomes Pereira - UEB"],
  ["Ayrton Bots", "CME Ayrton Senna - UEB"], ["RoboTech Pastor3", "EMEB Pastor Rodolfo Saenger"],
  ["RoboTech Pastor1", "EMEB Pastor Rodolfo Saenger"], ["RoboTech Pastor2", "EMEB Pastor Rodolfo Saenger"]
].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
const GREEN = "0F7A3A", GRAY = "5F6B64", LIGHT = "EEF6F0", FONT = "Arial";

const border = { style: BorderStyle.SINGLE, size: 6, color: "7A857F" };
const borders = { top: border, bottom: border, left: border, right: border };
const t = (text, o = {}) => new TextRun({ text, font: FONT, size: o.size || 20, bold: !!o.bold, color: o.color, italics: !!o.italics });
const p = (runs, o = {}) => new Paragraph({ children: Array.isArray(runs) ? runs : [runs], alignment: o.align, spacing: { before: o.before ?? 0, after: o.after ?? 80 }, keepNext: o.keepNext });
function cell(content, w, o = {}) {
  const paras = (Array.isArray(content) ? content : [content]).map(c => typeof c === "string" ? p(t(c, { bold: o.bold, size: o.size, color: o.color }), { align: o.align, after: 0 }) : c);
  return new TableCell({
    children: paras, width: { size: w, type: WidthType.DXA }, borders, verticalAlign: o.v || VerticalAlign.CENTER,
    shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 60, bottom: 60, left: 90, right: 90 }, columnSpan: o.span
  });
}
const row = (cells, h) => new TableRow({ children: cells, height: h ? { value: h, rule: "atLeast" } : undefined, cantSplit: true });
const table = (widths, rows) => new Table({ width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths, rows, layout: TableLayoutType.FIXED });
const line = (label, w = 3000) => [t(label + " ", { bold: true }), t("_".repeat(Math.round(w / 110)), { color: GRAY })];

function headerBlock(title, subtitle) {
  return [
    new Paragraph({ children: [new ImageRun({ type: "png", data: LOGO, transformation: { width: 110, height: 50 } }), t("     ROBOSAPIENS 2026 · IFSul Campus Sapiranga · Robô Estoura Balão", { bold: true, size: 20, color: GRAY })], spacing: { after: 60 } }),
    new Paragraph({ children: [t(title, { bold: true, size: 34, color: GREEN })], spacing: { after: 20 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: GREEN, space: 4 } } }),
    p(t(subtitle, { size: 18, color: GRAY }), { after: 140 })
  ];
}
const checkbox = label => t(`☐ ${label}     `, { size: 20 });

/* ======================= ARENA LIVRE (paisagem, 1 página por rodada) ======================= */
function arenaPage(round, last) {
  // largura útil A4 paisagem com margens de 1,5 cm ≈ 14990 DXA
  const W = [700, 2500, 2700, 1300, 1450, 1450, 1450, 1250, 2190]; // soma 14990
  const head = row([
    cell("Ordem", W[0], { bold: true, fill: LIGHT, align: AlignmentType.CENTER, size: 18 }),
    cell("Equipe", W[1], { bold: true, fill: LIGHT, size: 18 }),
    cell("Escola", W[2], { bold: true, fill: LIGHT, size: 18 }),
    cell("Cor (nº)", W[3], { bold: true, fill: LIGHT, align: AlignmentType.CENTER, size: 18 }),
    cell(["Balões de", "outra cor", "(+50 cada)"], W[4], { bold: true, fill: LIGHT, align: AlignmentType.CENTER, size: 18 }),
    cell(["Balões da", "própria cor", "(−50 cada)"], W[5], { bold: true, fill: LIGHT, align: AlignmentType.CENTER, size: 18 }),
    cell(["Saídas da", "arena", "(−30 cada)"], W[6], { bold: true, fill: LIGHT, align: AlignmentType.CENTER, size: 18 }),
    cell(["PONTOS"], W[7], { bold: true, fill: LIGHT, align: AlignmentType.CENTER, size: 18 }),
    cell(["Falha técnica / repetição", "(motivo) · rubrica do juiz"], W[8], { bold: true, fill: LIGHT, align: AlignmentType.CENTER, size: 16 })
  ]);
  const body = [...TEAMS, ["", ""], ["", ""]].map(([n, s]) => row([
    cell("", W[0]), cell(n, W[1], { bold: true, size: 20 }), cell(s, W[2], { size: 16, color: GRAY }),
    cell("", W[3]), cell("", W[4]), cell("", W[5]), cell("", W[6]), cell("", W[7]), cell("", W[8])
  ], 620));
  return [
    ...headerBlock(`SÚMULA — ARENA LIVRE · RODADA ${round}`, "Arena 2,70 × 2,70 m · uma equipe por vez · tempo máximo de 30 s por tentativa · a cor da equipe vale para todas as rodadas"),
    p([...line("Data:", 1800), t("     "), ...line("Juiz:", 3800), t("     "), ...line("Operador do sistema:", 3800)], { after: 140 }),
    table(W, [head, ...body]),
    p([t("Pontos da tentativa = ", { bold: true, size: 18 }), t("(balões de outra cor × 50) − (balões da própria cor × 50) − (saídas da arena × 30). ", { size: 18 }),
      t("Marque os balões com tracinhos (|||) e some ao final. A equipe com falha técnica pode repetir a tentativa, registrando o motivo.", { size: 18, color: GRAY })], { before: 120, after: 160 }),
    p([...line("Assinatura do juiz:", 4200), t("          "), ...line("Comissão Organizadora:", 4200)], { before: 200, after: 0 }),
    ...(last ? [] : [new Paragraph({ children: [new PageBreak()] })])
  ];
}

/* ======================= CONFRONTO DIRETO (retrato, 1 página por confronto) ======================= */
const MATCHES = [
  // até 21 confrontos preliminares (7 equipes: 7, 14 ou 21 conforme a configuração); use só os necessários
  ...Array.from({ length: 21 }, (_, i) => ["Fase preliminar", `Confronto ${i + 1}`]),
  ["Semifinal", "Semifinal 1 · 1º colocado × 4º colocado"], ["Semifinal", "Semifinal 2 · 2º colocado × 3º colocado"],
  ["Final", "Final · vencedor SF1 × vencedor SF2"], ["", "Confronto nº ____ (reserva / repetição)"]
];
function matchPage([phase, label], last) {
  const W = [3690, 3000, 3000]; // soma 9690 (A4 retrato, margens 1,5 cm ≈ 9900)
  const teamHdr = side => [p(t(`EQUIPE ${side}`, { bold: true, size: 18, color: GRAY }), { after: 20, align: AlignmentType.CENTER }), p(t("_".repeat(26), { color: GRAY }), { after: 20, align: AlignmentType.CENTER }), p(t("Escola: ____________________", { size: 16, color: GRAY }), { after: 0, align: AlignmentType.CENTER })];
  const qty = (lbl, mult) => row([cell([p([t(lbl, { size: 19 })], { after: 0 }), p(t(`quantidade × ${mult}`, { size: 16, color: GRAY }), { after: 0 })], W[0]),
    cell(p([t("qtd ____   =   ______ pts", { size: 19 })], { after: 0, align: AlignmentType.CENTER }), W[1]),
    cell(p([t("qtd ____   =   ______ pts", { size: 19 })], { after: 0, align: AlignmentType.CENTER }), W[2])], 560);
  const sub = lbl => row([cell(lbl, W[0], { bold: true, fill: LIGHT }), cell("", W[1], { fill: LIGHT }), cell("", W[2], { fill: LIGHT })], 480);
  const sec = lbl => row([cell(lbl, W[0] + W[1] + W[2], { bold: true, color: GREEN, span: 3 })], 360);
  const phaseLine = phase ? [t("Fase: ", { bold: true }), t(phase, { bold: true, color: GREEN })] : [t("Fase: ", { bold: true }), checkbox("Preliminar"), checkbox("Semifinal"), checkbox("Final")];
  return [
    ...headerBlock("SÚMULA — CONFRONTO DIRETO", "Arena 1,20 × 1,20 m · Round 1 até 2 min · intervalo até 2 min · Round 2 até 1 min · +100 por balão adversário estourado · +30 quando o adversário sai da arena"),
    p([...phaseLine, t("      "), t(label, { bold: true })], { after: 100 }),
    p([...line("Data:", 1800), t("     "), ...line("Horário:", 1400), t("     "), ...line("Juiz:", 3600)], { after: 160 }),
    table(W, [
      row([cell("", W[0], { fill: LIGHT }), cell(teamHdr("A"), W[1], { fill: LIGHT }), cell(teamHdr("B"), W[2], { fill: LIGHT })], 900),
      sec("ROUND 1 (até 2 min)"), qty("Balões do adversário estourados", "100"), qty("Adversário saiu da arena", "30"), sub("Subtotal Round 1"),
      sec("ROUND 2 (até 1 min)"), qty("Balões do adversário estourados", "100"), qty("Adversário saiu da arena", "30"), sub("Subtotal Round 2"),
      row([cell("TOTAL", W[0], { bold: true, size: 24, fill: "DFF3E4" }), cell("", W[1], { fill: "DFF3E4" }), cell("", W[2], { fill: "DFF3E4" })], 640)
    ]),
    p([t("Resultado:  ", { bold: true }), checkbox("Vitória da Equipe A"), checkbox("Vitória da Equipe B"), checkbox("Empate (só na fase preliminar)")], { before: 180, after: 80 }),
    p([t("Empate em semifinal/final — vencedor por decisão da Comissão: ", { size: 19 }), t("_".repeat(34), { color: GRAY })], { after: 140 }),
    p(t("Ocorrências / falha técnica (round repetido? motivo):", { bold: true, size: 19 }), { after: 40 }),
    p(t("_".repeat(84), { color: GRAY }), { after: 40 }), p(t("_".repeat(84), { color: GRAY }), { after: 200 }),
    table([3230, 3230, 3230], [row([
      cell([p(t(" ", { size: 20 }), { after: 300 }), p(t("Juiz", { size: 18, color: GRAY }), { align: AlignmentType.CENTER, after: 0 })], 3230),
      cell([p(t(" ", { size: 20 }), { after: 300 }), p(t("Representante Equipe A", { size: 18, color: GRAY }), { align: AlignmentType.CENTER, after: 0 })], 3230),
      cell([p(t(" ", { size: 20 }), { after: 300 }), p(t("Representante Equipe B", { size: 18, color: GRAY }), { align: AlignmentType.CENTER, after: 0 })], 3230)
    ])]),
    ...(last ? [] : [new Paragraph({ children: [new PageBreak()] })])
  ];
}

const margin = { top: 850, bottom: 850, left: 850, right: 850 };
const footer = txt => ({ default: new Footer({ children: [p(t(txt, { size: 14, color: GRAY }), { align: AlignmentType.CENTER, after: 0 })] }) });

const arena = new Document({
  styles: { default: { document: { run: { font: FONT, size: 20 } } } },
  sections: [{ properties: { page: { size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE }, margin } },
    footers: footer("RoboSapiens 2026 · Robô Estoura Balão · Súmula da Arena Livre — registrar também no sistema"),
    children: [1, 2, 3, 4, 5].flatMap(r => arenaPage(r, r === 5)) }]
});
const cup = new Document({
  styles: { default: { document: { run: { font: FONT, size: 20 } } } },
  sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin } },
    footers: footer("RoboSapiens 2026 · Robô Estoura Balão · Súmula do Confronto Direto — registrar também no sistema"),
    children: MATCHES.flatMap((m, i) => matchPage(m, i === MATCHES.length - 1)) }]
});
Promise.all([Packer.toBuffer(arena), Packer.toBuffer(cup)]).then(([a, c]) => {
  fs.writeFileSync("Sumula-Arena-Livre.docx", a); fs.writeFileSync("Sumula-Confronto-Direto.docx", c); console.log("ok");
});
