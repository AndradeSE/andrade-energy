from __future__ import annotations

import math
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "portal-web" / "public" / "tutorials"
LOGO = ROOT / "assets" / "images" / "andrade-logo-horizontal.png"
W, H, FPS, SECONDS = 720, 1280, 24, 4
GREEN = "#075E43"
DARK = "#082F26"
YELLOW = "#F4CE35"
MINT = "#DDEBE4"
INK = "#16382D"
MUTED = "#64776E"


def font(size: int, bold: bool = False):
    name = "segoeuib.ttf" if bold else "segoeui.ttf"
    return ImageFont.truetype(str(Path("C:/Windows/Fonts") / name), size)


def rounded(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def wrap(draw, text, fnt, max_width):
    words = text.split()
    lines, line = [], ""
    for word in words:
        candidate = f"{line} {word}".strip()
        if draw.textbbox((0, 0), candidate, font=fnt)[2] <= max_width:
            line = candidate
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def phone_panel(img, step, accent):
    d = ImageDraw.Draw(img)
    x1, y1, x2, y2 = 64, 430, 656, 1090
    rounded(d, (x1, y1, x2, y2), 34, "#F8FBF9", "#BFD1C7", 2)
    rounded(d, (x1 + 1, y1 + 1, x2 - 1, y1 + 108), 32, accent)
    d.rectangle((x1 + 1, y1 + 72, x2 - 1, y1 + 108), fill=accent)
    d.text((x1 + 34, y1 + 34), step["screen"], font=font(28, True), fill="white")
    if step.get("metric"):
        rounded(d, (x1 + 28, y1 + 140, x2 - 28, y1 + 278), 22, "#E4EFE9")
        d.text((x1 + 52, y1 + 166), step["metric_label"], font=font(18, True), fill=MUTED)
        d.text((x1 + 52, y1 + 202), step["metric"], font=font(42, True), fill=GREEN)
        list_y = y1 + 314
    else:
        list_y = y1 + 145
    for idx, item in enumerate(step["items"]):
        yy = list_y + idx * 86
        rounded(d, (x1 + 28, yy, x2 - 28, yy + 67), 16, "white", "#D4E1DA", 2)
        rounded(d, (x1 + 44, yy + 14, x1 + 84, yy + 54), 12, YELLOW)
        d.text((x1 + 56, yy + 19), str(idx + 1), font=font(20, True), fill=DARK)
        d.text((x1 + 104, yy + 19), item, font=font(21, True), fill=INK)
    if step.get("action"):
        rounded(d, (x1 + 28, y2 - 92, x2 - 28, y2 - 30), 18, accent)
        action_box = d.textbbox((0, 0), step["action"], font=font(22, True))
        tx = (W - (action_box[2] - action_box[0])) / 2
        d.text((tx, y2 - 75), step["action"], font=font(22, True), fill="white")


def make_frame(title, subtitle, step, index, total, theme, progress):
    img = Image.new("RGB", (W, H), "#EEF4F0")
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, W, 360), fill=theme)
    d.ellipse((520, -100, 810, 190), fill="#0A7954")
    d.ellipse((-110, 245, 160, 510), fill="#F4CE35")
    if LOGO.exists():
        logo = Image.open(LOGO).convert("RGBA")
        logo.thumbnail((340, 115), Image.Resampling.LANCZOS)
        alpha = logo.getchannel("A")
        white = Image.new("RGBA", logo.size, "white")
        white.putalpha(alpha)
        img.paste(white, (42, 35), white)
    d.text((42, 164), f"PASSO {index + 1} DE {total}", font=font(18, True), fill=YELLOW)
    title_lines = wrap(d, title, font(42, True), 630)
    yy = 198
    for line in title_lines:
        d.text((42, yy), line, font=font(42, True), fill="white")
        yy += 51
    d.text((42, 376), subtitle, font=font(22), fill=INK)
    phone_panel(img, step, theme)
    d.text((42, 1140), "Andrade Energy • Tutorial rápido", font=font(18, True), fill=MUTED)
    d.text((42, 1177), step["tip"], font=font(18), fill=INK)
    d.rectangle((0, H - 10, W, H), fill="#C9DAD1")
    d.rectangle((0, H - 10, int(W * progress), H), fill=YELLOW)
    return img


def render(name, title, subtitle, steps, theme):
    OUTPUT.mkdir(parents=True, exist_ok=True)
    poster = make_frame(title, subtitle, steps[0], 0, len(steps), theme, 0.02)
    poster.save(OUTPUT / f"{name}.png", quality=95)
    path = OUTPUT / f"{name}.mp4"
    writer = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*"mp4v"), FPS, (W, H))
    if not writer.isOpened():
        raise RuntimeError("Não foi possível iniciar a gravação MP4")
    total_frames = len(steps) * SECONDS * FPS
    for idx, step in enumerate(steps):
        for local in range(SECONDS * FPS):
            fade = min(1.0, local / 10, (SECONDS * FPS - local) / 10)
            progress = (idx * SECONDS * FPS + local + 1) / total_frames
            frame = make_frame(title, subtitle, step, idx, len(steps), theme, progress)
            if fade < 1:
                bg = Image.new("RGB", (W, H), DARK)
                frame = Image.blend(bg, frame, fade)
            arr = cv2.cvtColor(np.asarray(frame), cv2.COLOR_RGB2BGR)
            writer.write(arr)
    writer.release()
    return path


GERADOR = [
    {"screen":"Acesso seguro","items":["Entre com sua conta","Ative a biometria","Escolha o perfil"],"action":"Entrar no Gerador","tip":"Ao reabrir o app, confirme a biometria e escolha o perfil."},
    {"screen":"Gestão de Usinas","metric_label":"GERAÇÃO DO MÊS","metric":"12.480 kWh","items":["Selecione a usina","Confira autonomia","Veja UCs alocadas"],"action":"Abrir usina","tip":"O cabeçalho mostra qual usina está sendo administrada."},
    {"screen":"Clientes e UCs","items":["Cadastre o cliente","Adicione a UC","Importe a conta PDF"],"action":"Adicionar por fatura","tip":"O CPF identifica o consumidor e ajuda no recebimento automático."},
    {"screen":"Alocação","metric_label":"PERCENTUAL SUGERIDO","metric":"15,4%","items":["Abra a UC","Escolha a usina","Revise o percentual"],"action":"Salvar alocação","tip":"O sistema sugere a alocação usando o consumo médio."},
    {"screen":"Faturamento","items":["Importe a conta","Revise GD1 ou GD2","Gere a unificada"],"action":"Faturar competência","tip":"A conta também pode chegar automaticamente pelo e-mail configurado."},
    {"screen":"Gestão Comercial","metric_label":"RECEITA PREVISTA","metric":"R$ 8.940,00","items":["Acompanhe pagamentos","Gerencie assinaturas","Compartilhe os apps"],"action":"Ver operação","tip":"Use notificações para localizar vencimentos e pendências."},
]

CONSUMIDOR = [
    {"screen":"Primeiro acesso","items":["Abra o convite","Confirme seus dados","Crie sua senha"],"action":"Aceitar convite","tip":"Use o mesmo CPF informado no cadastro feito pelo gerador."},
    {"screen":"Unidades","items":["Busque pelo titular","Selecione a UC","Confira o contrato"],"action":"Acessar unidade","tip":"Cada UC mantém suas próprias faturas, economia e contrato."},
    {"screen":"Visão geral","metric_label":"ECONOMIA ACUMULADA","metric":"R$ 1.284,70","items":["Veja faturas abertas","Confira o saldo","Acompanhe alertas"],"action":"Ver todas as faturas","tip":"Puxe a tela para baixo sempre que quiser atualizar os dados."},
    {"screen":"Faturas","items":["Abra a competência","Baixe a unificada","Consulte o pagamento"],"action":"Abrir fatura","tip":"A conta da concessionária fica separada da fatura Andrade Energy."},
    {"screen":"Economia","metric_label":"ECONOMIA DO MÊS","metric":"R$ 83,47","items":["Compare os valores","Veja o gráfico","Entenda o desconto"],"action":"Ver composição","tip":"O gráfico mostra como a energia e os custos formam o total."},
    {"screen":"Contrato e Perfil","items":["Consulte vigência","Veja o termo","Ative a biometria"],"action":"Abrir contrato","tip":"Dados pessoais e segurança ficam disponíveis no menu Perfil."},
]


if __name__ == "__main__":
    print(render("tutorial-gerador", "App Gerador", "Da usina ao faturamento, passo a passo", GERADOR, GREEN))
    print(render("tutorial-consumidor", "App Consumidor", "Faturas, economia e contrato no celular", CONSUMIDOR, "#0A7B57"))
