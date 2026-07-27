// Mapea el nombre de un alimento a un emoji representativo.
// Se revisa primero coincidencia exacta, luego palabras clave contenidas
// en el nombre (para que "leche descremada" también encuentre 🥛).

const EXACT: Record<string, string> = {
  leche: '🥛', yogur: '🥣', yogurt: '🥣', queso: '🧀', mantequilla: '🧈',
  huevo: '🥚', huevos: '🥚',
  carne: '🥩', res: '🥩', cerdo: '🥩', chuleta: '🥓', tocino: '🥓',
  pollo: '🍗', pavo: '🍗',
  pescado: '🐟', atun: '🐟', salmon: '🐟', camaron: '🦐', mariscos: '🦐',
  papa: '🥔', papas: '🥔', patata: '🥔',
  tomate: '🍅', cebolla: '🧅', ajo: '🧄', zanahoria: '🥕',
  brocoli: '🥦', coliflor: '🥦', lechuga: '🥬', espinaca: '🥬', acelga: '🥬', col: '🥬',
  pepino: '🥒', pimiento: '🫑', choclo: '🌽', maiz: '🌽', elote: '🌽',
  aguacate: '🥑', palta: '🥑',
  manzana: '🍎', pera: '🍐', platano: '🍌', banano: '🍌', banana: '🍌',
  uva: '🍇', uvas: '🍇', fresa: '🍓', fresas: '🍓', sandia: '🍉', melon: '🍈',
  naranja: '🍊', mandarina: '🍊', limon: '🍋', piña: '🍍', durazno: '🍑', mango: '🥭',
  pan: '🍞', tostada: '🍞', arroz: '🍚', fideo: '🍝', fideos: '🍝', pasta: '🍝', espagueti: '🍝',
  harina: '🌾', avena: '🌾', cereal: '🥣',
  frejol: '🫘', frijol: '🫘', frijoles: '🫘', lenteja: '🫘', lentejas: '🫘', garbanzo: '🫘',
  aceite: '🫒', vinagre: '🫙',
  azucar: '🍬', sal: '🧂', miel: '🍯',
  cafe: '☕', te: '🍵',
  agua: '💧', jugo: '🧃', gaseosa: '🥤', refresco: '🥤', cerveza: '🍺', vino: '🍷',
  chocolate: '🍫', galleta: '🍪', galletas: '🍪',
  atun_enlatado: '🥫', enlatado: '🥫', conserva: '🥫', sardina: '🥫',
}

const KEYWORD_ORDER: [string, string][] = Object.entries(EXACT).sort(
  (a, b) => b[0].length - a[0].length
)

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita tildes
    .trim()
}

export function getFoodEmoji(foodName: string): string {
  const normalized = normalize(foodName)
  if (EXACT[normalized]) return EXACT[normalized]

  for (const [keyword, emoji] of KEYWORD_ORDER) {
    if (normalized.includes(keyword)) return emoji
  }
  return '🥫' // alimento genérico, sin match
}
