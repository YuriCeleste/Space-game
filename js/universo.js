/* =====================================================================
   universo.js — monta o GRAFO DO UNIVERSO (vértices = corpos, arestas = rotas)
   Os corpos são fixos; posições e quantidade de conexões variam a cada partida.
   O custo de combustível de cada rota vem da distância entre os corpos.
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

function criarUniverso(L = 800, A = 500) {
  const g = new Grafo(), margem = 45, distanciaMinima = 70;
  const posicionados = [];
  for (const corpo of CORPOS) {
    let ponto = null;
    for (let tentativa = 0; tentativa < 1000 && !ponto; tentativa++) {
      const candidato = {
        x: margem + Math.random() * (L - 2 * margem),
        y: margem + Math.random() * (A - 2 * margem),
      };
      if (posicionados.every(p => Math.hypot(p.x - candidato.x, p.y - candidato.y) >= distanciaMinima))
        ponto = candidato;
    }
    if (!ponto) throw new Error('Não foi possível posicionar os corpos sem sobreposição.');
    posicionados.push(ponto);
    g.addVertice(corpo.id, { ...corpo, ...ponto });
  }

  const corpos = [...g.vertices.values()];
  const chavePar = (a, b) => [a, b].sort().join('|');
  const paresPorChave = new Map(), pares = [];
  for (let i = 0; i < corpos.length; i++) {
    for (let j = i + 1; j < corpos.length; j++) {
      const a = corpos[i], b = corpos[j];
      const par = {
        a,
        b,
        distancia: Math.hypot(a.x - b.x, a.y - b.y),
      };
      pares.push(par);
      paresPorChave.set(chavePar(a.id, b.id), par);
    }
  }
  pares.sort((a, b) => a.distancia - b.distancia || a.a.id.localeCompare(b.a.id) || a.b.id.localeCompare(b.b.id));

  const selecionados = [];
  const chavesSelecionadas = new Set();
  const graus = new Map(corpos.map(c => [c.id, 0]));
  const alvos = new Map(corpos.map(c => [c.id, 2 + Math.floor(Math.random() * 3)]));
  const adicionarPar = par => {
    const chave = chavePar(par.a.id, par.b.id);
    if (chavesSelecionadas.has(chave)) return;
    selecionados.push(par);
    chavesSelecionadas.add(chave);
    graus.set(par.a.id, graus.get(par.a.id) + 1);
    graus.set(par.b.id, graus.get(par.b.id) + 1);
  };

  // Forma um caminho usando o vizinho mais próximo ainda não visitado.
  const ordem = [corpos[Math.floor(Math.random() * corpos.length)]];
  const restantes = new Set(corpos.filter(c => c.id !== ordem[0].id));
  while (restantes.size) {
    const atual = ordem[ordem.length - 1];
    const proximo = [...restantes].sort((a, b) =>
      Math.hypot(atual.x - a.x, atual.y - a.y) - Math.hypot(atual.x - b.x, atual.y - b.y))[0];
    adicionarPar(paresPorChave.get(chavePar(atual.id, proximo.id)));
    ordem.push(proximo);
    restantes.delete(proximo);
  }
  const chavesCaminho = new Set(ordem.slice(1).map((corpo, i) =>
    chavePar(ordem[i].id, corpo.id)));

  // Os extremos do caminho também precisam de pelo menos duas conexões.
  for (const extremo of [ordem[0], ordem[ordem.length - 1]]) {
    if (graus.get(extremo.id) >= 2) continue;
    const par = pares.find(p =>
      (p.a.id === extremo.id || p.b.id === extremo.id) &&
      !chavesSelecionadas.has(chavePar(p.a.id, p.b.id)) &&
      graus.get(p.a.id === extremo.id ? p.b.id : p.a.id) < 4);
    if (!par) throw new Error('Não foi possível conectar todos os corpos.');
    const vizinho = par.a.id === extremo.id ? par.b : par.a;
    adicionarPar(par);
    alvos.set(vizinho.id, Math.max(alvos.get(vizinho.id), graus.get(vizinho.id)));
  }

  for (const par of pares) {
    if (graus.get(par.a.id) < alvos.get(par.a.id) && graus.get(par.b.id) < alvos.get(par.b.id))
      adicionarPar(par);
  }

  selecionados.sort((a, b) => a.distancia - b.distancia);
  const indiceTunel = selecionados.findIndex(par =>
    !chavesCaminho.has(chavePar(par.a.id, par.b.id)));
  const quantidadeRiscoZero = Math.round(selecionados.length * 7 / 19);
  const quantidadeRiscoDois = Math.round(selecionados.length * 3 / 19);
  selecionados.forEach((par, i) => {
    const risco = i < quantidadeRiscoZero ? 0
      : i >= selecionados.length - quantidadeRiscoDois ? 2 : 1;
    const dirigida = i === indiceTunel;
    const combustivel = Math.max(4, Math.round(par.distancia / 16));
    g.addAresta(par.a.id, par.b.id, { combustivel, risco }, dirigida);
  });
  return g;
}
