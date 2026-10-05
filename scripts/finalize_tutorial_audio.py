"""Give the reviewed real tutorials a consistent, audible music bed."""
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "outputs/tutorial-previews"
FF = ROOT / ".codex-ffmpeg/node_modules/ffmpeg-static/ffmpeg.exe"
MUSIC = ROOT / "tmp/tutorials-por-funcao/trilha-instrumental.wav"

if __name__ == "__main__":
    for source in sorted(OUT.glob("tutorial-*-blur-arrows-20261004.mp4")):
        probe = subprocess.run([str(FF), "-hide_banner", "-i", str(source)], capture_output=True, text=True)
        match = re.search(r"Duration: (\d+):(\d+):([\d.]+)", probe.stderr)
        if not match:
            raise RuntimeError(f"Invalid tutorial: {source.name}")
        hours, minutes, seconds = map(float, match.groups())
        duration = hours * 3600 + minutes * 60 + seconds
        target = source.with_name(source.name.replace("-blur-arrows-", "-final-"))
        # The source music is already mixed at 1.9. This small aligned addition
        # brings it to 2.4 without rendering the video frames a second time.
        filters = (f"[1:a]volume=0.5,atrim=duration={duration},"
                   f"afade=t=out:st={max(0, duration-3)}:d=3[m];"
                   "[0:a][m]amix=inputs=2:duration=first:normalize=0,"
                   "alimiter=limit=0.84:level=false[a]")
        subprocess.run([str(FF), "-y", "-hide_banner", "-loglevel", "error",
                        "-i", str(source), "-stream_loop", "-1", "-i", str(MUSIC),
                        "-filter_complex", filters, "-map", "0:v:0", "-map", "[a]",
                        "-c:v", "copy", "-c:a", "aac", "-b:a", "160k",
                        "-metadata:s:a:0", "language=por", "-metadata:s:v:0", "language=por",
                        "-movflags", "+faststart", "-t", str(duration), str(target)], check=True)
        print(target.name, flush=True)
