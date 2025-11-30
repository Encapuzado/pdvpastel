// firebase-collections-setup.js
// Roda apenas 1 vez para popular o Firestore com o cardápio Fritô Pastel

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function runSetup() {

  console.log("Iniciando criação das coleções...");

  // ------------------------------
  // 1. CONFIGURAÇÕES DO SISTEMA
  // ------------------------------
  await db.collection("configuracoes").doc("sistema").set({
    precoBasePastel: 10.00,
    maxSaboresInclusos: 4,
    precoSaborExtra: 1.50
  });

  // ---------------------------------
  // 2. SABORES SALGADOS
  // ---------------------------------
  const saboresSalgados = [
    "carne",
    "carne seca",
    "frango",
    "calabresa",
    "bacon",
    "queijo",
    "presunto",
    "catupiry",
    "ovo de codorna",
    "cheddar"
  ];

  for (const sabor of saboresSalgados) {
    await db.collection("sabores_salgados").doc(sabor.replace(/ /g, "_")).set({
      nome: sabor,
      tipo: "salgado",
      ativo: true
    });
  }

  // ---------------------------------
  // 3. SABORES DOCES
  // ---------------------------------
  const saboresDoces = [
    "banana",
    "nutella",
    "goiabada",
    "queijo fresco",
    "doce de leite"
  ];

  for (const sabor of saboresDoces) {
    await db.collection("sabores_doces").doc(sabor.replace(/ /g, "_")).set({
      nome: sabor,
      tipo: "doce",
      ativo: true
    });
  }

  // ---------------------------------
  // 4. COMPLEMENTOS
  // ---------------------------------
  const complementos = [
    "milho",
    "ervilha",
    "orégano",
    "cebola crispy",
    "batata palha",
    "palmito",
    "azeitona",
    "tomate",
    "cebola"
  ];

  for (const item of complementos) {
    await db.collection("complementos").doc(item.replace(/ /g, "_")).set({
      nome: item,
      ativo: true
    });
  }

  // ---------------------------------
  // 5. MOLHOS
  // ---------------------------------
  const molhos = [
    "barbecue",
    "ketchup",
    "maionese",
    "pimenta",
    "maionese temperada"
  ];

  for (const molho of molhos) {
    await db.collection("molhos").doc(molho.replace(/ /g, "_")).set({
      nome: molho,
      ativo: true
    });
  }

  // ---------------------------------
  // 6. BEBIDAS
  // ---------------------------------
  const bebidas = [
    { id: "refrigerante_lata", nome: "Refrigerante lata", preco: 6.00 },
    { id: "original_litrinho", nome: "Original litrinho", preco: 6.00 },
    { id: "mate_couro_1l", nome: "Mate Couro 1L", preco: 8.00 },
    { id: "coca_cola_1l", nome: "Coca-Cola 1L", preco: 9.00 },
    { id: "heineken", nome: "Heineken", preco: 9.00 },
    { id: "suco", nome: "Suco", preco: 5.00 },
    { id: "agua", nome: "Água", preco: 2.50 }
  ];

  for (const bebida of bebidas) {
    await db.collection("bebidas").doc(bebida.id).set({
      nome: bebida.nome,
      preco: bebida.preco,
      categoria: "bebida",
      ativo: true
    });
  }

  console.log("Todas as coleções foram criadas com sucesso!");

  process.exit();
}

runSetup().catch(err => {
  console.error("Erro ao criar coleções:", err);
  process.exit(1);
});
