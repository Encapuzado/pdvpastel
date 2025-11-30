// ====== IMPORTS FIREBASE ======
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  update,
  remove,
  set,
  push
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-database.js";
import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// ====== CONFIGURAÇÃO DO FIREBASE ======
const firebaseConfig = {
  apiKey: "AIzaSyB_QnCVZR4scg_Q3X6_SXlfMzF_ENzCS-s",
  authDomain: "pdvpastel.firebaseapp.com",
  projectId: "pdvpastel",
  storageBucket: "pdvpastel.firebasestorage.app",
  messagingSenderId: "482208869366",
  appId: "1:482208869366:web:d83dc72f7daa2d8cf535d7",
  databaseURL: "https://pdvpastel-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);
const rtdb = getDatabase(app);
const db = getFirestore(app);

// ====== ELEMENTOS ======
const ordersContainer = document.getElementById("ordersContainer");
const statusSummary = document.getElementById("statusSummary");

const sideOverlay  = document.getElementById("sideOverlay");
const sidePanel    = document.getElementById("sidePanel");
const sideTitle    = document.getElementById("sideTitle");
const sideBody     = document.getElementById("sideBody");
const sideCloseBtn = document.getElementById("sideCloseBtn");

// ====== ESTADO ======
let currentOrderId = null;
let currentItemType = "pastel";         // pastel | bebida
let currentAtendimentoMode = "local";   // local | viagem | delivery
let cardapioCache = null;

// ====== CARDÁPIO (FIRESTORE) ======
async function loadCardapio(){
  if (cardapioCache) return cardapioCache;

  const [salSnap, docSnap, compSnap, molhoSnap, bebSnap] = await Promise.all([
    getDocs(collection(db,"sabores_salgados")),
    getDocs(collection(db,"sabores_doces")),
    getDocs(collection(db,"complementos")),
    getDocs(collection(db,"molhos")),
    getDocs(collection(db,"bebidas"))
  ]);

  const mapDocs = snap => snap.docs.map(d => ({ id: d.id, ...d.data() }));

  cardapioCache = {
    sabores_salgados: mapDocs(salSnap),
    sabores_doces:   mapDocs(docSnap),
    complementos:    mapDocs(compSnap),
    molhos:          mapDocs(molhoSnap),
    bebidas:         mapDocs(bebSnap)
  };

  return cardapioCache;
}

// ====== SIDEBAR ======
function openSidebar(){
  sideOverlay.classList.add("visible");
  sidePanel.classList.add("open");
}
function closeSidebar(){
  sideOverlay.classList.remove("visible");
  sidePanel.classList.remove("open");
  sideBody.innerHTML = "";
  currentOrderId = null;
  currentItemType = "pastel";
}
sideOverlay.addEventListener("click", closeSidebar);
sideCloseBtn.addEventListener("click", closeSidebar);

// ====== LEITURA EM TEMPO REAL DA COZINHA ======
const pedidosRef = ref(rtdb, "cozinha/pedidos");

onValue(pedidosRef, (snapshot) => {
  const val = snapshot.val() || {};
  const rows = [];
  const metas = {};

  Object.entries(val).forEach(([orderId, pedido])=>{
    metas[orderId] = pedido.dados || {};
    const itens = pedido.itens || {};
    Object.entries(itens).forEach(([itemId, item])=>{
      rows.push({
        orderId,
        id: itemId,
        nomeCliente: item.nomeCliente || "Cliente",
        status: normalizeStatus(item.status),
        tipo: item.tipo || "pastel",
        sabores: item.sabores || [],
        complementos: item.complementos || [],
        molhos: item.molhos || [],
        adicionais: item.adicionais || 0,
        preco: item.preco || 0
      });
    });
  });

  updateSummary(rows);
  renderGrouped(rows, metas);
});

// ====== AUXILIARES DE STATUS ======
function normalizeStatus(status){
  if (!status || status === "pendente") return "queue";
  return status;
}

function updateSummary(rows){
  const counts = { queue:0, cooking:0, ready:0 };
  rows.forEach(r=>{
    if(r.status==="queue") counts.queue++;
    if(r.status==="cooking") counts.cooking++;
    if(r.status==="ready") counts.ready++;
  });
  statusSummary.textContent =
    `🧾 ${counts.queue} em espera • ${counts.cooking} em preparo • ${counts.ready} prontos`;
}

// ====== RENDERIZAÇÃO AGRUPADA POR COMANDA ======
function renderGrouped(rows, metas){
  ordersContainer.innerHTML = "";

  if(!rows.length){
    ordersContainer.innerHTML = '<div class="muted">Sem itens na cozinha.</div>';
    return;
  }

  const groups = {};
  rows.forEach(r=>{
    if(!groups[r.orderId]) groups[r.orderId] = { items: [], meta: metas[r.orderId] || {} };
    groups[r.orderId].items.push(r);
  });

  Object.entries(groups).forEach(([orderId, groupData])=>{
    const items = groupData.items;
    const meta  = groupData.meta || {};

    const total = items.reduce((sum,it)=>sum + (it.preco || 0), 0);

    const modo = meta.modo || "local";
    const modeLabel =
      modo === "delivery" ? "Delivery" :
      modo === "viagem"   ? "Viagem"   :
                            "Local";

    const groupDiv = document.createElement("div");
    groupDiv.className = "order-group " + modo;

    const head = document.createElement("div");
    head.className = "order-head";
    head.innerHTML = `
      <span>Pedido #${String(orderId).padStart(3,"0")} • ${modeLabel}</span>
    `;

    const groupBtns = document.createElement("div");
    groupBtns.className = "group-actions";

    const btnCook = buttonGroup("Em preparo","ga-cook",()=>setGroupStatus(orderId,"cooking"));
    const btnReady= buttonGroup("Pronto","ga-ready",()=>setGroupStatus(orderId,"ready"));
    const btnWait = buttonGroup("Em espera","ga-wait",()=>setGroupStatus(orderId,"queue"));
    const btnDeliv= buttonGroup("Entregue","ga-delivered",()=>setGroupStatus(orderId,"delivered"));

    groupBtns.append(btnCook,btnReady,btnWait,btnDeliv);
    head.appendChild(groupBtns);

    const grid = document.createElement("div");
    grid.className = "grid";

    // separa pasteis e bebidas
    const itemsBebidas = items.filter(i => i.tipo === "bebida");
    const itemsComida  = items.filter(i => i.tipo !== "bebida");

    // cards de pastel (e outros não-bebida)
    itemsComida.forEach(it=>{
      const card = document.createElement("div");
      card.className = "card s-" + it.status;
      if(it.status==="cooking") card.classList.add("pulse");

      const ingText = formatIngredients(it);

      const body = `
        <div class="title-line">
          <div class="title-name">${escapeHtml(it.nomeCliente)}</div>
          <div class="title-type">${it.tipo==="bebida"?"Bebida":"Pastel"}</div>
        </div>
        <div class="Ing">${ingText}</div>
        <div class="muted">R$ ${it.preco.toFixed(2).replace(".",",")}</div>
      `;

      const act = document.createElement("div");
      act.className = "row";

      const cancelBtn = button("Cancelar","bDanger",()=>deleteItem(orderId,it.id));
      act.append(cancelBtn);

      card.innerHTML = body;
      card.appendChild(act);
      grid.appendChild(card);
    });

    // card único de bebidas
    if (itemsBebidas.length > 0) {
      const agreg = {};

      itemsBebidas.forEach(it=>{
        const nome = (it.sabores && it.sabores[0]) || "Bebida";
        if(!agreg[nome]) agreg[nome] = { qtd:0, total:0 };
        agreg[nome].qtd++;
        agreg[nome].total += (it.preco || 0);
      });

      const cardB = document.createElement("div");
      cardB.className = "card card-bebidas";

      let listHtml = "";
      Object.entries(agreg).forEach(([nome,info])=>{
        listHtml += `
          <div>
            ${escapeHtml(nome)} x${info.qtd} — R$ ${info.total.toFixed(2).replace(".",",")}
          </div>
        `;
      });

      cardB.innerHTML = `
        <div class="title-line">
          <div class="title-name">Bebidas</div>
        </div>
        <div class="ing">${listHtml}</div>
      `;

      grid.appendChild(cardB);
    }

    groupDiv.append(head,grid);

    // rodapé com total + botão + e fechar
    const footer = document.createElement("div");
    footer.className = "order-group-footer";

    const totalDiv = document.createElement("div");
    totalDiv.className = "order-group-total";
    totalDiv.textContent = `Total R$ ${total.toFixed(2).replace(".",",")}`;

    const footerBtns = document.createElement("div");
    footerBtns.className = "order-group-footer-buttons";

    const plusBtn = document.createElement("button");
    plusBtn.className = "round-add-btn";
    plusBtn.textContent = "+";
    plusBtn.onclick = ()=> openAddItem(orderId, meta);

    const closeBtn = document.createElement("button");
    closeBtn.className = "close-order-btn";
    closeBtn.textContent = "Fechar comanda";
    closeBtn.onclick = ()=> closeOrder(orderId);

    footerBtns.append(plusBtn,closeBtn);
    footer.append(totalDiv,footerBtns);

    groupDiv.appendChild(footer);
    ordersContainer.appendChild(groupDiv);
  });
}

// ====== BOTÕES AUXILIARES ======
function button(text, cls, fn){
  const b = document.createElement("button");
  b.className = "btn " + cls;
  b.textContent = text;
  b.onclick = fn;
  return b;
}
function buttonGroup(text, cls, fn){
  const b = document.createElement("button");
  b.className = cls;
  b.textContent = text;
  b.onclick = fn;
  return b;
}

// ====== INGREDIENTES / ESCAPE ======
function formatIngredients(it){
  const all = [
    ...(it.sabores || []),
    ...(it.complementos || []),
    ...(it.molhos || [])
  ];
  if(!all.length) return "<span class='muted'>Sem ingredientes</span>";
  return all.map(s=>escapeHtml(String(s))).join(" • ");
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m=>({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[m]));
}

// ====== OPERAÇÕES NO FIREBASE (ITEM) ======
async function deleteItem(orderId,itemId){
  if(!confirm("Deseja remover este item?")) return;
  await remove(ref(rtdb,`cozinha/pedidos/${orderId}/itens/${itemId}`));
}

// ====== OPERAÇÕES NO FIREBASE (COMANDA) ======
async function setGroupStatus(orderId,status){
  const itemsRef = ref(rtdb,`cozinha/pedidos/${orderId}/itens`);
  onValue(itemsRef,(snap)=>{
    const itens = snap.val() || {};
    const updates = {};
    Object.keys(itens).forEach(id=>{
      updates[`cozinha/pedidos/${orderId}/itens/${id}/status`] = status;
    });
    if(Object.keys(updates).length>0){
      update(ref(rtdb),updates);
    }
  },{onlyOnce:true});
}

async function closeOrder(orderId){
  if(!confirm("Fechar esta comanda e remover da tela da cozinha?")) return;
  await remove(ref(rtdb,`cozinha/pedidos/${orderId}`));
}

// ====== ADIÇÃO DE ITENS VIA SIDEBAR ======
async function openAddItem(orderId, meta = {}){
  currentOrderId = orderId;
  currentItemType = "pastel";
  currentAtendimentoMode = meta.modo || "local";

  const cardapio = await loadCardapio();
  buildItemForm(cardapio, meta);
  sideTitle.textContent = `Adicionar item — Pedido #${String(orderId).padStart(3,"0")}`;
  openSidebar();
}

function buildItemForm(cardapio, meta={}){
  const modo = currentAtendimentoMode;

  sideBody.innerHTML = `
    <div class="sb-field">
      <label>Nome do cliente</label>
      <input id="sbNomeCliente" placeholder="Ex: Maria"/>
    </div>

    <div class="sb-field">
      <label>Tipo de item</label>
      <div class="sb-tabs" id="itemTypeTabs">
        <button class="sb-tab active" data-itemtype="pastel">Pastel</button>
        <button class="sb-tab" data-itemtype="bebida">Bebida</button>
      </div>
    </div>

    <div id="sectionPastel">
      <div class="sb-field">
        <label>Sabores selecionados</label>
        <div class="sb-counter" id="sbSaboresCount">0 / 4</div>

        <div class="chips"><strong>Sabores salgados</strong></div>
        <div class="chips">
          ${cardapio.sabores_salgados.map(s=>`
            <div class="chip" data-kind="sabor" data-value="${escapeHtml(s.nome || s.id)}">
              ${escapeHtml(s.nome || s.id)}
            </div>
          `).join("")}
        </div>

        <div class="chips"><strong>Sabores doces</strong></div>
        <div class="chips">
          ${cardapio.sabores_doces.map(s=>`
            <div class="chip" data-kind="sabor" data-value="${escapeHtml(s.nome || s.id)}">
              ${escapeHtml(s.nome || s.id)}
            </div>
          `).join("")}
        </div>

        <div class="chips"><strong>Complementos</strong></div>
        <div class="chips">
          ${cardapio.complementos.map(c=>`
            <div class="chip" data-kind="comp" data-value="${escapeHtml(c.nome || c.id)}">
              ${escapeHtml(c.nome || c.id)}
            </div>
          `).join("")}
        </div>

        <div class="chips"><strong>Molhos</strong></div>
        <div class="chips">
          ${cardapio.molhos.map(m=>`
            <div class="chip" data-kind="molho" data-value="${escapeHtml(m.nome || m.id)}">
              ${escapeHtml(m.nome || m.id)}
            </div>
          `).join("")}
        </div>
      </div>
    </div>

    <div id="sectionBebida" style="display:none;">
      <div class="sb-field">
        <label>Bebidas</label>

        <div class="bev-list">
          ${cardapio.bebidas.map(b=>{
            const nome = b.nome || b.id;
            const preco = b.preco || 0;
            const precoStr = preco.toFixed(2).replace(".",",");

            return `
              <div class="bev-card" data-nome="${escapeHtml(nome)}" data-preco="${preco}" data-qty="0">
                <div class="bev-name">${escapeHtml(nome)}</div>

                <div class="bev-controls">
                  <button class="bev-btn bev-btn-minus">-</button>
                  <span class="bev-qty">0</span>
                  <button class="bev-btn bev-btn-plus">+</button>
                  <div class="bev-price">R$ ${precoStr}</div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    </div>

    <div class="sb-field">
      <label>Modo</label>
      <div class="sb-tabs" id="modeTabs">
        <button class="sb-tab ${modo==="local"?"active":""}" data-mode="local">Local</button>
        <button class="sb-tab ${modo==="viagem"?"active":""}" data-mode="viagem">Viagem</button>
        <button class="sb-tab ${modo==="delivery"?"active":""}" data-mode="delivery">Delivery</button>
      </div>
    </div>

    <div id="deliveryFields" style="${modo==="delivery"?"":"display:none"}">
      <div class="sb-field">
        <label>Endereço</label>
        <textarea id="sbEndereco" rows="2">${meta.endereco || ""}</textarea>
      </div>
      <div class="sb-field">
        <label>Telefone</label>
        <input id="sbTelefone" value="${meta.telefone || ""}">
      </div>
    </div>

    <div class="sb-field">
      <label>Observação</label>
      <textarea id="sbObs" rows="2"></textarea>
    </div>

    <div class="sb-footer">
      <button class="ghost" id="sbCancel">Cancelar</button>
      <button class="primary" id="sbConfirm">Adicionar</button>
    </div>
  `;

  wireSidebarHandlers();
}

function wireSidebarHandlers(){
  const sectionPastel = sideBody.querySelector("#sectionPastel");
  const sectionBebida = sideBody.querySelector("#sectionBebida");

  sideBody.querySelectorAll("#itemTypeTabs .sb-tab").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      sideBody.querySelectorAll("#itemTypeTabs .sb-tab").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      currentItemType = btn.dataset.itemtype;

      if(currentItemType==="pastel"){
        sectionPastel.style.display = "";
        sectionBebida.style.display = "none";
      }else{
        sectionPastel.style.display = "none";
        sectionBebida.style.display = "";
      }
    });
  });

  sideBody.querySelectorAll("#modeTabs .sb-tab").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      sideBody.querySelectorAll("#modeTabs .sb-tab").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");

      currentAtendimentoMode = btn.dataset.mode;

      const deliveryFields = sideBody.querySelector("#deliveryFields");
      deliveryFields.style.display = currentAtendimentoMode==="delivery" ? "" : "none";
    });
  });

  // ingredientes
  sideBody.querySelectorAll(".chip").forEach(ch=>{
    ch.addEventListener("click", ()=>{
      if(ch.dataset.kind === "sabor" ||
         ch.dataset.kind === "comp" ||
         ch.dataset.kind === "molho"){
        ch.classList.toggle("selected");
        updateSaboresLimitHighlight();
      }
    });
  });

  // BEBIDAS: + e –
  sideBody.querySelectorAll(".bev-card").forEach(card=>{
    const qtySpan = card.querySelector(".bev-qty");

    card.querySelector(".bev-btn-minus").addEventListener("click", ()=>{
      let qty = parseInt(card.dataset.qty,10);
      qty = Math.max(0, qty-1);
      card.dataset.qty = qty;
      qtySpan.textContent = qty;
    });

    card.querySelector(".bev-btn-plus").addEventListener("click", ()=>{
      let qty = parseInt(card.dataset.qty,10);
      qty++;
      card.dataset.qty = qty;
      qtySpan.textContent = qty;
    });
  });

  sideBody.querySelector("#sbCancel").onclick = ()=>closeSidebar();
  sideBody.querySelector("#sbConfirm").onclick = ()=>handleConfirmItem();

  updateSaboresLimitHighlight();
}

// contador e limite 4 sabores
function updateSaboresLimitHighlight(){
  const sabores = sideBody.querySelectorAll('.chip.selected[data-kind="sabor"]');
  const counter = sideBody.querySelector("#sbSaboresCount");

  const qtd = sabores.length;
  counter.textContent = `${qtd} / 4`;
  counter.classList.toggle("over", qtd>4);

  sabores.forEach(ch=>{
    if(qtd>4){
      ch.classList.add("limit-extra");
    } else {
      ch.classList.remove("limit-extra");
    }
  });
}

// ====== ADICIONAR ITEM ======
async function handleConfirmItem(){
  if(!currentOrderId) return;

  const nomeCliente = sideBody.querySelector("#sbNomeCliente").value.trim() || "Cliente";
  const endereco = currentAtendimentoMode==="delivery" ? sideBody.querySelector("#sbEndereco").value.trim() : "";
  const telefone = currentAtendimentoMode==="delivery" ? sideBody.querySelector("#sbTelefone").value.trim() : "";
  const observacao = sideBody.querySelector("#sbObs").value.trim();

  const dadosRef = ref(rtdb,`cozinha/pedidos/${currentOrderId}/dados`);
  await update(dadosRef,{
    modo: currentAtendimentoMode,
    endereco,
    telefone
  });

  const itensRef = ref(rtdb,`cozinha/pedidos/${currentOrderId}/itens`);

  if(currentItemType==="pastel"){
    // pastel
    const sabores = [...sideBody.querySelectorAll('.chip.selected[data-kind="sabor"]')].map(c=>c.dataset.value);
    const complementos = [...sideBody.querySelectorAll('.chip.selected[data-kind="comp"]')].map(c=>c.dataset.value);
    const molhos = [...sideBody.querySelectorAll('.chip.selected[data-kind="molho"]')].map(c=>c.dataset.value);

    let preco = 10;
    if(sabores.length > 4){
      preco += (sabores.length - 4) * 1.5;
    }

    const newRef = push(itensRef);
    await set(newRef,{
      nomeCliente,
      tipo:"pastel",
      preco,
      status:"queue",
      sabores,
      complementos,
      molhos,
      adicionais: Math.max(0, sabores.length - 4),
      observacao,
      criadoEm: Date.now()
    });

  } else {
    // bebidas
    const cards = sideBody.querySelectorAll(".bev-card");
    let addedAny = false;

    for(const card of cards){
      const nome = card.dataset.nome;
      const preco = parseFloat(card.dataset.preco || "0");
      const qty = parseInt(card.dataset.qty,10);

      if(qty > 0){
        addedAny = true;
        for(let i=0;i<qty;i++){
          const newRef = push(itensRef);
          await set(newRef,{
            nomeCliente,
            tipo:"bebida",
            preco,
            status:"queue",
            sabores:[nome], // nome da bebida fica aqui
            complementos:[],
            molhos:[],
            adicionais:0,
            observacao,
            criadoEm: Date.now()
          });
        }
      }
    }

    if(!addedAny){
      alert("Selecione pelo menos uma bebida.");
      return;
    }
  }

  closeSidebar();
}

