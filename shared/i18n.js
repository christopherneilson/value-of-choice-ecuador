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

  // --------------------------------------------------------------- landing
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
