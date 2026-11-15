// Central de Chamados: fila de atendimento com prioridade e SLA.
// Tudo roda no navegador; os chamados ficam salvos no localStorage.

// Prazo de SLA de cada prioridade, em horas corridas.
const PRIORIDADES = {
  P1: { nome: 'P1 · Crítica (para a operação)', horas: 4 },
  P2: { nome: 'P2 · Alta (afeta um setor)', horas: 8 },
  P3: { nome: 'P3 · Média (afeta uma pessoa)', horas: 24 },
  P4: { nome: 'P4 · Baixa (dúvida ou pedido)', horas: 72 },
};
const STATUS = ['Aberto', 'Em atendimento', 'Resolvido'];
const CHAVE = 'central-de-chamados';
const HORA = 60 * 60 * 1000;

let chamados = carregar();

// ---------- armazenamento
function carregar() {
  let texto;
  try {
    texto = localStorage.getItem(CHAVE);
  } catch {
    alert('Este navegador bloqueou o armazenamento local. Os chamados somem ao fechar a página.');
    return [];
  }
  if (texto == null) return [];
  try {
    const lista = JSON.parse(texto);
    if (Array.isArray(lista)) return lista;
  } catch {
    // cai no aviso abaixo
  }
  // Dado ilegível: guarda uma cópia antes de começar vazio, para o próximo salvar() não apagar de vez.
  try { localStorage.setItem(`${CHAVE}-corrompido`, texto); } catch { /* sem espaço: o aviso abaixo continua valendo */ }
  alert(`Os chamados salvos estavam ilegíveis. Uma cópia ficou em "${CHAVE}-corrompido" no armazenamento do navegador, e a fila começa vazia.`);
  return [];
}
function salvar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(chamados));
  } catch {
    alert('Não foi possível salvar neste navegador. Os chamados somem ao fechar a página.');
  }
}

// ---------- regras de SLA
function prazo(c) {
  return c.abertoEm + PRIORIDADES[c.prioridade].horas * HORA;
}
// Situação do SLA: no prazo, perto de vencer (menos de 25% do tempo), estourado.
function situacaoSla(c, agora = Date.now()) {
  const fim = c.status === 'Resolvido' ? c.resolvidoEm : agora;
  const restante = prazo(c) - fim;
  if (c.status === 'Resolvido') {
    return restante >= 0 ? { classe: 'ok', texto: 'resolvido no prazo' } : { classe: 'estourado', texto: 'resolvido fora do prazo' };
  }
  if (restante < 0) return { classe: 'estourado', texto: `SLA estourado há ${duracao(-restante)}` };
  const total = PRIORIDADES[c.prioridade].horas * HORA;
  return restante < total * 0.25
    ? { classe: 'atencao', texto: `vence em ${duracao(restante)}` }
    : { classe: 'ok', texto: `vence em ${duracao(restante)}` };
}
function duracao(ms) {
  const h = Math.floor(ms / HORA);
  const min = Math.floor((ms % HORA) / 60000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return h ? `${h}h ${min}min` : `${min}min`;
}

// ---------- ações
function abrir(dados) {
  const numero = chamados.reduce((max, c) => Math.max(max, c.numero), 0) + 1;
  chamados.push({ numero, ...dados, status: 'Aberto', abertoEm: Date.now(), resolvidoEm: null });
  salvar();
  desenhar();
}
function mudarStatus(numero, status) {
  const c = chamados.find((x) => x.numero === numero);
  if (!c) return;
  c.status = status;
  c.resolvidoEm = status === 'Resolvido' ? Date.now() : null;
  salvar();
  desenhar();
}

// ---------- tela
const $ = (id) => document.getElementById(id);
// Escapa o texto digitado antes de colocar no HTML.
const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

function desenhar() {
  const agora = Date.now();
  const filtro = $('filtro-status').value;
  const busca = $('busca').value.trim().toLowerCase();

  const visiveis = chamados
    .filter((c) => (filtro === 'todos' ? true : filtro === 'pendentes' ? c.status !== 'Resolvido' : c.status === filtro))
    .filter((c) => !busca || `${c.numero} ${c.titulo} ${c.solicitante} ${c.area} ${c.categoria}`.toLowerCase().includes(busca))
    // Pendentes: quem vence primeiro aparece primeiro. Resolvidos: os mais recentes primeiro.
    .sort((a, b) => (a.status === 'Resolvido' && b.status === 'Resolvido' ? b.resolvidoEm - a.resolvidoEm : prazo(a) - prazo(b)));

  $('fila').innerHTML = visiveis.map((c) => {
    const sla = situacaoSla(c, agora);
    const botoes = c.status === 'Aberto'
      ? `<button data-n="${c.numero}" data-s="Em atendimento">Atender</button><button data-n="${c.numero}" data-s="Resolvido" class="primario">Resolver</button>`
      : c.status === 'Em atendimento'
        ? `<button data-n="${c.numero}" data-s="Resolvido" class="primario">Resolver</button>`
        : `<button data-n="${c.numero}" data-s="Aberto">Reabrir</button>`;
    return `<li class="chamado ${sla.classe}">
      <div class="linha1"><b>#${c.numero}</b> <span class="prio ${c.prioridade}">${c.prioridade}</span> ${esc(c.titulo)}</div>
      <div class="linha2">${esc(c.solicitante)} · ${esc(c.area)} · ${esc(c.categoria)} · <i>${c.status}</i></div>
      <div class="linha3"><span class="sla ${sla.classe}">${sla.texto}</span><span class="botoes">${botoes}</span></div>
    </li>`;
  }).join('');
  $('vazio').hidden = visiveis.length > 0;

  // Indicadores
  const pendentes = chamados.filter((c) => c.status !== 'Resolvido');
  const resolvidos = chamados.filter((c) => c.status === 'Resolvido');
  $('kpi-abertos').textContent = pendentes.length;
  $('kpi-estourados').textContent = pendentes.filter((c) => prazo(c) < agora).length;
  $('kpi-resolvidos').textContent = resolvidos.length;
  const noPrazo = resolvidos.filter((c) => c.resolvidoEm <= prazo(c)).length;
  $('kpi-sla').textContent = resolvidos.length ? `${Math.round((noPrazo / resolvidos.length) * 100)}%` : '–';

  // Barras por categoria
  const contagem = {};
  for (const c of chamados) contagem[c.categoria] = (contagem[c.categoria] || 0) + 1;
  const maior = Math.max(1, ...Object.values(contagem));
  $('por-categoria').innerHTML = Object.entries(contagem)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, n]) => `<div class="barra"><span>${esc(cat)}</span><div><i style="width:${(n / maior) * 100}%"></i></div><b>${n}</b></div>`)
    .join('') || '<p class="vazio">Sem chamados ainda.</p>';
}

// Exemplos com horários relativos a agora, para o SLA aparecer em todas as situações.
function carregarExemplos() {
  const agora = Date.now();
  const ex = [
    ['Balança da expedição sem comunicar com o sistema', 'Carlos', 'Logística', 'Rede', 'P1', 5, null, 'Aberto'],
    ['Sem acesso à pasta compartilhada do faturamento', 'Ana', 'Financeiro', 'Acesso e senha', 'P3', 3, null, 'Em atendimento'],
    ['Impressora de etiquetas da linha 2 travando', 'Rodrigo', 'Produção', 'Impressora', 'P2', 7, null, 'Aberto'],
    ['Instalar leitor de PDF para o novo colaborador', 'Juliana', 'RH', 'Software', 'P4', 10, null, 'Aberto'],
    ['Notebook não liga após queda de energia', 'Marcos', 'Comercial', 'Hardware', 'P2', 30, 24, 'Resolvido'],
    ['Senha do e-mail bloqueada', 'Patrícia', 'Financeiro', 'Acesso e senha', 'P3', 50, 47, 'Resolvido'],
    ['Wi-Fi caindo na sala de reunião', 'Fernanda', 'TI', 'Rede', 'P3', 80, 40, 'Resolvido'],
  ];
  let numero = chamados.reduce((max, c) => Math.max(max, c.numero), 0);
  for (const [titulo, solicitante, area, categoria, prioridade, horasAtras, resolvidoHorasAtras, status] of ex) {
    chamados.push({
      numero: ++numero, titulo, solicitante, area, categoria, prioridade, status,
      abertoEm: agora - horasAtras * HORA,
      resolvidoEm: resolvidoHorasAtras == null ? null : agora - resolvidoHorasAtras * HORA,
    });
  }
  salvar();
  desenhar();
}

// ---------- eventos
$('prioridade').innerHTML = Object.entries(PRIORIDADES)
  .map(([k, p]) => `<option value="${k}" ${k === 'P3' ? 'selected' : ''}>${p.nome} · SLA ${p.horas}h</option>`)
  .join('');

$('form').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const titulo = f.get('titulo').trim();
  const solicitante = f.get('solicitante').trim();
  if (!titulo || !solicitante) {
    alert('Preencha o resumo e o solicitante.');
    return;
  }
  abrir({
    titulo,
    solicitante,
    area: f.get('area'),
    categoria: f.get('categoria'),
    prioridade: f.get('prioridade'),
  });
  e.target.reset();
  $('prioridade').value = 'P3';
});
$('fila').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-n]');
  if (b) mudarStatus(Number(b.dataset.n), b.dataset.s);
});
$('busca').addEventListener('input', desenhar);
$('filtro-status').addEventListener('change', desenhar);
$('exemplos').addEventListener('click', carregarExemplos);
$('limpar').addEventListener('click', () => {
  if (confirm('Apagar todos os chamados deste navegador?')) {
    chamados = [];
    salvar();
    desenhar();
  }
});

// Com a página aberta em duas abas, a alteração feita numa aparece na outra (e uma não sobrescreve a outra).
window.addEventListener('storage', (e) => {
  if (e.key === CHAVE) {
    chamados = carregar();
    desenhar();
  }
});

desenhar();
// Atualiza os prazos a cada minuto, sem recarregar a página.
setInterval(desenhar, 60000);
