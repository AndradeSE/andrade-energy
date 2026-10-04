/** Apply a conservative peak ceiling without re-encoding reviewed video frames. */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const ffmpeg = 'C:/Users/vini_/andrade-energy/.codex-ffmpeg/node_modules/ffmpeg-static/ffmpeg.exe';
const source = join(root, 'tmp/video-audit-20261004/revised');
const output = join(root, 'tmp/video-audit-20261004/final-candidates');
const music = 'C:/Users/vini_/andrade-energy/tmp/tutorials-por-funcao/trilha-instrumental.wav';
mkdirSync(output, { recursive: true });
for (const name of readdirSync(source).filter((item) => item.endsWith('.mp4'))) {
  process.stdout.write(`Finishing ${name}...\n`);
  const target = join(output, name);
  const sourceFile = join(source, name);
  const probe = spawnSync(ffmpeg, ['-hide_banner', '-i', sourceFile], { encoding: 'utf8' });
  const match = probe.stderr.match(/Duration: (\d+):(\d+):([\d.]+)/);
  if (!match) throw new Error(`Cannot read duration: ${name}`);
  const duration = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
  const fadeStart = Math.max(0, duration - 2);
  const result = spawnSync(ffmpeg, [
    '-y', '-hide_banner', '-loglevel', 'error', '-i', sourceFile,
    '-stream_loop', '-1', '-i', music,
    '-filter_complex', `[1:a]volume=1.0,atrim=duration=${duration},afade=t=out:st=${fadeStart}:d=2[bed];[0:a][bed]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.75:level=0[a]`,
    '-map', '0:v:0', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k',
    '-metadata:s:a:0', 'language=por', '-metadata:s:v:0', 'language=por',
    '-movflags', '+faststart', target,
  ], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`${result.error ?? result.stderr}`);
}
