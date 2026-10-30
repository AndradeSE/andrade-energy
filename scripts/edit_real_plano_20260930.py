"""Edit the recorded Preview plan workflow; never synthesize application screens."""
import asyncio
import math
import hashlib
import re
import subprocess
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from tutorial_annotations import privacy_graph, draw_marker

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'outputs/tutorial-previews'
FF = ROOT / '.codex-ffmpeg/node_modules/ffmpeg-static/ffmpeg.exe'
FPS = 30
ACTION_LEAD = 1.8
TITLE = 'Como cadastrar um plano comercial?'
PREFIX = 'plano'
TITLE_LINES = ['Como cadastrar um', 'plano comercial?']
END_LINES = ['Tutorial concluído', 'Confira sempre os valores.']
BRAND = 'COMERCIAL'
SPEEDS = {0: 3, 1: 1.5}
LEADS = {0: .5, 1: .3, 2: .8}
SCENES = [
    ('comercial-plano-real', 8, 16,
     'Na Home do Comercial, abra Planos.',
     (650, 2150, 875, 2305)),
    ('comercial-plano-real', 49, 54,
     'Na lista de planos, toque em Novo plano.',
     (720, 765, 1060, 895)),
    ('comercial-plano-real', 54, 65,
     'No formulário, preencha o nome e a descrição. Use uma descrição clara dos serviços incluídos.',
     (70, 650, 940, 1060)),
    ('comercial-plano-final', 23, 38,
     'Defina os preços mensal e anual. São valores separados: confira os dois antes de continuar. Neste exemplo, usamos dez reais por mês e cem reais por ano, somente para teste.',
     (70, 1120, 790, 1320)),
    ('comercial-plano-confirmacao', 10, 24,
     'Confira os limites de usinas e clientes e liste os recursos, um por linha. Plano disponível controla se ele pode ser escolhido. Como este plano é de teste, deixamos essa opção desligada.',
     (40, 1870, 880, 2050)),
    ('comercial-plano-confirmacao', 63, 78,
     'Depois de revisar, toque em Salvar e refletir em todo o sistema. Aguarde a confirmação Plano atualizado. O exemplo foi salvo apenas na homologação, sem criar cobrança ou contratar uma assinatura.',
     (40, 2070, 910, 2220)),
]

if '--multiempresas' in sys.argv:
    PREFIX = 'multiempresas'
    TITLE = 'Como cadastrar e operar outra empresa?'
    TITLE_LINES = ['Como cadastrar e', 'operar outra empresa?']
    END_LINES = ['Tutorial concluído', 'Confira o ambiente ativo.']
    SCENES = [
        ('multiempresas-inicio', 5, 20,
         'Na Home, toque em Trocar ambiente. Essa seleção separa a operação das usinas, a gestão comercial e as empresas parceiras.', (80,310,535,410)),
        ('multiempresas-inicio', 61, 77,
         'Escolha Empresas parceiras. Aguarde a abertura da lista: cada empresa mantém usuários, usinas, clientes e faturas separados.', (60,400,510,550)),
        ('multiempresas-inicio', 112, 126,
         'Na lista, toque em Nova empresa. No formulário, informe nome, razão social e identificador. Complete os dados de suporte conforme a empresa. Aqui usamos somente uma empresa fictícia de homologação.', (90,700,990,1200)),
        ('multiempresas-final', 12, 28,
         'Revise a identidade da empresa e os dados de envio de e-mail. Não ative Domínio de e-mail verificado sem validar o domínio no provedor. Neste teste, esse campo permaneceu desligado.', (45,1550,1020,1860)),
        ('multiempresas-final', 38, 74,
         'Toque em Criar empresa e aguarde Empresa criada. A nova empresa aparece na lista, pronta para receber uma operação separada. Essa criação aconteceu apenas no Preview.', (55,2050,1020,2270)),
        ('multiempresas-final', 113, 131,
         'No cartão da empresa correta, toque em Operar esta empresa. A mensagem Ambiente alterado confirma a troca. Confira o nome do ambiente antes de cadastrar qualquer dado. Ambiente atual indica a empresa em que você está trabalhando.', (55,1920,1020,2110)),
    ]
    SPEEDS = {4: 2}
    LEADS = {}

if '--faturamento' in sys.argv:
    PREFIX = 'faturamento'
    SPEEDS = {}
    LEADS = {}
    BRAND = 'GERADOR'
    TITLE = 'Como faturar a conta de energia por PDF?'
    TITLE_LINES = ['Como faturar a conta', 'de energia por PDF?']
    END_LINES = ['Tutorial concluído', 'Confira a confirmação.']
    SCENES = [
        ('gerador-faturamento-pdf', 0, 8, 'Na Home do Gerador, use Faturar via PDF. Selecione a conta de energia no celular.', (70,710,320,1030)),
        ('gerador-faturamento-selecao', 88, 103, 'No seletor de arquivos, localize o PDF correto. Neste exemplo, buscamos o arquivo de teste. Não use um contrato ou outro documento no lugar da fatura.', (40,730,520,1400)),
        ('gerador-faturamento-selecao', 117, 132, 'O aplicativo importa os dados. Confira o cliente vinculado, a unidade consumidora e a concessionária. Os dados pessoais foram ocultados nesta edição.', (50,1160,1030,1910)),
        ('gerador-faturamento-selecao', 164, 178, 'Revise a competência, o vencimento, o consumo e o valor. Corrija qualquer divergência antes de confirmar. O botão Confirmar faturamento conclui a geração.', (55,2040,1040,2240)),
        ('gerador-faturamento-resultado', 0, 15, 'Faturamento concluído confirma que a cobrança foi gerada e o envio entrou na fila de e-mail. Essa mensagem não confirma a entrega do e-mail. O exemplo foi feito somente no Preview.', (90,950,1020,1510)),
    ]

if '--analise-cancelamento' in sys.argv:
    PREFIX = 'analise-cancelamento'
    SPEEDS = {}
    LEADS = {}
    BRAND = 'GERADOR'
    TITLE = 'Como analisar um pedido de cancelamento?'
    TITLE_LINES = ['Como analisar um', 'pedido de cancelamento?']
    END_LINES = ['Tutorial concluído', 'A decisão fica registrada.']
    SCENES = [
        ('gerador-renovacao', 0, 12, 'Na Home do Gerador, abra Contratos para localizar os pedidos vinculados aos clientes da usina.', (870,2150,1070,2310)),
        ('gerador-renovacao', 45, 63, 'Expanda o cliente correto. Cancelamento solicitado indica um pedido pendente. Use Analisar cancelamento para abrir a solicitação.', (110,1860,1040,2010)),
        ('gerador-analise', 0, 15, 'Confira a situação pendente, o cliente, o contrato, a unidade e a data do pedido. Os dados pessoais estão ocultos no vídeo.', (80,520,1010,760)),
        ('gerador-analise', 30, 44, 'Na área Decisão, registre uma observação para o histórico. Confirmar cancelamento encerra o contrato. Recusar solicitação mantém o contrato ativo.', (100,1330,1030,1680)),
        ('gerador-recusa', 20, 34, 'Neste teste, escolhemos Recusar solicitação. Leia a confirmação antes de tocar em Recusar: o contrato permanecerá ativo.', (140,1040,1020,1450)),
        ('gerador-recusa', 60, 74, 'Solicitação concluída confirma a decisão registrada. O contrato permanece ativo neste exemplo, realizado somente no Preview.', (80,970,1020,1450)),
    ]

if '--renovacao-gerador' in sys.argv:
    PREFIX = 'renovacao-gerador'
    SPEEDS = {}
    LEADS = {}
    BRAND = 'GERADOR'
    TITLE = 'Como preparar uma proposta de renovação?'
    TITLE_LINES = ['Como preparar uma', 'proposta de renovação?']
    END_LINES = ['Tutorial concluído', 'Aguarde o aceite do cliente.']
    SCENES = [
        ('gerador-renovacao', 0, 12, 'Na Home do Gerador, abra Contratos. Localize a unidade do cliente que solicitou a renovação.', (870,2150,1070,2310)),
        ('gerador-renovacao', 45, 63, 'Expanda o cliente e use Preparar renovação. O formulário traz as condições atuais para você revisar antes de gerar a proposta.', (110,2030,1040,2170)),
        ('gerador-renovacao', 155, 172, 'Confira prazo, desconto e início da vigência. O vencimento é calculado pelo aplicativo. Revise também as estimativas, sem tratar os valores de exemplo como promessa de economia.', (100,1040,1020,1600)),
        ('gerador-minuta-renovacao', 5, 28, 'Use Gerar e revisar a minuta. A confirmação lembra que o contrato anterior continua vigente até a concordância. Abra o PDF gerado e leia as condições antes de enviar.', (60,1500,1020,1710)),
        ('gerador-minuta-renovacao', 64, 78, 'O documento gerado abre no leitor do celular. Confira todas as cláusulas e condições. O conteúdo foi desfocado aqui para preservar os dados.', (50,430,1030,1740)),
        ('gerador-minuta-renovacao', 116, 138, 'Depois da leitura, toque em Enviar revisão para aceite. Confira a confirmação da proposta. Confirmar e enviar encaminha o documento para o cliente, sem substituir o contrato vigente antes do aceite.', (80,1930,1030,2060)),
        ('consumidor-revisao-recebimento', 20, 33, 'No app do cliente, a notificação Revisão contratual disponível foi recebida neste teste. O cliente deve conferir a nova minuta e concordar com as alterações para concluir a renovação.', (50,320,1010,480)),
    ]

def run(args):
    tail = 3 if len(args) >= 3 and args[-2] == '-loglevel' else 1
    subprocess.run([str(FF), '-y', '-filter_complex_threads', '2', *args[:-tail], '-threads', '2', *args[-tail:]], check=True)

def audio_duration(path):
    probe = subprocess.run([str(FF), '-hide_banner', '-i', str(path)], capture_output=True, text=True)
    match = re.search(r'Duration: (\d+):(\d+):([\d.]+)', probe.stderr)
    if not match:
        raise RuntimeError(f'Cannot inspect narration: {path}')
    hours, minutes, seconds = map(float, match.groups())
    return hours * 3600 + minutes * 60 + seconds

def card(path, lines, ending=False):
    im = Image.new('RGB', (1080, 2340), '#083e31')
    d = ImageDraw.Draw(im)
    if ending:
        d.ellipse((440, 747, 640, 947), fill='#0bbf79')
        d.line(((482, 847), (524, 887), (602, 800)), fill='white', width=18, joint='curve')
    for i, line in enumerate(lines):
        d.text((540, 1030 + 92*i), line, fill='white', anchor='mm',
               font=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 61))
    d.text((540, 2110), f'ANDRADE ENERGY · {BRAND}', fill='#8bd9b4', anchor='mm',
           font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 36))
    im.save(path)

async def voices():
    result = []
    for i, text in enumerate([TITLE] + [s[3] for s in SCENES]):
        key = hashlib.sha256(('pt-BR-FranciscaNeural:'+text).encode()).hexdigest()[:8]
        path = OUT / f'{PREFIX}-real-20260930-voz-{key}.mp3'
        if not path.exists():
            sys.path.insert(0, str(ROOT / 'tmp/tts-tools'))
            import edge_tts
            await edge_tts.Communicate(text, 'pt-BR-FranciscaNeural', rate='+2%').save(str(path))
        result.append(path)
    return result

def build():
    audio = asyncio.run(voices())
    # Never cut off speech. Preserve a short pause after each narrated section.
    scene_durations = [max((s[2]-s[1])/SPEEDS.get(i,1)+LEADS.get(i,ACTION_LEAD), audio_duration(audio[i+1])+.8)
                      for i,s in enumerate(SCENES)]
    intro, outro = OUT / f'{PREFIX}-real-titulo.png', OUT / f'{PREFIX}-real-final.png'
    card(intro, TITLE_LINES)
    card(outro, END_LINES, True)
    cuts = []
    plan_marks = {
        0: [((695, 2130, 825, 2300), 1.2, 3.2)],
        1: [((695, 780, 1025, 925), 1.0, 3.5)],
        2: [((55, 710, 900, 885), 1.1, 3.3), ((55, 940, 900, 1120), 4.0, 6.2)],
        3: [((55, 1150, 465, 1350), 1.0, 3.2), ((480, 1150, 905, 1350), 4.0, 6.2)],
        4: [((55, 1370, 905, 1570), 1.1, 3.3), ((55, 1620, 900, 1880), 5.0, 7.2), ((755, 1900, 900, 2070), 9.0, 11.2)],
        5: [((55, 2130, 900, 2300), 1.0, 3.8)],
    }
    multi_marks = {
        0: [((55, 315, 500, 445), 1.8, 4.2)],
        1: [((325, 1820, 780, 1970), 0.1, 1.6)],
        2: [((65, 650, 500, 770), 1.8, 4.0),
            ((65, 680, 1000, 850), 6.2, 8.2)],
        3: [((65, 1030, 1015, 1190), 2.0, 4.2),
            ((905, 1680, 1050, 1840), 10.0, 12.2)],
        4: [((70, 2100, 1020, 2300), 2.0, 4.6)],
        5: [((95, 1950, 965, 2130), 2.0, 4.6)],
    }
    billing_marks = {
        0: [((65, 750, 320, 1020), 1.8, 4.0)],
        1: [((55, 500, 400, 1040), 1.8, 4.0)],
        # The selected PDF card stays visible here; marking the instruction
        # paragraph above it would point to the wrong control.
        2: [((60, 880, 1010, 1130), 1.8, 4.0)],
        3: [((90, 650, 950, 850), 1.8, 3.4),
            ((90, 880, 950, 1080), 3.8, 5.4),
            ((90, 1110, 950, 1320), 5.8, 7.4),
            ((65, 1930, 1010, 2095), 9.0, 11.5)],
        4: [((290, 1130, 880, 1510), 2.0, 5.0)],
    }
    cancellation_marks = {
        4: [((170, 1535, 910, 1700), 7.0, 9.4),
            ((765, 1280, 950, 1390), 11.3, 13.6)],
    }
    for i, (name, start, stop, _, bounds) in enumerate(SCENES):
        speed = SPEEDS.get(i, 1)
        action_lead = LEADS.get(i,ACTION_LEAD)
        duration = scene_durations[i]
        # Normalize capture timestamps once so independent cuts seek to the same frame.
        normalized = OUT / f'{name}-timeline30-20261001.mp4'
        if not normalized.exists():
            run(['-i',str(ROOT / f'tmp/device-debug/{name}-20260930.mp4'),
                 '-vf',f'fps={FPS},setpts=PTS-STARTPTS','-an','-c:v','libx264',
                 '-preset','veryfast','-crf','22',str(normalized),'-loglevel','error'])
        frames = OUT / f'frames-{PREFIX}-sincronia-v2-{i}'
        frames.mkdir(exist_ok=True)
        for n in range(math.ceil(duration*FPS)):
            t = n/FPS
            layer = Image.new('RGBA', (1080,2340), (0,0,0,0))
            mark_start, mark_stop = (9, 12) if PREFIX == 'multiempresas' and i == 3 else (1, 4)
            if PREFIX in ('analise-cancelamento', 'renovacao-gerador') and i == 1:
                mark_start, mark_stop = 10, 13
            mark_start += action_lead
            mark_stop += action_lead
            marks = (plan_marks[i] if PREFIX == 'plano' else
                     multi_marks[i] if PREFIX == 'multiempresas' else
                     billing_marks[i] if PREFIX == 'faturamento' else
                     cancellation_marks[i] if PREFIX == 'analise-cancelamento' and i in cancellation_marks else
                     [(bounds, mark_start, mark_stop)])
            if PREFIX == 'renovacao-gerador' and i == 4:
                # The document is intentionally blurred: there is no specific
                # readable control to point at while narrating its review.
                marks = []
            for (x1,y1,x2,y2), begin, end in marks:
                if begin <= t <= end:
                    p = min(1, (t-begin)/.9)
                    d = ImageDraw.Draw(layer)
                    alpha = round(235*min(1,(end-t)/.4))
                    draw_marker(d, (x1,y1,x2,y2), p, alpha)
            layer.save(frames / f'{n:04d}.png')
        revision = 'v10' if PREFIX in ('multiempresas', 'faturamento', 'analise-cancelamento') else 'v9'
        cut = OUT / f'{PREFIX}-sincronia-{revision}-cena-{i}.mp4'
        # Names in the commercial header and keyboard predictions are private.
        privacy = 'drawbox=x=160:y=120:w=690:h=180:color=0x07513d:t=fill' if PREFIX == 'plano' else 'null'
        if PREFIX == 'faturamento':
            if i == 1:
                privacy = 'drawbox=x=0:y=1500:w=1080:h=840:color=0x181818:t=fill'
            elif i == 2:
                privacy = 'drawbox=x=540:y=1300:w=440:h=80:color=0xf1f7f3:t=fill,drawbox=x=540:y=1540:w=440:h=80:color=0xf1f7f3:t=fill'
            elif i >= 3:
                # These cuts are already scrolled to public billing values.
                # A fixed identity mask here obscures the concessionaria row.
                privacy = 'null'
        if PREFIX == 'analise-cancelamento':
            if i == 1:
                privacy = "drawbox=x=200:y=1360:w=740:h=130:color=0xf1f7f3:t=fill,drawbox=x=230:y=1715:w=750:h=155:color=0xf1f7f3:t=fill,drawbox=x=200:y=1640:w=800:h=230:color=0xf1f7f3:t=fill:enable='lt(t,6)'"
            elif i == 2:
                privacy = 'drawbox=x=140:y=800:w=870:h=110:color=0xf1f7f3:t=fill,drawbox=x=140:y=1000:w=870:h=115:color=0xf1f7f3:t=fill,drawbox=x=140:y=1190:w=870:h=115:color=0xf1f7f3:t=fill'
        if PREFIX == 'renovacao-gerador':
            if i == 1:
                privacy = "drawbox=x=200:y=1360:w=740:h=130:color=0xf1f7f3:t=fill,drawbox=x=230:y=1715:w=750:h=155:color=0xf1f7f3:t=fill,drawbox=x=200:y=1640:w=800:h=230:color=0xf1f7f3:t=fill:enable='lt(t,6)'"
            elif i == 2:
                privacy = 'drawbox=x=100:y=240:w=900:h=380:color=0xf1f7f3:t=fill'
            elif i == 4:
                privacy = 'gblur=sigma=24'
            elif i == 6:
                privacy = "drawtext=fontfile='C\\:/Windows/Fonts/arialbd.ttf':text='NO APP CONSUMIDOR':x=(w-tw)/2:y=1950:fontsize=38:fontcolor=0x083e31"
        run(['-ss',str(start),'-t',str(stop-start),'-i',str(normalized),'-framerate',str(FPS),
             '-i',str(frames/'%04d.png'),'-filter_complex',privacy_graph('0:v', privacy, 'private', f'mask{i}')+f';[private]setpts=(PTS-STARTPTS)/{speed},fps={FPS},tpad=start_mode=clone:start_duration={action_lead}:stop_mode=clone:stop_duration={duration},trim=duration={duration}[p];[p][1:v]overlay=shortest=1[v]',
             '-map','[v]','-an','-c:v','libx264','-preset','veryfast','-crf','22',str(cut),'-loglevel','error'])
        cuts.append(cut)
    args = ['-loop','1','-i',str(intro)]
    for cut in cuts: args += ['-i',str(cut)]
    args += ['-loop','1','-i',str(outro)]
    for path in audio: args += ['-i',str(path)]
    args += ['-stream_loop','-1','-i',str(ROOT/'tmp/tutorials-por-funcao/trilha-instrumental.wav')]
    durations = [max(5,audio_duration(audio[0])+1)] + scene_durations + [3]
    filters = [f'[{i}:v]fps={FPS},trim=duration={dur},setpts=PTS-STARTPTS[v{i}]' for i,dur in enumerate(durations)]
    nv = len(durations)
    filters += [''.join(f'[v{i}]' for i in range(nv))+f'concat=n={nv}:v=1:a=0[v]']
    for i,dur in enumerate(durations[:-1]):
        filters += [f'[{nv+i}:a]highpass=f=70,loudnorm=I=-18:TP=-2:LRA=7,aresample=48000,adelay=200,apad,atrim=duration={dur},asetpts=PTS-STARTPTS[a{i}]']
    total = sum(durations)
    na = len(audio)
    filters += [''.join(f'[a{i}]' for i in range(na))+f'concat=n={na}:v=0:a=1,apad,atrim=duration={total}[voice]',
                f'[{nv+na}:a]volume=1.9,atrim=duration={total},afade=t=out:st={total-3}:d=3[music]',
                '[voice][music]amix=inputs=2:duration=first:normalize=0,alimiter=limit=.92[a]']
    revision = 'v10' if PREFIX in ('multiempresas', 'faturamento', 'analise-cancelamento') else 'v9'
    target = OUT / f'tutorial-{PREFIX}-real-blur-arrows-20261004.mp4'
    run([*args,'-filter_complex',';'.join(filters),'-map','[v]','-map','[a]','-t',str(total),
         '-c:v','libx264','-preset','veryfast','-crf','22','-pix_fmt','yuv420p','-c:a','aac',
         '-b:a','128k','-metadata:s:a:0','language=por','-metadata:s:v:0','language=por','-movflags','+faststart',str(target),'-loglevel','error'])
    print(target)

if __name__ == '__main__':
    build()
