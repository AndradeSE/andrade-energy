from __future__ import annotations

from pathlib import Path
import subprocess
import tempfile

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "portal-web" / "public" / "tutorials"
LOGO = ROOT / "assets" / "images" / "andrade-logo-horizontal.png"
W, H, FPS, STEP_SECONDS = 1280, 720, 24, 4
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
    for index, row in enumerate(step["rows"]):
        y = 438 + index * 47
        rounded(d, (306, y, W - 79, y + 37), 9, "#F3F7F5")
        d.text((324, y + 9), row, font=font(12, True), fill=INK)
        if index == step.get("row", 0):
            rounded(d, (W - 220, y + 6, W - 96, y + 31), 12, GREEN)
            d.text((W - 196, y + 11), step["action"], font=font(10, True), fill="white")

    start = step.get("cursor_from", (995, 170))
    end = step.get("cursor", (1110, 460))
    move = min(1, local_progress * 1.8)
    cx = int(start[0] + (end[0] - start[0]) * move)
    cy = int(start[1] + (end[1] - start[1]) * move)
    if 0.58 < local_progress < 0.82:
        pulse = int(14 + 18 * abs(0.7 - local_progress) / 0.12)
        d.ellipse((cx - pulse, cy - pulse, cx + pulse, cy + pulse), outline=YELLOW, width=4)
    d.polygon([(cx, cy), (cx + 5, cy + 22), (cx + 11, cy + 14), (cx + 22, cy + 14)], fill="#111E19")

    rounded(d, (282, 638, W - 55, 686), 12, "#FFF5C8")
    d.text((301, 651), f"PASSO {step['number']}", font=font(10, True), fill=DEEP)
    tip_lines = wrap(d, step["tip"], font(12, True), 700)
    d.text((380, 649), tip_lines[0], font=font(12, True), fill=INK)
    d.rectangle((23, H - 24, W - 23, H - 19), fill="#C1D1C9")
    d.rectangle((23, H - 24, int(23 + (W - 46) * progress), H - 19), fill=YELLOW)
    return img


def render(name, steps):
    OUTPUT.mkdir(parents=True, exist_ok=True)
    draw_browser(steps[0], 0.01, 0).save(OUTPUT / f"{name}.png", quality=95)
    total = len(steps) * STEP_SECONDS * FPS
    ffmpeg = ROOT / ".codex-ffmpeg" / "node_modules" / "ffmpeg-static" / "ffmpeg.exe"
    with tempfile.TemporaryDirectory(prefix=f"{name}-", dir=ROOT / "tmp") as temp:
        folder = Path(temp)
        frame_number = 0
        for index, step in enumerate(steps):
            for local in range(STEP_SECONDS * FPS):
                global_frame = index * STEP_SECONDS * FPS + local + 1
                frame = draw_browser(step, global_frame / total, local / (STEP_SECONDS * FPS - 1))
                frame.save(folder / f"frame-{frame_number:05d}.jpg", quality=88)
                frame_number += 1
        subprocess.run([
            str(ffmpeg), "-y", "-framerate", str(FPS), "-i", str(folder / "frame-%05d.jpg"),
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
            "-movflags", "+faststart", str(OUTPUT / f"{name}.mp4"),
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


GENERATOR_MENU = ["Visão geral", "Clientes", "Unidades", "Usinas", "Faturas", "Financeiro"]
CONSUMER_MENU = ["Visão geral", "Economia", "Minha unidade", "Faturas", "Contratos", "Perfil"]
GENERATOR = [
    dict(number=1, profile="PORTAL GERADOR", menu=GENERATOR_MENU, active="Visão geral", eyebrow="VISÃO GERAL", title="Acompanhe a operação", subtitle="Comece pelos indicadores e escolha a área que deseja administrar.", cards=[("GERAÇÃO DO MÊS", "12.480 kWh", "Produção consolidada"), ("CLIENTES", "28", "26 ativos"), ("FATURAS ABERTAS", "7", "2 vencidas")], panel="Acesso rápido", panel_note="Abra a área desejada sem sair do painel.", rows=["Usinas e produção", "Clientes e unidades consumidoras", "Faturamento e recebimentos"], row=0, action="Abrir", cursor=(1120, 459), tip="Clique em Usinas para selecionar a planta que será administrada."),
    dict(number=2, profile="PORTAL GERADOR", menu=GENERATOR_MENU, active="Usinas", eyebrow="GESTÃO DE USINAS", title="Selecione a usina", subtitle="Confira produção, autonomia e unidades alocadas.", cards=[("PRODUÇÃO 12 MESES", "154,8 MWh", "Média 12,9 MWh/mês"), ("UCs ALOCADAS", "18", "83% da capacidade"), ("SALDO", "2.140 kWh", "Disponível")], panel="Usinas cadastradas", panel_note="Escolha uma usina para ver os detalhes.", rows=["Usina Solar Andrade · 120 kWp", "Usina Sul · 75 kWp", "Usina Norte · 48 kWp"], row=0, action="Detalhes", cursor=(1120, 459), tip="Abra a usina para importar produção e revisar suas alocações."),
    dict(number=3, profile="PORTAL GERADOR", menu=GENERATOR_MENU, active="Clientes", eyebrow="CLIENTES", title="Convide o consumidor", subtitle="O cadastro aparece após o consumidor aceitar o convite e criar a conta.", cards=[("CLIENTES ATIVOS", "28", "3 novos no mês"), ("UNIDADES", "34", "32 com contrato"), ("CONVITES", "2", "Aguardando aceite")], panel="Clientes cadastrados", panel_note="Abra o cliente para consultar suas áreas sem misturar os dados.", rows=["Vinícius Duarte · 2 UCs", "Sarah Oliveira · 1 UC", "Décio Bento · 3 UCs"], row=0, action="Abrir", cursor=(1120, 459), tip="Em Contas vinculadas, escolha o PDF enviado pelo consumidor e adicione a UC."),
    dict(number=4, profile="PORTAL GERADOR", menu=GENERATOR_MENU, active="Unidades", eyebrow="ALOCAÇÃO", title="Revise a unidade", subtitle="Confirme usina, modalidade, percentual e regras de repasse.", cards=[("CONSUMO MÉDIO", "612 kWh", "Últimos 12 meses"), ("ALOCAÇÃO", "15,4%", "Calculada pelo sistema"), ("MODALIDADE", "GD II", "Fatura unificada")], panel="Unidade consumidora 121361801894", panel_note="A alocação pode ser ajustada antes do próximo faturamento.", rows=["Usina vinculada · Usina Solar Andrade", "Percentual alocado · 15,4%", "Repasse disponibilidade · Ativo"], row=1, action="Editar", cursor=(1120, 506), tip="Salve a alocação para que o faturamento use a produção correta."),
    dict(number=5, profile="PORTAL GERADOR", menu=GENERATOR_MENU, active="Faturas", eyebrow="FATURAMENTO", title="Gere e acompanhe faturas", subtitle="Revise a competência e gere os documentos do cliente.", cards=[("EM ABERTO", "R$ 8.940", "18 faturas"), ("RECEBIDO", "R$ 21.680", "No mês"), ("VENCIDAS", "R$ 1.204", "3 faturas")], panel="Faturas de agosto", panel_note="A conta recebida por e-mail pode ser processada automaticamente.", rows=["Vinícius Duarte · R$ 347,98", "Sarah Oliveira · R$ 582,14", "Décio Bento · R$ 441,70"], row=0, action="Abrir", cursor=(1120, 459), tip="Abra a fatura para conferir cálculo, PDF, Pix e código de barras."),
]
CONSUMER = [
    dict(number=1, profile="PORTAL CONSUMIDOR", menu=CONSUMER_MENU, active="Visão geral", eyebrow="MINHA ENERGIA", title="Veja sua economia", subtitle="A página inicial reúne faturas, economia e alertas da unidade.", cards=[("ECONOMIA ACUMULADA", "R$ 1.284,70", "Desde o início"), ("FATURA ABERTA", "R$ 347,98", "Vence em 05/09"), ("SALDO", "3.099 kWh", "Créditos disponíveis")], panel="Resumo da unidade", panel_note="Selecione uma ação para consultar os detalhes.", rows=["Fatura de agosto disponível", "Economia mensal", "Contrato ativo"], row=0, action="Ver fatura", cursor=(1100, 459), tip="Clique na fatura aberta para consultar valores e pagamento."),
    dict(number=2, profile="PORTAL CONSUMIDOR", menu=CONSUMER_MENU, active="Minha unidade", eyebrow="UNIDADE CONSUMIDORA", title="Confira os dados da UC", subtitle="Cada unidade mantém seu histórico de consumo e documentos.", cards=[("UC", "121361801894", "B3 Comercial"), ("CONSUMO MÉDIO", "612 kWh", "Últimos 12 meses"), ("USINA", "Andrade Solar", "Contrato ativo")], panel="Informações da unidade", panel_note="Use a unidade correta antes de consultar faturas.", rows=["Titular · Vinícius Duarte Andrade", "Endereço · Brazópolis/MG", "Concessionária · CEMIG"], row=0, action="Detalhes", cursor=(1100, 459), tip="Se houver mais de uma UC, selecione a desejada antes de continuar."),
    dict(number=3, profile="PORTAL CONSUMIDOR", menu=CONSUMER_MENU, active="Faturas", eyebrow="MINHAS FATURAS", title="Abra a competência", subtitle="Acompanhe faturas abertas, pagas e vencidas.", cards=[("EM ABERTO", "1", "R$ 347,98"), ("PAGAS", "7", "Últimos 12 meses"), ("VENCIDAS", "0", "Nenhuma pendência")], panel="Histórico de competências", panel_note="Clique em uma linha para abrir o documento completo.", rows=["Agosto/2026 · Em aberto", "Julho/2026 · Paga", "Junho/2026 · Paga"], row=0, action="Abrir", cursor=(1100, 459), tip="A fatura detalha o total unificado e as formas de pagamento."),
    dict(number=4, profile="PORTAL CONSUMIDOR", menu=CONSUMER_MENU, active="Economia", eyebrow="ECONOMIA", title="Entenda o benefício", subtitle="Compare o valor com e sem Andrade Energy.", cards=[("ECONOMIA DO MÊS", "R$ 83,47", "22,79% após impostos"), ("TOTAL PAGO", "R$ 347,98", "Fatura unificada"), ("SEM BENEFÍCIO", "R$ 431,45", "Valor de referência")], panel="Evolução mensal", panel_note="O histórico mostra a economia consolidada por competência.", rows=["Agosto/2026 · R$ 83,47", "Julho/2026 · R$ 78,96", "Junho/2026 · R$ 74,21"], row=0, action="Detalhes", cursor=(1100, 459), tip="Use a composição para entender energia, disponibilidade e encargos."),
    dict(number=5, profile="PORTAL CONSUMIDOR", menu=CONSUMER_MENU, active="Contratos", eyebrow="CONTRATO", title="Consulte a vigência", subtitle="Veja status, datas, unidades e termo de adesão.", cards=[("STATUS", "Ativo", "Contrato vigente"), ("INÍCIO", "15/05/2026", "Adesão confirmada"), ("VENCIMENTO", "15/05/2027", "Renovação anual")], panel="Contrato da unidade", panel_note="O cancelamento segue as condições e a vigência contratadas.", rows=["Termo de adesão", "Unidade consumidora vinculada", "Economia anual estimada"], row=0, action="Abrir termo", cursor=(1090, 459), tip="Abra o termo para baixar uma cópia ou consultar as condições."),
]


if __name__ == "__main__":
    generator_names = ["visao-geral", "usinas", "clientes-e-ucs", "configuracao-uc", "faturamento"]
    consumer_names = ["visao-geral", "minha-unidade", "faturas", "economia", "contratos"]
    for name, step in zip(generator_names, GENERATOR):
        render(f"web-gerador-{name}", [step])
    for name, step in zip(consumer_names, CONSUMER):
        render(f"web-consumidor-{name}", [step])
