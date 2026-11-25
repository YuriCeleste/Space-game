/* =====================================================================
   algoritmos.js — ALGORITMOS DE GRAFOS (todos implementados à mão)

   Algoritmo                      | Requisito atendido            | Usado em (jogo.js)
   -------------------------------|-------------------------------|-----------------------------
   FilaPrioridade (min-heap)      | base do Dijkstra              | dijkstra()
   dijkstra + reconstruirCaminho  | Menor caminho com restrições  | Missão 1 (ida: risco; volta:
                                  | (combustível / mais seguro)   | combustível) e Missão 3 (fuga)
   componentesConexos (BFS)       | Identificar regiões conectadas| botão "regiões navegáveis"
   bfsDistancias (BFS)            | ordem do colapso              | Missão 3 (timer do buraco negro)
   encontrarCiclos (DFS)          | Ciclos e rotas comerciais     | botão "ciclos / rotas"
   tsp (força bruta com poda)     | Caixeiro viajante simplificado| Missão 2 (Correio Intergaláctico)
   ===================================================================== */

// Funções de peso: o MESMO Dijkstra serve para "mais curto" e "mais seguro".
// Arestas que levam ao buraco negro têm peso Infinity => nunca entram numa rota.
const letal = (g, v) => g.vertices.get(v)?.perigo?.tipo === 'buraco';
const PESOS = {
  combustivel: g => (a, b, e) => letal(g, b) ? Infinity : e.combustivel,
  risco: g => (a, b, e) => letal(g, b) ? Infinity
    : e.risco + (g.vertices.get(b).perigo?.nivel || 0) + e.combustivel / 1000, // desempate
};

/* ---- Fila de prioridade: min-heap em array ---- */
class FilaPrioridade {
  constructor() { this.h = []; }
  vazia() { return this.h.length === 0; }
  push(v, p) {
    const h = this.h; h.push({ v, p });
    let i = h.length - 1;
    while (i > 0) {                       // "sobe" enquanto for menor que o pai
      const pai = (i - 1) >> 1;
      if (h[pai].p <= h[i].p) break;
      [h[pai], h[i]] = [h[i], h[pai]]; i = pai;
    }
  }
  pop() {
    const h = this.h, topo = h[0], ult = h.pop();
    if (h.length) {
      h[0] = ult; let i = 0;
      for (;;) {                          // "desce" trocando com o menor filho
        let m = i; const l = 2 * i + 1, r = l + 1;
        if (l < h.length && h[l].p < h[m].p) m = l;
        if (r < h.length && h[r].p < h[m].p) m = r;
        if (m === i) break;
        [h[m], h[i]] = [h[i], h[m]]; i = m;
      }
    }
    return topo;
  }
}

/* ---- Dijkstra: menor custo de `origem` para todos os vértices ---- */
function dijkstra(g, origem, peso) {
  const dist = new Map(), prev = new Map(), fila = new FilaPrioridade();
  for (const id of g.vertices.keys()) dist.set(id, Infinity);
  dist.set(origem, 0); fila.push(origem, 0);
  while (!fila.vazia()) {
    const { v, p } = fila.pop();
    if (p > dist.get(v)) continue;        // entrada velha da fila
    for (const { to, e } of g.vizinhos(v)) {
      const nd = p + peso(v, to, e);
      if (nd < dist.get(to)) { dist.set(to, nd); prev.set(to, v); fila.push(to, nd); }
    }
  }
  return { dist, prev };
}

// Volta pelos "prev" para montar [origem, ..., destino]; null se inalcançável
function reconstruirCaminho(prev, origem, destino) {
  const c = [destino];
  while (c[0] !== origem) {
    if (!prev.has(c[0])) return null;
    c.unshift(prev.get(c[0]));
  }
  return c;
}

/* ---- BFS: distância (em saltos) de `origem` ignorando direção ---- */
function bfsDistancias(g, origem) {
  const dist = new Map([[origem, 0]]), fila = [origem];
  while (fila.length) {
    const v = fila.shift();
    for (const w of g.vizinhosFracos(v))
      if (!dist.has(w)) { dist.set(w, dist.get(v) + 1); fila.push(w); }
  }
  return dist;
}

/* ---- Componentes conexos: repete BFS em cada vértice ainda não visitado ---- */
function componentesConexos(g) {
  const vis = new Set(), comps = [];
  for (const id of g.vertices.keys()) {
    if (vis.has(id)) continue;
    const comp = [...bfsDistancias(g, id).keys()];
    comp.forEach(v => vis.add(v));
    comps.push(comp);
  }
  return comps;
}

/* ---- Ciclos por DFS: aresta para um vértice que ainda está na pilha = ciclo ---- */
function encontrarCiclos(g, limite = 8) {
  const vis = new Set(), pilha = [], ciclos = [];
  const dfs = (v, pai) => {
    vis.add(v); pilha.push(v);
    for (const w of g.vizinhosFracos(v)) {
      if (w === pai) continue;
      if (pilha.includes(w)) ciclos.push(pilha.slice(pilha.indexOf(w)));
      else if (!vis.has(w)) dfs(w, v);
    }
    pilha.pop();
  };
  for (const id of g.vertices.keys()) if (!vis.has(id)) dfs(id, null);
  return ciclos.slice(0, limite);
}

/* ---- TSP simplificado: testa todas as ordens de visita (com poda) ----
   O custo entre dois corpos é o menor caminho (Dijkstra), pois nem todo par é vizinho.
   `fim` = vértice onde a viagem termina (ex.: voltar à Terra); null = termina no último alvo. */
function tsp(g, origem, alvos, fim = null) {
  const d = {};
  for (const p of [origem, ...alvos]) d[p] = dijkstra(g, p, PESOS.combustivel(g));
  let melhor = { custo: Infinity, ordem: null };
  const permutar = (resto, atual, custo, ordem) => {
    if (custo >= melhor.custo) return;    // poda: já está pior que a melhor ordem
    if (!resto.length) {
      const total = custo + (fim ? d[atual].dist.get(fim) : 0);
      if (total < melhor.custo) melhor = { custo: total, ordem };
      return;
    }
    resto.forEach((r, i) =>
      permutar(resto.filter((_, j) => j !== i), r, custo + d[atual].dist.get(r), [...ordem, r]));
  };
  permutar(alvos, origem, 0, []);
  if (!melhor.ordem) return null;
  const rota = [origem]; let at = origem;
  for (const s of [...melhor.ordem, ...(fim ? [fim] : [])]) {
    rota.push(...reconstruirCaminho(d[at].prev, at, s).slice(1)); at = s;
  }
  return { custo: melhor.custo, rota, ordem: melhor.ordem };
}
