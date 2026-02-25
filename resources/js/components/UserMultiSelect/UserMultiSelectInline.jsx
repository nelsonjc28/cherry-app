import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const UserMultiSelect = ({
  selectedUsers = [],
  onUsersChange,
  placeholder = "Buscar usuarios...",
  maxHeight = "300px",
}) => {
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(allUsers);
      return;
    }

    const search = searchTerm.toLowerCase();
    const filtered = allUsers.filter((user) => {
      const fullName = `${user.first_name || ""} ${user.last_name || ""}`.toLowerCase();
      const username = user.username?.toLowerCase() || "";
      return fullName.includes(search) || username.includes(search);
    });

    setFilteredUsers(filtered);
  }, [searchTerm, allUsers]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");

      if (!token) {
        setError("No hay sesión activa");
        setAllUsers([]);
        setFilteredUsers([]);
        setLoading(false);
        return;
      }

      const response = await axios.get("/api/admin/clients", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (response.data.success && response.data.users) {
        setAllUsers(response.data.users);
        setFilteredUsers(response.data.users);
      } else {
        setError("No se pudieron cargar los usuarios");
        setAllUsers([]);
        setFilteredUsers([]);
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || err.message || "Error de conexión al cargar usuarios";
      setError(errorMsg);
      setAllUsers([]);
      setFilteredUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUserToggle = (user) => {
    const isSelected = selectedUsers.some((u) => u?.id === user.id);

    if (isSelected) {
      onUsersChange(selectedUsers.filter((u) => u?.id !== user.id));
    } else {
      onUsersChange([...selectedUsers, user]);
    }
  };

  const handleRemoveUser = (userToRemove) => {
    onUsersChange(selectedUsers.filter((u) => u?.id !== userToRemove.id));
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const formatUserName = (user) => {
    if (!user) return "Usuario desconocido";
    const firstName = user.first_name || "";
    const lastName = user.last_name || "";
    return `${firstName} ${lastName}`.trim() || "Sin nombre";
  };

  const handleSelectAll = () => {
    const formatted = allUsers
      .filter((u) => u?.id)
      .map((u) => ({
        ...u,
        name: formatUserName(u),
      }));

    onUsersChange(formatted);
  };

  const handleSelectByCategory = (category) => {
    const usersByCategory = allUsers
      .filter((u) => u?.id && u.seller_category === category)
      .map((u) => ({
        ...u,
        name: formatUserName(u),
      }));

    // Si ya están todos seleccionados, deseleccionarlos
    // Si no están todos seleccionados, agregarlos (sin duplicados)
    const currentCategoryUserIds = selectedUsers
      .filter(u => u.seller_category === category)
      .map(u => u.id);
    
    const allCategorySelected = usersByCategory.length > 0 && 
      usersByCategory.every(u => currentCategoryUserIds.includes(u.id));

    if (allCategorySelected) {
      // Deseleccionar usuarios de esta categoría
      onUsersChange(selectedUsers.filter(u => u.seller_category !== category));
    } else {
      // Agregar usuarios de esta categoría (sin duplicados)
      const existingIds = selectedUsers.map(u => u.id);
      const newUsers = usersByCategory.filter(u => !existingIds.includes(u.id));
      onUsersChange([...selectedUsers, ...newUsers]);
    }
  };

  const allSelected = selectedUsers.length === allUsers.length && allUsers.length > 0;
  
  // Verificar si todas las categorías están seleccionadas
  const oroUsers = allUsers.filter(u => u.seller_category === 'oro');
  const bronceUsers = allUsers.filter(u => u.seller_category === 'bronce');
  const diamanteUsers = allUsers.filter(u => u.seller_category === 'diamante');
  
  const selectedOroUsers = selectedUsers.filter(u => u.seller_category === 'oro');
  const selectedBronceUsers = selectedUsers.filter(u => u.seller_category === 'bronce');
  const selectedDiamanteUsers = selectedUsers.filter(u => u.seller_category === 'diamante');
  
  const allOroSelected = oroUsers.length > 0 && selectedOroUsers.length === oroUsers.length;
  const allBronceSelected = bronceUsers.length > 0 && selectedBronceUsers.length === bronceUsers.length;
  const allDiamanteSelected = diamanteUsers.length > 0 && selectedDiamanteUsers.length === diamanteUsers.length;

  return (
    <div style={{ position: "relative", width: "100%" }} ref={dropdownRef}>
      {/* Input */}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          style={{
            width: "100%",
            padding: "12px 16px",
            border: "2px solid #e1e5e9",
            borderRadius: "8px",
            fontSize: "14px",
            backgroundColor: "#fff",
            transition: "border-color 0.2s ease",
          }}
        />
      </div>

      {/* Selected users */}
      {selectedUsers.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            marginTop: "8px",
            padding: "8px",
            backgroundColor: "#f8f9fa",
            borderRadius: "6px",
          }}
        >
          {selectedUsers.map((user) => (
            <div
              key={user.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                backgroundColor: "#dc3545",
                color: "white",
                borderRadius: "20px",
                fontSize: "13px",
                fontWeight: 500,
              }}
            >
              <span>{formatUserName(user)}</span>
              <button
                type="button"
                onClick={() => handleRemoveUser(user)}
                style={{
                  background: "none",
                  border: "none",
                  color: "white",
                  fontSize: "16px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "white",
            border: "2px solid #e1e5e9",
            borderTop: "none",
            borderRadius: "0 0 8px 8px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
            zIndex: 1000,
            overflowY: "auto",
            maxHeight: "170px",
          }}
        >
          {/* Select All */}
          <div
            onClick={handleSelectAll}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "8px 12px",
              cursor: "pointer",
              backgroundColor: allSelected ? "#f8d7da" : "transparent",
              borderBottom: "1px solid #f1f3f4",
              fontWeight: 600,
              color: "#dc3545",
            }}
          >
            <input
              type="checkbox"
              readOnly
              checked={allSelected}
              style={{
                width: "14px",
                height: "14px",
                cursor: "pointer",
                accentColor: "#dc3545",
              }}
            />
            <span>Seleccionar todos</span>
          </div>

          {/* Select by Category - Oro */}
          {oroUsers.length > 0 && (
            <div
              onClick={() => handleSelectByCategory('oro')}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 12px",
                cursor: "pointer",
                backgroundColor: allOroSelected ? "#fff3cd" : "transparent",
                borderBottom: "1px solid #f1f3f4",
                fontWeight: 600,
                color: allOroSelected ? "#856404" : "#FFD700",
              }}
            >
              <input
                type="checkbox"
                readOnly
                checked={allOroSelected}
                style={{
                  width: "14px",
                  height: "14px",
                  cursor: "pointer",
                  accentColor: "#FFD700",
                }}
              />
              <span>🥇 Seleccionar Oro ({oroUsers.length})</span>
            </div>
          )}

          {/* Select by Category - Diamante */}
          {diamanteUsers.length > 0 && (
            <div
              onClick={() => handleSelectByCategory('diamante')}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 12px",
                cursor: "pointer",
                backgroundColor: allDiamanteSelected ? "#e0f7fa" : "transparent",
                borderBottom: "1px solid #f1f3f4",
                fontWeight: 600,
                color: allDiamanteSelected ? "#006064" : "#00BCD4",
              }}
            >
              <input
                type="checkbox"
                readOnly
                checked={allDiamanteSelected}
                style={{
                  width: "14px",
                  height: "14px",
                  cursor: "pointer",
                  accentColor: "#00BCD4",
                }}
              />
              <span>💎 Seleccionar Diamante ({diamanteUsers.length})</span>
            </div>
          )}

          {/* Select by Category - Bronce */}
          {bronceUsers.length > 0 && (
            <div
              onClick={() => handleSelectByCategory('bronce')}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 12px",
                cursor: "pointer",
                backgroundColor: allBronceSelected ? "#fff3cd" : "transparent",
                borderBottom: "1px solid #f1f3f4",
                fontWeight: 600,
                color: allBronceSelected ? "#856404" : "#CD7F32",
              }}
            >
              <input
                type="checkbox"
                readOnly
                checked={allBronceSelected}
                style={{
                  width: "14px",
                  height: "14px",
                  cursor: "pointer",
                  accentColor: "#CD7F32",
                }}
              />
              <span>🥉 Seleccionar Bronce ({bronceUsers.length})</span>
            </div>
          )}

          {/* Users list */}
          {filteredUsers.map((user) => {
            const isSelected = selectedUsers.some((u) => u?.id === user.id);

            return (
              <div
                key={user.id}
                onClick={() => handleUserToggle(user)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 12px",
                  cursor: "pointer",
                  borderBottom: "1px solid #f1f3f4",
                  backgroundColor: isSelected ? "#f8d7da" : "transparent",
                  transition: "background-color 0.2s ease",
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  readOnly
                  style={{
                    width: "14px",
                    height: "14px",
                    cursor: "pointer",
                    accentColor: "#dc3545",
                  }}
                />
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 500 }}>
                    {formatUserName(user)}
                  </div>
                  <div style={{ fontSize: "11px", color: "#6c757d" }}>
                    {user.username || "Sin usuario"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UserMultiSelect;