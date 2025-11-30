import { 
    criarPedido, 
    adicionarItem, 
    calcularPrecoItem, 
    calcularTotal 
  } from "./services/pedidos";
  
  export async function testarCalculo() {
  
    // Criar comanda
    const pedidoId = await criarPedido("local", "manual");
    console.log("Pedido:", pedidoId);
  
    const item = {
      tipo: "pastel",
      nomeCliente: "João",
      detalhes: {
        sabores: ["carne", "queijo", "frango", "bacon", "calabresa"], // 5 sabores
        complementos: [],
        molhos: [],
      }
    };
  
    // Calcular preço antes de salvar
    item.preco = calcularPrecoItem(item);
    console.log("Preço calculado:", item.preco);
  
    // Adicionar item
    await adicionarItem(pedidoId, item);
  
    // Atualizar total da comanda
    const total = await calcularTotal(pedidoId);
    console.log("Total da comanda:", total);
  }
  