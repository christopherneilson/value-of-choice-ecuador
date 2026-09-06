// i18n.js — English is the default in markup and code; Spanish lives here as keyed overrides.
//   static text : <el data-i18n="key">English</el>  → applyStatic() swaps innerHTML per language
//   dynamic text: t("key", "English {x}", {x})       → Spanish override if present, else the English
//   numbers     : nf(x, digits)                       → locale formatting (es: comma decimals)
// Language: ?lang=es|en, else localStorage "voc.lang", else the browser's; mountToggle() adds EN/ES.
// Spanish drafted 2026-09-04 (needs a native review before becoming the default); Ecuadorian grade
// names: Inicial 1 (3 años), Inicial 2 (4 años), Primero de básica; "cupos" for seats.

const ES = {
  // ---------------------------------------------------------------- shared
  "site.title": "El valor de elegir en la asignación escolar centralizada",
  "grade.2": "Inicial 1 (3 años)", "grade.3": "Inicial 2 (4 años)", "grade.4": "Primero de básica",
  "rule.dc": "Regla de distancia", "rule.da": "Aceptación diferida", "rule.sic": "Referencia",
  "rule.dc.info": "El statu quo: a cada familia se le ofrece la escuela más cercana con cupo; los empates se resuelven con un sorteo por familia. Las preferencias declaradas no juegan ningún papel.",
  "rule.da.info": "La regla implementada: las listas declaradas por las familias, con las demás escuelas añadidas en orden de distancia; prioridades hermano > declarada > añadida, un sorteo por par familia–escuela.",
  "rule.sic.info": "Referencia eficiente restringida: ciclos de mejora estable aplicados al resultado de la aceptación diferida — lo máximo que puede añadir un mecanismo que respeta las prioridades.",
  "src.engine": "motor, sintético", "src.paper": "artículo, datos reales", "src.paper.all": "artículo, datos reales, todos los niveles",
  "load.fail": "No se pudieron cargar los datos",
  "toggle.label": "Idioma",

  // ------------------------------------------------------------- simulator
  "sim.crumb.tag": "interactivo",
  "sim.h1": "Elige la regla",
  "sim.lede": "Las escuelas reales de Manta, una población sintética de familias generada con el modelo estimado en el artículo, y las tres reglas que el artículo compara. Cambia la regla y observa quién queda asignado dónde; luego reduce los cupos o cambia cómo se distribuyen los gustos de las familias.",
  "sim.grade": "Nivel", "sim.rule": "Regla de asignación", "sim.outcome": "Resultado bajo esta regla",
  "sim.th.dc": "Distancia", "sim.th.da": "AD", "sim.th.sic": "Referencia",
  "sim.play": "Juega con el modelo",
  "sim.seats": "Cupos (perilla de congestión)",
  "sim.sxi": "Cuánto difieren las escuelas (σ<sub>ξ</sub>)",
  "sim.seps": "Gusto idiosincrático (σ<sub>ε</sub>)",
  "sim.sgam": "Heterogeneidad del gusto por la distancia (σ<sub>γ</sub>)",
  "sim.aware": "Cuántas escuelas conocen las familias",
  "sim.reset": "Restablecer",
  "sim.lines": "mostrar una muestra de enlaces hogar→escuela",
  "sim.play.note": "Las perillas multiplican las estimaciones del artículo (×1 = Tabla 9). Las utilidades se recomponen a partir de los gustos sorteados de cada familia, así que son las mismas familias las que se reasignan con gustos nuevos. El conocimiento fija cuántas de sus escuelas más cercanas compara cada familia antes de armar su lista (la encuesta sugiere que solo unas pocas); en el extremo derecho toda familia conoce todas las escuelas.",
  "sim.family": "Sigue a una familia",
  "sim.legend": "Leyenda",
  "sim.legend.first": "familia asignada a su primera opción",
  "sim.legend.listed": "asignada a otra escuela de su lista",
  "sim.legend.unlisted": "asignada a una escuela fuera de su lista",
  "sim.legend.school": "escuela (tamaño = cupos, color = banda de deseabilidad)",
  "sim.try1.h": "Prueba: cambia la regla",
  "sim.try1.p": "Pasa de la <a href=\"?grade=2&rule=dc\">regla de distancia</a> a la <a href=\"?grade=2&rule=da\">aceptación diferida</a>. La proporción de familias asignadas a una escuela que pidieron sube; la proporción asignada a su primera opción sube más. Luego pasa a la <a href=\"?grade=2&rule=sic\">referencia</a> y nota lo poco que cambia: esa brecha es el valor del <em>algoritmo</em>, y es pequeña.",
  "sim.try2.h": "Prueba: reduce los cupos",
  "sim.try2.p": "Arrastra los cupos por debajo de ×1, o salta a <a href=\"?grade=2&rule=da&seats=0.6\">cupos ×0,6</a>. Al crecer la congestión, la proporción en primera opción bajo aceptación diferida cae y la ganancia sobre la regla de distancia se encoge. Por eso <a href=\"?grade=4&rule=da\">Primero de básica</a>, el nivel más congestionado, es el que menos gana en el artículo.",
  "sim.try3.h": "Prueba: haz que las familias se parezcan",
  "sim.try3.p": "Baja el gusto idiosincrático σ<sub>ε</sub> a <a href=\"?grade=2&rule=da&seps=0.2\">×0,2</a>: ahora la mayoría quiere su escuela más cercana, la regla de distancia casi iguala a la aceptación diferida y la ganancia de elegir cae de cerca de 0,5 a 0,1 km por familia. Súbelo a <a href=\"?grade=2&rule=da&seps=3\">×3</a> y la ganancia se triplica. Prueba ahora con σ<sub>ξ</sub>: hacer que todas las escuelas sean <a href=\"?grade=2&rule=dc&sxi=0\">igual de deseables</a> casi no cambia nada, porque las familias solo comparan unas pocas escuelas cercanas. El valor de elegir está en lo que cada familia quiere, no en un ranking de escuelas que un planificador pudiera observar: el resultado del artículo con imágenes, en una sola perilla.",
  "sim.try4.h": "Prueba: sigue a una familia",
  "sim.try4.p": "Haz clic en cualquier punto, o <a href=\"?grade=2&rule=dc&family=16\">abre la familia 16</a>, que vive a 170 m de una escuela pero quiere una a 590 m: la regla de distancia la manda a su cuarta opción; la aceptación diferida, a la primera. La ficha de cada familia muestra su lista, la escuela de al lado y adónde la envía cada regla, con la pérdida respecto de su primera opción en km equivalentes. Luego <a href=\"?grade=2&rule=da&aware=0\">haz que las familias conozcan solo sus escuelas más cercanas</a> y observa cómo casi todas la piden, o <a href=\"?grade=2&rule=da&aware=all\">deja que cada familia conozca todas las escuelas</a> y observa cómo crece el valor de elegir a medida que las listas llegan más lejos.",
  "sim.footer": "Las familias son sintéticas: generadas con el modelo de demanda estimado en el artículo sobre las escuelas reales, con hogares muestreados de una grilla de densidad gruesa; ninguna familia real aparece. La deseabilidad de cada escuela se muestra solo como banda de quintil. Las reglas siguen el diseño implementado: la aceptación diferida corre sobre la lista declarada con las demás escuelas añadidas en orden de distancia (prioridades: hermano, declarada, añadida; un sorteo por par familia–escuela); la regla de distancia asigna en orden de distancia con un sorteo por familia; la referencia aplica ciclos de mejora estable a la aceptación diferida (artículo, Proposición 2). Mapa base © colaboradores de <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a>.",
  // dynamic
  "sim.headline": "{n}% en su primera opción",
  "sim.headsub": "{listed}% en una escuela de su lista · {km} km promedio a la escuela · {n} familias, {seats} cupos · promedio de {draws} sorteos",
  "sim.row.listed": "Asignados a una escuela de su lista, %",
  "sim.row.first": "Asignados a su primera opción, %",
  "sim.row.km": "Distancia promedio a la escuela, km",
  "sim.row.welfare": "Bienestar promedio, km equivalentes",
  "sim.recovered": "La aceptación diferida cierra <b>{rec}%</b> de la brecha de bienestar entre la regla de distancia y la referencia (ganancia de {gain} km equivalentes por familia). El {near}% de las familias pone primero a su escuela más cercana; las demás aceptan una mediana de {extra} km más de viaje. Las familias consideran {m} escuelas en promedio.",
  "sim.paper": "<b>Artículo, datos reales ({grade}):</b> regla de distancia {dcl}% en lista · AD {dal}% en lista, {daf}% en primera opción · AD cierra {rec} del rango · {near}% pone primero a la más cercana.",
  "sim.paper.rec.4": "cerca de cero (sensible a convenciones)",
  "sim.gradeinfo": "{n} familias · {J} escuelas · {seats} cupos ({ratio} por familia)",
  "sim.aware.all": "todas las escuelas",
  "sim.aware.zero": "solo las más cercanas (tantas como listan)",
  "sim.aware.est": "según lo estimado (≈{k} más cercanas)",
  "sim.aware.k": "≈{k} escuelas más cercanas",
  "fam.pick": "Haz clic en cualquier familia del mapa, o",
  "fam.random": "elige una al azar",
  "fam.another": "otra familia",
  "fam.clear": "quitar",
  "fam.head": "<b>Familia {i}</b> · escuela más cercana {s} a {km} km · conoce {M} escuelas · listó {K}",
  "fam.sib": " · hermano en {s}",
  "fam.th.list": "Su lista", "fam.th.dist": "distancia", "fam.th.rule": "Regla", "fam.th.placed": "asignada a", "fam.th.vs": "vs. 1.ª, km eq.",
  "fam.sibtag": " (hermano)",
  "fam.first": "primera opción", "fam.choice": "opción n.º {r}", "fam.unlisted": "fuera de su lista", "fam.unassigned": "sin asignar",
  "fam.note": "Último sorteo. «vs. 1.ª» es cuánto le falta a la asignación respecto de la primera opción de la familia, en utilidad equivalente en km. Línea punteada: primera opción; líneas continuas: adónde la envía cada regla.",

  "sim.loading": "cargando…", "fam.number": "Número de familia", "fam.go": "Ir",
  // ----------------------------------------------------------------- story
  "story.crumb.tag": "el argumento, paso a paso",
  "story.h1": "Por qué importa elegir — aunque la mayoría de las familias quiera la escuela de al lado",
  "story.lede": "Desplázate. El mapa de la derecha es un modelo en vivo de Manta, Ecuador: las escuelas reales y una población sintética de familias generada con el modelo de demanda estimado en el artículo, reasignadas bajo cada regla a medida que lees. Cada número lleva etiqueta: <em>motor, sintético</em> para lo que el modelo calcula aquí; <em>artículo, datos reales</em> para lo que el artículo midió.",
  "story.s0.k": "El contexto", "story.s0.h": "Una ciudad, un nivel de ingreso, una pregunta",
  "story.s0.p1": "En 2021 Manta reemplazó una regla centralizada de asignación por otra. Antes, un algoritmo coordinado enviaba a cada niño a la escuela pública más cercana con cupo. Después, el mismo tipo de algoritmo —la aceptación diferida— asignó a los niños según las listas ordenadas que presentaron sus familias.",
  "story.s0.p2": "La coordinación no cambió. La digitalización no cambió. Lo que cambió fue el <em>objetivo</em>: proximidad o preferencias. Eso convierte a Manta en un lugar raro para preguntar cuánto vale, por sí solo, actuar sobre las preferencias de las familias.",
  "story.s1.k": "Paso 1", "story.s1.h": "La mayoría de las familias quiere la escuela más cercana. Una cuarta parte, no.",
  "story.s1.p1": "Pide a las familias que ordenen escuelas y la mayoría pondrá primero la de al lado. Por eso una regla de distancia parece casi óptima. Pero más de una cuarta parte pone primero una escuela que no es la más cercana, y está dispuesta a viajar por ella: una mediana de 0,6 km más en los datos reales.",
  "story.s1.p2": "Una regla de distancia no puede ver esto. Trata cada metro adicional como puro costo.",
  "story.s2.k": "Paso 2", "story.s2.h": "Qué hace la regla de distancia con eso",
  "story.s2.p1": "Bajo la regla antigua la lista de una familia no juega ningún papel. Las familias coloreadas en el mapa quedan donde las pone la proximidad: a quienes querían la escuela de al lado les va bien; a quienes querían otra los envía de todos modos a la más cercana, y el cupo que querían puede ir a alguien que no lo quería.",
  "story.s2.p2": "En los datos reales solo el 42% de los postulantes obtuvo su primera opción, y solo la mitad fue asignada a alguna escuela de su lista.",
  "story.s3.k": "Paso 3", "story.s3.h": "Actuar sobre las preferencias, en cambio",
  "story.s3.p1": "Las mismas familias, las mismas escuelas, los mismos cupos, los mismos sorteos. La aceptación diferida simplemente toma en serio las listas: cada familia se postula a su primera opción, las escuelas retienen a los postulantes con mejor prioridad y las familias rechazadas bajan por su lista.",
  "story.s3.p2": "La proporción en su primera opción salta, la proporción en alguna escuela de su lista salta, y el viaje sube solo unos cientos de metros, porque la mayoría de las familias pedía algo cercano desde el principio.",
  "story.s4.k": "Paso 4", "story.s4.h": "¿Ayuda un algoritmo más ingenioso? Apenas.",
  "story.s4.p1": "La aceptación diferida no es el mecanismo más eficiente imaginable. Intercambios que respetan las prioridades todavía pueden mejorarla; la <em>referencia eficiente restringida</em> del artículo los encuentra todos. Cambia a ella y casi nada se mueve.",
  "story.s4.p2": "Ese es el hallazgo central del artículo: el valor proviene de elicitar las preferencias, no de la elección del algoritmo. En el paso de la ciudad de Nueva York a la asignación coordinada, los refinamientos algorítmicos valían el 3% del rango de bienestar; en Manta, el 0,3%.",
  "story.s5.k": "Paso 5", "story.s5.h": "Lo que sí importa: los cupos",
  "story.s5.p1": "Las preferencias solo pueden atenderse donde hay cupos con qué atenderlas. Reduce los cupos y observa cómo la aceptación diferida pierde su ventaja: menos familias en su primera opción y una porción menor de la ganancia posible capturada.",
  "story.s5.p2": "Los tres niveles de Manta están en puntos distintos de esta curva. En el nivel de ingreso la aceptación diferida ubica al 93% de las familias en su primera opción; en el congestionado Primero de básica, al 33%. La congestión, no el algoritmo, es lo que limita el valor de elegir.",
  "story.s6.k": "Paso 6", "story.s6.h": "Quién gana",
  "story.s6.p1": "Las ganancias son progresivas. Ordenando los barrios por escolaridad, el artículo encuentra ganancias medias de +0,79 km equivalentes en el cuartil más bajo frente a +0,59 en el más alto en Inicial 1 (+0,49 frente a +0,15 en Inicial 2). La escuela más cercana que ofrece un barrio más pobre proviene de un menú más escaso, así que mirar más allá de la proximidad ayuda más a esas familias.",
  "story.s6.p2": "El indicador socioeconómico es un promedio por manzana censal, de modo que el artículo lo lee como evidencia sobre la dirección de la incidencia, no como un ranking preciso.",
  "story.s7.k": "Paso 7", "story.s7.h": "¿Podría haberlo adivinado un planificador?",
  "story.s7.p1": "Si lo que las familias quieren fuera sobre todo <em>calidad escolar</em>, un planificador bien informado podría ordenar las escuelas y asignar en consecuencia, sin listas. El artículo midió las escuelas con imágenes satelitales y a nivel de calle —superficie construida, estado, vegetación y más— y encontró que la mayor parte de lo que hace deseable a una escuela para una familia dada sigue sin explicarse.",
  "story.s7.p2": "El modelo dice lo mismo desde el otro lado: reduce los gustos idiosincráticos de las familias y el valor de elegir se desploma; haz idénticas a las escuelas y casi nada cambia. Elegir vale algo porque las familias difieren, de maneras que un planificador no puede observar.",
  "story.s8.k": "Pruébalo", "story.s8.h": "Corre las reglas tú mismo",
  "story.s8.p1": "El simulador te permite cambiar de regla, reducir los cupos y cambiar cómo se distribuyen los gustos de las familias, sobre la misma población sintética, con los números de datos reales del artículo al lado.",
  "story.cta.sim": "Abrir el simulador →", "story.cta.pdf": "Leer el artículo (PDF)",
  "story.legend.near": "quiere la escuela más cercana", "story.legend.away": "quiere otra escuela",
  "story.legend.first": "asignada a su primera opción", "story.legend.listed": "otra escuela de su lista", "story.legend.unlisted": "escuela fuera de su lista",
  "story.footer": "Las familias son sintéticas (generadas con el modelo de demanda estimado en el artículo sobre las escuelas reales; hogares de una grilla de densidad gruesa; ninguna familia real aparece). La deseabilidad de cada escuela se muestra solo como banda de quintil. Los números de datos reales provienen del artículo <em>The Value of Choice in Centralized School Assignment</em> (Elacqua, Jacas, Krussig, Méndez y Neilson, 2026). Mapa base © colaboradores de <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a>.",
  "story.loading": "Calculando los escenarios…",
  // dynamic readouts
  "story.r.hero.h": "55 escuelas · 1.098 familias",
  "story.r.hero.s": "Inicial 1, el nivel de ingreso. Escuelas según cupos y coloreadas por banda de deseabilidad; las familias son sintéticas, generadas con el modelo estimado en el artículo.",
  "story.r.nearest.h": "{p}% quiere una escuela que no es la más cercana",
  "story.r.nearest.s": "El {near}% pone primero a su escuela más cercana; las demás aceptan una mediana de {extra} km más de viaje por su primera opción {src1}<br>Artículo: 65% pone primero a la más cercana en este nivel; en todos los niveles, más de una cuarta parte elige otra y paga una mediana de 0,6 km por ello {src2}",
  "story.r.distance.h": "{p}% obtiene su primera opción",
  "story.r.distance.s": "{listed}% queda en alguna escuela de su lista; {km} km promedio a la escuela {src1}<br>Artículo: bajo la regla de distancia el 42% de los postulantes obtuvo su primera opción y el 50% alguna escuela de su lista {src2}",
  "story.r.da.h": "{p}% obtiene su primera opción",
  "story.r.da.s": "desde {p0}%: las mismas familias, las mismas escuelas, los mismos cupos; solo cambió el objetivo. {listed}% en una escuela de su lista; el viaje sube de {km0} a {km} km {src1}<br>Artículo: 42% → 70% primera opción, 50% → 78% en lista, +0,32 km {src2}",
  "story.r.benchmark.h": "{p}% — frente a {p0}% bajo AD",
  "story.r.benchmark.s": "La referencia es lo máximo que puede hacer un mecanismo que respeta las prioridades. La AD ya cierra el {rec}% de la brecha entre la regla de distancia y ella {src1}<br>Artículo: 99,6% en Inicial 1; los refinamientos algorítmicos valen el 0,3% del rango; actuar sobre las preferencias, el 87,6% {src2}",
  "story.r.congestion.h": "cupos ×0,6: {p}% en primera opción, {rec}% de la brecha cerrada",
  "story.r.congestion.s": "A medida que los cupos se reducen, la aceptación diferida ubica a menos familias en su primera opción y el valor que añade sobre la regla de distancia se desploma {src1}<br>Artículo: proporción en primera opción bajo AD del 93% en Inicial 1, 58% en Inicial 2 y 33% en Primero de básica: el nivel congestionado es el que menos gana {src2}",
  "story.chart.first": "AD: % en primera opción", "story.chart.rec": "% de la brecha que cierra la AD", "story.chart.aria": "Proporción en primera opción y porcentaje de la brecha cerrada a medida que se reducen los cupos",
  "story.r.whogains.h": "Las ganancias son progresivas",
  "story.r.whogains.s": "Ganancia media por cuartil de escolaridad del barrio, del más bajo al más alto — Inicial 1: <b>+0,79, +0,68, +0,68, +0,59</b> km; Inicial 2: <b>+0,49, +0,38, +0,34, +0,15</b> km. Más bajo menos más alto: +0,20 km en Inicial 1 (intervalo del 95%: +0,01 a +0,39). En Inicial 1 gana el 51,8% de las familias, unos 1,4 km cada una {src2}<br>La población sintética aún no tiene capa socioeconómica, así que el mapa conserva el coloreado de la aceptación diferida.",
  "story.r.planner.h": "Cuánto vale elegir depende de cuánto difieren las familias",
  "story.r.planner.s": "Ganancia por actuar sobre las preferencias, km equivalentes por familia — familias parecidas (σ<sub>ε</sub>×0,2): <b>{a}</b> · según lo estimado: <b>{b}</b> · muy diversas (×3): <b>{c}</b>. Hacer idénticas a todas las <em>escuelas</em>, en cambio, casi no cambia nada {src1}<br>Artículo: incluso con diez atributos derivados de imágenes y rasgos aprendidos de las fotos, la mayor parte de lo que hace deseable a una escuela para una familia dada sigue sin explicarse {src2}",
  "story.r.end.h": "Pruébalo tú mismo",
  "story.r.end.s": "El simulador te permite cambiar de regla, reducir los cupos y cambiar los gustos sobre las mismas familias.",

  // ------------------------------------------------------------------- toy
  "toy.crumb.tag": "un mercado de juguete",
  "toy.h1": "¿Conviene mentir?",
  "toy.lede": "Tres familias, tres escuelas, un cupo cada una. Ordena las escuelas para <b>tu</b> familia y observa adónde te envían dos reglas de asignación. Bajo el <b>mecanismo de Boston</b> una escuela llena su cupo apenas alguien la pone primera, así que una familia que apunta alto y falla puede perder también su opción segura, y puede irle mejor <em>no</em> diciendo la verdad. Bajo la <b>aceptación diferida</b> nada queda fijo hasta el final, y ninguna lista supera nunca a la verdad. Por eso el artículo puede tratar las listas de Manta como lo que las familias realmente quieren.",
  "toy.market": "El mercado", "toy.th.family": "Familia", "toy.th.prefs": "Preferencias verdaderas", "toy.th.prio": "Prioridad",
  "toy.market.note": "Cada escuela tiene un cupo. Una escuela admite postulantes en orden de prioridad; los empates se resuelven con un sorteo fijo. Ana tiene un hermano en A; tú vives en la zona de B.",
  "toy.submit": "La lista que entregas",
  "toy.submit.note": "Tu preferencia verdadera es A, luego B, luego C. Elige la lista que entregas; las otras dos familias siempre dicen la verdad.",
  "toy.boston": "Mecanismo de Boston", "toy.boston.sub": "aceptación inmediata",
  "toy.da": "Aceptación diferida", "toy.da.sub": "la regla que adoptó Manta",
  "toy.all": "Todas las listas que podrías entregar", "toy.th.list": "Tu lista", "toy.th.bos": "Boston te da", "toy.th.da": "La AD te da",
  "toy.all.note": "Bajo la aceptación diferida la lista sincera siempre está entre las mejores que puedes entregar: eso significa «a prueba de estrategias», y vale para cualesquiera preferencias, prioridades y cupos, no solo para este ejemplo (la Proposición 1 del artículo enuncia la forma que toma con las prioridades de Manta). Bajo Boston, que mentir convenga depende de lo que hagan los demás, que es justamente el juego de adivinanzas que un buen mecanismo elimina.",
  "toy.cta": "Volver al simulador completo →",
  "toy.you": "Tú", "toy.truth": "la verdad", "toy.unassigned": "sin asignar",
  "toy.prio.1": "1.ª", "toy.prio.2": "2.ª", "toy.prio.3": "3.ª",
  "toy.ord.1": "tu 1.ª opción", "toy.ord.2": "tu 2.ª opción", "toy.ord.3": "tu 3.ª opción",
  "toy.log.round": "Ronda {r}, escuela {s}: postulan {applied}",
  "toy.log.accepted": "{who} admitido/a de forma definitiva",
  "toy.log.rejected": "{who} rechazado/a y pasa a la siguiente escuela de su lista",
  "toy.da.explain": "Cada familia se postula a la primera escuela de su lista; cada escuela retiene provisionalmente a su mejor postulante y rechaza al resto, que se postula más abajo en su lista. Nada es definitivo hasta que nadie es rechazado, así que una escuela que pones primera no puede costarte las que pones después.",
  "toy.v.truth": "Dijiste la verdad. Bajo Boston terminas en <b>{b}</b>; bajo la aceptación diferida, en <b>{d}</b>. Ahora prueba poner B primero.",
  "toy.v.bos.better": "Bajo Boston esta mentira <b class=good>convino</b>: <b>{x}</b> en lugar de la <b>{y}</b> que te habría dado la verdad.",
  "toy.v.bos.worse": "Bajo Boston esta mentira <b class=bad>salió mal</b>: <b>{x}</b> en lugar de la <b>{y}</b> que te habría dado la verdad.",
  "toy.v.bos.same": "Bajo Boston esta mentira no cambió nada: <b>{x}</b> de todos modos.",
  "toy.v.da.better": "Bajo la aceptación diferida le fue mejor que a la verdad, lo cual no puede ocurrir; por favor repórtalo.",
  "toy.v.da.same": "Bajo la aceptación diferida la verdad ya te daba <b>{y}</b>, y esta lista también: mentir no ganó nada.",
  "toy.v.da.worse": "Bajo la aceptación diferida la verdad te habría dado <b>{y}</b>; esta lista te da <b>{x}</b>: mentir te <b class=bad>costó</b>.",

  // ---------------------------------------------------------------- ladder
  "lad.crumb.tag": "dos escaleras de bienestar",
  "lad.h1": "Dos reformas, dos escaleras, y qué puede reclamar cada peldaño",
  "lad.lede": "La ciudad de Nueva York pasó <em>de</em> un sistema no coordinado a la asignación coordinada; Manta pasó de una regla coordinada a otra, cambiando solo el objetivo. Puestas las dos descomposiciones de bienestar en una escala común, las bandas más grandes se parecen, pero no son el mismo objeto. Haz clic en una banda.",
  "lad.selected": "Banda seleccionada", "lad.sel.hint": "Haz clic en una banda",
  "lad.point": "La idea",
  "lad.point.body": "La banda del 45,0% de Nueva York <b>agrupa</b> coordinación, digitalización y actuar sobre las preferencias: ninguna de las tres puede separarse. Manta mantuvo fijas las dos primeras y cambió solo el objetivo, así que su banda del 87,6% es <b>actuar sobre las preferencias, a secas</b>. Mira también las bandas verdes pequeñas: lo que un algoritmo más ingenioso añade entre mecanismos coordinados es el 3,3% del rango en Nueva York y el 0,3% en Manta.",
  "lad.leg.reform": "la banda de la que trata cada contexto", "lad.leg.algo": "refinamientos del algoritmo", "lad.leg.other": "andamiaje que ningún contexto reclama",
  "lad.sources": "Manta: niveles de la Tabla 7 del artículo (regla de distancia −0,104; aceptación diferida 0,583; referencia eficiente restringida 0,586; máximo sin restricciones 0,681 km equivalentes; Inicial 1). Nueva York: redibujado a partir de los totales publicados en Abdulkadiroğlu, Agarwal y Pathak (2017), 18,96 millas de disposición a viajar; su única banda de 3,73 millas de «posibles mejoras del algoritmo» se divide en sus dos componentes impresos para que las columnas comparen lo comparable.",
  "lad.cta": "Leer el argumento paso a paso →",
  "lad.ny.label": "Ciudad de Nueva York (2003–04)", "lad.ma.label": "Manta (2021), Inicial 1",
  "lad.aria": "Dos barras apiladas: descomposiciones de bienestar de Nueva York y Manta en una escala común",
  "lad.src.ny": "Abdulkadiroğlu, Agarwal y Pathak (2017)",
  "lad.ny0.h": "De no elegir a un sistema de elección no coordinado", "lad.ny0.b": "El primer paso de Nueva York: las familias pudieron elegir, pero mediante un proceso no coordinado con múltiples ofertas y cupos sin llenar. 35,3% del rango. Manta no tiene contraparte: ya tenía un sistema coordinado antes de la reforma.",
  "lad.ny1.h": "Coordinar la asignación", "lad.ny1.b": "Una sola ronda coordinada reemplaza al proceso no coordinado: 45,0% del rango. Esta banda agrupa tres cambios a la vez —coordinación, digitalización y actuar sobre las preferencias de las familias— y la evidencia de Nueva York no puede atribuirla a ninguno de ellos.",
  "lad.ny2.h": "Refinamientos del algoritmo entre mecanismos coordinados", "lad.ny2.b": "Lo que añadiría un mecanismo más eficiente que respete las prioridades sobre la aceptación diferida: 3,3% del rango (0,62 millas).",
  "lad.ny3.h": "Más allá de cualquier mecanismo estable", "lad.ny3.b": "La distancia entre el mejor mecanismo estable y el óptimo utilitarista sin restricciones: 16,4% (3,11 millas). Ningún mecanismo que respete las prioridades puede alcanzarlo.",
  "lad.ma1.h": "Actuar sobre las preferencias elicitadas", "lad.ma1.b": "El paso de Manta de la regla de distancia a la aceptación diferida: 87,6% del rango (0,687 km equivalentes por familia). La coordinación y la digitalización se mantuvieron fijas, así que este es el valor de actuar sobre las preferencias, a secas.",
  "lad.ma2.h": "Refinamientos del algoritmo", "lad.ma2.b": "De la aceptación diferida a la referencia eficiente restringida: 0,3% del rango (0,003 km). En el nivel de ingreso el 93% de las familias ya tiene su primera opción; casi no queda nada por intercambiar.",
  "lad.ma3.h": "Más allá de cualquier mecanismo que respete las prioridades", "lad.ma3.b": "De la referencia al máximo cardinal sin restricciones: 12,1% (0,095 km). Alcanzarlo exigiría pasar por encima de las prioridades.",

  // --------------------------------------------------------------- planner
  "pl.crumb.tag": "un juego de adivinanzas",
  "pl.h1": "¿Podría haberlo adivinado un planificador?",
  "pl.lede": "El artículo midió cada escuela de Manta con imágenes satelitales y a nivel de calle —diez atributos, desde la superficie construida hasta las señales de seguridad en la calle— y preguntó si explican lo que las familias quieren. Juega a ser el planificador: para cada escuela real de abajo, lee sus atributos y adivina cuán deseable la encontraron las familias (su <b>banda</b>, 1 = el quinto menos deseable, 5 = el más). Luego compara tu puntaje con un planificador estadístico que usa los diez atributos a la vez.",
  "pl.round": "Ronda",
  "pl.attrs.note": "Las barras muestran cada atributo en relación con las demás escuelas del mercado (centro = promedio; derecha = más/mejor). Valores en bruto a la derecha.",
  "pl.bands.note": "Tu apuesta: banda de deseabilidad, 1 = el quinto de escuelas menos deseable, 5 = el más.",
  "pl.next": "Siguiente escuela →",
  "pl.score": "Tu puntaje", "pl.score.sub": "a una banda o menos de la verdad",
  "pl.summary": "Cómo le fue a cada uno", "pl.th.within": "a 1 banda", "pl.th.exact": "exacto",
  "pl.again": "Jugar de nuevo con otras escuelas",
  "pl.paper": "Lo que encontró el artículo",
  "pl.paper.body": "Dos atributos tienen una señal robusta en todos los niveles: una mayor <b>superficie construida</b> vale para las familias cerca de 0,4 km de viaje adicional; un campus más fragmentado (mayor <b>número de edificios</b>), cerca de 0,3 km menos. Los otros ocho son individualmente imprecisos. Y con los diez en el modelo —más rasgos aprendidos de las fotografías— <b>la mayor parte de la dispersión en la deseabilidad de las escuelas sigue sin explicarse</b>. La deseabilidad es real, grande y en gran medida idiosincrática; ningún conjunto parsimonioso de atributos observables sustituye a preguntarles a las familias. <span class=src>artículo, datos reales</span>",
  "pl.cta": "Ver las imágenes detrás de los atributos →",
  "pl.school": "Escuela {id}", "pl.school.sub": "{canton} · {seats} cupos en Inicial 1",
  "pl.na": "sin codificar", "pl.yes": "sí", "pl.no": "no",
  "pl.raw.count": "{n} edificios", "pl.raw.builtup": "construido",
  "pl.attr.building_footprint_m2": "Superficie construida", "pl.attr.building_count": "Número de edificios", "pl.attr.built_up_density": "Densidad construida",
  "pl.attr.greenery_ndvi_mean": "Vegetación (NDVI)", "pl.attr.open_recreation_space": "Espacio recreativo abierto", "pl.attr.building_condition": "Estado del edificio",
  "pl.attr.sidewalk_quality": "Calidad de la acera", "pl.attr.road_pavement": "Pavimento de la vía", "pl.attr.street_safety_cues": "Señales de seguridad en la calle",
  "pl.attr.visible_commercial_activity": "Actividad comercial cercana",
  "pl.cat.building_condition.fair": "regular", "pl.cat.building_condition.good": "bueno",
  "pl.cat.sidewalk_quality.none": "sin acera", "pl.cat.sidewalk_quality.poor": "mala", "pl.cat.sidewalk_quality.fair": "regular", "pl.cat.sidewalk_quality.good": "buena",
  "pl.cat.road_pavement.unpaved": "sin pavimentar", "pl.cat.road_pavement.partially_paved": "parcialmente pavimentada", "pl.cat.road_pavement.paved": "pavimentada",
  "pl.cat.street_safety_cues.none": "ninguna", "pl.cat.street_safety_cues.minimal": "mínimas", "pl.cat.street_safety_cues.moderate": "moderadas",
  "pl.r.exact": "<b class=good>Exacto.</b>", "pl.r.close": "<b class=good>A una banda</b>: cerca.", "pl.r.miss": "<b class=bad>A {d} bandas.</b>",
  "pl.r.truth": "Las familias pusieron esta escuela en la banda <b>{b}</b>. Un planificador que ajusta los diez atributos habría apostado <b>{p}</b>.",
  "pl.you": "Tú", "pl.planner": "Modelo del planificador (diez atributos)", "pl.chance": "Apostar siempre a la banda del medio",
  "pl.summary.note": "En estas {n} escuelas. Sobre las {N} escuelas del mercado, el modelo del planificador, ajustado dejando una fuera, acierta a una banda o menos en el {w}% (apostar a la banda del medio: {c}%) y explica el {r2}% de la variación de las bandas fuera de muestra. Es el resultado de medición del artículo en miniatura: los atributos son señales reales, y la mayor parte de lo que las familias quieren sigue sin estar en ellos.",
  "pl.src.attrs": "atributos derivados, escuelas reales",
  "land.planner.h": "¿Podría haberlo adivinado un planificador? →",
  "land.planner.p": "Un juego con escuelas reales: a partir de diez atributos medidos con imágenes, adivina cuán deseable encontraron las familias cada escuela, y compara tu puntaje con un planificador estadístico. La mayor parte de la deseabilidad no está en los atributos.",

  // ----------------------------------------------------------------- apply
  "ap.crumb.tag": "postula tú mismo",
  "ap.h1": "Postula a una escuela en Manta",
  "ap.lede": "Pon tu casa en el mapa, mira las escuelas a su alrededor y entrega una lista ordenada. Luego te asignan junto a las familias sintéticas, compitiendo por los mismos cupos reales. Dos reglas corren sobre tu postulación: la regla de distancia que Manta usaba antes de la reforma y la aceptación diferida que adoptó. El argumento entero del artículo, desde donde estás parado.",
  "ap.s1": "¿Dónde vives?",
  "ap.s1.none": "Todavía no hay casa. Haz clic en cualquier punto del mapa, o toma una típica.",
  "ap.s1.random": "Ponme en un lugar típico", "ap.s1.clear": "Empezar de nuevo",
  "ap.s1.note": "Las casas típicas se generan dentro de la grilla de densidad publicada de hogares de postulantes, así que tus vecinos están donde las familias viven de verdad. Nada de lo que haces aquí se guarda ni se envía.",
  "ap.s1.set": "Tu casa está puesta. La escuela más cercana que ofrece {grade} es <b>{s}</b>, a {km} km.",
  "ap.s2": "¿Qué grado?",
  "ap.gradeinfo": "{n} familias · {J} escuelas · {seats} cupos, {ratio} por familia. Mientras más apretado el mercado, más importa la regla.",
  "ap.s3": "Escribe tu lista",
  "ap.s3.mine": "Tu postulación, la mejor primero",
  "ap.s3.empty": "Todavía no listaste nada. Agrega una escuela abajo, o haz clic en una del mapa.",
  "ap.s3.nohome": "Primero pon tu casa en el mapa.",
  "ap.s3.near": "Escuelas cerca de ti", "ap.s3.all": "ver todas", "ap.s3.fewer": "ver menos",
  "ap.s3.submit": "Entregar mi postulación",
  "ap.s3.note": "Te asignarán junto a otras {n} familias que compiten por los mismos cupos.",
  "ap.th.school": "Escuela", "ap.th.km": "km", "ap.th.seats": "cupos",
  "ap.add": "agregar", "ap.up": "subir", "ap.down": "bajar", "ap.remove": "quitar",
  "ap.sib": "Ya tiene un hermano en", "ap.sib.none": "sin hermano", "ap.sibtag": "(hermano)",
  "ap.sib.note": "Los hermanos tienen prioridad sobre todos los demás en esa escuela.",
  "ap.res": "Lo que te ofrecieron",
  "ap.running": "Corriendo {n} sorteos contra todo el mercado…",
  "ap.ord.0": "primera", "ap.ord.1": "segunda", "ap.ord.2": "tercera", "ap.ord.3": "cuarta",
  "ap.ord.4": "quinta", "ap.ord.5": "sexta", "ap.ord.6": "séptima", "ap.ord.7": "octava",
  "ap.unassigned": "ninguna escuela", "ap.unlisted": "una escuela que no listaste", "ap.choice": "tu {o} opción",
  "ap.v.nearest": "Tu primera opción es la escuela de al lado, así que las dos reglas tienen poco en qué diferir. <b>Pon arriba una escuela que de verdad prefieras</b> y entrega otra vez.",
  "ap.v.dawins": "<b class=good>La regla de distancia nunca leyó tu lista.</b> Solo sabe dónde vives, así que te ofreció {dc}. La aceptación diferida leyó esa misma lista y te ofreció {da}. Esa diferencia, en todo un mercado, es lo que mide el artículo.",
  "ap.v.same": "Las dos reglas llegaron al mismo lugar esta vez. Pasa cuando la escuela que más quieres es también la más cercana con cupo libre. Sube una escuela en tu lista, o prueba un grado más congestionado.",
  "ap.v.dcwins": "Este sorteo te salió en contra: la aceptación diferida te ubicó por debajo de la regla de distancia. Un sorteo es un sorteo. Mira los {n} de abajo y córrelo otra vez.",
  "ap.odds.h": "En {n} sorteos independientes",
  "ap.odds.note": "La misma lista, el mismo mercado, otros números de sorteo. Tu riesgo viene de los cupos, no del algoritmo.",
  "ap.lying.now": "Entregaste <b>{sub}</b>. Tu resultado igual se evalúa contra lo que de verdad quieres, <b>{tru}</b>.",
  "ap.next": "Ahora prueba esto",
  "ap.next.again": "Correr el sorteo otra vez", "ap.next.swap": "Cambiar mis dos primeras opciones",
  "ap.next.aware": "Que todas las familias conozcan todas las escuelas", "ap.next.aware.off": "Volver a lo que las familias conocen",
  "ap.n.again": "Números de sorteo nuevos, la misma lista y el mismo mercado.",
  "ap.n.swap": "Obtuviste tu verdadera primera opción en el {b}% de los sorteos, contra el {a}% cuando dijiste la verdad. Y cubrirte no te compró nada: quedaste en alguna escuela que habías listado el {lb}% de las veces, contra el {la}%. Bajo la aceptación diferida una escuela que pones más abajo sigue siendo tuya si puedes entrar, así que nunca hay razón para poner primero una escuela segura. El {toy} muestra por qué con tres familias.",
  "ap.n.swap.need": "Lista al menos dos escuelas primero.", "ap.n.toy": "mercado de juguete", "ap.n.sim": "simulador",
  "ap.n.aware": "Ahora cada familia compara todas las escuelas del mercado en vez de las pocas más cercanas, así que las deseables reciben más postulaciones. Tu probabilidad de primera opción pasó del {a}% al {b}%. El conocimiento es una palanca de política distinta de actuar sobre las preferencias que las familias ya tienen, y el {sim} te deja moverla de forma continua.",
  "ap.n.aware.off": "De vuelta a los conjuntos de consideración estimados: las familias comparan solo sus pocas escuelas más cercanas.",
  "ap.legend": "Referencias", "ap.legend.home": "tu casa", "ap.legend.school": "escuela (tamaño = cupos, color = banda de deseabilidad)",
  "ap.tip.listed": "en tu lista", "ap.tip.add": "haz clic para agregarla a tu lista",
  "ap.footer": "Las familias contra las que compites son sintéticas: generadas con el modelo de demanda estimado en el artículo sobre las escuelas, cupos y cantones reales de Manta, con hogares tomados de una grilla de densidad gruesa. La deseabilidad de cada escuela se muestra solo como banda de quintil, y aquí no se publican nombres de escuelas. Tu propio orden es un orden, no una escala, así que esta página informa cuál de tus opciones te tocó y nunca una cifra de bienestar en kilómetros. La aceptación diferida corre tal como se implementó: tu lista primero, luego las demás escuelas agregadas por distancia, con la prioridad de hermano por encima de las escuelas listadas y estas por encima de las agregadas, y un número de sorteo por postulante y escuela. La regla de distancia asigna por orden de distancia con un número de sorteo por postulante. Mapa base © colaboradores de <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a>.",
  // ---------------------------------------------------------------- survey
  "sv.crumb.tag": "la encuesta",
  "sv.h1": "Lo que dijeron las familias",
  "sv.lede": "Entre postular y recibir la asignación, 1.873 familias (el 47% de los postulantes) respondieron una encuesta sobre cómo habían elegido. Cada cifra de abajo es un agregado de esa encuesta, sin ninguna celda menor de cinco familias. Elige una lente para ver en qué se distinguen las familias que listaron una sola escuela de las que listaron varias, y cómo se comparan los tres grados de entrada.",
  "sv.lens": "Familias", "sv.lens.all": "Todas", "sv.lens.one": "Listaron una escuela", "sv.lens.multi": "Listaron dos o más",
  "sv.grade": "Grado", "sv.grade.all": "Todos", "sv.grade.g2": "Inicial 1", "sv.grade.g3": "Inicial 2", "sv.grade.g4": "Primero de básica",
  "sv.n": "{n} encuestados · {f} completaron el cuestionario",
  "sv.sup": "n<5", "sv.toofew": "Muy pocos encuestados en este grupo para tabular.", "sv.q.verbatim": "La pregunta, textual:",
  "src.survey": "encuesta, datos reales (agregados)", "src.oa": "artículo, apéndice en línea",
  "sv.reasons.h": "¿Por qué no listaron más escuelas?",
  "sv.reason.scarcity": "No hay más escuelas fiscales lo suficientemente cerca", "sv.reason.confident": "Seguros de obtener un cupo en una escuela listada",
  "sv.reason.hard_to_find": "Es muy difícil encontrar más escuelas", "sv.reason.prefer_unassigned": "Conocen las otras y prefieren quedar sin cupo",
  "sv.reason.private": "Se matricularían en una escuela particular", "sv.reason.other": "Otra",
  "sv.reasons.note": "Porcentajes sobre las {b} familias que respondieron; el {blank}% dejó la pregunta en blanco. Solo una respuesta describe una fricción de información: que es difícil encontrar más escuelas.",
  "sv.know.h": "¿Qué tan bien conocen las escuelas?",
  "sv.know.unlisted": "Escuelas fiscales cercanas que no listaron", "sv.know.listed": "Escuelas que listaron",
  "sv.know.well": "la conocen bien", "sv.know.name": "solo de nombre", "sv.know.no": "no la conocen",
  "sv.know.note": "{p} pares escuela–familia calificados para escuelas no listadas ({r} encuestados) y {p2} para escuelas listadas. A cada familia se le mostraron hasta cinco escuelas fiscales cercanas a las que no postuló.",
  "sv.belief.h": "¿Qué tan seguras estaban de obtener un cupo?",
  "sv.belief.note": "Mediana {m}%; el {g} dice 80% o más. Respondieron {b}.",
  "sv.right.h": "¿Tenían razón?",
  "sv.th.stated": "Probabilidad declarada", "sv.th.mean": "Media declarada", "sv.th.placed": "Colocados en una escuela listada", "sv.th.first": "Obtuvieron su primera opción",
  "sv.out.all": "Todos los encuestados emparejados", "sv.out.one": "Listaron exactamente una escuela", "sv.out.conf": "Seguros (90% o más)", "sv.out.confone": "Seguros y listaron una escuela",
  "sv.right.note": "Al vincular la encuesta con la asignación que las familias efectivamente recibieron (99,8% emparejadas): la colocación en una escuela listada superó el 78% en todos los niveles de confianza declarada, y el 72% de quienes listaron una sola escuela la obtuvieron. Fijo entre lentes: todos los encuestados emparejados.",
  "sv.len.h": "¿Cuán largas fueron las listas?",
  "sv.len.note": "Largo medio {m}. El {s} listó una sola escuela.",
  "sv.len.byconstruction": "Esta lente fija el largo de la lista; vuelve a «todas» para ver la distribución.",
  "sv.sat.h": "¿Les gustó el proceso?",
  "sv.sat.note": "Calificación del proceso de asignación en la escala escolar ecuatoriana de 0 a 20, preguntada antes de conocer los resultados. El {t} dio entre 16 y 20.",
  "sv.ext.h": "Cuando las listas sí se alargaron",
  "sv.ext.body": "familias agregaron al menos una escuela a la lista que habían empezado. Preguntadas si tuvieron que buscar más información para convencerse, el {y} de las {b} que respondieron dijo que sí. Buscar cuesta justo en el margen donde las listas se alargan: por eso descubrir opciones es una palanca de política distinta de actuar sobre las preferencias.",
  "sv.ext.allfam": "todas las familias",
  "sv.who.h": "Quiénes respondieron",
  "sv.who.body": "{n} encuestados, el {pct}% de los {A} postulantes del piloto, encuestados después de postular y antes de los resultados. Los encuestados están levemente seleccionados hacia arriba, pero equilibrados donde importa:",
  "sv.th.surveyed": "Encuestados", "sv.th.notsurveyed": "No encuestados",
  "sv.rep.manta_origin": "Origen Manta (%)", "sv.rep.block_nbi": "Privación de la manzana, NBI (%)", "sv.rep.list_length": "Largo de lista (media)", "sv.rep.admission_risk": "Riesgo real de admisión (%)", "sv.rep.placed_listed": "Colocados en una escuela listada (%)",
  "sv.who.note": "Todas las diferencias estandarizadas son de a lo sumo 0,17; equilibrados por grado. Privación de la manzana según el censo de 2022.",
  "sv.read.h": "Qué significa para la comparación de bienestar",
  "sv.read.p1": "Las listas cortas no son un fracaso en encontrar alternativas. La mayoría de las familias con una sola escuela dice que no hay una escuela fiscal aceptable lo suficientemente cerca, o que está segura de un cupo; solo cerca del 6% menciona dificultad para encontrar escuelas. Eso es lo que permite al artículo leer las listas cortas como escasez de opciones cercanas aceptables y no como ignorancia, y tratar la ganancia de bienestar estimada como una cota inferior del valor de actuar sobre las preferencias.",
  "sv.read.p2": "Pero el conocimiento de las escuelas que no listaron es escaso: conocen bien solo el 8% de ellas. El modelo de demanda lee una escuela omitida como menos deseada que cualquiera listada, y algunas omisiones son sin duda cuestión de conocimiento y no de preferencia. El artículo lo dice con claridad; el control de conocimiento del simulador muestra qué pasa con la comparación cuando las familias consideran más o menos escuelas a su alrededor.",
  "sv.read.p3": "Las creencias fueron conservadoras y el proceso fue bien evaluado, lo que es coherente con un sistema que actúa sobre preferencias que las familias ya tenían. No es una medida independiente de la ganancia de bienestar: la encuesta se aplicó solo bajo la aceptación diferida, así que no existe una contraparte con la regla de distancia para comparar.",
  "sv.cta.sim": "Prueba el control de conocimiento →", "sv.cta.story": "Lee el argumento paso a paso →", "sv.cta.toy": "¿Conviene mentir? →",
  // ----------------------------------------------------------- calibration
  "cal.crumb.tag": "calibración",
  "cal.h1": "¿Reproduce el mercado sintético al artículo?",
  "cal.lede": "El simulador y el relato corren sobre una Manta sintética: las escuelas, cantones y cupos reales, y familias generadas con el modelo de demanda estimado en el artículo, porque los hogares y las postulaciones de las familias reales son confidenciales. Esta página pone cada cifra que produce esa población junto a la del artículo, leídas del archivo que escribe el generador. Las filas verdes coinciden; las rojas son las brechas conocidas, explicadas más abajo.",
  "cal.meta": "Configuración del generador: hogares tomados de una grilla de densidad de {cell} m ({cells} celdas, al menos {min} hogares cada una, que cubre el {cov}% de la muestra de estimación); {draws} sorteos, semilla {seed}; bienestar en kilómetros equivalentes.",
  "cal.pooled.h": "Acceso, los tres grados juntos: regla de distancia → asignación por preferencias",
  "cal.th.syn": "sintético", "cal.th.paper": "artículo", "src.syn": "población sintética",
  "cal.m.listed": "Ubicados en una escuela que la familia listó, %", "cal.m.first": "Ubicados en la primera opción, %", "cal.m.km": "Distancia media recorrida, km",
  "cal.pooled.note": "Las filas comparan el cambio de la regla de distancia a la asignación por preferencias; una fila es verde cuando el cambio sintético está a pocos puntos del que reporta el artículo.",
  "cal.grade.h": "Por grado",
  "cal.m.dalisted": "Por preferencias: ubicados en una escuela listada, %", "cal.m.dafirst": "Por preferencias: primera opción, %", "cal.m.dclisted": "Regla de distancia: ubicados en una escuela listada, %",
  "cal.m.rec": "Proporción del rango regla de distancia → referencia recuperada, %", "cal.m.gain": "Ganancia de bienestar sobre la regla de distancia, km equivalentes",
  "cal.m.near": "Ponen primero la escuela más cercana, %", "cal.m.nearkm": "Distancia a la escuela más cercana, km (p10 / mediana / p90)",
  "cal.grade.note": "Los valores del artículo son las estimaciones publicadas para cada grado; un guion significa que el artículo no reporta una cifra directamente comparable. La proporción recuperada de Primero de básica se marca como brecha por construcción: ver abajo.",
  "cal.mech.h": "Los cuatro mecanismos en el mercado sintético (solo sintético)",
  "cal.rule.dc": "Regla de distancia", "cal.rule.da": "Aceptación diferida", "cal.rule.sic": "Referencia eficiente restringida (ciclos de mejora estables)", "cal.rule.ttc": "Ciclos de intercambio (TTC)",
  "cal.th.listed": "listada %", "cal.th.first": "primera opción %", "cal.th.km": "km medios", "cal.th.u": "utilidad, km eq.",
  "cal.mech.note": "Promedios sobre los sorteos. La referencia y los ciclos de intercambio coinciden salvo el ruido del sorteo, como exige la Proposición 2 del artículo.",
  "cal.read.h": "Cómo leer esto",
  "cal.read.p1": "Qué se calibró y qué no. Cada parámetro del modelo es la estimación publicada en el artículo; la deseabilidad de cada escuela es la banda en que la ponen las estimaciones; los hogares se generan dentro de una grilla de densidad de 300 m de los hogares de los postulantes, sin celdas de menos de cinco hogares. Una sola cosa se ajustó: cuántas escuelas cercanas compara una familia antes de escribir su lista, uno más un sorteo de Poisson con media 1,5, unas dos escuelas y media. Sorteando sobre las 55 escuelas, el modelo pondría primero la escuela más cercana solo para cerca del 40% de las familias frente al 65% observado, y ningún reescalamiento de los parámetros de gustos lo corrige sin romper las cifras de bienestar. Los conjuntos de consideración pequeños son, además, lo que la encuesta del artículo dice que las familias realmente conocen.",
  "cal.read.p2": "Qué coincide. El relato de acceso: la proporción ubicada en una escuela listada y en la primera opción bajo cada regla, por grado y en conjunto, y la forma en que ambas caen a medida que el mercado se aprieta desde el nivel de ingreso hasta Primero de básica. Las distancias a la escuela más cercana y la proporción que la pone primero en los dos grados posteriores.",
  "cal.read.p3": "Qué no coincide. Tres brechas son el precio de los conjuntos de consideración pequeños. Las familias que eligen una escuela distinta de la más cercana no se desvían tanto como las reales (unos 0,25 km frente a 0,6), así que la ganancia de bienestar en kilómetros es cerca del 70% de la del artículo; en el nivel de ingreso la proporción que pone primero la más cercana es 58% frente a 65%. Y la «proporción del rango recuperada» de Primero de básica no es comparable en absoluto: en el artículo ese cociente está casi indefinido para el grado congestionado (su intervalo de confianza va de −77% a +36%), mientras que en el mundo sintético, donde las preferencias son completas, está bien definido. El relato de la congestión vive en la proporción en primera opción, que sí coincide.",
  "cal.read.p4": "Por qué importa. Nada en este sitio es evidencia sobre Manta más allá de lo que reporta el artículo; el mercado sintético es un instrumento para ver cómo las conclusiones del artículo dependen de sus ingredientes. Donde una perilla mueve una cifra aquí, las estimaciones del artículo dicen aproximadamente cuánto la movería allá.",
  "cal.cta.dl": "Descarga los datos y el cuaderno →", "cal.cta.sim": "Corre el simulador →",
  // ------------------------------------------------------------- downloads
  "dl.crumb.tag": "descargas",
  "dl.h1": "Descargas y material didáctico",
  "dl.lede": "Todo lo que este sitio ofrece para reutilizar: la Manta sintética en JSON, el motor de asignación como módulo independiente, un cuaderno que reconstruye desde cero las reglas del artículo y las verifica contra el motor, y el propio artículo. Todo es sintético, derivado o agregado; nada identifica a una familia. Por favor cita el artículo al usarlo.",
  "dl.nb.h": "El cuaderno didáctico",
  "dl.nb.p": "Python simple, solo la biblioteca estándar, cerca de un minuto de ejecución. Carga los datos del sitio, escribe la aceptación diferida con propuestas de los postulantes en quince líneas, reproduce la asignación del motor del sitio para cada una de las 1.098 familias del nivel de ingreso bajo ambas reglas, promedia veinte sorteos para recuperar las cifras del simulador y luego cambia el mercado: quita el 30% de los cupos y pregunta cuánto valdría elegir si a las familias solo les importara la distancia. Cuatro ejercicios al final, desde los ciclos de mejora estables hasta correrlo en tu propia ciudad.",
  "dl.nb.colab": "Abrir en Google Colab →", "dl.nb.download": "Descargar el cuaderno (.ipynb)", "dl.nb.github": "Leerlo en GitHub",
  "dl.data.h": "Los datos", "dl.th.file": "archivo", "dl.th.contents": "contenido",
  "dl.f.schools": "Cada escuela del mercado: id anonimizado, coordenadas, cantón y, por grado, los cupos regulares y la banda de deseabilidad (1–5, con el valor esperado de la banda en km equivalentes). Hechos reales salvo la banda, que reemplaza al valor estimado.",
  "dl.f.apps": "Las familias sintéticas, un archivo por grado de ingreso (Inicial 1, Inicial 2, Primero de básica; 1.098 / 885 / 389 familias). Por familia: un hogar sintético, su gusto por la distancia, el largo de su lista, el número de escuelas consideradas, la escuela del hermano, la lista que entregó y su utilidad por cada escuela. Los parámetros publicados del modelo de demanda están en el encabezado del archivo.",
  "dl.f.cells": "La grilla de densidad de 300 m de la que se generan los hogares: centros y conteos de celda, sin celdas de menos de cinco hogares (187 celdas).",
  "dl.f.cal": "Cada momento del mercado sintético junto a su objetivo en el artículo, por grado y en conjunto; se muestra en la <a href=\"../calibration/\">página de calibración</a>.",
  "dl.f.attr": "Los diez atributos derivados de imágenes de cada escuela del mercado, crudos y estandarizados, con su banda y la predicción fuera de muestra del modelo del planificador (el juego del planificador).",
  "dl.f.survey": "Tabulaciones de la encuesta a padres por largo de lista y grado: ningún grupo con menos de veinte encuestados, ningún conteo entre uno y cuatro (el explorador de la encuesta).",
  "dl.f.readme": "Documentación campo por campo", "dl.f.zip": "Todo en un ZIP (el repositorio completo del sitio)",
  "dl.engine.h": "El motor",
  "dl.engine.p": "Las reglas que compara el artículo, como módulo ES sin dependencias que puedes importar desde cualquier página o desde Node: aceptación diferida, regla de distancia, la referencia de ciclos de mejora estables, el constructor del mercado, el reescalador de parámetros y el simulador con semilla. Está validado contra los motores en Python de la investigación con un sorteo por grado, familia por familia; los archivos de validación se publican junto a él.",
  "dl.engine.readme": "Cómo usarlo", "dl.engine.fixtures": "Archivos de validación",
  "dl.paper.h": "El artículo", "dl.cal.link": "Cómo se compara el mercado sintético con él",
  "dl.terms.h": "Condiciones",
  "dl.terms.p": "Estos archivos son materiales derivados y sintéticos de los autores, publicados junto al documento de trabajo para docencia e investigación; cita el artículo al usarlos. Los registros de postulación y las respuestas de la encuesta subyacentes son datos confidenciales del Ministerio de Educación y respuestas individuales; no están aquí y no pueden compartirse. Consultas y solicitudes: <a href=\"mailto:christopher.neilson@yale.edu\">christopher.neilson@yale.edu</a>.",
  // --------------------------------------------------------------- landing
  "land.materials": "Materiales",
  "land.kit.h": "Descargas y material didáctico →",
  "land.kit.p": "La Manta sintética en JSON, el motor como módulo independiente y un cuaderno de Colab que reconstruye las reglas del artículo en quince líneas de Python, las verifica familia por familia contra el motor y termina con ejercicios.",
  "land.cal.h": "¿Reproduce el mercado sintético al artículo? →",
  "land.cal.p": "Cada cifra que produce la población sintética junto a la del artículo: qué coincide, qué no, y por qué; la única perilla calibrada y lo que cuesta.",
  "land.apply.h": "Postula tú mismo a una escuela en Manta →",
  "land.apply.p": "Pon tu casa en el mapa, ordena las escuelas a tu alrededor y entrega la lista. Compites por los mismos cupos que las familias sintéticas y ves qué te da cada regla, cuánto cambia el sorteo y por qué mentir no conviene.",
  "land.survey.h": "Lo que dijeron las familias →",
  "land.survey.p": "La encuesta a padres previa a los resultados, en agregados que puedes filtrar: por qué las listas fueron cortas, qué tan bien conocían las escuelas que no listaron, cuán seguras estaban y si tenían razón. Sin microdatos.",
  "land.badge": "Documento de trabajo · materiales en línea",
  "land.tagline": "Ganancias de bienestar por actuar sobre las preferencias de las familias en Ecuador",
  "land.keywords": "Palabras clave: diseño de mecanismos; asignación centralizada de estudiantes; elección escolar; Ecuador",
  "land.abstract": "Estudiamos una reforma de 2021 en Manta, Ecuador, que reemplazó una regla centralizada de asignación por otra: una regla que minimizaba la distancia entre el hogar y la escuela dio paso a la aceptación diferida aplicada a las preferencias ordenadas que declaran las familias, que las propiedades de incentivos del mecanismo no les dan razón para tergiversar. Como un mismo algoritmo coordinado despejó el mercado antes y después, lo que cambió principalmente fue el objetivo, lo que aísla el valor de actuar sobre las preferencias manteniendo fija la coordinación: el contrafactual para los muchos sistemas que asignan por proximidad. Una regla de distancia parece casi óptima —la mayoría de las familias pone primero a su escuela más cercana—, pero más de una cuarta parte no lo hace. Actuar sobre sus preferencias eleva la proporción de postulantes asignados a una escuela de su lista del 50% al 78%, y a su primera opción del 42% al 70%, a un costo de 0,32 km de viaje adicional. Estimando las preferencias a partir de las listas presentadas, encontramos que la aceptación diferida cierra cerca del 99,6% de la distancia entre la regla de distancia y la referencia eficiente restringida en el nivel de ingreso, mientras que otros mecanismos que mejoran la eficiencia casi no añaden nada: allí, las ganancias provienen de elicitar las preferencias, no de la elección del algoritmo. Además son progresivas, y hacen eco de la evidencia del paso de la ciudad de Nueva York a la asignación coordinada en un contexto muy distinto. <span class=\"tiny\">(Traducción no oficial; el artículo está en inglés.)</span>",
  "land.paper": "Artículo",
  "land.pdf": "PDF", "land.bib": "BibTeX", "land.code": "Código y datos — a pedido",
  "land.data.note": "El paquete de replicación (código de cada estimación, simulación, tabla y figura) se depositará en la revista al momento de la aceptación y está disponible para editores y árbitros a pedido. Los microdatos de postulación son registros confidenciales del Ministerio de Educación y no pueden redistribuirse; los autores facilitarán las solicitudes al Ministerio.",
  "land.cite": "Citar",
  "land.interactive": "Interactivo",
  "land.story.h": "Por qué importa elegir →",
  "land.story.p": "El argumento paso a paso, con un modelo en vivo que se reasigna a medida que lees: la mayoría quiere la escuela de al lado, una cuarta parte no, qué hace cada regla con eso, por qué el algoritmo importa poco y los cupos mucho.",
  "land.sim.h": "Elige la regla →",
  "land.sim.p": "Corre tú mismo la regla de distancia, la aceptación diferida y la referencia eficiente restringida sobre una Manta sintética: mapa de escuelas y familias, cupos y perillas de gustos, y una ficha por familia.",
  "land.toy.h": "¿Conviene mentir? →",
  "land.toy.p": "Tres familias, tres escuelas, un cupo cada una. Entrega una lista bajo el mecanismo de Boston y bajo la aceptación diferida y observa cuándo conviene tergiversar, y por qué, bajo la regla que adoptó Manta, nunca puede convenir.",
  "land.ladder.h": "Dos escaleras de bienestar →",
  "land.ladder.p": "La figura central del artículo, en vivo: el paso de Nueva York a la asignación coordinada junto al paso de Manta de una regla de distancia a las preferencias, en una escala común; haz clic en cada banda para ver qué puede y qué no puede atribuir.",
  "land.appendices": "Apéndices en línea",
  "land.appendix.h": "Imágenes de escuelas e incrustaciones →",
  "land.appendix.p": "Una mirada interactiva al conjunto de imágenes de escuelas: galerías por tipo de imagen con interpretación y un mapa de incrustaciones CLIP que puedes recolorear por atributo y explorar por vecino más cercano. Muestra cómo se usan las imágenes para medir características observables de las escuelas en el modelo de demanda, y qué no explican.",
  "land.updated": "Última actualización",
  "land.footer": "Las imágenes del apéndice tienen licencia abierta (Mapillary CC-BY-SA 4.0; Copernicus Sentinel-2) o son fotografías propias del proyecto con rostros difuminados; no se redistribuyen teselas propietarias de Street View ni satelitales. Consulta el apéndice para las notas completas de fuentes y licencias.",
  "sim.tip.seats": "cupos", "sim.tip.placed": "asignados", "sim.tip.band": "banda de deseabilidad",
};

const KEY = "voc.lang";
let lang = "en";

function detect() {
  const q = new URLSearchParams(location.search).get("lang");
  if (q === "es" || q === "en") return q;
  try { const s = localStorage.getItem(KEY); if (s === "es" || s === "en") return s; } catch (e) { /* storage may be unavailable */ }
  return (navigator.language || "").toLowerCase().startsWith("es") ? "es" : "en";
}

export function getLang() { return lang; }

export function t(key, en, vars) {
  let s = lang === "es" ? (ES[key] ?? en) : en;
  if (vars) for (const k in vars) s = s.split(`{${k}}`).join(String(vars[k]));
  return s;
}

export function nf(x, d = 0) {
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString(lang === "es" ? "es-EC" : "en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function applyStatic(root = document) {
  for (const el of root.querySelectorAll("[data-i18n]")) {
    if (el.dataset.i18nEn === undefined) el.dataset.i18nEn = el.innerHTML;
    const k = el.dataset.i18n;
    el.innerHTML = lang === "es" ? (ES[k] ?? el.dataset.i18nEn) : el.dataset.i18nEn;
  }
  document.documentElement.lang = lang;
  for (const b of document.querySelectorAll("[data-lang]")) b.classList.toggle("on", b.dataset.lang === lang);
}

export function setLang(l) {
  if (l !== "es" && l !== "en") return;
  lang = l;
  try { localStorage.setItem(KEY, l); } catch (e) { /* ignore */ }
  const url = new URL(location.href); url.searchParams.set("lang", l); history.replaceState(null, "", url);
  applyStatic();
  window.dispatchEvent(new CustomEvent("langchange", { detail: { lang: l } }));
}

// Renders "EN | ES" into `container` (an element or selector) and wires it.
export function mountToggle(container) {
  const host = typeof container === "string" ? document.querySelector(container) : container;
  if (!host) return;
  host.innerHTML = `<span class="langtoggle" role="group" aria-label="Language">` +
    `<button type="button" data-lang="en" lang="en">EN</button><button type="button" data-lang="es" lang="es">ES</button></span>`;
  host.querySelectorAll("[data-lang]").forEach(b => b.addEventListener("click", () => setLang(b.dataset.lang)));
  applyStatic();
}

// Initialise: language from URL / storage / browser; keep ?lang= links working across pages.
lang = detect();
export function init() {
  applyStatic();
  // propagate the language to same-site links so navigation keeps it
  if (lang === "es") for (const a of document.querySelectorAll("a[href]")) {
    const h = a.getAttribute("href");
    if (/^(https?:)?\/\//.test(h) || h.startsWith("#") || h.startsWith("mailto:") || /\.(pdf|bib)$/i.test(h)) continue;
    const u = new URL(h, location.href); if (u.origin !== location.origin) continue;
    u.searchParams.set("lang", "es"); a.setAttribute("href", u.pathname + u.search + u.hash);
  }
}
