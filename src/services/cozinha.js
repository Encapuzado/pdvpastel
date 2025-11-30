// src/services/cozinha.js
// Funções para envio e atualização no monitor da cozinha (Realtime DB)

import { rtdb } from "../firebase";
import { ref, set, update } from "firebase/database";

// Enviar um item para a cozinha
export async function enviarItemParaCozinha(pedidoId, itemId, item) {

  console.log("=== DEBUG COZINHA ===");
  console.log("pedidoId:", pedidoId);
  console.log("itemId:", itemId);
  console.log("item:", item);

  const path = `cozinha/pedidos/${pedidoId}/itens/${itemId}`;
  console.log("RTDB path:", path);

  const itemRef = ref(rtdb, path);

  try {
    await set(itemRef, {
      nomeCliente: item.nomeCliente,
      tipo: item.tipo,
      preco: item.preco,
      status: "pendente",
      sabores: item.detalhes.sabores || [],
      complementos: item.detalhes.complementos || [],
      molhos: item.detalhes.molhos || [],
      adicionais: item.detalhes.adicionais || 0,
      criadoEm: Date.now()
    });

    console.log("SALVO NO RTDB COM SUCESSO");

  } catch (e) {
    console.error("ERRO AO SALVAR NO RTDB:", e);
  }
}

// Atualizar status do item na cozinha (ex: cozinhando → pronto)
export async function atualizarStatusCozinha(pedidoId, itemId, novoStatus) {

  const itemRef = ref(rtdb, `cozinha/pedidos/${pedidoId}/itens/${itemId}`);

  await update(itemRef, {
    status: novoStatus
  });

  return true;
}
