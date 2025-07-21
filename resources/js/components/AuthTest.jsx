import React, { useState } from 'react';
import useUserStore from '../store/userStore';

const AuthTest = () => {
  const { user, token, fetchUser, loading } = useUserStore();
  const [testResult, setTestResult] = useState('');

  const testAuth = async () => {
    try {
      setTestResult('Probando autenticación...');
      
      // Test 1: Verificar token
      const storedToken = localStorage.getItem('token');
      setTestResult(prev => prev + '\nToken en localStorage: ' + (storedToken ? 'Sí' : 'No'));
      
      // Test 2: Llamar a /api/me
      const response = await fetch('/api/me', {
        headers: {
          'Authorization': `Bearer ${storedToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      setTestResult(prev => prev + `\nStatus /api/me: ${response.status}`);
      
      if (response.ok) {
        const userData = await response.json();
        setTestResult(prev => prev + `\nUsuario: ${userData?.first_name} ${userData?.last_name}`);
        setTestResult(prev => prev + `\nRol: ${userData?.role?.name}`);
      } else {
        const errorData = await response.json();
        setTestResult(prev => prev + `\nError: ${JSON.stringify(errorData)}`);
      }
      
      // Test 3: Llamar a /api/debug
      const debugResponse = await fetch('/api/debug', {
        headers: {
          'Authorization': `Bearer ${storedToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      setTestResult(prev => prev + `\nStatus /api/debug: ${debugResponse.status}`);
      
      if (debugResponse.ok) {
        const debugData = await debugResponse.json();
        setTestResult(prev => prev + `\nDebug: ${JSON.stringify(debugData)}`);
      }
      
    } catch (error) {
      setTestResult(prev => prev + `\nError: ${error.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <h2>Test de Autenticación</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Estado actual:</h3>
        <p>Usuario: {user ? `${user.first_name} ${user.last_name}` : 'No hay usuario'}</p>
        <p>Token: {token ? 'Sí' : 'No'}</p>
        <p>Loading: {loading ? 'Sí' : 'No'}</p>
      </div>
      
      <button onClick={testAuth} style={{ marginBottom: '20px' }}>
        Probar Autenticación
      </button>
      
      <div style={{ 
        backgroundColor: '#f5f5f5', 
        padding: '10px', 
        borderRadius: '5px',
        whiteSpace: 'pre-wrap',
        fontFamily: 'monospace',
        fontSize: '12px'
      }}>
        {testResult || 'Haz clic en "Probar Autenticación" para ver los resultados'}
      </div>
    </div>
  );
};

export default AuthTest; 