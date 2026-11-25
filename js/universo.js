/* =====================================================================
   universo.js — monta o GRAFO DO UNIVERSO (vértices = corpos, arestas = rotas)
   Corpos e rotas são fixos (as missões sempre existem); só as POSIÇÕES no mapa
   são sorteadas a cada partida. O custo de combustível de cada rota vem da
   distância entre os corpos; o risco é definido à mão em ROTAS.
   ===================================================================== */
const CORPOS = [
  { id: 'terra', nome: 'Terra', tipo: 'planeta', emoji: '🌍', riqueza: 4, gravidade: '1,0 g', recursos: 'água, oxigênio' },
  { id: 'lua', nome: 'Lua', tipo: 'planeta', emoji: '🌕', riqueza: 3, gravidade: '0,16 g', recursos: 'hélio-3, rochas' },
  { id: 'marte', nome: 'Marte', tipo: 'planeta', emoji: '🔴', riqueza: 4, gravidade: '0,38 g', recursos: 'ferro, gelo' },
  { id: 'venus', nome: 'Vênus', tipo: 'planeta', emoji: '🟠', riqueza: 3, gravidade: '0,9 g', recursos: 'enxofre' },
  { id: 'jupiter', nome: 'Júpiter', tipo: 'planeta', emoji: '🪐', riqueza: 5, gravidade: '2,5 g', recursos: 'hidrogênio' },
  { id: 'sol', nome: 'Sol', tipo: 'estrela', emoji: '☀️', riqueza: 5, gravidade: '28 g', recursos: 'energia solar', perigo: { tipo: 'tempestade', nivel: 1 } },
  { id: 'sirius', nome: 'Sirius', tipo: 'estrela', emoji: '✨', riqueza: 4, gravidade: '12 g', recursos: 'energia' },
  { id: 'halley', nome: 'Cometa Halley', tipo: 'cometa', emoji: '☄️', riqueza: 2, gravidade: '0,001 g', recursos: 'gelo, carbono', perigo: { tipo: 'piratas', nivel: 2 } },
  { id: 'orion', nome: 'Estação Órion', tipo: 'estacao', emoji: '🛰️', riqueza: 2, gravidade: '0 g', recursos: 'combustível, peças' },
  { id: 'vega', nome: 'Estação Vega', tipo: 'estacao', emoji: '📡', riqueza: 2, gravidade: '0 g', recursos: 'combustível, abrigo' },
  { id: 'esmeralda', nome: 'Nebulosa Esmeralda', tipo: 'nebulosa', emoji: '🌫️', riqueza: 5, gravidade: '0 g', recursos: 'gás ionizado' },
  { id: 'negro', nome: 'Buraco Negro', tipo: 'buraco negro', emoji: '🕳️', riqueza: 5, gravidade: '∞', recursos: 'nenhum', perigo: { tipo: 'buraco', nivel: 99 } },
  { id: 'kepler', nome: 'Kepler-22b', tipo: 'planeta', emoji: '🌐', riqueza: 4, gravidade: '2,4 g', recursos: 'água' },
  { id: 'exilio', nome: 'Estação Exílio', tipo: 'estacao', emoji: '🛰️', riqueza: 1, gravidade: '0 g', recursos: 'combustível' },
];

// [origem, destino, risco, dirigida?]  — Kepler/Exílio formam uma região isolada
const ROTAS = [
  ['terra', 'lua', 0], ['terra', 'marte', 0], ['terra', 'venus', 1], ['terra', 'orion', 0],
  ['lua', 'orion', 0], ['marte', 'jupiter', 1], ['marte', 'halley', 1], ['venus', 'sol', 2],
  ['orion', 'esmeralda', 2], ['orion', 'sirius', 1], ['sirius', 'esmeralda', 0], ['halley', 'esmeralda', 1],
  ['jupiter', 'vega', 0], ['sirius', 'vega', 1], ['halley', 'negro', 1], ['sol', 'negro', 1],
  ['jupiter', 'negro', 2], ['venus', 'sirius', 1, true], // túnel de salto: só vai de Vênus a Sirius
  ['kepler', 'exilio', 0],
];

function criarUniverso(L = 800, A = 500) {
  // Sorteia uma célula de uma grade 5x3 para cada corpo (evita sobreposição) + um pequeno desvio
  const celulas = [];
  for (let c = 0; c < 5; c++) for (let r = 0; r < 3; r++) celulas.push([c, r]);
  celulas.sort(() => Math.random() - 0.5);
  const g = new Grafo(), cw = L / 5, ch = A / 3;
  CORPOS.forEach((c, i) => {
    const [col, lin] = celulas[i];
    g.addVertice(c.id, {
      ...c,
      x: col * cw + cw / 2 + (Math.random() - 0.5) * 50,
      y: lin * ch + ch / 2 + (Math.random() - 0.5) * 50,
    });
  });
  for (const [a, b, risco, dir] of ROTAS) {
    const A_ = g.vertices.get(a), B_ = g.vertices.get(b);
    const combustivel = Math.max(4, Math.round(Math.hypot(A_.x - B_.x, A_.y - B_.y) / 16));
    g.addAresta(a, b, { combustivel, risco }, !!dir);
  }
  return g;
}
