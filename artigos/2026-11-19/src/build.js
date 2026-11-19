// Converte os .txt (marcação simples) em .docx
const fs = require('fs');
const path = require('path');
const d = require('docx');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, LevelFormat, AlignmentType } = d;

function runs(text, base = {}) {
  const out = [];
  text.split(/(\*\*[^*]+\*\*)/).forEach(p => {
    if (!p) return;
    if (p.startsWith('**') && p.endsWith('**')) out.push(new TextRun({ ...base, text: p.slice(2, -2), bold: true }));
    else out.push(new TextRun({ ...base, text: p }));
  });
  return out;
}

function build(src, dst, cfg) {
  const lines = fs.readFileSync(src, 'utf8').split('\n');
  const children = [];
  let numRef = 0, inNum = false, table = null;
  const flushTable = () => {
    if (!table) return;
    const cols = table[0].length, total = 9026, w = Math.floor(total / cols);
    const widths = Array(cols).fill(w); widths[cols - 1] = total - w * (cols - 1);
    const border = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' };
    children.push(new Table({
      width: { size: total, type: WidthType.DXA }, columnWidths: widths,
      rows: table.map((r, i) => new TableRow({ tableHeader: i === 0, children: r.map((c, j) => new TableCell({
        width: { size: widths[j], type: WidthType.DXA },
        borders: { top: border, bottom: border, left: border, right: border },
        shading: i === 0 ? { type: ShadingType.CLEAR, fill: cfg.accent, color: 'auto' } : undefined,
        margins: { top: 80, bottom: 80, left: 100, right: 100 },
        children: [new Paragraph({ spacing: { after: 0 }, children: runs(c.trim(), i === 0 ? { bold: true, color: 'FFFFFF' } : {}) })],
      })) })),
    }));
    children.push(new Paragraph({ children: [] }));
    table = null;
  };
  for (const raw of lines) {
    const l = raw.trimEnd();
    if (!l.startsWith('|')) flushTable();
    if (!/^\d+\. /.test(l)) inNum = false;
    if (!l) continue;
    if (l.startsWith('|')) { (table = table || []).push(l.slice(1).split('|')); continue; }
    if (l.startsWith('# ')) children.push(new Paragraph({ heading: HeadingLevel.TITLE, children: runs(l.slice(2)) }));
    else if (l.startsWith('## ')) children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: runs(l.slice(3)) }));
    else if (l.startsWith('### ')) children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: runs(l.slice(4)) }));
    else if (l.startsWith('@')) children.push(new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: l.slice(1), italics: true, color: '666666' })] }));
    else if (l.startsWith('- ')) children.push(new Paragraph({ numbering: { reference: 'bul', level: 0 }, children: runs(l.slice(2)) }));
    else if (/^\d+\. /.test(l)) {
      if (!inNum) { numRef++; inNum = true; }
      children.push(new Paragraph({ numbering: { reference: 'num' + numRef, level: 0 }, children: runs(l.replace(/^\d+\. /, '')) }));
    } else if (l.startsWith('> ')) children.push(new Paragraph({
      indent: { left: 360 }, spacing: { before: 120, after: 240 },
      border: { left: { style: BorderStyle.SINGLE, size: 18, color: cfg.accent, space: 12 } },
      children: runs(l.slice(2), { italics: true }) }));
    else if (/^\*[^*].*\*$/.test(l)) children.push(new Paragraph({ children: [new TextRun({ text: l.slice(1, -1), italics: true, size: 20, color: '666666' })] }));
    else children.push(new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: runs(l) }));
  }
  flushTable();
  const numConfigs = [{ reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }];
  for (let i = 1; i <= numRef; i++) numConfigs.push({ reference: 'num' + i, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] });
  const font = cfg.font;
  const doc = new Document({
    creator: cfg.creator, title: cfg.title,
    styles: {
      default: { document: { run: { font, size: 23 }, paragraph: { spacing: { after: 160, line: 300, lineRule: 'auto' } } } },
      paragraphStyles: [
        { id: 'Title', name: 'Title', basedOn: 'Normal', next: 'Normal', run: { font, size: 40, bold: true, color: cfg.accent }, paragraph: { spacing: { before: 0, after: 160, line: 264, lineRule: 'auto' }, keepNext: true } },
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font, size: 28, bold: true, color: cfg.accent }, paragraph: { spacing: { before: 320, after: 120 }, keepNext: true, outlineLevel: 0 } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font, size: 24, bold: true }, paragraph: { spacing: { before: 200, after: 80 }, keepNext: true, outlineLevel: 1 } },
      ],
    },
    numbering: { config: numConfigs },
    sections: [{ properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } }, children }],
  });
  return Packer.toBuffer(doc).then(b => fs.writeFileSync(dst, b));
}

const here = __dirname, out = path.join(here, '..');
const TM = { font: 'Georgia', accent: '1F3864', creator: 'O Tributarista Minucioso' };
const MLA = { font: 'Arial', accent: '0B3D2E', creator: 'Manassés Lopes Advogados' };
Promise.all([
  build(path.join(here, 'tm_destaque.txt'), path.join(out, 'Tributarista_Minucioso_Destaque_CBS_IBS_2026-11-19.docx'), { ...TM, title: 'Destaque de CBS e IBS' }),
  build(path.join(here, 'mla_cosmeticos.txt'), path.join(out, 'MLA_Exportacao_Cosmeticos_Aladi_2026-11-19.docx'), { ...MLA, title: 'Exportação de cosméticos' }),
  build(path.join(here, 'linkedin.txt'), path.join(out, 'LinkedIn_posts_2026-11-19.docx'), { ...MLA, title: 'LinkedIn' }),
]).then(() => console.log('ok'));
