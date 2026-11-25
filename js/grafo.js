/* =====================================================================
   grafo.js — ESTRUTURA DE DADOS: Grafo com lista de adjacência (à mão)
   Requisito: "corpos celestes = vértices; rotas = arestas com peso,
   direcionadas (túneis de salto) ou não direcionadas (rota comum)".
   Usado em: universo.js (construção), algoritmos.js (todos os algoritmos),
             jogo.js (movimento da nave e colapso do setor).
   ===================================================================== */
class Grafo {
  constructor() {
    this.vertices = new Map(); // id -> dados do corpo celeste
    this.adj = new Map();      // id -> Map(idVizinho -> aresta)  (lista de adjacência)
    this.arestas = [];         // lista simples, útil para desenhar e varrer
  }

  addVertice(id, dados = {}) {
    this.vertices.set(id, { id, ...dados });
    this.adj.set(id, new Map());
  }

  // dados = { combustivel, risco, ... } (pesos). dirigida=true => só vai de a para b
  addAresta(a, b, dados = {}, dirigida = false) {
    const e = { a, b, dirigida, ...dados };
    this.arestas.push(e);
    this.adj.get(a).set(b, e);
    if (!dirigida) this.adj.get(b).set(a, e);
    return e;
  }

  // Vizinhos para onde SE PODE IR a partir de v (respeita a direção)
  vizinhos(v) {
    if (!this.adj.has(v)) return [];
    return [...this.adj.get(v)].map(([to, e]) => ({ to, e }));
  }

  // Vizinhos ignorando a direção (usado em componentes conexos, ciclos e BFS)
  vizinhosFracos(v) {
    const s = new Set();
    for (const e of this.arestas) {
      if (e.a === v) s.add(e.b);
      else if (e.b === v) s.add(e.a);
    }
    return [...s];
  }

  // Remove o vértice e todas as arestas ligadas a ele (missão "Setor Colapsando")
  removerVertice(id) {
    this.vertices.delete(id);
    this.adj.delete(id);
    for (const m of this.adj.values()) m.delete(id);
    this.arestas = this.arestas.filter(e => e.a !== id && e.b !== id);
  }
}
