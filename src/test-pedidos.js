import { criarPedido, adicionarItem } from "./services/pedidos";

export async function testarPedidos() {
  // Criar comanda
  const pedidoId = await criarPedido("local", "manual");
  console.log("Pedido criado:", pedidoId);

  // Adicionar pastel
  const itemId = await adicionarItem(pedidoId, {
    tipo: "pastel",
    nomeCliente: "João",
    preco: 12.5,
    quantidade: 1,
    detalhes: {
      sabores: ["carne", "queijo"],
      complementos: ["catupiry"],
      molhos: ["barbecue"],
      adicionais: 0
    }
  });

  console.log("Item criado:", itemId);
}
