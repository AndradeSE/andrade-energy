const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const filename = path.resolve(__dirname, '../backend/src/modules/faturas/documentosFatura.service.ts');
const compiled = new Module(filename, module);
compiled.paths = Module._nodeModulePaths(path.dirname(filename));
const actualRequire = compiled.require.bind(compiled);
compiled.require = name => name.endsWith('/config/supabase') ? { supabase: { from() { throw Error('Consulta não permitida nesta prova local'); } } }
  : name.endsWith('/ocr/ocr.service') ? {} : name.endsWith('/ocr/parser.service') ? {} : actualRequire(name);
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const fixture = {
  referencia: '10/2026', vencimento: '2026-10-20', numero_instalacao: 'UC TESTE',
  clientes: { nome: 'CLIENTE DE DEMONSTRAÇÃO' }, unidades_consumidoras: { id: 'local', titular: 'CLIENTE DE DEMONSTRAÇÃO', endereco: 'ENDEREÇO DE TESTE' },
  valor_cemig: 117.83, valor_cemig_repassado: 105.31, valor_total_absorvido: 12.52,
  valor_usina: 269.61, valor_total_unificado: 374.92, energia_compensada: 401, desconto_percentual: 15,
};
compiled.exports.gerarPdfFatura(fixture, 'UNIFICADA').then(buffer => {
  const dir = path.resolve(__dirname, '../tmp/pdfs'); fs.mkdirSync(dir, {recursive: true});
  const target = path.join(dir, 'invoice-minus-qa.pdf'); fs.writeFileSync(target, buffer); console.log(target);
}).catch(error => {console.error(error.message);process.exitCode=1;});
