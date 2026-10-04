import { spawnSync } from 'node:child_process';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dir = join(root, 'tmp/video-audit-20261004/final-candidates');
const qa = join(root, 'tmp/video-audit-20261004/blur-arrows-qa');
const ff = 'C:/Users/vini_/andrade-energy/.codex-ffmpeg/node_modules/ffmpeg-static/ffmpeg.exe';
const names = ['faturamento-comercial', 'analise-cancelamento-comercial', 'renovacao-gerador', 'chave-pix-salva', 'plano-comercial', 'multiempresas-comercial', 'cancelamento-completo', 'revisao-real-consumidor'];
mkdirSync(qa, { recursive: true });
const report = [];
for (const stem of names) {
  const name = stem === 'revisao-real-consumidor' ? `tutorial-${stem}` : `tutorial-${stem}-real`;
  const file = join(dir, `${name}.mp4`);
  const probe = spawnSync(ff, ['-threads', '2', '-hide_banner', '-i', file], {encoding:'utf8'});
  if (!/30 fps/.test(probe.stderr) || !/Audio: aac/.test(probe.stderr) || !/\(por\)/.test(probe.stderr)) throw new Error(`Stream format mismatch: ${name}`);
  const duration = probe.stderr.match(/Duration: (\d+):(\d+):([\d.]+)/);
  if (!duration || statSync(file).size < 50000) throw new Error(`Incomplete file: ${name}`);
  const seconds = +duration[1]*3600 + +duration[2]*60 + +duration[3];
  const decode = spawnSync(ff, ['-threads','2','-v','error','-i',file,'-f','null','NUL'], {encoding:'utf8'});
  if (decode.status !== 0 || decode.stderr.trim()) throw new Error(`Decode failure: ${name}: ${decode.stderr.slice(-500)}`);
  const sheet = spawnSync(ff, ['-threads','2','-y','-v','error','-i',file,'-vf',`fps=1/${(seconds/16).toFixed(3)},scale=270:-1,tile=4x4`,'-frames:v','1',join(qa,`${name}.jpg`)], {encoding:'utf8'});
  if (sheet.status !== 0) throw new Error(sheet.stderr);
  report.push({name,seconds,bytes:statSync(file).size,decode:'passed',fps:30,audioLanguage:'por',visualReview:'contact-sheet-required'});
  console.log(`${name}: decode passed, ${seconds.toFixed(1)}s, 30fps, Portuguese audio`);
}
writeFileSync(join(qa, 'technical-validation.json'), JSON.stringify(report,null,2));
