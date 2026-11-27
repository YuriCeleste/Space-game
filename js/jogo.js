/* =====================================================================
   jogo.js — telas, nave, missões e desenho do mapa (SVG).
   ===================================================================== */
const NAVES = [
  { id: 'A', nome: 'nave a', emoji: '🛸', c: 3, k: 3, v: 3 },
  { id: 'B', nome: 'nave b', emoji: '🚀', c: 2, k: 2, v: 5 },
  { id: 'C', nome: 'nave c', emoji: '🛩️', c: 5, k: 5, v: 2 },
]; // c = combustível, k = carga, v = velocidade (níveis 1 a 5)

const MISSOES = [
  { id: 1, titulo: 'Viagem à Nebulosa Esmeralda', desc: 'Vá pela rota mais segura, colete os dados da nebulosa e volte à Terra pela rota mais curta.', inicio: 'terra' },
  { id: 2, titulo: 'Correio Intergaláctico', desc: 'Entregue cargas na Lua, Marte, Vênus e Júpiter e volte à Terra gastando o mínimo.', inicio: 'terra', alvos: ['lua', 'marte', 'venus', 'jupiter'] },
  { id: 3, titulo: 'Setor Colapsando', desc: 'Um buraco negro devora o setor. Chegue à Estação Vega antes que as rotas sumam.', inicio: 'lua', destino: 'vega' },
];

const E = { concluidas: {}, historicoTelas: [] }; 
const $ = s => document.querySelector(s);

/* ---------- NAVEGAÇÃO ---------- */
function mostrar(tela, salvar = true) {
  const telaAtiva = document.querySelector('.tela.ativa');
  if (salvar && telaAtiva && telaAtiva.id !== tela) {
    E.historicoTelas.push(telaAtiva.id);
  }
  document.querySelectorAll('.tela').forEach(s => s.classList.toggle('ativa', s.id === tela));
}

function voltar() {
  if (E.historicoTelas.length > 0) {
    const anterior = E.historicoTelas.pop();
    mostrar(anterior, false);
  } else {
    // Se não tiver histórico, vai para o início e limpa a pilha
    E.historicoTelas = [];
    mostrar('tela-inicio', false);
  }
}

const combMax = () => 40 + 25 * E.nave.c;
const cargaMax = () => 2 * E.nave.k;
const custo = e => Math.ceil(e.combustivel * E.nave.fator);
const nome = id => E.base[id].nome;
const msg = t => { E.msgs.push(t); };
const rnd = (a, b) => Math.round(a + Math.random() * (b - a));
const sorteia = l => l[rnd(0, l.length - 1)];

/* ---------- menus ---------- */
function montarMenu() {
  $('#lista-missoes').innerHTML = MISSOES.map(m => `<div class="card"><h3>missão ${m.id}</h3>
    <div class="texto"><b>${m.titulo}</b><br><br>${m.desc}</div>
    <div>concluído: ${E.concluidas[m.id] ? 'sim' : 'não'} <button class="btn" data-missao="${m.id}">ir</button></div></div>`).join('');
  $('#lista-naves').innerHTML = NAVES.map(n => `<div class="card" data-nave="${n.id}">
    <div class="icone">${n.emoji}</div><h3>${n.nome}</h3>
    ${[['combustível', 'c'], ['carga', 'k'], ['velocidade', 'v']].map(([r, k]) =>
      `<div>${r} <span class="pontos">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= n[k] ? 'on' : ''}"></i>`).join('')}</span></div>`).join('')}
    <button class="btn" data-sel="${n.id}">selecionar</button></div>`).join('');
  $('#btn-comecar').disabled = true; E.nave = null;
}

/* ---------- partida ---------- */
function iniciarJogo() {
  clearInterval(E.timer);
  const g = criarUniverso();
  Object.assign(E, {
    g, base: Object.fromEntries(g.vertices), todasArestas: [...g.arestas], pos: E.missao.inicio,
    carga: cargaMax(), dados: new Map(), destaque: null, viajando: false, fim: false,
    fase: 0, entregues: new Set(), msgs: [], navePos: null, cicloIdx: 0,
  });
  E.combustivel = E.missao.id === 3 ? Math.round(combMax() * 0.6) : combMax();
  coletar(E.pos);
  msg('Missão iniciada. Clique num corpo ligado por linha pontilhada.');
  if (E.missao.id === 3) iniciarColapso();
  $('#titulo-missao').textContent = 'missão: ' + E.missao.titulo;
  $('#fim').classList.add('oculto');
  mostrar('tela-jogo'); desenhar(); atualizarPaineis();
}

function coletar(id) {
  if (E.dados.has(id)) return;
  E.dados.set(id, {
    campo: rnd(10, 900) + ' µT',
    atmosfera: sorteia(['inexistente', 'tênue', 'densa', 'tóxica', 'respirável']),
    minerais: sorteia(['ferro', 'silício', 'níquel', 'gelo', 'cristais raros']),
    vida: rnd(0, 100) + '%',
    anomalias: sorteia(['nenhuma', 'nenhuma', 'pulso de rádio', 'distorção temporal']),
  });
}

/* ---------- Missão 3: colapso do setor ---------- */
function iniciarColapso() {
  const d = bfsDistancias(E.g, 'negro');
  E.ordem = [...d].filter(([id]) => id !== 'negro' && id !== E.missao.destino)
    .sort((a, b) => a[1] - b[1]).map(([id]) => id);
  E.cont = 4;
  E.timer = setInterval(() => {
    if (E.fim) return;
    if (--E.cont > 0) { const c = $('#cont'); if (c) c.textContent = E.cont; return; }
    E.cont = 4;
    const id = E.ordem.shift();
    if (id) colapsar(id); else clearInterval(E.timer);
  }, 1000);
}

function colapsar(id) {
  const n = nome(id);
  E.g.removerVertice(id);
  E.destaque = null; msg(`💥 ${n} colapsou!`);
  if (id === E.pos && !E.viajando) return fim(false, `${n} foi engolido com a nave dentro.`);
  desenhar(); atualizarPaineis(); checarPresa();
}

/* ---------- movimento ---------- */
function viajar(id) {
  if (E.viajando || E.fim) return;
  const v = E.g.vizinhos(E.pos).find(x => x.to === id);
  if (!v) return;
  const c = custo(v.e);
  if (c > E.combustivel) { msg('⛽ Combustível insuficiente para esta rota.'); return atualizarPaineis(); }
  E.combustivel -= c; E.destaque = null; E.viajando = true;
  const A = E.base[E.pos], B = E.base[id], t0 = performance.now();
  const dur = Math.hypot(B.x - A.x, B.y - A.y) / (E.nave.v * 40) * 1000;
  E.navePos = { x: A.x, y: A.y };
  desenhar(); atualizarPaineis();
  const passo = t => {
    const p = Math.min(1, (t - t0) / dur);
    E.navePos = { x: A.x + (B.x - A.x) * p, y: A.y + (B.y - A.y) * p };
    const n = $('#nave-voo');
    if (n) n.setAttribute('transform', `translate(${E.navePos.x},${E.navePos.y})`);
    if (p < 1) requestAnimationFrame(passo); else chegar(id);
  };
  requestAnimationFrame(passo);
}

function chegar(id) {
  E.viajando = false; E.navePos = null;
  if (E.fim) return;
  if (!E.g.vertices.has(id)) return fim(false, 'O destino colapsou durante a viagem.');
  E.pos = id;
  const c = E.g.vertices.get(id), p = c.perigo, M = E.missao.id;
  if (p?.tipo === 'buraco') return fim(false, 'A nave foi engolida pelo buraco negro.');
  if (p?.tipo === 'piratas') {
    const l = Math.ceil(combMax() * 0.1 * p.nivel);
    E.combustivel = Math.max(0, E.combustivel - l); E.carga = Math.max(0, E.carga - 1);
    msg(`☠️ Piratas! -${l} de combustível e -1 de carga.`);
  }
  if (p?.tipo === 'tempestade') {
    const l = Math.ceil(combMax() * 0.08);
    E.combustivel = Math.max(0, E.combustivel - l); msg(`⚡ Tempestade de radiação! -${l} de combustível.`);
  }
  coletar(id);
  if (M === 1) {
    if (id === 'esmeralda' && E.fase === 0) { E.fase = 1; msg('🌫️ Dados da nebulosa coletados! Volte à Terra pela rota mais curta.'); }
    else if (id === 'terra' && E.fase === 1) return fim(true, 'Dados entregues na Terra. Missão cumprida!');
  }
  if (M === 2) {
    if (E.missao.alvos.includes(id) && !E.entregues.has(id)) {
      if (E.carga > 0) { E.entregues.add(id); E.carga--; msg(`📦 Carga entregue: ${c.nome}.`); }
      else msg('Sem carga! Reabasteça em uma estação e volte aqui.');
    }
    if (id === 'terra' && E.entregues.size === E.missao.alvos.length) return fim(true, 'Todas as entregas feitas e de volta à Terra!');
  }
  if (M === 3 && id === E.missao.destino) return fim(true, 'Você escapou do setor!');
  desenhar(); atualizarPaineis(); checarPresa();
}

function checarPresa() {
  if (E.fim || E.viajando) return;
  const t = E.g.vertices.get(E.pos);
  if (!t || t.tipo === 'estacao') return;
  const alcanca = E.g.vizinhos(E.pos).some(({ e }) => custo(e) <= E.combustivel);
  if (E.combustivel <= 0 || !alcanca)
    fim(false, E.combustivel <= 0 ? 'Combustível zerado.' : 'Combustível insuficiente para qualquer caminho.');
}

function fim(ok, texto) {
  E.fim = true; clearInterval(E.timer); E.viajando = false;
  if (ok) E.concluidas[E.missao.id] = true;
  $('#fim').className = 'fim ' + (ok ? 'ganhou' : 'perdeu');
  $('#fim').innerHTML = `<h2>${ok ? 'missão concluída' : 'game over'}</h2><p>${texto}</p><button class="btn" id="btn-menu">voltar ao menu</button>`;
  desenhar(); atualizarPaineis();
}

function acao(a) {
  if (E.fim || E.viajando) return;
  const g = E.g, M = E.missao.id;
  if (a === 'reabastecer') { E.combustivel = combMax(); E.carga = cargaMax(); msg('⛽ Combustível e carga reabastecidos.'); }

  if (a === 'rota') {
    let r = null, info = '';
    if (M === 1) {
      const ida = E.fase === 0, alvo = ida ? 'esmeralda' : 'terra';
      const { dist, prev } = dijkstra(g, E.pos, (ida ? PESOS.risco : PESOS.combustivel)(g));
      r = reconstruirCaminho(prev, E.pos, alvo);
      info = ida ? `Rota mais segura: risco total ${Math.round(dist.get(alvo))}.` : `Rota mais curta: ${Math.round(dist.get(alvo))} de combustível (base).`;
    } else if (M === 2) {
      const falta = E.missao.alvos.filter(x => !E.entregues.has(x));
      const t = tsp(g, E.pos, falta, 'terra');
      if (t) { r = t.rota; info = `Melhor ordem: ${t.ordem.map(nome).join(' → ')} → Terra (${t.custo} de combustível base).`; }
    } else {
      const { dist, prev } = dijkstra(g, E.pos, PESOS.combustivel(g));
      r = reconstruirCaminho(prev, E.pos, E.missao.destino);
      info = `Rota de fuga: ${Math.round(dist.get(E.missao.destino))} de combustível (base).`;
    }
    if (r && r.length > 1) { E.destaque = { tipo: 'rota', ids: r }; msg('✨ ' + info); } else msg('Nenhuma rota disponível!');
  }

  if (a === 'regioes') {
    const comps = componentesConexos(g), c = comps.find(x => x.includes(E.pos));
    E.destaque = { tipo: 'regiao', ids: c };
    msg(`🗺️ ${comps.length} região(ões) isolada(s). A sua tem ${c.length} corpos.`);
  }

  if (a === 'ciclos') {
    const cs = encontrarCiclos(g);
    if (!cs.length) msg('Nenhum ciclo no grafo.');
    else {
      const c = cs[E.cicloIdx++ % cs.length];
      E.destaque = { tipo: 'ciclo', ids: [...c, c[0]] };
      msg(`🔁 Ciclo ${((E.cicloIdx - 1) % cs.length) + 1}/${cs.length}: ${c.map(nome).join(' → ')}.`);
    }
  }
  desenhar(); atualizarPaineis(); checarPresa();
}

function objetivo() {
  const M = E.missao.id;
  if (M === 1) return E.fase === 0 ? 'Objetivo: chegar à Nebulosa Esmeralda.' : 'Objetivo: voltar à Terra.';
  if (M === 2) {
    const f = E.missao.alvos.filter(x => !E.entregues.has(x));
    return f.length ? `Entregas ${E.entregues.size}/4. Faltam: ${f.map(nome).join(', ')}.` : 'Entregas completas. Volte à Terra.';
  }
  return 'Objetivo: chegar à Estação Vega.';
}

function atualizarPaineis() {
  const c = E.base[E.pos], d = E.dados.get(E.pos), M = E.missao.id;
  const dadosCorpo = [
    ['tipo', c.tipo],
    ['riqueza científica', '★'.repeat(c.riqueza)],
    ['gravidade', c.gravidade],
    ['perigos', c.perigo ? c.perigo.tipo : 'nenhum'],
    ['recursos', c.recursos],
    ...(d ? [
      ['campo magnético', d.campo],
      ['atmosfera', d.atmosfera],
      ['minerais', d.minerais],
      ['prob. de vida', d.vida],
      ['anomalias', d.anomalias],
    ] : []),
  ];
  $('#info-corpo').innerHTML = `<div class="corpo-cabecalho"><b>${c.emoji} ${c.nome}</b></div>
    <div class="dados-corpo">${dadosCorpo.map(([rotulo, valor]) =>
      `<div class="dado-corpo"><span>${rotulo}</span><strong>${valor}</strong></div>`).join('')}
      ${c.tipo === 'estacao' ? '<div class="acao-corpo"><button class="btn" data-acao="reabastecer">reabastecer tudo</button></div>' : ''}
    </div>`;
  const rot = M === 1 ? (E.fase === 0 ? 'rota mais segura' : 'rota mais curta') : M === 2 ? 'rota ótima (TSP)' : 'rota de fuga';
  $('#info-nave').innerHTML = `<b class="nave-titulo">${E.nave.emoji} ${E.nave.nome}</b>
    <div class="status-nave">
      <div class="combustivel-nave"><span>combustível ${E.combustivel}/${combMax()}</span>
        <div class="barra"><i style="width:${Math.round(E.combustivel / combMax() * 100)}%"></i></div>
      </div>
      <div class="atributos-nave"><span>carga ${E.carga}/${cargaMax()}</span><span>velocidade ${E.nave.v}</span></div>
    </div>
    <div class="objetivo-nave">${objetivo()}${M === 3 ? `<br>próximo colapso em <b id="cont">${E.cont}</b>s` : ''}</div>
    <div class="nave-acoes">
      <button class="btn" data-acao="rota">${rot}</button>
      <button class="btn" data-acao="regioes">regiões navegáveis</button>
      <button class="btn" data-acao="ciclos">ciclos / rotas</button>
    </div>
    <div class="log">${E.msgs.slice(-4).map(m => `<div>${m}</div>`).join('')}</div>`;
}

function desenhar() {
  const g = E.g, at = E.pos, D = E.destaque, ids = new Set(D ? D.ids : []), arD = new Set();
  if (D && D.tipo !== 'regiao') D.ids.forEach((v, i) => { const w = D.ids[i + 1]; if (w) { arD.add(v + '|' + w); arD.add(w + '|' + v); } });
  const viz = new Set(g.vizinhos(at).map(v => v.to));
  let s = '';
  for (const e of E.todasArestas) {
    if (!g.vertices.has(e.a) || !g.vertices.has(e.b)) continue;
    const A = E.base[e.a], B = E.base[e.b];
    const dx = B.x - A.x, dy = B.y - A.y, distancia = Math.hypot(dx, dy), margem = 32;
    const x1 = A.x + dx / distancia * margem, y1 = A.y + dy / distancia * margem;
    const x2 = B.x - dx / distancia * margem, y2 = B.y - dy / distancia * margem;
    const poss = (e.a === at && viz.has(e.b)) || (!e.dirigida && e.b === at && viz.has(e.a));
    const cls = arD.has(e.a + '|' + e.b) ? 'ideal' : poss ? 'possivel' : '';
    s += `<line class="aresta ${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    if (poss) s += `<text class="custo" x="${(A.x + B.x) / 2}" y="${(A.y + B.y) / 2}">⛽${custo(e)}</text>`;
  }
  for (const c of Object.values(E.base)) {
    const vivo = g.vertices.has(c.id);
    const cl = ['no', !vivo && 'colapsado', vivo && viz.has(c.id) && !E.fim && 'possivel',
      D && D.tipo !== 'regiao' && ids.has(c.id) && 'dest', D && D.tipo === 'regiao' && !ids.has(c.id) && 'fora'].filter(Boolean).join(' ');
    s += `<g class="${cl}" data-id="${c.id}" transform="translate(${c.x},${c.y})"><circle r="26" fill="transparent"/>
      <text class="emoji">${c.emoji}</text><text class="rot" y="36">${c.nome}</text></g>`;
    if (vivo && c.perigo?.tipo === 'piratas')
      s += `<g transform="translate(${c.x},${c.y})"><g class="orbita rapida"><g>
        <animateMotion path="M 34 0 A 34 34 0 1 1 -34 0 A 34 34 0 1 1 34 0" dur="2s" repeatCount="indefinite" rotate="0"/>
        <text>☠️</text></g></g></g>`;
  }
  if (E.viajando) s += `<text id="nave-voo" class="nave" transform="translate(${E.navePos.x},${E.navePos.y})">${E.nave.emoji}</text>`;
  else {
    const P = E.base[at];
    s += `<g transform="translate(${P.x},${P.y})"><g class="orbita nave-orbita">
      <g><animateMotion path="M -32 0 A 32 32 0 1 1 32 0 A 32 32 0 1 1 -32 0" dur="4s" repeatCount="indefinite" rotate="0"/>
      <text>${E.nave.emoji}</text></g></g></g>`;
  }
  $('#mapa').innerHTML = s;
}

/* ---------- eventos ---------- */
document.addEventListener('click', ev => {
  const q = s => ev.target.closest(s);
  
  // BOTÃO GLOBAL DE FECHAR (VOLTAR)
  if (q('#btn-fechar')) {
    voltar();
  }
  else if (q('#btn-iniciar')) { montarMenu(); mostrar('tela-missoes'); }
  else if (q('[data-missao]')) { E.missao = MISSOES.find(m => m.id == q('[data-missao]').dataset.missao); mostrar('tela-naves'); }
  else if (q('[data-sel]')) {
    const n = NAVES.find(x => x.id === q('[data-sel]').dataset.sel);
    E.nave = { ...n, fator: 1 + (n.v - 3) * 0.12 };
    document.querySelectorAll('[data-nave]').forEach(c => c.classList.toggle('sel', c.dataset.nave === n.id));
    $('#btn-comecar').disabled = false;
  }
  else if (q('#btn-comecar')) iniciarJogo();
  else if (q('[data-acao]')) acao(q('[data-acao]').dataset.acao);
  else if (q('#mapa .no')) viajar(q('#mapa .no').dataset.id);
  else if (q('#btn-menu')) { 
    // Botão "voltar ao menu" do game over
    const m = E.missao; 
    montarMenu(); 
    E.missao = m; 
    mostrar('tela-missoes'); 
  }
});