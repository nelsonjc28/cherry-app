import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './UserMultiSelect.css';

const UserMultiSelect = ({ 
  selectedUsers = [], 
  onUsersChange, 
  placeholder = "Buscar usuarios...",
  maxHeight = "300px"
}) => {
  
  // Debug: Mostrar usuarios seleccionados recibidos
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Cargar usuarios al montar el componente
  useEffect(() => {
    loadUsers();
  }, []);

  // Filtrar usuarios cuando cambia el término de búsqueda
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => {
        const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
        const username = user.username?.toLowerCase() || '';
        const search = searchTerm.toLowerCase();
        return fullName.includes(search) || username.includes(search);
      });
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get('/api/admin/clients', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });


      if (response.data.success && response.data.users) {
        setUsers(response.data.users);
        setFilteredUsers(response.data.users);
      } else {
        setUsers([]);
        setError('Error al cargar usuarios');
      }
    } catch (error) {
      setError('Error al cargar usuarios');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleUserToggle = (user) => {
    if (!user || !user.id) {
      console.warn('Usuario inválido:', user);
      return;
    }
    
    const isSelected = selectedUsers.some(selected => selected && selected.id === user.id);
    let newSelectedUsers;
    
    if (isSelected) {
      newSelectedUsers = selectedUsers.filter(selected => selected && selected.id !== user.id);
    } else {
      newSelectedUsers = [...selectedUsers, user];
    }
    
    onUsersChange(newSelectedUsers);
  };

  const handleRemoveUser = (userToRemove) => {
    if (!userToRemove || !userToRemove.id) {
      console.warn('Usuario a eliminar inválido:', userToRemove);
      return;
    }
    
    const newSelectedUsers = selectedUsers.filter(user => user && user.id !== userToRemove.id);
    onUsersChange(newSelectedUsers);
  };

  const formatUserName = (user) => {
    if (!user || !user.first_name || !user.last_name) {
      return 'Usuario sin nombre';
    }
    return `${user.first_name} ${user.last_name}`;
  };

  
  return (
    <div className="user-multi-select" ref={dropdownRef}>
      {/* Input de búsqueda */}
      <div className="user-multi-select__input-container">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="user-multi-select__input"
        />
        {loading && (
          <div className="user-multi-select__loading">
            <div className="user-multi-select__spinner"></div>
          </div>
        )}
      </div>

      {/* Usuarios seleccionados */}
      {selectedUsers.length > 0 && (
        <div className="user-multi-select__selected">
          {selectedUsers.filter(user => user && user.id).map(user => (
            <div key={user.id} className="user-multi-select__selected-item">
              <span className="user-multi-select__selected-name">
                {formatUserName(user)}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveUser(user)}
                className="user-multi-select__remove-btn"
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
          className="user-multi-select__dropdown"
          style={{ maxHeight }}
        >
          {error && (
            <div className="user-multi-select__error">
              {error}
            </div>
          )}
          
          {loading && (
            <div className="user-multi-select__loading-message">
              Cargando usuarios...
            </div>
          )}
          
          {!loading && filteredUsers.length === 0 && (
            <div className="user-multi-select__no-results">
              {searchTerm ? 'No se encontraron usuarios' : 'No hay usuarios disponibles'}
            </div>
          )}
          
          {!loading && filteredUsers.length > 0 && (
            <>
              <div className="user-multi-select__count">
                {filteredUsers.length} usuario{filteredUsers.length !== 1 ? 's' : ''} disponible{filteredUsers.length !== 1 ? 's' : ''}
              </div>
              {filteredUsers.filter(user => user && user.id).map(user => {
                const isSelected = selectedUsers.some(selected => selected && selected.id === user.id);
                return (
                  <div
                    key={user.id}
                    className={`user-multi-select__item ${isSelected ? 'user-multi-select__item--selected' : ''}`}
                    onClick={() => handleUserToggle(user)}
                  >
                    <div className="user-multi-select__checkbox">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleUserToggle(user)}
                        className="user-multi-select__checkbox-input"
                      />
                    </div>
                    <div className="user-multi-select__item-info">
                      <div className="user-multi-select__item-name">
                        {formatUserName(user)}
                      </div>
                      <div className="user-multi-select__item-email">
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
