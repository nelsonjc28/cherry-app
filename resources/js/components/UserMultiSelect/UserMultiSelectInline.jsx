import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const UserMultiSelect = ({ 
  selectedUsers = [], 
  onUsersChange, 
  placeholder = "Buscar usuarios...",
  maxHeight = "300px"
}) => {
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(allUsers);
      return;
    }

    const search = searchTerm.toLowerCase();
    const filtered = allUsers.filter(user => {
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
      const username = user.username?.toLowerCase() || '';
      return fullName.includes(search) || username.includes(search);
    });

    setFilteredUsers(filtered);
  }, [searchTerm, allUsers]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('No hay sesión activa');
        setAllUsers([]);
        setFilteredUsers([]);
        setLoading(false);
        return;
      }
      
      console.log('🔍 Cargando usuarios clientes...');
      
      const response = await axios.get('/api/admin/clients', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      console.log('✅ Respuesta de usuarios:', response.data);

      if (response.data.success && response.data.users) {
        console.log(`✅ ${response.data.users.length} usuarios cargados`);
        setAllUsers(response.data.users);
        setFilteredUsers(response.data.users);
      } else {
        console.error('❌ Respuesta sin usuarios:', response.data);
        setError('No se pudieron cargar los usuarios');
        setAllUsers([]);
        setFilteredUsers([]);
      }
    } catch (err) {
      console.error('❌ Error fetching users:', err);
      console.error('❌ Error response:', err.response?.data);
      
      const errorMsg = err.response?.data?.message || err.message || 'Error de conexión al cargar usuarios';
      setError(errorMsg);
      setAllUsers([]);
      setFilteredUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUserToggle = (user) => {
    const isSelected = selectedUsers.some(selected => selected && selected.id === user.id);
    
    if (isSelected) {
      const newUsers = selectedUsers.filter(selected => selected && selected.id !== user.id);
      onUsersChange(newUsers);
    } else {
      onUsersChange([...selectedUsers, user]);
    }
  };

  const handleRemoveUser = (userToRemove) => {
    const newUsers = selectedUsers.filter(user => user && user.id !== userToRemove.id);
    onUsersChange(newUsers);
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const formatUserName = (user) => {
    if (!user) return 'Usuario desconocido';
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    return `${firstName} ${lastName}`.trim() || 'Sin nombre';
  };
  
  return (
    <div style={{ position: 'relative', width: '100%' }} ref={dropdownRef}>
      {/* Input de búsqueda */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '12px 16px',
            border: '2px solid #e1e5e9',
            borderRadius: '8px',
            fontSize: '14px',
            backgroundColor: '#fff',
            transition: 'border-color 0.2s ease'
          }}
        />
        {loading && (
          <div style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)'
          }}>
            <div style={{
              width: '20px',
              height: '20px',
              border: '2px solid #e1e5e9',
              borderTop: '2px solid #dc3545',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
          </div>
        )}
      </div>

      {/* Usuarios seleccionados */}
      {selectedUsers.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginTop: '8px',
          padding: '8px',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px',
          minHeight: '40px'
        }}>
          {selectedUsers.filter(user => user && user.id).map(user => (
            <div key={user.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: '#dc3545',
              color: 'white',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 500
            }}>
              <span style={{ whiteSpace: 'nowrap' }}>
                {formatUserName(user)}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveUser(user)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  padding: 0,
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%'
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dropdown de usuarios */}
      {isOpen && (
        <div 
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'white',
            border: '2px solid #e1e5e9',
            borderTop: 'none',
            borderRadius: '0 0 8px 8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            overflowY: 'auto',
            maxHeight: '170px'
          }}
        >
          {error && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              borderBottom: '1px solid #f5c6cb',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}
          
          {loading && (
            <div style={{
              padding: '12px 12px',
              textAlign: 'center',
              color: '#6c757d',
              fontSize: '12px',
              fontStyle: 'italic'
            }}>
              Cargando usuarios...
            </div>
          )}
          
          {!loading && filteredUsers.length === 0 && (
            <div style={{
              padding: '12px 12px',
              textAlign: 'center',
              color: '#6c757d',
              fontSize: '12px',
              fontStyle: 'italic'
            }}>
              {searchTerm ? 'No se encontraron usuarios' : 'No hay usuarios disponibles'}
            </div>
          )}
          
          {!loading && filteredUsers.length > 0 && (
            <>
              <div style={{
                padding: '8px 12px',
                backgroundColor: '#f8f9fa',
                borderBottom: '1px solid #e1e5e9',
                fontSize: '11px',
                color: '#6c757d',
                fontWeight: 500
              }}>
                {filteredUsers.length} usuario{filteredUsers.length !== 1 ? 's' : ''} disponible{filteredUsers.length !== 1 ? 's' : ''}
              </div>
              {filteredUsers.filter(user => user && user.id).map(user => {
                const isSelected = selectedUsers.some(selected => selected && selected.id === user.id);
                return (
                  <div
                    key={user.id}
                    onClick={() => handleUserToggle(user)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f1f3f4',
                      backgroundColor: isSelected ? '#f8d7da' : 'transparent',
                      transition: 'background-color 0.2s ease'
                    }}
                  >
                    <div style={{ flexShrink: 0 }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleUserToggle(user)}
                        style={{
                          width: '14px',
                          height: '14px',
                          cursor: 'pointer',
                          accentColor: '#dc3545'
                        }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 500,
                        fontSize: '13px',
                        color: '#212529',
                        marginBottom: '1px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {formatUserName(user)}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: '#6c757d',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {user.username || 'Sin usuario'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default UserMultiSelect;

