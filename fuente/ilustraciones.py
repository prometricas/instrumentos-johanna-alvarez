# Genera las ilustraciones de las situaciones (SVG planos y coloridos, sin texto) en public/assets/situaciones/.
# Son dibujos propios, neutrales: muestran la escena sin sugerir las respuestas. Uso: python3 fuente/ilustraciones.py
import os
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'situaciones')
os.makedirs(OUT, exist_ok=True)
W, H = 480, 300
TINTA = '#2B2D42'
PIEL = ['#F6CBA6', '#E0A878', '#B57545', '#7B4A24']
PELO = ['#2B2D42', '#6B3E26', '#C9772F', '#F2C14E', '#1B1B1B']
CAM = ['#FF7A59', '#8E5BE8', '#1BA8A0', '#F5A623', '#E84C8B', '#3DB561', '#3B9DF2']

def kid(x, y, cam, piel, pelo, nina=False, brazos=(0, 0), s=1.0):
    """Niño o niña de pie; (x, y) = centro de los pies. brazos = (izq, der): 0 abajo, 1 levantado, 2 adelante."""
    g = [f'<g transform="translate({x} {y}) scale({s})">']
    pant = '#3F4F8C'
    g.append(f'<rect x="-11" y="-22" width="9" height="22" rx="4" fill="{pant}"/><rect x="2" y="-22" width="9" height="22" rx="4" fill="{pant}"/>')
    g.append(f'<ellipse cx="-6" cy="0" rx="8" ry="3.5" fill="{TINTA}"/><ellipse cx="7" cy="0" rx="8" ry="3.5" fill="{TINTA}"/>')
    g.append(f'<rect x="-15" y="-56" width="30" height="37" rx="11" fill="{cam}"/>')
    for lado, modo in ((-1, brazos[0]), (1, brazos[1])):
        x0, y0 = lado * 14, -50
        if modo == 1: x1, y1 = lado * 26, -76
        elif modo == 2: x1, y1 = lado * 28, -44
        else: x1, y1 = lado * 22, -28
        g.append(f'<line x1="{x0}" y1="{y0}" x2="{x1}" y2="{y1}" stroke="{cam}" stroke-width="8" stroke-linecap="round"/><circle cx="{x1}" cy="{y1}" r="4.5" fill="{piel}"/>')
    g.append(f'<circle cx="0" cy="-72" r="17" fill="{piel}"/>')
    if nina:
        g.append(f'<path d="M-17 -74 a17 17 0 0 1 34 0 l0 6 q-4 -8 -8 -8 q-9 6 -18 0 q-4 0 -8 8 z" fill="{pelo}"/><circle cx="-19" cy="-66" r="6" fill="{pelo}"/><circle cx="19" cy="-66" r="6" fill="{pelo}"/>')
    else:
        g.append(f'<path d="M-17 -72 a17 17 0 0 1 34 0 l0 2 q-6 -7 -12 -5 q-5 4 -10 0 q-6 -2 -12 5 z" fill="{pelo}"/>')
    g.append(f'<circle cx="-6" cy="-70" r="2" fill="{TINTA}"/><circle cx="6" cy="-70" r="2" fill="{TINTA}"/><path d="M-6 -64 q6 5 12 0" stroke="{TINTA}" stroke-width="2" fill="none" stroke-linecap="round"/>')
    g.append(f'<circle cx="-10" cy="-64" r="2.6" fill="#F08A8A" opacity=".55"/><circle cx="10" cy="-64" r="2.6" fill="#F08A8A" opacity=".55"/>')
    g.append('</g>')
    return ''.join(g)

def svg(cuerpo, fondo):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-hidden="true">'
            f'<rect width="{W}" height="{H}" rx="18" fill="{fondo}"/>{cuerpo}</svg>')

def salon(pared='#FFF4DF', piso='#F2D7B0', zocalo='#E3B77E'):
    return f'<rect x="0" y="0" width="{W}" height="200" fill="{pared}"/><rect x="0" y="200" width="{W}" height="100" fill="{piso}"/><rect x="0" y="196" width="{W}" height="8" fill="{zocalo}"/>'

def ventana(x, y, w, h, abierta=False, cielo='#BDE7FF', lluvia=False, sol=False):
    g = [f'<rect x="{x-6}" y="{y-6}" width="{w+12}" height="{h+12}" rx="6" fill="#8FB9D9"/><rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{cielo}"/>']
    if sol: g.append(f'<circle cx="{x+w*0.72}" cy="{y+h*0.3}" r="{h*0.16}" fill="#FFD166"/>')
    if lluvia:
        g.append(f'<ellipse cx="{x+w*0.35}" cy="{y+h*0.28}" rx="{w*0.26}" ry="{h*0.14}" fill="#9AA7B8"/><ellipse cx="{x+w*0.62}" cy="{y+h*0.22}" rx="{w*0.22}" ry="{h*0.13}" fill="#B4BFCC"/>')
        for i in range(7):
            xx = x + 10 + i * (w - 20) / 6; g.append(f'<line x1="{xx}" y1="{y+h*0.45}" x2="{xx-4}" y2="{y+h*0.62}" stroke="#6FA8DC" stroke-width="3" stroke-linecap="round"/><line x1="{xx+3}" y1="{y+h*0.72}" x2="{xx-1}" y2="{y+h*0.88}" stroke="#6FA8DC" stroke-width="3" stroke-linecap="round"/>')
    g.append(f'<line x1="{x+w/2}" y1="{y}" x2="{x+w/2}" y2="{y+h}" stroke="#8FB9D9" stroke-width="5"/><line x1="{x}" y1="{y+h/2}" x2="{x+w}" y2="{y+h/2}" stroke="#8FB9D9" stroke-width="5"/>')
    if abierta:  # hoja abierta hacia adentro
        g.append(f'<path d="M{x+w} {y} l34 18 l0 {h-36} l-34 18 z" fill="#CFE9FB" stroke="#8FB9D9" stroke-width="5" stroke-linejoin="round"/>')
    return ''.join(g)

def mesa(x, y, w, h=14, color='#D9A066', patas=28):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="5" fill="{color}"/>'
            f'<rect x="{x+8}" y="{y+h}" width="8" height="{patas}" fill="#B8824A"/><rect x="{x+w-16}" y="{y+h}" width="8" height="{patas}" fill="#B8824A"/>')

def cuaderno(x, y, color, w=34, h=10):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="2" fill="{color}"/><rect x="{x+3}" y="{y}" width="4" height="{h}" fill="#fff" opacity=".6"/>'

def nube(x, y, s=1.0, color='#fff'):
    return f'<g transform="translate({x} {y}) scale({s})"><ellipse cx="0" cy="0" rx="26" ry="14" fill="{color}"/><circle cx="-10" cy="-8" r="13" fill="{color}"/><circle cx="8" cy="-10" r="16" fill="{color}"/></g>'

def arbol(x, y, s=1.0):
    return f'<g transform="translate({x} {y}) scale({s})"><rect x="-6" y="-30" width="12" height="34" rx="4" fill="#8D5A2B"/><circle cx="0" cy="-50" r="28" fill="#5FBF6A"/><circle cx="-20" cy="-36" r="18" fill="#6CCB77"/><circle cx="20" cy="-38" r="18" fill="#6CCB77"/></g>'

# ---------- Práctica: el recreo ----------
def practica():
    b = [f'<rect width="{W}" height="300" fill="#D8F1FF"/><circle cx="420" cy="56" r="30" fill="#FFD166"/>', nube(90, 50, 1.0), nube(300, 36, .7),
         f'<rect x="0" y="206" width="{W}" height="94" fill="#8EDC8E"/><rect x="0" y="206" width="{W}" height="10" fill="#6CC56C"/>', arbol(60, 236, 1.0),
         # niño con balón
         kid(190, 270, CAM[6], PIEL[1], PELO[0], brazos=(0, 1)), '<circle cx="226" cy="262" r="16" fill="#fff" stroke="#2B2D42" stroke-width="2.5"/><path d="M219 254 l7 5 l7 -5 l-3 9 l-8 0 z" fill="#2B2D42"/><path d="M212 268 l6 -2 M240 268 l-6 -2 M226 246 l0 4" stroke="#2B2D42" stroke-width="2" stroke-linecap="round"/>',
         # niña con lazo
         kid(340, 270, CAM[4], PIEL[2], PELO[1], nina=True, brazos=(1, 1)), '<path d="M314 194 q26 -40 52 0" stroke="#E84C8B" stroke-width="3" fill="none"/><path d="M314 194 q26 60 52 0" stroke="#E84C8B" stroke-width="3" fill="none" opacity=".5"/>',
         '<rect x="400" y="248" width="60" height="10" rx="3" fill="#B8824A"/><rect x="406" y="258" width="8" height="18" fill="#8D5A2B"/><rect x="446" y="258" width="8" height="18" fill="#8D5A2B"/>']
    return svg(''.join(b), '#D8F1FF')

# ---------- S1: exposición ----------
def s1():
    b = [salon()]
    # cartelera con muchas cartulinas de colores (salón lleno)
    b.append('<rect x="22" y="34" width="250" height="150" rx="8" fill="#C9A26B"/><rect x="30" y="42" width="234" height="134" rx="5" fill="#F5E6C8"/>')
    cols = ['#FF7A59', '#8E5BE8', '#1BA8A0', '#F5A623', '#E84C8B', '#3DB561', '#3B9DF2', '#FFD166', '#FF9F80', '#B388FF', '#4DD0C4', '#F8C471']
    k = 0
    for fila in range(3):
        for c in range(4):
            x, y = 38 + c * 57, 50 + fila * 43
            b.append(f'<rect x="{x}" y="{y}" width="50" height="37" rx="3" fill="{cols[k % len(cols)]}" transform="rotate({(-3, 2, -2, 3)[(k) % 4]} {x+25} {y+18})"/>')
            b.append(f'<path d="M{x+8} {y+28} l8 -9 l7 6 l6 -11 l8 14" stroke="#fff" stroke-width="2.5" fill="none" opacity=".85" stroke-linecap="round" stroke-linejoin="round"/>')
            k += 1
    # dos niños apretados mirando
    b.append(kid(120, 282, CAM[2], PIEL[0], PELO[1], brazos=(0, 2)))
    b.append(kid(170, 282, CAM[3], PIEL[3], PELO[4], nina=True, brazos=(2, 0)))
    # puerta al corredor amplio con otros niños pasando
    b.append('<rect x="300" y="26" width="166" height="176" fill="#8FB9D9"/><rect x="308" y="34" width="150" height="168" fill="#E6F3FB"/><rect x="308" y="150" width="150" height="52" fill="#D4E6F3"/>')
    b.append('<rect x="330" y="50" width="40" height="28" rx="3" fill="#BDE7FF" stroke="#8FB9D9" stroke-width="3"/>')
    b.append(kid(390, 200, CAM[0], PIEL[2], PELO[2], brazos=(0, 0), s=.78))
    b.append(kid(430, 200, CAM[5], PIEL[1], PELO[0], nina=True, brazos=(0, 0), s=.72))
    b.append(kid(340, 200, CAM[1], PIEL[0], PELO[1], brazos=(0, 0), s=.7))
    return svg(''.join(b), '#FFF4DF')

# ---------- S2: cartelera ----------
def s2():
    b = [salon('#F3F0FF', '#E4DDF7', '#CFC3F0')]
    # reloj
    b.append('<circle cx="430" cy="48" r="30" fill="#fff" stroke="#8E5BE8" stroke-width="5"/>')
    b.append('<path d="M430 48 L430 18 A30 30 0 0 1 456 33 Z" fill="#D9CCFB"/>')  # franja de 25 minutos
    for i in range(12):
        import math
        a = i * math.pi / 6; x1, y1 = 430 + 25 * math.sin(a), 48 - 25 * math.cos(a); x2, y2 = 430 + 20 * math.sin(a), 48 - 20 * math.cos(a)
        b.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="#2B2D42" stroke-width="2"/>')
    b.append('<line x1="430" y1="48" x2="430" y2="27" stroke="#2B2D42" stroke-width="3" stroke-linecap="round"/><line x1="430" y1="48" x2="444" y2="38" stroke="#8E5BE8" stroke-width="3" stroke-linecap="round"/><circle cx="430" cy="48" r="3" fill="#2B2D42"/>')
    # dos niños detrás de la mesa (Luciana y Samuel), con globos de diálogo
    b.append(kid(170, 222, CAM[4], PIEL[1], PELO[1], nina=True, brazos=(0, 2), s=.95))
    b.append(kid(300, 222, CAM[6], PIEL[2], PELO[0], brazos=(2, 0), s=.95))
    b.append('<path d="M110 90 h110 a10 10 0 0 1 10 10 v30 a10 10 0 0 1 -10 10 h-50 l-10 12 l-2 -12 h-48 a10 10 0 0 1 -10 -10 v-30 a10 10 0 0 1 10 -10 z" fill="#fff" stroke="#E84C8B" stroke-width="3"/>')
    b.append('<path d="M250 90 h110 a10 10 0 0 1 10 10 v30 a10 10 0 0 1 -10 10 h-50 l-10 12 l-2 -12 h-48 a10 10 0 0 1 -10 -10 v-30 a10 10 0 0 1 10 -10 z" fill="#fff" stroke="#3B9DF2" stroke-width="3"/>')
    for i in range(3):
        b.append(f'<circle cx="{150+i*16}" cy="115" r="4.5" fill="#E84C8B"/><circle cx="{290+i*16}" cy="115" r="4.5" fill="#3B9DF2"/>')
    # mesa con cartulina y materiales
    b.append('<rect x="110" y="186" width="260" height="60" rx="8" fill="#D9A066"/><rect x="118" y="246" width="12" height="40" fill="#B8824A"/><rect x="350" y="246" width="12" height="40" fill="#B8824A"/>')
    b.append('<rect x="136" y="166" width="208" height="64" rx="6" fill="#FFF3B0" transform="rotate(-4 240 198)"/>')
    for i, c in enumerate(['#FF7A59', '#1BA8A0', '#3B9DF2', '#F5A623', '#E84C8B']):
        b.append(f'<rect x="{150+i*16}" y="178" width="7" height="34" rx="3" fill="{c}" transform="rotate(-20 {153+i*16} 195)"/>')
    b.append('<circle cx="300" cy="190" r="9" fill="#3DB561"/><rect x="316" y="182" width="16" height="16" rx="2" fill="#FF9F80" transform="rotate(15 324 190)"/><path d="M276 212 l12 -10 l12 10 z" fill="#8E5BE8"/>')
    b.append('<path d="M330 214 l16 -14 M336 214 l10 -14" stroke="#9AA7B8" stroke-width="3" stroke-linecap="round"/><circle cx="330" cy="215" r="4" fill="none" stroke="#9AA7B8" stroke-width="2.5"/><circle cx="337" cy="216" r="4" fill="none" stroke="#9AA7B8" stroke-width="2.5"/>')
    # otros dos niños a los lados de la mesa
    b.append(kid(72, 290, CAM[2], PIEL[0], PELO[2], brazos=(0, 1)))
    b.append(kid(412, 290, CAM[3], PIEL[3], PELO[4], nina=True, brazos=(2, 0)))
    return svg(''.join(b), '#F3F0FF')

# ---------- S3: cuadernos ----------
def s3():
    b = [salon('#EAF6F2', '#D6E9E1', '#BFD9CE')]
    b.append(ventana(50, 34, 150, 110, abierta=True, cielo='#B9C9D8', lluvia=True))
    b.append(mesa(40, 176, 190))
    for i, c in enumerate(['#FF7A59', '#3B9DF2', '#F5A623', '#8E5BE8']):
        b.append(cuaderno(64 + (i % 2) * 44, 156 + (i // 2) * -10, c))
    b.append(cuaderno(170, 158, '#3DB561', 40, 12))
    # estante al otro lado
    b.append('<rect x="320" y="40" width="130" height="150" rx="6" fill="#C9A26B"/><rect x="328" y="48" width="114" height="134" fill="#E9D7B6"/>')
    for fila in range(3):
        y = 60 + fila * 42
        b.append(f'<rect x="328" y="{y+30}" width="114" height="6" fill="#B8824A"/>')
        for j, c in enumerate(['#1BA8A0', '#E84C8B', '#F5A623', '#3B9DF2', '#8E5BE8'][: 4 + fila % 2]):
            b.append(f'<rect x="{334+j*22}" y="{y}" width="16" height="30" rx="2" fill="{c}"/>')
    b.append('<rect x="30" y="240" width="90" height="14" rx="5" fill="#B8824A"/><rect x="40" y="254" width="8" height="30" fill="#8D5A2B"/><rect x="102" y="254" width="8" height="30" fill="#8D5A2B"/>')
    b.append('<rect x="28" y="226" width="94" height="16" rx="6" fill="#3B9DF2"/>')  # silla
    return svg(''.join(b), '#EAF6F2')

# ---------- S4: rincón para leer ----------
def s4():
    b = [salon('#F2FBEA', '#DDEFCF', '#C5E0B0')]
    b.append(ventana(40, 34, 160, 112, cielo='#BDE7FF', sol=True))
    # luz que entra por la ventana
    b.append('<path d="M40 146 L200 146 L250 230 L0 230 Z" fill="#FFF3B0" opacity=".55"/>')
    # patio visto por la ventana: niños jugando pequeños
    b.append('<rect x="40" y="110" width="160" height="36" fill="#9BD28A"/>' + kid(90, 142, CAM[0], PIEL[1], PELO[0], s=.32) + kid(140, 142, CAM[4], PIEL[2], PELO[1], nina=True, s=.32) + '<circle cx="116" cy="136" r="5" fill="#fff" stroke="#2B2D42" stroke-width="1.5"/>')
    # rincón del fondo: tapete, cojines, librero y lámpara
    b.append('<ellipse cx="370" cy="236" rx="96" ry="26" fill="#F8C471"/>')
    b.append('<ellipse cx="330" cy="226" rx="24" ry="12" fill="#E84C8B"/><ellipse cx="380" cy="230" rx="24" ry="12" fill="#1BA8A0"/>')
    b.append('<rect x="300" y="60" width="90" height="120" rx="6" fill="#C9A26B"/><rect x="307" y="67" width="76" height="106" fill="#E9D7B6"/>')
    for fila in range(3):
        y = 76 + fila * 34
        b.append(f'<rect x="307" y="{y+24}" width="76" height="5" fill="#B8824A"/>')
        for j, c in enumerate(['#3B9DF2', '#FF7A59', '#3DB561', '#8E5BE8'][: 3 + fila % 2]):
            b.append(f'<rect x="{312+j*18}" y="{y}" width="13" height="24" rx="2" fill="{c}"/>')
    b.append('<rect x="432" y="90" width="6" height="130" fill="#6B7280"/><ellipse cx="435" cy="222" rx="18" ry="6" fill="#6B7280"/><path d="M405 92 l60 0 l-10 -40 l-40 0 z" fill="#FFD166"/>')
    # Mariana cerca de la ventana, Daniel al fondo
    b.append(kid(112, 282, CAM[4], PIEL[0], PELO[2], nina=True, brazos=(1, 0)))
    b.append(kid(250, 282, CAM[6], PIEL[3], PELO[4], brazos=(0, 2)))
    return svg(''.join(b), '#F2FBEA')

# ---------- S5: juego en equipos ----------
def s5():
    b = [f'<rect width="{W}" height="300" fill="#D8F1FF"/><circle cx="110" cy="56" r="30" fill="#FFD166"/>', nube(230, 44, .7)]
    b.append(f'<rect x="0" y="200" width="{W}" height="100" fill="#BFC9D4"/><rect x="0" y="200" width="{W}" height="8" fill="#9AA7B8"/>')  # patio de cemento
    # corredor cubierto a la derecha: techo y columnas
    b.append('<rect x="300" y="40" width="180" height="24" fill="#FF7A59"/><rect x="300" y="64" width="180" height="136" fill="#FFE9D6"/>')
    for x in (316, 390, 464):
        b.append(f'<rect x="{x-7}" y="64" width="14" height="140" fill="#F8C471"/>')
    b.append('<rect x="300" y="200" width="180" height="100" fill="#E3B77E"/>')
    # equipos en el patio: petos naranja y verde, balón
    b.append(kid(60, 286, CAM[3], PIEL[1], PELO[0], brazos=(1, 0), s=.95))
    b.append(kid(130, 268, CAM[3], PIEL[3], PELO[4], nina=True, brazos=(0, 2), s=.85))
    b.append(kid(200, 288, CAM[5], PIEL[0], PELO[2], brazos=(2, 1), s=.95))
    b.append(kid(250, 262, CAM[5], PIEL[2], PELO[1], nina=True, brazos=(0, 0), s=.8))
    b.append('<circle cx="166" cy="244" r="12" fill="#fff" stroke="#2B2D42" stroke-width="2"/><path d="M160 237 l6 4 l6 -4 l-2 8 l-8 0 z" fill="#2B2D42"/>')
    # un niño en el corredor
    b.append(kid(390, 286, CAM[6], PIEL[1], PELO[1], brazos=(0, 0), s=.95))
    return svg(''.join(b), '#D8F1FF')

# ---------- S6: maqueta ----------
def s6():
    b = [salon('#FFF0F5', '#F4D9E5', '#E6BFD0')]
    # puerta al fondo
    b.append('<rect x="372" y="50" width="84" height="150" rx="4" fill="#C9A26B"/><rect x="380" y="58" width="68" height="142" fill="#8D5A2B"/><circle cx="438" cy="132" r="4" fill="#FFD166"/>')
    # mesa y maqueta
    b.append(mesa(60, 190, 270, 16, patas=40))
    b.append('<rect x="76" y="150" width="238" height="44" rx="6" fill="#8EDC8E"/><path d="M76 168 q60 -10 120 0 t118 0 l0 26 l-238 0 z" fill="#6FB7E8" opacity=".9"/>')
    casas = [(96, 'FF7A59'), (134, '3B9DF2'), (176, 'F5A623'), (226, 'E84C8B'), (268, '8E5BE8')]
    for x, c in casas:
        b.append(f'<rect x="{x}" y="{136}" width="26" height="20" fill="#{c}"/><path d="M{x-4} 136 l17 -14 l17 14 z" fill="#B8824A"/><rect x="{x+9}" y="146" width="8" height="10" fill="#fff" opacity=".8"/>')
    for x in (120, 210, 300):
        b.append(f'<rect x="{x-2}" y="130" width="4" height="12" fill="#8D5A2B"/><circle cx="{x}" cy="124" r="9" fill="#3DB561"/>')
    # niños alrededor
    b.append(kid(40, 290, CAM[2], PIEL[2], PELO[0], brazos=(0, 2)))
    b.append(kid(350, 290, CAM[3], PIEL[0], PELO[2], nina=True, brazos=(2, 0)))
    return svg(''.join(b), '#FFF0F5')

if __name__ == '__main__':
    for nombre, f in [('practica', practica), ('S1', s1), ('S2', s2), ('S3', s3), ('S4', s4), ('S5', s5), ('S6', s6)]:
        open(os.path.join(OUT, nombre + '.svg'), 'w', encoding='utf-8').write(f())
    print('ok', os.listdir(OUT))
