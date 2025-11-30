// src/services/pedidos.js
// Funções centrais do fluxo de comandas

import { db } from "../firebase";
import { 
  collection, 
  addDoc, 
  doc, 
  setDoc, 
  serverTimestamp,
  updateDoc,
  getDocs
} from "firebase/firestore";
import { enviarItemParaCozinha } from "./cozinha";

// Criar um novo pedido (comanda)
export async function criarPedido(tipo = "local", origem = "manual") {
  const ref = collection(db, "pedidos");

  const novoPedido = {
    tipo,
    origem,
    status: "aberto",
    valorTotal: 0,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp()
  };

  const docRef = await addDoc(ref, novoPedido);
  return docRef.id;
}

// Adicionar um item na comanda
export async function adicionarItem(pedidoId, item) {

  const ref = collection(db, `pedidos/${pedidoId}/itens`);

  const novoItem = {
    tipo: item.tipo,
    nomeCliente: item.nomeCliente || "",
    preco: item.preco || 0,
    quantidade: item.quantidade || 1,
    status: "pendente",
    detalhes: item.detalhes || {},
    criadoEm: serverTimestamp()
  };

  const docRef = await addDoc(ref, novoItem);

  // Enviar item para a cozinha (Realtime Database)
  await enviarItemParaCozinha(pedidoId, docRef.id, novoItem);

  // Atualiza horário da comanda
  await updateDoc(doc(db, "pedidos", pedidoId), {
    atualizadoEm: serverTimestamp()
  });

  return docRef.id;
}



// Calcular o preço de um item
export function calcularPrecoItem(item) {
  if (item.tipo === "bebida") {
    return item.preco;
  }

  if (item.tipo === "pastel") {
    const precoBase = 10;
    const maxSabores = 4;
    const precoExtra = 1.5;

    const qtdSabores = item.detalhes.sabores?.length || 0;

    const extras = Math.max(0, qtdSabores - maxSabores);
    const valorExtras = extras * precoExtra;

    return precoBase + valorExtras;
  }

  return 0;
}

// Atualizar valor total da comanda
export async function calcularTotal(pedidoId) {
  const itensRef = collection(db, `pedidos/${pedidoId}/itens`);
  const snap = await getDocs(itensRef);

  let total = 0;

  snap.forEach((doc) => {
    const item = doc.data();
    total += item.preco || 0;
  });

  await updateDoc(doc(db, "pedidos", pedidoId), {
    valorTotal: total,
    atualizadoEm: serverTimestamp()
  });

  return total;
}
