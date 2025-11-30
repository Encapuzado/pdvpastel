import { criarPedido, adicionarItem, calcularPrecoItem } from "./services/pedidos";

export async function testarCozinha() {

  const pedidoId = await criarPedido("local", "manual");

  const item = {
    tipo: "pastel",
    nomeCliente: "Maria",
    detalhes: {
      sabores: ["carne", "queijo"],
      complementos: ["catupiry"],
      molhos: ["barbecue"],
      adicionais: 0
    }
  };

  item.preco = calcularPrecoItem(item);

  await adicionarItem(pedidoId, item);

  console.log("Item enviado para cozinha:", pedidoId);
}
