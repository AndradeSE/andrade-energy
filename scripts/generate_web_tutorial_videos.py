from __future__ import annotations

from pathlib import Path
import asyncio
import subprocess
import tempfile
import wave

import edge_tts
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "portal-web" / "public" / "tutorials"
LOGO = ROOT / "assets" / "images" / "andrade-logo-horizontal.png"
W, H, FPS = 1280, 720, 30
GREEN, DEEP, YELLOW = "#087A46", "#0B3F31", "#F4CE35"
BG, SURFACE, INK, MUTED, LINE = "#EAF1ED", "#FFFFFF", "#17382D", "#667970", "#CAD9D1"


def font(size: int, bold: bool = False):
    return ImageFont.truetype(str(Path("C:/Windows/Fonts") / ("segoeuib.ttf" if bold else "segoeui.ttf")), size)


def rounded(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def wrap(draw, text, fnt, width):
    lines, line = [], ""
    for word in text.split():
        candidate = f"{line} {word}".strip()
        if draw.textbbox((0, 0), candidate, font=fnt)[2] <= width:
            line = candidate
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def draw_field(d, box, label, value="", accent=False):
    x1, y1, x2, y2 = box
    d.text((x1, y1 - 19), label, font=font(10, True), fill=MUTED)
    rounded(d, box, 9, "#F8FBF9", GREEN if accent else LINE, 2 if accent else 1)
    if value:
        d.text((x1 + 13, y1 + 10), value, font=font(12), fill=INK)


def draw_toggle(d, x, y, label, enabled=True):
    d.text((x, y + 4), label, font=font(11, True), fill=INK)
    rounded(d, (x + 245, y, x + 293, y + 25), 13, GREEN if enabled else "#BBC8C2")
    knob_x = x + 271 if enabled else x + 247
    d.ellipse((knob_x, y + 3, knob_x + 19, y + 22), fill="white")


def draw_unique_panel(d, step):
    """Desenha a ferramenta real de cada etapa, evitando tutoriais visualmente repetidos."""
    title = step["title"].lower()
    left, top, right = 306, 427, W - 79

    if "envie o convite" in title:
        draw_field(d, (left, top + 23, 760, top + 65), "E-MAIL DO CONSUMIDOR", "cliente@email.com", True)
        draw_field(d, (785, top + 23, right, top + 65), "TELEFONE (OPCIONAL)", "(35) 99999-9999")
        rounded(d, (left, top + 92, 570, top + 134), 10, GREEN)
        d.text((342, top + 104), "Enviar convite", font=font(12, True), fill="white")
        return (470, top + 113)
    if "contas vinculadas" in title:
        rows = [("Conta CEMIG · agosto/2026", "UC 121361801894", "Usar esta fatura"),
                ("Conta CEMIG · julho/2026", "UC 121361801894", "Visualizar")]
        for i, (name, uc, action) in enumerate(rows):
            y = top + i * 70
            rounded(d, (left, y, right, y + 56), 10, "#F3F7F5", LINE)
            d.text((left + 16, y + 9), name, font=font(12, True), fill=INK)
            d.text((left + 16, y + 31), uc, font=font(10), fill=MUTED)
            rounded(d, (right - 160, y + 12, right - 14, y + 44), 9, GREEN if i == 0 else "#E2ECE7")
            d.text((right - 143, y + 21), action, font=font(10, True), fill="white" if i == 0 else INK)
        return (right - 84, top + 28)
    if "configure a unidade" in title:
        draw_field(d, (left, top + 19, 610, top + 57), "USINA GERADORA", "Usina Andrade Energy ▼", True)
        draw_field(d, (635, top + 19, 815, top + 57), "ALOCAÇÃO", "15,4%")
        draw_field(d, (840, top + 19, right, top + 57), "DESCONTO", "40%")
        draw_toggle(d, left, top + 85, "Absorver custo de disponibilidade", True)
        draw_toggle(d, 660, top + 85, "Absorver diferença do Fio B", False)
        rounded(d, (right - 176, top + 130, right, top + 169), 10, GREEN)
        d.text((right - 144, top + 141), "Salvar unidade", font=font(11, True), fill="white")
        return (right - 88, top + 149)
    if "abra a unidade correta" in title:
        for i, (uc, owner, status) in enumerate([
            ("UC 121361801894", "Vinícius Duarte", "Automático ativo"),
            ("UC 300112459811", "Sarah Andrade", "Ativar recebimento"),
        ]):
            y = top + i * 70
            rounded(d, (left, y, right, y + 56), 10, "#F3F7F5", LINE)
            d.text((left + 16, y + 8), uc, font=font(12, True), fill=INK)
            d.text((left + 16, y + 30), owner, font=font(10), fill=MUTED)
            d.text((right - 175, y + 20), status, font=font(10, True), fill=GREEN)
        return (right - 90, top + 98)
    if "ative o recebimento" in title:
        rounded(d, (left, top, right, top + 55), 10, "#FFF8D8", "#E7C65B")
        d.text((left + 17, top + 10), "Recebimento desativado", font=font(12, True), fill=INK)
        d.text((left + 17, top + 31), "Ative para criar o endereço exclusivo desta UC.", font=font(10), fill=MUTED)
        rounded(d, (left, top + 75, 570, top + 118), 10, GREEN)
        d.text((335, top + 88), "Ativar recebimento automático", font=font(11, True), fill="white")
        return (450, top + 96)
    if "copie e configure" in title:
        draw_field(d, (left, top + 20, right - 180, top + 62), "ENDEREÇO EXCLUSIVO", "uc121361801894@faturas.andradeenergy.com.br", True)
        rounded(d, (right - 160, top + 20, right, top + 62), 9, GREEN)
        d.text((right - 114, top + 33), "Copiar", font=font(11, True), fill="white")
        for i, text in enumerate(["1. Copie o endereço acima", "2. Crie uma regra no Gmail ou Outlook", "3. Encaminhe uma conta para testar"]):
            d.text((left + 8, top + 88 + i * 28), text, font=font(11, True), fill=INK)
        return (right - 80, top + 41)
    if "importe a conta" in title or "selecione o pdf" in title:
        rounded(d, (left, top, right, top + 112), 12, "#F8FBF9", GREEN, 2)
        d.text((left + 290, top + 20), "PDF", font=font(18, True), fill=GREEN)
        d.text((left + 235, top + 51), "Arraste a conta aqui", font=font(13, True), fill=INK)
        rounded(d, (left + 260, top + 76, left + 440, top + 106), 8, GREEN)
        d.text((left + 291, top + 84), "Selecionar arquivo", font=font(10, True), fill="white")
        return (left + 350, top + 91)
    if "confira o cálculo" in title or "entenda o total" in title:
        values = [("Conta concessionária", "R$ 128,17"), ("Energia Andrade", "R$ 219,81"), ("Total unificado", "R$ 347,98")]
        for i, (label, value) in enumerate(values):
            x = left + i * 282
            rounded(d, (x, top, x + 258, top + 86), 11, DEEP if i == 2 else "#F3F7F5", LINE)
            d.text((x + 16, top + 13), label.upper(), font=font(9, True), fill="#B9D8CA" if i == 2 else MUTED)
            d.text((x + 16, top + 39), value, font=font(19, True), fill="white" if i == 2 else INK)
        d.text((left, top + 108), "Economia real: R$ 83,47 · 27,2%", font=font(12, True), fill=GREEN)
        return (right - 130, top + 43)
    if "gere e acompanhe" in title or "forma de pagamento" in title:
        for i, (label, value) in enumerate([("PIX COPIA E COLA", "00020126..."), ("CÓDIGO DE BARRAS", "23790.50400...")]):
            y = top + i * 66
            draw_field(d, (left, y + 18, right - 150, y + 56), label, value, i == 0)
            rounded(d, (right - 130, y + 18, right, y + 56), 8, GREEN)
            d.text((right - 94, y + 29), "Copiar", font=font(10, True), fill="white")
        return (right - 65, top + 36)
    if "administração multiempresa" in title:
        for i, (name, detail) in enumerate([("Andrade Energy", "Ambiente atual"), ("Solar Minas", "Empresa parceira"), ("Nova empresa", "Criar ambiente")]):
            x = left + i * 282
            rounded(d, (x, top, x + 258, top + 105), 11, DEEP if i == 0 else "#F3F7F5", LINE)
            d.text((x + 16, top + 18), name, font=font(13, True), fill="white" if i == 0 else INK)
            d.text((x + 16, top + 48), detail, font=font(10), fill="#B9D8CA" if i == 0 else MUTED)
        return (left + 705, top + 52)
    if "cadastre a empresa" in title:
        draw_field(d, (left, top + 18, 660, top + 57), "NOME DA EMPRESA", "Solar Minas", True)
        draw_field(d, (685, top + 18, right, top + 57), "RESPONSÁVEL", "Marcos Silva")
        draw_field(d, (left, top + 91, 660, top + 130), "PLANO", "Profissional ▼")
        draw_field(d, (685, top + 91, right, top + 130), "PERÍODO", "45 dias de teste")
        return (right - 70, top + 150)
    if "personalize a identidade" in title:
        rounded(d, (left, top, 565, top + 125), 12, "#F3F7F5", LINE)
        d.text((left + 70, top + 22), "LOGO DA EMPRESA", font=font(11, True), fill=INK)
        rounded(d, (left + 55, top + 55, left + 205, top + 94), 8, GREEN)
        d.text((left + 83, top + 67), "Enviar logo", font=font(10, True), fill="white")
        d.text((610, top + 5), "CORES DA MARCA", font=font(10, True), fill=MUTED)
        for i, color in enumerate([GREEN, DEEP, YELLOW, "#FFFFFF"]):
            d.ellipse((610 + i * 70, top + 40, 654 + i * 70, top + 84), fill=color, outline=LINE)
        rounded(d, (right - 175, top + 102, right, top + 141), 9, GREEN)
        d.text((right - 145, top + 113), "Salvar identidade", font=font(10, True), fill="white")
        return (right - 88, top + 121)
    if "competência em aberto" in title:
        for i, (month, status, value) in enumerate([("Agosto/2026", "EM ABERTO", "R$ 347,98"), ("Julho/2026", "PAGA", "R$ 331,20")]):
            y = top + i * 70
            rounded(d, (left, y, right, y + 56), 10, "#F3F7F5", LINE)
            d.text((left + 16, y + 9), month, font=font(12, True), fill=INK)
            d.text((left + 16, y + 31), status, font=font(9, True), fill=GREEN)
            d.text((right - 175, y + 19), value, font=font(14, True), fill=INK)
        return (right - 70, top + 28)
    if "conta salva" in title:
        d.ellipse((left + 340, top, left + 420, top + 80), fill="#DDF1E7")
        d.text((left + 365, top + 18), "✓", font=font(30, True), fill=GREEN)
        d.text((left + 300, top + 96), "Conta vinculada com sucesso", font=font(15, True), fill=INK)
        d.text((left + 270, top + 124), "O documento já está disponível para o gerador.", font=font(11), fill=MUTED)
        return (left + 380, top + 40)

    # Home: mantém o acesso rápido, mas com cartões grandes próprios do perfil.
    for index, row in enumerate(step["rows"]):
        x = left + index * 282
        rounded(d, (x, top, x + 258, top + 105), 11, "#F3F7F5", LINE)
        d.text((x + 16, top + 18), row, font=font(12, True), fill=INK)
        rounded(d, (x + 16, top + 58, x + 122, top + 88), 8, GREEN)
        d.text((x + 42, top + 66), "Abrir", font=font(10, True), fill="white")
    return (left + 69, top + 73)


def draw_browser(step, progress, local_progress):
    img = Image.new("RGB", (W, H), "#DCE5E0")
    d = ImageDraw.Draw(img)
    rounded(d, (22, 18, W - 22, H - 18), 18, SURFACE, "#BACAC2", 2)
    d.rectangle((23, 62, W - 23, H - 19), fill=BG)
    d.ellipse((42, 35, 52, 45), fill="#EB6B63")
    d.ellipse((60, 35, 70, 45), fill="#E6BE4C")
    d.ellipse((78, 35, 88, 45), fill="#68B678")
    rounded(d, (150, 28, 820, 53), 12, "#EFF3F1")
    d.text((173, 33), "andradeenergy.com.br", font=font(12), fill=MUTED)

    d.rectangle((23, 62, 245, H - 19), fill=DEEP)
    if LOGO.exists():
        logo = Image.open(LOGO).convert("RGBA")
        logo.thumbnail((160, 52), Image.Resampling.LANCZOS)
        alpha = logo.getchannel("A")
        white = Image.new("RGBA", logo.size, "white")
        white.putalpha(alpha)
        img.paste(white, (50, 82), white)
    d.text((48, 151), step["profile"], font=font(10, True), fill="#9EC4B4")
    for index, item in enumerate(step["menu"]):
        y = 180 + index * 48
        active = item == step["active"]
        if active:
            rounded(d, (40, y, 225, y + 38), 10, YELLOW)
        d.text((57, y + 9), item, font=font(14, True), fill=DEEP if active else "#D5E5DE")
    d.text((48, 650), "Ajuda e suporte", font=font(11, True), fill="#9EC4B4")

    d.text((282, 91), step["eyebrow"], font=font(11, True), fill=GREEN)
    d.text((282, 116), step["title"], font=font(28, True), fill=INK)
    d.text((282, 157), step["subtitle"], font=font(14), fill=MUTED)

    cards = step["cards"]
    card_width = (W - 330 - 20 * (len(cards) - 1)) // len(cards)
    for index, (label, value, note) in enumerate(cards):
        x = 282 + index * (card_width + 20)
        rounded(d, (x, 205, x + card_width, 322), 14, DEEP if index == 0 else SURFACE, LINE)
        color = "#B9D8CA" if index == 0 else MUTED
        value_color = "white" if index == 0 else INK
        d.text((x + 20, 224), label, font=font(10, True), fill=color)
        d.text((x + 20, 250), value, font=font(25, True), fill=value_color)
        d.text((x + 20, 291), note, font=font(10), fill=color)

    rounded(d, (282, 347, W - 55, 617), 14, SURFACE, LINE)
    d.text((306, 371), step["panel"], font=font(16, True), fill=INK)
    d.text((306, 400), step["panel_note"], font=font(11), fill=MUTED)
    target = draw_unique_panel(d, step)

    start = step.get("cursor_from", (995, 170))
    end = target
    move = min(1, local_progress * 1.8)
    cx = int(start[0] + (end[0] - start[0]) * move)
    cy = int(start[1] + (end[1] - start[1]) * move)
    if 0.48 < local_progress < 0.82:
        pulse = 24 + int(5 * abs(0.65 - local_progress) / 0.17)
        d.ellipse((cx - pulse, cy - pulse, cx + pulse, cy + pulse), outline="#E32636", width=6)
    d.polygon([(cx, cy), (cx + 5, cy + 22), (cx + 11, cy + 14), (cx + 22, cy + 14)], fill="#111E19")

    rounded(d, (282, 638, W - 55, 686), 12, "#FFF5C8")
    d.text((301, 651), f"PASSO {step['number']}", font=font(10, True), fill=DEEP)
    tip_lines = wrap(d, step["tip"], font(12, True), 700)
    d.text((380, 649), tip_lines[0], font=font(12, True), fill=INK)
    d.rectangle((23, H - 24, W - 23, H - 19), fill="#C1D1C9")
    d.rectangle((23, H - 24, int(23 + (W - 46) * progress), H - 19), fill=YELLOW)
    return img


async def gerar_voz(texto: str, destino: Path):
    await edge_tts.Communicate(texto, "pt-BR-FranciscaNeural", rate="+10%").save(str(destino))


def render(name, steps, narration):
    OUTPUT.mkdir(parents=True, exist_ok=True)
    draw_browser(steps[0], 0.01, 0).save(OUTPUT / f"{name}.png", quality=95)
    ffmpeg = ROOT / ".codex-ffmpeg" / "node_modules" / "ffmpeg-static" / "ffmpeg.exe"
    with tempfile.TemporaryDirectory(prefix=f"{name}-", dir=ROOT / "tmp") as temp:
        folder = Path(temp)
        step_audio = []
        step_seconds = []
        for index, step in enumerate(steps):
            mp3 = folder / f"voice-{index}.mp3"
            wav = folder / f"voice-{index}.wav"
            texto = f"{step['title']}. {step['tip']}"
            asyncio.run(gerar_voz(texto, mp3))
            subprocess.run([
                str(ffmpeg), "-y", "-i", str(mp3), "-ar", "44100", "-ac", "2", str(wav),
            ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            with wave.open(str(wav), "rb") as arquivo:
                duracao_voz = arquivo.getnframes() / arquivo.getframerate()
            # 350 ms antes da fala e uma pausa curta depois da conclusão.
            duracao_etapa = max(4.2, duracao_voz + 1.15)
            step_audio.append(wav)
            step_seconds.append(duracao_etapa)

        frames_by_step = [round(seconds * FPS) for seconds in step_seconds]
        total = sum(frames_by_step)
        frame_number = 0
        rendered_before = 0
        for index, step in enumerate(steps):
            frames_per_step = frames_by_step[index]
            for local in range(frames_per_step):
                global_frame = rendered_before + local + 1
                frame = draw_browser(step, global_frame / total, local / max(1, frames_per_step - 1))
                frame.save(folder / f"frame-{frame_number:05d}.jpg", quality=88)
                frame_number += 1
            rendered_before += frames_per_step
        music = ROOT / "tmp" / "tutorials-por-funcao" / "trilha-instrumental.wav"
        command = [str(ffmpeg), "-y", "-framerate", str(FPS), "-i", str(folder / "frame-%05d.jpg")]
        for audio in step_audio:
            command.extend(["-i", str(audio)])
        command.extend(["-stream_loop", "-1", "-i", str(music)])
        voice_filters = []
        voice_labels = []
        for index, seconds in enumerate(step_seconds):
            label = f"voice{index}"
            voice_filters.append(f"[{index + 1}:a]adelay=350|350,apad,atrim=duration={seconds:.3f}[{label}]")
            voice_labels.append(f"[{label}]")
        music_input = len(step_audio) + 1
        total_seconds = total / FPS
        filters = ";".join(voice_filters)
        filters += f";{''.join(voice_labels)}concat=n={len(step_audio)}:v=0:a=1[voice]"
        filters += f";[{music_input}:a]volume=0.08,atrim=duration={total_seconds:.3f}[music]"
        filters += ";[voice][music]amix=inputs=2:normalize=0,alimiter=limit=0.92[a]"
        command.extend([
            "-filter_complex", filters,
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
            "-map", "0:v", "-map", "[a]", "-c:a", "aac", "-b:a", "128k", "-t", f"{total_seconds:.3f}",
            "-movflags", "+faststart", str(OUTPUT / f"{name}.mp4"),
        ])
        subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


GENERATOR_MENU = ["Visão geral", "Clientes", "Unidades", "Usinas", "Faturas", "Financeiro"]
CONSUMER_MENU = ["Visão geral", "Economia", "Minha unidade", "Faturas", "Contratos", "Perfil"]


def scene(number, profile, menu, active, eyebrow, title, subtitle, cards, panel, panel_note, rows, row, action, tip):
    return dict(number=number, profile=profile, menu=menu, active=active, eyebrow=eyebrow, title=title,
                subtitle=subtitle, cards=cards, panel=panel, panel_note=panel_note, rows=rows,
                row=row, action=action, cursor=(1110, 459 + row * 47), tip=tip)


G_HOME = scene(1, "PORTAL GERADOR", GENERATOR_MENU, "Visão geral", "HOME", "Visão geral da operação",
    "Todos os tutoriais começam aqui para você reconhecer o caminho.",
    [("GERAÇÃO DO MÊS", "12.480 kWh", "Produção consolidada"), ("CLIENTES", "28", "26 ativos"), ("FATURAS", "7", "2 vencidas")],
    "Acesso rápido", "Escolha a tarefa que deseja executar.", ["Clientes e unidades", "Faturar via conta", "Usinas e produção"], 0, "Abrir", "Partimos sempre da Home e marcamos em vermelho o botão que deve ser usado.")
C_HOME = scene(1, "PORTAL CONSUMIDOR", CONSUMER_MENU, "Visão geral", "HOME", "Minha energia",
    "Todos os tutoriais começam aqui para facilitar a orientação.",
    [("ECONOMIA", "R$ 1.284,70", "Acumulada"), ("FATURA ABERTA", "R$ 347,98", "Vence em 05/09"), ("SALDO", "3.099 kWh", "Créditos")],
    "Acesso rápido", "Escolha a tarefa que deseja executar.", ["Anexar conta ao CPF", "Abrir e pagar fatura", "Contrato da unidade"], 0, "Abrir", "Partimos sempre da Home e destacamos cada ação antes de trocar de tela.")

TUTORIALS = [
    ("web-gerador-convite-e-uc", [
        G_HOME,
        scene(2, "PORTAL GERADOR", GENERATOR_MENU, "Clientes", "CLIENTES", "Envie o convite", "O cliente só entra na carteira depois de aceitar e criar a conta.", [("ATIVOS", "28", "Clientes"), ("CONVITES", "2", "Aguardando"), ("UCs", "34", "Vinculadas")], "Ações do cliente", "Use o convite antes de cadastrar a unidade.", ["Enviar convite por e-mail", "Acompanhar aceite", "Abrir cliente ativo"], 0, "Convidar", "Informe o e-mail; o consumidor recebe a chave e cria a própria conta."),
        scene(3, "PORTAL GERADOR", GENERATOR_MENU, "Clientes", "CLIENTE ATIVO", "Abra as contas vinculadas", "As contas anexadas pelo consumidor ficam disponíveis no perfil.", [("CLIENTE", "Ativo", "Cadastro confirmado"), ("CONTAS", "2", "Vinculadas ao CPF"), ("UCs", "1", "Ativa")], "Acesso rápido do cliente", "Escolha a conta que contém a nova instalação.", ["Unidades consumidoras", "Contas vinculadas ao CPF", "Faturas processadas"], 1, "Abrir", "Entre em Contas vinculadas para reaproveitar um PDF enviado pelo cliente."),
        scene(4, "PORTAL GERADOR", GENERATOR_MENU, "Unidades", "NOVA UC", "Confirme e configure a unidade", "Revise usina, modalidade, alocação e desconto antes de salvar.", [("CONSUMO MÉDIO", "612 kWh", "12 meses"), ("ALOCAÇÃO", "15,4%", "Sugerida"), ("DESCONTO", "40%", "Contratado")], "Configuração da UC", "A projeção muda conforme as opções GD.", ["Selecionar a usina", "Revisar repasses e desconto", "Salvar unidade"], 2, "Salvar", "Confirme os dados e salve; a unidade ficará dentro do cliente."),
    ], "Na Home, abra Clientes e envie o convite. Depois que o consumidor aceitar, abra o cliente ativo. Entre em Contas vinculadas e escolha o PDF da instalação. Por fim, revise usina, alocação, desconto e salve a unidade."),
    ("web-gerador-recebimento-automatico", [
        G_HOME,
        scene(2, "PORTAL GERADOR", GENERATOR_MENU, "Unidades", "UNIDADES", "Abra a unidade correta", "O endereço automático pertence a uma UC específica.", [("UCs ATIVAS", "34", "Carteira"), ("AUTOMÁTICAS", "19", "Conectadas"), ("PENDENTES", "15", "Sem conexão")], "Lista de unidades", "Localize pelo número ou titular.", ["UC 121361801894 · Vinícius", "UC 300112459811 · Sarah", "UC 901146230002 · Décio"], 0, "Abrir", "Selecione a UC que receberá as contas da concessionária."),
        scene(3, "PORTAL GERADOR", GENERATOR_MENU, "Unidades", "FATURA AUTOMÁTICA", "Ative o recebimento", "O sistema cria um endereço exclusivo para esta unidade.", [("STATUS", "Desativado", "Ainda sem conexão"), ("ENDEREÇO", "—", "Será gerado"), ("ÚLTIMA CONTA", "—", "Nenhuma")], "Recebimento por e-mail", "Ative para gerar o endereço da UC.", ["Ativar recebimento automático", "Conectar Gmail", "Conectar Outlook"], 0, "Ativar", "Ative o recebimento e aguarde o endereço exclusivo aparecer."),
        scene(4, "PORTAL GERADOR", GENERATOR_MENU, "Unidades", "ENCAMINHAMENTO", "Copie e configure o endereço", "Crie uma regra no e-mail do cliente para encaminhar PDFs.", [("STATUS", "Ativo", "Conectado"), ("ENDEREÇO", "uc1213@...", "Exclusivo"), ("PROCESSAMENTO", "Automático", "PDF recebido")], "Como conectar", "Finalize no provedor de e-mail do cliente.", ["Copiar endereço exclusivo", "Criar regra no Gmail ou Outlook", "Enviar uma conta para testar"], 0, "Copiar", "Copie o endereço, configure o encaminhamento e envie uma conta de teste."),
    ], "Comece na Home e abra Unidades. Selecione a UC correta e entre em Fatura automática. Ative o recebimento para gerar o endereço exclusivo. Copie esse endereço, crie a regra no Gmail ou Outlook e envie uma conta para testar."),
    ("web-gerador-faturamento", [
        G_HOME,
        scene(2, "PORTAL GERADOR", GENERATOR_MENU, "Faturas", "FATURAMENTO", "Importe a conta da energia", "Use o PDF da competência que será faturada.", [("EM ABERTO", "18", "Faturas"), ("VENCIDAS", "3", "Pendências"), ("RECEBIDO", "R$ 21.680", "No mês")], "Faturar via conta", "O sistema identifica a UC e os dados GD.", ["Selecionar PDF da concessionária", "Aguardar leitura", "Revisar competência"], 0, "Selecionar", "Escolha a conta da concessionária e aguarde a leitura completa."),
        scene(3, "PORTAL GERADOR", GENERATOR_MENU, "Faturas", "REVISÃO", "Confira o cálculo", "Valide energia, modalidade, repasses e desconto real.", [("ENERGIA", "303 kWh", "Compensada"), ("DESCONTO REAL", "27,2%", "Projetado"), ("TOTAL", "R$ 347,98", "Unificado")], "Composição da cobrança", "Só confirme depois de revisar os valores.", ["Conta da concessionária · R$ 128,17", "Energia Andrade · R$ 219,81", "Total unificado · R$ 347,98"], 2, "Confirmar", "Confira a composição e confirme a fatura para gerar os documentos."),
        scene(4, "PORTAL GERADOR", GENERATOR_MENU, "Faturas", "COBRANÇA", "Gere e acompanhe o pagamento", "O cliente recebe o PDF e as opções disponíveis.", [("STATUS", "Em aberto", "Aguardando"), ("PIX", "Disponível", "Copia e cola"), ("PDF", "Gerado", "Pronto")], "Documentos e pagamento", "Abra o detalhe para baixar ou registrar a quitação.", ["Baixar fatura Andrade", "Copiar Pix ou boleto", "Registrar pagamento"], 1, "Copiar", "Envie a cobrança e acompanhe o status até a confirmação do pagamento."),
    ], "Na Home, abra Faturar via conta e selecione o PDF da concessionária. Aguarde a leitura, confira energia, repasses, desconto e total unificado. Confirme a competência e então gere ou envie os documentos de pagamento."),
    ("web-gerador-multiempresa-e-marca", [
        G_HOME,
        scene(2, "PORTAL GERADOR", GENERATOR_MENU, "Visão geral", "AMBIENTE", "Abra a administração multiempresa", "Somente administradores podem criar e alternar empresas.", [("EMPRESA ATUAL", "Andrade", "Padrão"), ("PARCEIRAS", "3", "Ativas"), ("USUÁRIOS", "8", "Administradores")], "Menu do ambiente", "Troque a empresa sem misturar carteiras.", ["Alternar ambiente", "Administração multiempresa", "Perfil administrativo"], 1, "Abrir", "Use Administração multiempresa para criar ou revisar uma empresa parceira."),
        scene(3, "PORTAL GERADOR", GENERATOR_MENU, "Visão geral", "EMPRESA", "Cadastre a empresa parceira", "Defina responsável, plano e acesso antes de ativar.", [("STATUS", "Em teste", "45 dias"), ("PLANO", "Profissional", "Selecionado"), ("IDENTIDADE", "Pendente", "Configurar")], "Dados da empresa", "Cada empresa mantém sua própria operação.", ["Informar empresa e responsável", "Definir plano e validade", "Salvar empresa"], 2, "Salvar", "Salve a empresa para liberar o ambiente separado."),
        scene(4, "PORTAL GERADOR", GENERATOR_MENU, "Visão geral", "MINHA MARCA", "Personalize a identidade", "Aplique logo e cores somente ao ambiente selecionado.", [("LOGO", "Enviada", "Prévia pronta"), ("COR PRINCIPAL", "#087A46", "Personalizada"), ("STATUS", "Ativa", "Aplicada")], "Identidade visual", "Revise a prévia antes de publicar.", ["Enviar a logo", "Escolher cores", "Salvar identidade"], 2, "Salvar", "Confira a prévia e salve; a marca será aplicada aos clientes da empresa."),
    ], "Partindo da Home, abra Administração multiempresa. Cadastre a empresa, escolha o plano e salve o novo ambiente. Depois entre em Minha marca, envie a logo, escolha as cores e confirme a identidade visual."),
    ("web-consumidor-conta-vinculada", [
        C_HOME,
        scene(2, "PORTAL CONSUMIDOR", CONSUMER_MENU, "Perfil", "MEU PERFIL", "Abra as contas vinculadas", "Use apenas contas de instalações ligadas ao seu CPF.", [("PERFIL", "Ativo", "CPF confirmado"), ("CONTAS", "1", "Anexada"), ("UCs", "1", "Vinculada")], "Acesso rápido", "A conta ficará disponível também para o gerador.", ["Adicionar conta ao meu perfil", "Meus dados", "Segurança e biometria"], 0, "Abrir", "Abra Adicionar conta ao meu perfil para escolher o documento."),
        scene(3, "PORTAL CONSUMIDOR", CONSUMER_MENU, "Perfil", "CONTA VINCULADA", "Selecione o PDF", "O sistema confere o número da UC e os dados do titular.", [("ARQUIVO", "conta.pdf", "PDF selecionado"), ("CPF", "Confirmado", "Primeiros dígitos"), ("UC", "121361801894", "Identificada")], "Enviar conta da concessionária", "Confira se o documento pertence ao seu CPF.", ["Escolher PDF no aparelho", "Aguardar a análise", "Confirmar o envio"], 0, "Escolher", "Selecione o PDF e aguarde a identificação da unidade."),
        scene(4, "PORTAL CONSUMIDOR", CONSUMER_MENU, "Perfil", "CONCLUÍDO", "Conta salva no perfil", "O gerador já pode usar esse documento para cadastrar a UC.", [("STATUS", "Anexada", "Disponível"), ("UC", "121361801894", "Identificada"), ("DATA", "Hoje", "Envio concluído")], "Contas vinculadas", "Você pode anexar outras instalações do mesmo CPF.", ["Abrir o PDF enviado", "Acompanhar a vinculação", "Adicionar outra conta"], 1, "Acompanhar", "Pronto. A conta permanece no perfil e pode ser usada pelo gerador."),
    ], "Na Home, abra Adicionar conta ao meu perfil. Escolha uma conta da concessionária vinculada ao seu CPF e aguarde a análise. Confirme o envio. O documento ficará salvo e disponível para o gerador cadastrar a unidade."),
    ("web-consumidor-fatura-e-pagamento", [
        C_HOME,
        scene(2, "PORTAL CONSUMIDOR", CONSUMER_MENU, "Faturas", "FATURAS", "Abra a competência em aberto", "Confira sempre a unidade e a data de vencimento.", [("EM ABERTO", "1", "R$ 347,98"), ("PAGAS", "7", "Histórico"), ("VENCIDAS", "0", "Sem pendências")], "Histórico de competências", "Selecione a fatura que deseja entender ou pagar.", ["Agosto/2026 · Em aberto", "Julho/2026 · Paga", "Junho/2026 · Paga"], 0, "Abrir", "Abra a competência em aberto para ver o demonstrativo completo."),
        scene(3, "PORTAL CONSUMIDOR", CONSUMER_MENU, "Faturas", "COMPOSIÇÃO", "Entenda o total unificado", "Veja a conta da concessionária somada à energia Andrade.", [("SEM BENEFÍCIO", "R$ 431,45", "Referência"), ("ECONOMIA", "R$ 83,47", "Desconto real"), ("TOTAL", "R$ 347,98", "A pagar")], "Como chegamos ao total", "A composição separa cada parcela da cobrança.", ["Concessionária · R$ 128,17", "Energia Andrade · R$ 219,81", "Total unificado · R$ 347,98"], 2, "Detalhes", "Confira o total e a economia antes de escolher o pagamento."),
        scene(4, "PORTAL CONSUMIDOR", CONSUMER_MENU, "Faturas", "PAGAMENTO", "Escolha a forma de pagamento", "Use o Pix, boleto ou PDF disponível para esta cobrança.", [("STATUS", "Em aberto", "Até 05/09"), ("PIX", "Disponível", "Copia e cola"), ("BOLETO", "Disponível", "Código de barras")], "Formas de pagamento", "Depois da compensação, o status muda automaticamente.", ["Copiar código Pix", "Copiar código de barras", "Baixar a fatura"], 0, "Copiar", "Escolha a forma desejada e aguarde a confirmação automática do pagamento."),
    ], "Comece na Home e abra a fatura em aberto. Confira a unidade, o vencimento e a composição do total unificado. Depois escolha Pix, boleto ou PDF. Após a compensação, o status será atualizado automaticamente."),
]


if __name__ == "__main__":
    for name, steps, narration in TUTORIALS:
        print("Gerando", name, flush=True)
        render(name, steps, narration)
