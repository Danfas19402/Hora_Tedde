const CHAVE = 'hora-tedde-dias';
let dias = JSON.parse(localStorage.getItem(CHAVE) || '[]');
const $ = (seletor) => document.querySelector(seletor);
const novoId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const hoje = () => new Date().toISOString().slice(0, 10);
const minutos = (hora) => hora ? hora.split(':').reduce((h, m) => Number(h) * 60 + Number(m)) : null;
const formatar = (valor) => `${String(Math.floor(valor / 60)).padStart(2, '0')}:${String(valor % 60).padStart(2, '0')}`;
const dataBR = (data) => data ? data.split('-').reverse().join('/') : '';

function calcular(dia) {
  if (dia.folga) return { trabalhadas: 0, extras: 0 };
  const entrada = minutos(dia.entrada), inicio = minutos(dia.almocoIni), retorno = minutos(dia.almocoFim), saida = minutos(dia.saida);
  let trabalhadas = 0;
  if (entrada !== null && saida !== null) {
    trabalhadas = saida - entrada;
    if (trabalhadas < 0) trabalhadas += 1440;
    if (inicio !== null && retorno !== null) trabalhadas -= Math.max(0, retorno - inicio);
  } else if (entrada !== null && inicio !== null) trabalhadas = inicio - entrada;
  trabalhadas = Math.max(0, trabalhadas);
  const jornada = minutos($('#jornada').value) || 0;
  return { trabalhadas, extras: saida !== null ? Math.max(0, trabalhadas - jornada) : 0 };
}
function salvar() { localStorage.setItem(CHAVE, JSON.stringify(dias)); }
function adicionar(folga) { dias.push({ id: novoId(), data: hoje(), entrada: '', almocoIni: '', almocoFim: '', saida: '', folga, fotos: [] }); salvar(); renderizar(); }
function alterar(id, campo, valor) { const dia = dias.find((item) => item.id === id); if (dia) dia[campo] = valor; salvar(); renderizar(); }
function campo(nome, titulo, valor, id) { return `<label class="campo"><span>${titulo}</span><input type="${nome === 'data' ? 'date' : 'time'}" data-id="${id}" data-campo="${nome}" value="${valor}"></label>`; }

function renderizar() {
  $('#vazio').hidden = dias.length > 0;
  $('#dias').innerHTML = dias.map((dia) => {
    const total = calcular(dia);
    const horarios = dia.folga ? '<div class="etiqueta-folga">FOLGA</div>' : campo('entrada','Entrada',dia.entrada,dia.id) + campo('almocoIni','Almoço início',dia.almocoIni,dia.id) + campo('almocoFim','Retorno almoço',dia.almocoFim,dia.id) + campo('saida','Saída',dia.saida,dia.id);
    return `<article class="dia"><div class="campos">${campo('data','Data',dia.data,dia.id)}${horarios}</div><div class="resultado"><span>Horas trabalhadas: <b>${formatar(total.trabalhadas)}</b></span><span>Hora extra: <b class="verde">${formatar(total.extras)}</b></span><div class="botoes-dia"><label class="botao secundario foto-label">📷 Foto do ponto<input type="file" accept="image/*" capture="environment" data-foto="${dia.id}"></label><button class="botao perigo" data-remover="${dia.id}" type="button">Remover</button></div></div><div class="fotos" data-fotos="${dia.id}"></div></article>`;
  }).join('');
  const totais = dias.reduce((acc, dia) => { const t = calcular(dia); acc.trabalhadas += t.trabalhadas; acc.extras += t.extras; return acc; }, { trabalhadas: 0, extras: 0 });
  $('#total-trabalhadas').textContent = formatar(totais.trabalhadas); $('#total-extras').textContent = formatar(totais.extras);
  dias.forEach(exibirFotos);
}

function abrirBanco() { return new Promise((ok, erro) => { const pedido = indexedDB.open('hora-tedde-fotos', 1); pedido.onupgradeneeded = () => pedido.result.createObjectStore('fotos'); pedido.onsuccess = () => ok(pedido.result); pedido.onerror = () => erro(pedido.error); }); }
async function guardarFoto(id, dados) { const banco = await abrirBanco(); return new Promise((ok, erro) => { const t = banco.transaction('fotos','readwrite'); t.objectStore('fotos').put(dados,id); t.oncomplete = ok; t.onerror = () => erro(t.error); }); }
async function lerFoto(id) { const banco = await abrirBanco(); return new Promise((ok) => { const pedido = banco.transaction('fotos').objectStore('fotos').get(id); pedido.onsuccess = () => ok(pedido.result); pedido.onerror = () => ok(null); }); }
async function apagarFoto(id) { const banco = await abrirBanco(); banco.transaction('fotos','readwrite').objectStore('fotos').delete(id); }
function comprimir(arquivo) { return new Promise((ok, erro) => { const imagem = new Image(); imagem.onload = () => { const escala = Math.min(1, 1280 / Math.max(imagem.width, imagem.height)); const canvas = document.createElement('canvas'); canvas.width = imagem.width * escala; canvas.height = imagem.height * escala; const ctx = canvas.getContext('2d'); ctx.drawImage(imagem, 0, 0, canvas.width, canvas.height); const altura = Math.max(40, canvas.width / 14); ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(0, canvas.height - altura, canvas.width, altura); ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.max(16, Math.round(canvas.width / 28))}px Arial`; ctx.fillText(`HORA TEDDE • ${new Date().toLocaleString('pt-BR')}`, 12, canvas.height - altura / 3); ok(canvas.toDataURL('image/jpeg', .75)); URL.revokeObjectURL(imagem.src); }; imagem.onerror = erro; imagem.src = URL.createObjectURL(arquivo); }); }
async function exibirFotos(dia) { const area = document.querySelector(`[data-fotos="${dia.id}"]`); if (!area) return; for (const id of dia.fotos || []) { const url = await lerFoto(id); if (url) area.insertAdjacentHTML('beforeend', `<div class="miniatura"><img src="${url}" alt="Foto do ponto" data-ampliar="${id}"><button type="button" data-apagar-foto="${dia.id}:${id}" aria-label="Apagar foto">×</button></div>`); } }

function linhas() { return dias.map((d) => { const t = calcular(d); return [dataBR(d.data), d.folga ? 'FOLGA' : d.entrada, d.folga ? '' : d.almocoIni, d.folga ? '' : d.almocoFim, d.folga ? '' : d.saida, formatar(t.trabalhadas), formatar(t.extras)]; }); }
const cabecalho = ['Data','Entrada','Almoço início','Retorno almoço','Saída','Horas trabalhadas','Hora extra'];
$('#adicionar').onclick = () => adicionar(false); $('#folga').onclick = () => adicionar(true); $('#imprimir').onclick = () => print();
$('#limpar').onclick = async () => { if (!confirm('Apagar TODOS os dias e fotos?')) return; for (const d of dias) for (const f of d.fotos || []) await apagarFoto(f); dias = []; salvar(); renderizar(); };
$('#tema').onclick = () => { const escuro = !document.documentElement.classList.contains('escuro'); document.documentElement.classList.toggle('escuro', escuro); localStorage.setItem('hora-tedde-tema', escuro ? 'escuro' : 'claro'); $('#tema').textContent = escuro ? '☀️ Claro' : '🌙 Escuro'; };
$('#jornada').value = localStorage.getItem('hora-tedde-jornada') || '08:00'; $('#jornada').onchange = (e) => { localStorage.setItem('hora-tedde-jornada', e.target.value); renderizar(); };
$('#excel').onclick = () => { if (!window.XLSX) return alert('Conecte-se à internet para exportar.'); const totais = dias.reduce((a,d) => { const t=calcular(d); a[0]+=t.trabalhadas;a[1]+=t.extras;return a; },[0,0]); const planilha = XLSX.utils.aoa_to_sheet([cabecalho,...linhas(),['TOTAL','','','','',formatar(totais[0]),formatar(totais[1])]]); const livro=XLSX.utils.book_new();XLSX.utils.book_append_sheet(livro,planilha,'Ponto');XLSX.writeFile(livro,'hora-tedde.xlsx'); };
$('#pdf').onclick = () => { if (!window.jspdf) return alert('Conecte-se à internet para exportar.'); const doc=new window.jspdf.jsPDF();doc.text('HORA TEDDE — Relatório de ponto',14,16);doc.autoTable({head:[cabecalho],body:linhas(),startY:22,headStyles:{fillColor:[15,107,58]},styles:{fontSize:8}});doc.save('hora-tedde.pdf'); };
$('#dias').addEventListener('change', async (e) => { const alvo=e.target; if (alvo.dataset.campo) alterar(alvo.dataset.id,alvo.dataset.campo,alvo.value); if (alvo.dataset.foto && alvo.files[0]) { const dia=dias.find(d=>d.id===alvo.dataset.foto); if (!dia) return; const id=novoId();await guardarFoto(id,await comprimir(alvo.files[0]));dia.fotos.push(id);salvar();renderizar(); } });
$('#dias').addEventListener('click', async (e) => { const alvo=e.target; if (alvo.dataset.remover) { if (!confirm('Remover este dia?')) return; const dia=dias.find(d=>d.id===alvo.dataset.remover);for(const id of dia?.fotos||[]) await apagarFoto(id);dias=dias.filter(d=>d.id!==alvo.dataset.remover);salvar();renderizar(); } if (alvo.dataset.apagarFoto) { const [diaId,fotoId]=alvo.dataset.apagarFoto.split(':');if(!confirm('Apagar foto?'))return;await apagarFoto(fotoId);const dia=dias.find(d=>d.id===diaId);if(dia)dia.fotos=dia.fotos.filter(f=>f!==fotoId);salvar();renderizar(); } if (alvo.dataset.ampliar) { const url=await lerFoto(alvo.dataset.ampliar);if(url){$('#foto-grande img').src=url;$('#foto-grande').showModal();} } });
$('#fechar-foto').onclick=()=>$('#foto-grande').close(); $('#foto-grande').onclick=(e)=>{if(e.target===$('#foto-grande'))$('#foto-grande').close();};
const inicialEscuro=localStorage.getItem('hora-tedde-tema')==='escuro';document.documentElement.classList.toggle('escuro',inicialEscuro);$('#tema').textContent=inicialEscuro?'☀️ Claro':'🌙 Escuro';renderizar();

// ==============================================
// SISTEMA DE ANOTAÇÕES — PRONTO PARA USAR
// ==============================================

// 👇 COLE SOMENTE A SUA CHAVE DO JSONBIN AQUI
const CHAVE_MESTRE = "$2a$10$4G2f06raI7nqOhUqRa4KEuNHlQa.2VjhNalPMfmvQQrDjmJZ7tVk2";

// ⚠️ NÃO ALTERE A LINHA ABAIXO — o sistema cria sozinho
let ID_GRUPO_ANOTACOES = localStorage.getItem('id_grupo_anotacoes') || "";

document.addEventListener('DOMContentLoaded', async () => {
  const lista = document.getElementById('lista-anotacoes');

  // Verificar se a chave foi colocada
  if (CHAVE_MESTRE === "COLE_SUA_CHAVE_AQUI") {
    lista.innerHTML = `<p style="color:#ff9800; padding:15px; text-align:center;">
      🔧 Coloque sua CHAVE do JSONBIN no código para começar!
    </p>`;
    return;
  }

  // 👇 CRIA O ARMAZENAMENTO AUTOMATICAMENTE SE NÃO EXISTIR
  if (!ID_GRUPO_ANOTACOES) {
    try {
      const resCriar = await fetch('https://api.jsonbin.io/v3/b', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': CHAVE_MESTRE,
          'X-Bin-Name': 'hora-tedde-anotacoes'
        },
        body: JSON.stringify({ anotacoes: [] })
      });

      if (!resCriar.ok) throw new Error("Falha ao criar");
      const dados = await resCriar.json();
      ID_GRUPO_ANOTACOES = dados.metadata.id;
      
      // GUARDA O CÓDIGO PARA NÃO PRECISAR MAIS FAZER NADA
      localStorage.setItem('id_grupo_anotacoes', ID_GRUPO_ANOTACOES);
      
      lista.innerHTML = `<p style="color:#90ee90; padding:15px; text-align:center;">
        ✅ Sistema pronto! Código: <code style="background:#000; padding:4px 8px; border-radius:4px;">${ID_GRUPO_ANOTACOES}</code><br>
        Envie este código para quem vai usar também.
      </p>`;
      return;
      
    } catch (erro) {
      lista.innerHTML = `<p style="color:#ff6b6b; padding:15px;">❌ Erro: ${erro.message}</p>`;
      return;
    }
  }

  // ✅ TUDO PRONTO — CARREGA E ATUALIZA
  carregarAnotacoes();
  setInterval(carregarAnotacoes, 30000); // Atualiza a cada 30 segundos

  document.getElementById('btn-enviar-anotacao').addEventListener('click', enviarAnotacao);
  document.getElementById('campo-anotacao').addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') enviarAnotacao();
  });
});

async function carregarAnotacoes() {
  const lista = document.getElementById('lista-anotacoes');
  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${ID_GRUPO_ANOTACOES}/latest`);
    if (!res.ok) throw new Error("Sem anotações ainda");
    const dados = await res.json();
    exibirAnotacoes(dados.record?.anotacoes || []);
  } catch {
    lista.innerHTML = `<p class="sem-anotacao">Ainda não há anotações. Seja o primeiro a registrar!</p>`;
  }
}

async function enviarAnotacao() {
  const campo = document.getElementById('campo-anotacao');
  const texto = campo.value.trim();
  if (!texto) { alert("Escreva algo!"); campo.focus(); return; }

  const nova = {
    texto: texto,
    data: new Date().toLocaleString('pt-BR'),
    autor: 'Usuário'
  };

  try {
    let anotacoes = [];
    const res = await fetch(`https://api.jsonbin.io/v3/b/${ID_GRUPO_ANOTACOES}/latest`);
    if (res.ok) {
      const d = await res.json();
      anotacoes = d.record?.anotacoes || [];
    }
    anotacoes.unshift(nova);
    if (anotacoes.length > 50) anotacoes = anotacoes.slice(0, 50);

    await fetch(`https://api.jsonbin.io/v3/b/${ID_GRUPO_ANOTACOES}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': CHAVE_MESTRE
      },
      body: JSON.stringify({ anotacoes })
    });

    exibirAnotacoes(anotacoes);
    campo.value = '';
    alert("✅ Enviada! Todos verão em até 30 segundos.");
  } catch (erro) {
    alert("❌ Erro: " + erro.message);
  }
}

function exibirAnotacoes(lista) {
  const container = document.getElementById('lista-anotacoes');
  if (lista.length === 0) {
    container.innerHTML = '<p class="sem-anotacao">Ainda não há anotações. Seja o primeiro!</p>';
    return;
  }
  container.innerHTML = lista.map(item => `
    <div class="anotacao-item">
      <div class="anotacao-data">${item.data} — ${item.autor}</div>
      <div>${item.texto.replace(/\n/g, '<br>')}</div>
    </div>
  `).join('');
}
