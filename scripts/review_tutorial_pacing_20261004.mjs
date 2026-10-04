/** Non-destructive pacing/audio review copies of the eight real tutorials. */
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const ffmpeg = 'C:/Users/vini_/andrade-energy/.codex-ffmpeg/node_modules/ffmpeg-static/ffmpeg.exe';
const source = join(root, 'assets', 'tutorials');
const output = join(root, 'tmp', 'video-audit-20261004', 'revised');
const names = [
  'tutorial-faturamento-comercial-real',
  'tutorial-analise-cancelamento-comercial-real',
  'tutorial-renovacao-gerador-real',
  'tutorial-chave-pix-salva-real',
  'tutorial-plano-comercial-real',
  'tutorial-multiempresas-comercial-real',
  'tutorial-cancelamento-completo-real',
  'tutorial-revisao-real-consumidor',
];

function run(args) {
  const p = spawnSync(ffmpeg, ['-threads', '2', ...args], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (p.error || p.status !== 0) throw new Error(`${p.error ?? p.stderr.slice(-2500)}\n${args.join(' ')}`);
  return p.stderr;
}

function inspect(path) {
  const log = run(['-hide_banner', '-i', path, '-af', 'silencedetect=noise=-22dB:d=1.4', '-f', 'null', 'NUL']);
  const durationMatch = log.match(/Duration: (\d+):(\d+):([\d.]+)/);
  if (!durationMatch) throw new Error(`Cannot read duration: ${path}`);
  const duration = Number(durationMatch[1]) * 3600 + Number(durationMatch[2]) * 60 + Number(durationMatch[3]);
  const silences = [];
  let start = null;
  for (const line of log.split('\n')) {
    const beginning = line.match(/silence_start: ([\d.]+)/);
    const ending = line.match(/silence_end: ([\d.]+)/);
    if (beginning) start = Number(beginning[1]);
    else if (ending && start !== null) { silences.push([start, Number(ending[1])]); start = null; }
  }
  if (start !== null) silences.push([start, duration]);
  return { duration, silences };
}

function intervals(duration, silences) {
  const keep = [];
  let cursor = 0;
  for (const [start, end] of silences) {
    if (end - start < 2.8) continue;
    const cutStart = start + 1.15;
    const cutEnd = end - (end >= duration - 0.12 ? 1.6 : 0.8);
    if (cutEnd - cutStart < 0.8) continue;
    keep.push([cursor, cutStart]);
    cursor = cutEnd;
  }
  keep.push([cursor, duration]);
  return keep.filter(([a, b]) => b - a >= 0.04);
}

function render(name) {
  const rebuiltNames = {
    'tutorial-faturamento-comercial-real': 'tutorial-faturamento-real',
    'tutorial-analise-cancelamento-comercial-real': 'tutorial-analise-cancelamento-real',
    'tutorial-plano-comercial-real': 'tutorial-plano-real',
    'tutorial-multiempresas-comercial-real': 'tutorial-multiempresas-real',
  };
  const input = process.env.REBUILT_TUTORIAL_DIR
    ? join(process.env.REBUILT_TUTORIAL_DIR, `${rebuiltNames[name] ?? name}-blur-arrows-20261004.mp4`)
    : name === 'tutorial-faturamento-comercial-real' && process.env.BILLING_CLEAN_SOURCE
    ? process.env.BILLING_CLEAN_SOURCE : join(source, `${name}.mp4`);
  const target = join(output, `${name}.mp4`);
  const { duration, silences } = inspect(input);
  const kept = intervals(duration, silences);
  const filters = [];
  kept.forEach(([start, end], i) => {
    filters.push(`[0:v]trim=start=${start.toFixed(4)}:end=${end.toFixed(4)},setpts=PTS-STARTPTS[v${i}]`);
    filters.push(`[0:a]atrim=start=${start.toFixed(4)}:end=${end.toFixed(4)},asetpts=PTS-STARTPTS[a${i}]`);
  });
  filters.push(kept.map((_, i) => `[v${i}][a${i}]`).join('') + `concat=n=${kept.length}:v=1:a=1[v][raw]`);
  filters.push('[raw]highpass=f=65,acompressor=threshold=0.18:ratio=2.1:attack=12:release=250,loudnorm=I=-16:LRA=7:TP=-1.5,alimiter=limit=0.9[a]');
  run(['-y', '-hide_banner', '-loglevel', 'error', '-filter_complex_threads', '2', '-i', input, '-filter_complex', filters.join(';'), '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-threads', '2', '-preset', 'fast', '-crf', '21', '-r', '30', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-metadata:s:a:0', 'language=por', '-movflags', '+faststart', target]);
  run(['-v', 'error', '-i', target, '-f', 'null', 'NUL']);
  const revised = inspect(target);
  process.stdout.write(`${name}: ${duration.toFixed(1)}s -> ${revised.duration.toFixed(1)}s, ${kept.length - 1} gaps shortened\n`);
}

mkdirSync(output, { recursive: true });
const selected = process.argv.slice(2);
for (const name of selected.length ? selected : names) {
  if (!names.includes(name)) throw new Error(`Unknown tutorial: ${name}`);
  process.stdout.write(`Revising ${name}...\n`);
  render(name);
}
