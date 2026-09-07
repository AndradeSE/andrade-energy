// Inventário estático: candidatos precisam de revisão visual, não são erros confirmados.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function files(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : e.name.endsWith('.tsx') ? [path.join(dir, e.name)] : []); }
const rows = files(path.join(root, 'app')).filter(f => !f.includes('_old') && !f.endsWith('_layout.tsx')).map(file => {
  const source = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let texts = 0;
  const candidates = [];
  function visit(node) {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === 'Text') {
      texts++;
      const style = node.openingElement.attributes.getText(ast);
      if (/styles\.(title|subtitle|description|hint|sectionTitle|historyTitle|copy|note)\b/.test(style)) {
        let parent = node.parent, inCard = false;
        while (parent) {
          if (ts.isJsxElement(parent) && /^(Card|Section|AECard|DashboardSection)$/.test(parent.openingElement.tagName.getText(ast))) inCard = true;
          parent = parent.parent;
        }
        if (!inCard) candidates.push(ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return `| ${path.relative(root, file).replaceAll('\\', '/')} | ${texts} | ${candidates.join(', ') || '—'} |`;
});
process.stdout.write('# Mapa das telas dos aplicativos\n\nInventário estático de ' + rows.length + ' rotas (layouts e pastas antigas excluídos). Ambos os APKs compartilham estas fontes. Linhas candidatas indicam títulos/instruções fora de Card/Section; Views estilizadas podem já formar cards. Não equivale a validação visual no aparelho.\n\n| Tela | Textos | Linhas para revisão visual |\n| --- | ---: | --- |\n' + rows.join('\n') + '\n');
