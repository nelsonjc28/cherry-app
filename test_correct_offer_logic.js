// Script de prueba para verificar la lógica CORRECTA de ofertas "compra X obtén Y"
// La oferta es: por cada X que compres, obtienes Y gratis

function testCorrectOfferLogic(totalQuantity, buyQuantity, getQuantity) {
  console.log(`\n=== Prueba: ${totalQuantity} productos, oferta "compra ${buyQuantity} obtén ${getQuantity}" ===`);
  
  // Fórmula CORRECTA: por cada grupo de "buyQuantity" productos, obtienes "getQuantity" gratis
  const freeItems = Math.floor(totalQuantity / buyQuantity) * getQuantity;
  const paidItems = totalQuantity - freeItems;
  
  console.log(`Total productos: ${totalQuantity}`);
  console.log(`Productos a pagar: ${paidItems}`);
  console.log(`Productos gratis: ${freeItems}`);
  console.log(`Ahorro: ${freeItems} productos gratis`);
  
  return { totalQuantity, paidItems, freeItems };
}

// Casos de prueba para "compra 2 obtén 1 gratis"
console.log("=== PRUEBAS CORRECTAS PARA OFERTA 'COMPRA 2 OBTÉN 1 GRATIS' ===");

testCorrectOfferLogic(1, 2, 1); // 1 producto: paga 1, 0 gratis
testCorrectOfferLogic(2, 2, 1); // 2 productos: paga 1, 1 gratis ✅
testCorrectOfferLogic(3, 2, 1); // 3 productos: paga 2, 1 gratis ✅
testCorrectOfferLogic(4, 2, 1); // 4 productos: paga 2, 2 gratis ✅
testCorrectOfferLogic(5, 2, 1); // 5 productos: paga 3, 2 gratis ✅
testCorrectOfferLogic(6, 2, 1); // 6 productos: paga 3, 3 gratis ✅

console.log("\n=== PRUEBAS PARA OFERTA 'COMPRA 3 OBTÉN 1 GRATIS' ===");
testCorrectOfferLogic(3, 3, 1); // 3 productos: paga 2, 1 gratis ✅
testCorrectOfferLogic(6, 3, 1); // 6 productos: paga 4, 2 gratis ✅
testCorrectOfferLogic(9, 3, 1); // 9 productos: paga 6, 3 gratis ✅











