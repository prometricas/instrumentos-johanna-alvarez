# Instrumentos de investigación · tesis doctoral J. P. Álvarez Pulgarín (Universidad Cuauhtémoc)

App web para aplicar en pantalla la **prueba de desempeño de habilidades emergentes del pensamiento crítico** (tercero de primaria, I. E. Eduardo Santos, Medellín) de la investigación *Filosofía para Niños y pensamiento crítico*, calificarla con dos calificadores más una puntuación acordada, y guardar todo en una base central lista para exportar a Excel.

- **Aplicador** (`index.html`, con clave): registra estudiantes (Piloto, Experimental, Control), aplica la prueba en pantalla en dos momentos (Pretest y Postest) leyendo cada situación y cada pregunta en voz alta (pantalla del niño colorida, con un tema de color e ilustración propia por situación y tipografía Nunito), califica los protocolos a ciegas, muestra la tabla de respuestas y la descarga en Excel.
- **Instrumento**: un solo instrumento, 6 situaciones y 20 ítems puntuables (8 cerrados con clave, 0 o 2; 12 de rúbrica, 0-2) más dos elecciones iniciales auxiliares (situaciones 5 y 6, sin puntaje). Cinco habilidades de 4 ítems (0-8) y total 0-40. En el postest las situaciones se presentan en un orden al azar distinto para cada estudiante (las cuatro primeras entre sí y las dos de revisión entre sí, con la pausa entre ambos; el orden interno de cada situación no cambia), y ese orden queda registrado. Definición única en `fuente/instrumentos.json` (texto exacto de los ítems, clave, rúbricas, habilidades, hojas).
- **Reglas de puntuación** (guía de puntuación de la tesis, Apéndice B): omisión con oportunidad («no sé», «porque sí») = 0 y queda registrada; en los ítems de rúbrica el 0 se reserva para esa omisión y para la respuesta sin relación con la pregunta, y cualquier otro intento recibe al menos 1; falta de oportunidad = dato faltante (no 0); el ítem 8 sin la elección del 5 queda faltante; ninguna suma se calcula si le falta un ítem. Los cerrados se califican solos en el servidor; los de rúbrica los puntúan el calificador 1 y el 2 de forma independiente, viendo solo el código de protocolo (`P-XXXX`, derivado de la firma secreta; sin nombre, grupo ni momento), y la puntuación final es la acordada entre ambos (las coincidencias quedan prellenadas). La app calcula el acuerdo exacto y el kappa ponderado (pesos lineales) por ítem y global.
- **Versiones del instrumento**: la definición vigente es la **versión 2** (versión definitiva del TFM del 25-oct-2026, Apéndices A y B, fijada tras la validación por tres evaluadores expertos y el pilotaje): nombres Lis/Bruno (situación 2) y Clara/Teo (situación 4), ítem 1 con cuatro opciones, distractores nuevos en 7, 11, 12, 13, 14 y 16, claves 7 = C, 8 = D (Lis) o A (Bruno), 12 = D, uniones 13 Clara–C y Teo–A, consignas de los ítems 15 y 17-20 ajustadas tras el pilotaje, y rúbricas nuevas (el 0 solo para la omisión —«no sé», «porque sí»— o la respuesta sin relación con la pregunta; cualquier otro intento ≥ 1), con los ejemplos de la Tabla B4 (ítems 18 y 20) en la pantalla de calificar. Cada aplicación guarda `version`; las anteriores (pilotaje con la versión del 11 de octubre, sin `version`) conservan sus puntajes automáticos y se muestran y se califican con sus textos, opciones y claves originales (`versiones.legado` en el JSON; `VersionInstrumento` en el Excel). Los ids internos de los personajes (`luciana`, `samuel`, `mariana`, `daniel`) no cambiaron: solo cambió lo que se muestra y los nombres de columna. Una aplicación incompleta de otra versión no se continúa: solo se puede empezar de nuevo.
- **Datos**: Netlify Blobs, almacenes `participantes` (clave = código), `pc` (clave = `CÓDIGO-Momento`: respuestas por parte, estado de cada ítem, puntaje automático de los cerrados, protocolo, orden de las situaciones en el postest, y si quedó incompleta, los ítems pendientes y dónde quedó), `calif` (clave = `CÓDIGO-Momento-Rol`, rol 1, 2 o F), `papelera`, `bitacora` e `intentos`. La bitácora queda solo en el servidor como registro de auditoría.
- **Tabla de respuestas y Excel** en formato largo (panel): dos filas por estudiante, una por momento (`Momento` = Pretest | Postest), con `Grupo, Codigo, Nombre, Apellido, Momento, Sexo, Edad, Protocolo, Incompleta, OrdenSituaciones` y, en bloques: habilidades `Indagacion, Justificacion, Perspectivas, Conclusiones, Revision, TotalPC` (vacías si falta un ítem o la puntuación acordada); puntaje final por ítem `P01`…`P20` con `Omitidos` y `Faltantes`; opcionalmente `C1_02`…`C2_20`, `Calificador1`, `Calificador2`, `Acuerdo` (y una hoja `Acuerdo` con las estadísticas por ítem) y `FechaHora, Aplicador, Duracion`; y las respuestas tal como se dieron: `R01`, `R02a` (marcas, `A;C`), `R02b` (texto), `R03a`/`R03b`, `R04`, `R05a`/`R05b`, `R06a_Lis`/`R06a_Bruno`/`R06c`/`R06d`, `R07`…`R12`, `R13a_Clara`/`R13a_Teo`/`R13c`/`R13d`, `R14`…`R16`, `EI5a`/`EI5b`, `R17a`/`R17b`/`R17_fin` (elección final derivada), `R18a`/`R18b`, `EI6a`/`EI6b`, `R19a`/`R19b`/`R19_fin`, `R20a`/`R20b`. Los nombres de columna (`col` en el JSON) son independientes de las claves internas, así que pueden cambiarse sin migrar datos. Una hoja por grupo.
- **Ficha del estudiante** (avatar según el sexo): datos editables, incluido el código (sus aplicaciones y calificaciones lo siguen; si otro lo tiene, el mensaje dice quién), habilidades y total pre, post y cambio, estado de la calificación de cada aplicación y la tabla de respuestas y puntaje por ítem. Cada módulo tiene su dirección (`#estudiantes`, `#aplicar`, `#calificar`, `#respuestas`), así que el botón Atrás del navegador vuelve al módulo anterior.

Además: la prueba avanza por hojas como el cuadernillo (solo se puede volver atrás dentro de la misma hoja; en las situaciones 5 y 6 la elección inicial se cierra antes de mostrar la información nueva; pausa breve antes de la situación 5); práctica que no se guarda; no se avanza hasta responder todas las partes de cada pregunta, salvo que el aplicador registre «Sin respuesta» (omitió / sin oportunidad); las respuestas se guardan en el servidor tras cada pregunta, así que una aplicación interrumpida queda incompleta (los ítems no alcanzados, como dato faltante) y se continúa después desde donde quedó, en el mismo dispositivo o en otro; cola de envío cuando no hay conexión; copia de seguridad completa en JSON, restauración y visor de bitácora; buscador; papelera recuperable.

La documentación de uso y mantenimiento está en `app-web-instrumentos.md`.

## Estructura

```
public/            sitio publicado (index.html, assets/)
netlify/functions/ api.mjs: toda la lógica de datos (ruta /api/*)
netlify/lib/       instrumentos.mjs: el instrumento (generado)
fuente/            instrumentos.json: definición única del instrumento
build.py           regenera public/assets/instrumentos.js y netlify/lib/instrumentos.mjs
dev-local.mjs      servidor local de pruebas (node dev-local.mjs)
test/              e2e.py (prueba de punta a punta con Playwright) y semilla.mjs (datos ficticios locales)
```

## Publicar en Netlify

Netlify publica solo lo que llegue a la rama `main`. Desde la copia local (Git Bash):

```
git checkout main
git merge --ff-only revision
git push origin main
git checkout revision
```

## Configuración en Netlify

Variables de entorno: `APP_CLAVE` (clave del aplicador) y, recomendada, `FIRMA_SECRETA` (texto largo aleatorio: deriva los códigos de protocolo; si no existe se usa la clave, y entonces cambiar la clave cambia los códigos de protocolo ya calificados). Tras 5 claves incorrectas en 10 minutos desde una misma dirección, el acceso se bloquea 15 segundos; cada fallo espera 1,5 s. `netlify.toml` fija Node 20 y las cabeceras de seguridad (CSP solo con scripts propios, sin marcos).

## Pruebas locales

```
npm install
echo "APP_CLAVE=su_clave" > .env     # la clave nunca va en el código
node dev-local.mjs                    # http://localhost:8888
python3 test/e2e.py                   # prueba de punta a punta (Playwright); también corre en GitHub en cada subida
```

## Datos ficticios para revisar en local
Con el servidor local encendido, `node test/semilla.mjs` completa el plantel ficticio de los tres grupos y crea las aplicaciones que falten con respuestas aleatorias coherentes con el nivel de cada estudiante (en Experimental el postest mejora un poco), con calificaciones en distintos estados (acordadas, de un solo calificador, de los dos sin acuerdo, sin calificar), omisiones, un ítem 8 sin elección previa y una aplicación interrumpida. No reemplaza nada ya guardado. `node test/semilla.mjs --reiniciar` borra todos los estudiantes y la papelera y vuelve a crear el plantel desde E01. Nada de esto toca el sitio publicado.
