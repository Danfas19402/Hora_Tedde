/* ===== HORA TEDDE — lógica (JavaScript) ===== */
/* Dados ficam no localStorage do navegador; fotos no IndexedDB. */

const CHAVE_DIAS = "hora-tedde-dias";
const CHAVE_TEMA = "hora-tedde-tema";
const CHAVE_JORNADA = "hora-tedde-jornada";

/* ---------- Estado ---------- */
let dias = [];
let pronto = false;

const $ = (id) => document.getElementById(id);

/* ---------- Utilidades ---------- */
const novoId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const hoje = () => new Date().toISOString().slice(0, 10);
const dataBR = (iso) => (iso ? iso.split("-").reverse().join("/") : "");
const fmt = (m) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const emMinutos = (h) => {
  if (!h) return null;
  const [a, b] = h.split(":").map(Number);
  return (a || 0) * 60 + (b || 0);
};

/* ---------- Cálculo de horas ---------- */
function calcular(d, jornadaMin) {
  if (d.folga) return { trab: 0, extra: 0 };
  const e = emMinutos(d.entrada), ai = emMinutos(d.almocoIni),
    af = emMinutos(d.almocoFim), s = emMinutos(d.saida);
  let trab = 0;
  if (e != null && s != null) {
    trab = s - e;
    if (trab < 0) trab += 1440;
    if (ai != null && af != null) trab -= Math.max(0, af - ai);
  } else if (e != null && ai != null) {
    trab = ai - e;
  }
  trab = Math.max(0, trab);
  return { trab, extra: s != null ? Math.max(0, trab - jornadaMin) : 0 };
}

/* ---------- Armazenamento ---------- */
function carregar() {
  try { return JSON.parse(localStorage.getItem(CHAVE_DIAS) || "[]"); }
  catch { return []; }
}
const salvar = () => localStorage.setItem(CHAVE_DIAS, JSON.stringify(dias));

/* ---------- Fotos no IndexedDB ---------- */
function abrirDb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open("hora-tedde-fotos", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("fotos");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function salvarFoto(id, dataUrl) {
  const d = await abrirDb();
  await new Promise((res, rej) => {
    const t = d.transaction("fotos", "readwrite");
    t.objectStore("fotos").put(dataUrl, id);
    t.oncomplete = res;
    t.onerror = () => rej(t.error);
  });
}
function lerFoto(id) {
  return abrirDb().then(
    (d) =>
      new Promise((res) => {
        const r = d.transaction("fotos").objectStore("fotos").get(id);
        r.onsuccess = () => res(r.result);
        r.onerror = () => res(undefined);
      })
  );
}
async function apagarFotos(ids) {
  const d = await abrirDb();
  const s = d.transaction("fotos", "readwrite").objectStore("fotos");
  if (!ids) s.clear();
  else ids.forEach((i) => s.delete(i));
}

/* Reduz a foto e carimba data/hora */
function comprimir(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const max = 1280;
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = img.width * k;
      c.height = img.height * k;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const txt = new Date().toLocaleString("pt-BR");
      ctx.font = `bold ${Math.round(c.width / 28)}px sans-serif`;
      ctx.fillStyle = "rgba(0,0,0,.6)";
      ctx.fillRect(0, c.height - c.width / 14, c.width, c.width / 14);
      ctx.fillStyle = "#fff";
      ctx.fillText("HORA TEDDE • " + txt, 12, c.height - c.width / 40);
      res(c.toDataURL("image/jpeg", 0.75));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}

/* ---------- Tema ---------- */
function aplicarTema(escuro) {
  document.body.classList.toggle("dark", escuro);
  $("btnTema").textContent = escuro ? "☀️ Claro" : "🌙 Escuro";
  if (pronto) localStorage.setItem(CHAVE_TEMA, escuro ? "escuro" : "claro");
}

/* ---------- Ações ---------- */
function adicionar(folga) {
  dias.push({
    id: novoId(), data: hoje(),
    entrada: "", almocoIni: "", almocoFim: "", saida: "",
    folga, fotos: [],
  });
  render();
}
function atualizar(id, parte) {
  dias = dias.map((d) => (d.id === id ? { ...d, ...parte } : d));
  render();
}
function remover(d) {
  if (!confirm("Remover este dia?")) return;
  apagarFotos(d.fotos);
  dias = dias.filter((x) => x.id !== d.id);
  render();
}
function limparTudo() {
  if (!confirm("Apagar TODOS os dias e fotos?")) return;
  apagarFotos();
  dias = [];
  render();
}
async function adicionarFoto(d, file) {
  if (!file) return;
  const url = await comprimir(file);
  const id = novoId();
  await salvarFoto(id, url);
  atualizar(d.id, { fotos: [...d.fotos, id] });
}

/* ---------- Exportações ---------- */
const cabecalho = ["Data", "Entrada", "Almoço início", "Retorno almoço", "Saída", "Horas trabalhadas", "Hora extra"];

function linhas() {
  const jornadaMin = jornadaEmMinutos();
  return dias.map((d) => {
    const c = calcular(d, jornadaMin);
    return [
      dataBR(d.data),
      d.folga ? "FOLGA" : d.entrada,
      d.folga ? "" : d.almocoIni,
      d.folga ? "" : d.almocoFim,
      d.folga ? "" : d.saida,
      fmt(c.trab),
      fmt(c.extra),
    ];
  });
}
function totais() {
  const jornadaMin = jornadaEmMinutos();
  return dias.reduce(
    (t, d) => {
      const c = calcular(d, jornadaMin);
      return { trab: t.trab + c.trab, extra: t.extra + c.extra };
    },
    { trab: 0, extra: 0 }
  );
}
function jornadaEmMinutos() {
  const [h, m] = ($("jornada").value || "08:00").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function exportarExcel() {
  const tot = totais();
  const ws = XLSX.utils.aoa_to_sheet([
    cabecalho,
    ...linhas(),
    ["TOTAL", "", "", "", "", fmt(tot.trab), fmt(tot.extra)],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ponto");
  XLSX.writeFile(wb, "hora-tedde.xlsx");
}

function exportarPdf() {
  const tot = totais();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("HORA TEDDE — Relatório de ponto", 14, 16);
  doc.autoTable({
    head: [cabecalho],
    body: [...linhas(), ["TOTAL", "", "", "", "", fmt(tot.trab), fmt(tot.extra)]],
    startY: 22,
    headStyles: { fillColor: [15, 107, 58] },
    styles: { fontSize: 8 },
  });
  doc.save("hora-tedde.pdf");
}

/* ---------- Renderização ---------- */
function render() {
  if (pronto) salvar();

  const jornadaMin = jornadaEmMinutos();
  const tot = totais();
  $("totalTrab").textContent = fmt(tot.trab);
  $("totalExtra").textContent = fmt(tot.extra);
  $("vazio").style.display = dias.length ? "none" : "block";

  const lista = $("lista");
  lista.innerHTML = "";

  dias.forEach((d) => {
    const c = calcular(d, jornadaMin);
    const el = document.createElement("div");
    el.className = "dia";

    let campos = `<label class="campo"><span>Data</span>
      <input type="date" value="${d.data}" data-campo="data" /></label>`;
    if (d.folga) {
      campos += `<div><span class="folga-tag">FOLGA</span></div>`;
    } else {
      campos += `
        <label class="campo"><span>Entrada</span>
          <input type="time" value="${d.entrada}" data-campo="entrada" /></label>
        <label class="campo"><span>Almoço início</span>
          <input type="time" value="${d.almocoIni}" data-campo="almocoIni" /></label>
        <label class="campo"><span>Retorno almoço</span>
          <input type="time" value="${d.almocoFim}" data-campo="almocoFim" /></label>
        <label class="campo"><span>Saída</span>
          <input type="time" value="${d.saida}" data-campo="saida" /></label>`;
    }

    el.innerHTML = `
      <div class="dia-campos">${campos}</div>
      <div class="dia-rodape">
        <span>Horas trabalhadas: <b>${fmt(c.trab)}</b></span>
        <span>Hora extra: <b class="extra">${fmt(c.extra)}</b></span>
        <div class="dia-acoes no-print">
          <label class="btn btn-secundario" style="cursor:pointer">
            📷 Foto do ponto
            <input type="file" accept="image/*" capture="environment"
              data-foto style="display:none" />
          </label>
          <button class="btn btn-perigo" data-remover>Remover</button>
        </div>
      </div>
      <div class="fotos no-print" data-fotos></div>`;

    // campos
    el.querySelectorAll("[data-campo]").forEach((inp) => {
      inp.addEventListener("change", () =>
        atualizar(d.id, { [inp.dataset.campo]: inp.value })
      );
    });
    // foto
    const inpFoto = el.querySelector("[data-foto]");
    inpFoto.addEventListener("change", () => {
      adicionarFoto(d, inpFoto.files[0]);
      inpFoto.value = "";
    });
    // remover
    el.querySelector("[data-remover]").addEventListener("click", () => remover(d));

    // miniaturas
    const zonaFotos = el.querySelector("[data-fotos]");
    d.fotos.forEach((f) => {
      lerFoto(f).then((url) => {
        if (!url) return;
        const mini = document.createElement("div");
        mini.className = "foto-mini";
        mini.innerHTML = `
          <img alt="Foto do ponto" />
          <a class="foto-baixar" download="ponto-${f}.jpg">⬇</a>
          <button class="foto-apagar">✕</button>`;
        mini.querySelector("img").src = url;
        mini.querySelector("img").addEventListener("click", () => abrirModal(url));
        mini.querySelector(".foto-baixar").href = url;
        mini.querySelector(".foto-apagar").addEventListener("click", () => {
          if (confirm("Apagar foto?")) {
            apagarFotos([f]);
            atualizar(d.id, { fotos: d.fotos.filter((x) => x !== f) });
          }
        });
        zonaFotos.appendChild(mini);
      });
    });

    lista.appendChild(el);
  });
}

/* ---------- Modal ---------- */
function abrirModal(url) {
  $("modalImg").src = url;
  $("modal").hidden = false;
}
$("modal").addEventListener("click", () => ($("modal").hidden = true));

/* ---------- Início ---------- */
$("btnTema").addEventListener("click", () =>
  aplicarTema(!document.body.classList.contains("dark"))
);
$("btnAdicionar").addEventListener("click", () => adicionar(false));
$("btnFolga").addEventListener("click", () => adicionar(true));
$("btnExcel").addEventListener("click", exportarExcel);
$("btnPdf").addEventListener("click", exportarPdf);
$("btnImprimir").addEventListener("click", () => window.print());
$("btnLimpar").addEventListener("click", limparTudo);
$("jornada").addEventListener("change", () => {
  if (pronto) localStorage.setItem(CHAVE_JORNADA, $("jornada").value);
  render();
});

// Carrega o que já está salvo
aplicarTema(localStorage.getItem(CHAVE_TEMA) === "escuro");
$("jornada").value = localStorage.getItem(CHAVE_JORNADA) || "08:00";
dias = carregar();
pronto = true;
render();
