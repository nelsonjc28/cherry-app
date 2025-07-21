import React from 'react';

function SimpleTest() {
  return (
    <div style={{ 
      padding: '50px', 
      backgroundColor: 'red', 
      color: 'white', 
      fontSize: '24px',
      textAlign: 'center'
    }}>
      <h1>¡PRUEBA SIMPLE!</h1>
      <p>Si puedes ver esto, el problema no es de compilación</p>
      <button 
        style={{ 
          backgroundColor: 'yellow', 
          color: 'black', 
          padding: '20px',
          fontSize: '18px',
          border: '3px solid black'
        }}
        onClick={() => alert('¡BOTÓN FUNCIONA!')}
      >
        BOTÓN DE PRUEBA
      </button>
    </div>
  );
}

export default SimpleTest; 