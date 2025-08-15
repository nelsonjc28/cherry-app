import CherryButton from './CherryButton';

// Example usage file for CherryButton component
// This file shows all the different ways to use the CherryButton

const CherryButtonExamples = () => {
  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h2>CherryButton Examples</h2>
      
      {/* Color Variants */}
      <section>
        <h3>Color Variants</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <CherryButton variant="red">
            Botón Rojo
          </CherryButton>
          
          <CherryButton variant="white">
            Botón Blanco
          </CherryButton>
          
          <CherryButton variant="outline">
            Botón Outline
          </CherryButton>
        </div>
      </section>

      {/* Size Variants */}
      <section>
        <h3>Size Variants</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <CherryButton size="small" variant="red">
            Small
          </CherryButton>
          
          <CherryButton size="medium" variant="red">
            Medium
          </CherryButton>
          
          <CherryButton size="large" variant="red">
            Large
          </CherryButton>
        </div>
      </section>

      {/* With Icons - Like Hero Banner */}
      <section>
        <h3>With Icons (Like Hero Banner)</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <CherryButton 
            variant="red" 
            icon={<img src="/icons/hero/Users.svg" alt="" width="20" height="20" />} 
            iconPosition="left"
          >
            Regístrate ahora
          </CherryButton>
          
          <CherryButton 
            variant="outline" 
            icon={<img src="/icons/hero/Chevron Right.svg" alt="" width="20" height="20" />} 
            iconPosition="right"
          >
            Explora
          </CherryButton>
          
          <CherryButton 
            variant="white" 
            icon={<img src="/icons/User.svg" alt="" width="20" height="20" />} 
            iconPosition="left"
          >
            Iniciar sesión
          </CherryButton>
        </div>
      </section>

      {/* As Links (React Router) */}
      <section>
        <h3>As Links (React Router)</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <CherryButton 
            variant="red" 
            to="/productos"
            icon={<span>→</span>}
          >
            Ver Productos
          </CherryButton>
          
          <CherryButton 
            variant="white" 
            to="/catalogo"
          >
            Ver Catálogos
          </CherryButton>
        </div>
      </section>

      {/* With onClick Callbacks */}
      <section>
        <h3>With onClick Callbacks</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <CherryButton 
            variant="red" 
            onClick={() => alert('Button clicked!')}
          >
            Click me
          </CherryButton>
          
          <CherryButton 
            variant="outline" 
            onClick={() => alert('Logged to console')}
          >
            Log to Console
          </CherryButton>
        </div>
      </section>

      {/* Disabled State */}
      <section>
        <h3>Disabled State</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <CherryButton 
            variant="red" 
            disabled
          >
            Disabled Button
          </CherryButton>
          
          <CherryButton 
            variant="white" 
            disabled
            icon={<span>→</span>}
          >
            Disabled with Icon
          </CherryButton>
        </div>
      </section>

      {/* Full Width */}
      <section>
        <h3>Full Width</h3>
        <div style={{ maxWidth: '300px' }}>
          <CherryButton 
            variant="red" 
            fullWidth
            icon={<span>→</span>}
          >
            Full Width Button
          </CherryButton>
        </div>
      </section>
    </div>
  );
};

export default CherryButtonExamples; 