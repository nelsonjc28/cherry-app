import fs from 'fs';
import path from 'path';

// Function to remove console.log statements from a file
function removeConsoleLogs(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove console.log statements but keep the localStorage one in CarritoPage
    if (filePath.includes('CarritoPage.jsx')) {
      // Keep only the localStorage console.log
      content = content.replace(/console\.log\([^)]*\);?\s*/g, (match) => {
        if (match.includes('localStorage') || match.includes('CART DATA')) {
          return match; // Keep this one
        }
        return ''; // Remove others
      });
    } else {
      // Remove all console.log statements
      content = content.replace(/console\.log\([^)]*\);?\s*/g, '');
    }
    
    fs.writeFileSync(filePath, content);
    console.log(`Cleaned: ${filePath}`);
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

// Files to clean
const filesToClean = [
  'resources/js/pages/ContactoPage.jsx',
  'resources/js/pages/CookiesPage.jsx',
  'resources/js/pages/PromocionesPage.jsx',
  'resources/js/pages/ProductosPage.jsx',
  'resources/js/pages/NuevosPage.jsx',
  'resources/js/pages/ExplorarPage.jsx',
  'resources/js/pages/DestacadosOfertasPage.jsx',
  'resources/js/pages/DestacadosPage.jsx',
  'resources/js/pages/CatalogPage.jsx',
  'resources/js/pages/BuscarPage.jsx',
  'resources/js/components/CartDetailsProductCard/index.jsx',
  'resources/js/store/userStore.js'
];

filesToClean.forEach(removeConsoleLogs);
console.log('Console.log statements removed!'); 