"""Rebuild all eight existing real edits, then conservatively compact holds."""
import subprocess
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
tasks=[
    ('edit_real_plano_20260930.py',[]),
    ('edit_real_plano_20260930.py',['--multiempresas']),
    ('edit_real_plano_20260930.py',['--faturamento']),
    ('edit_real_plano_20260930.py',['--analise-cancelamento']),
    ('edit_real_plano_20260930.py',['--renovacao-gerador']),
    ('build_cancelamento_capture_20260930.py',[]),
    ('build_pix_saved_real_tutorial.py',[]),
    ('build_real_contract_revision_tutorial.py',[]),
    ('finalize_tutorial_audio.py',[]),
    ('compact_tutorial_pauses.py',[]),
]
for script,args in tasks:
    print('START',script,*args,flush=True)
    subprocess.run([sys.executable,str(ROOT/'scripts'/script),*args],cwd=ROOT,check=True)
    print('DONE',script,*args,flush=True)
