import { useState, useEffect } from 'react';
import './CatalogFilter.css';
import { getIconPath } from '../../utils/assetPaths';
import CustomButton from '../CustomButton';
import { useAvailableColors, useAvailableCategories } from '../../hooks/useProducts';

const CatalogFilter = ({
  filters,
  onFilterChange,
  onClearFilters,
  isMobile = false,
  onClose
}) => {
  // Local state for expandable sections
  const [expandedSections, setExpandedSections] = useState({
    sortBy: false,
    clothing: false,
    department: false,
    sector: false,
    sizes: false,
    colors: false,
    price: false
  });

  // State to show/hide the accordion
  const [showAccordion, setShowAccordion] = useState(true);

  // Get dynamic data from API
  const { data: availableColors = [] } = useAvailableColors(filters.catalog);
  const { data: availableCategories = [] } = useAvailableCategories(filters.catalog);

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    const newFilters = { ...filters };

    switch (filterType) {
      case 'catalog':
        newFilters.catalog = value;
        // Reset category when catalog changes
        newFilters.category = 'Todas las categorías';
        break;
      case 'availability':
        newFilters.availability = value;
        break;
      case 'category':
        newFilters.category = value;
        break;
      case 'department':
        newFilters.department = value;
        break;
      case 'sector':
        newFilters.sector = value;
        break;
      case 'sizes':
        if (newFilters.sizes.includes(value)) {
          newFilters.sizes = newFilters.sizes.filter(size => size !== value);
        } else {
          newFilters.sizes = [...newFilters.sizes, value];
        }
        break;
      case 'priceRange':
        newFilters.priceRange = value;
        break;
      default:
        break;
    }

    onFilterChange(newFilters);
  };

  // Available filter options
  const catalogOptions = [
    'Cherry 2025 - 2026',
    'Cherry 2024 - 2025',
    'Cherry 2023 - 2024'
  ];

  const availabilityOptions = [
    { value: 'todos', label: 'Todos' },
    { value: 'con-existencia', label: 'Con existencia' }
  ];

  const clothingCategories = [
    'Todas las categorías',
    ...availableCategories
  ];

  const departments = [
    'Todos los departamentos',
    'Ropa Casual',
    'Ropa Formal',
    'Ropa Deportiva',
    'Accesorios',
    'Calzado'
  ];

  const sectors = [
    'Todos los sectores',
    'Mujer',
    'Hombre',
    'Unisex',
    'Niños'
  ];

  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  // Create color options from API data
  const colorOptions = availableColors.map(color => ({
    name: color,
    value: color,
    hex: '#666666' // Default color, you can map specific colors if needed
  }));

  return (
    <div className={`catalog-filter ${isMobile ? 'mobile' : 'desktop'}`}>
      {/* Mobile header */}
      {isMobile && (
        <div className="filter-mobile-header">
          <h2>Filtros</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
      )}

      <div className="filter-content">
        {/* Catalog selector */}
        <div className="filter-section">
          <h3 className="filter-title">Catálogo</h3>
          <select
            value={filters.catalog}
            onChange={(e) => handleFilterChange('catalog', e.target.value)}
            className="filter-select"
          >
            {catalogOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        {/* Availability filter */}
        <div className="filter-section">
          <h3 className="filter-title">Filtrar por:</h3>
          <div className="radio-group">
            {availabilityOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleFilterChange('availability', option.value)}
                className={`availability-button ${filters.availability === option.value ? 'selected' : ''}`}
              >
                <div className="availability-indicator"></div>
                <span>
                  {option.label}
                  {option.value === 'con-existencia' && (
                    <span style={{ fontSize: '10px', opacity: 0.8, marginLeft: '4px' }}>
                      (solo con stock)
                    </span>
                  )}
                </span>
                {filters.availability === option.value && (
                  <span style={{ 
                    position: 'absolute', 
                    right: '12px', 
                    fontSize: '12px', 
                    color: 'white',
                    fontWeight: 'bold'
                  }}>
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Category filter */}
        <div className="filter-section">
          <h3 className="filter-title">Categoría</h3>
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="filter-select"
          >
            {clothingCategories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        {/* Department filter */}
        <div className="filter-section">
          <h3 className="filter-title">Departamento</h3>
          <select
            value={filters.department}
            onChange={(e) => handleFilterChange('department', e.target.value)}
            className="filter-select"
          >
            {departments.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        {/* Sector filter */}
        <div className="filter-section">
          <h3 className="filter-title">Sector</h3>
          <select
            value={filters.sector}
            onChange={(e) => handleFilterChange('sector', e.target.value)}
            className="filter-select"
          >
            {sectors.map((sector) => (
              <option key={sector} value={sector}>{sector}</option>
            ))}
          </select>
        </div>

        {/* Sizes filter */}
        <div className="filter-section">
          <h3 className="filter-title">Tallas</h3>
          <div className="checkbox-group">
            {sizes.map((size) => (
              <label key={size} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={filters.sizes.includes(size)}
                  onChange={() => handleFilterChange('sizes', size)}
                  className="checkbox-input"
                />
                <span className="checkbox-text">{size}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Price range filter */}
        <div className="filter-section">
          <h3 className="filter-title">Rango de Precio</h3>
          <div className="price-range">
            <div className="price-input-group">
              <label>Mínimo:</label>
              <input
                type="number"
                value={filters.priceRange.min || ''}
                onChange={(e) => handleFilterChange('priceRange', {
                  ...filters.priceRange,
                  min: parseFloat(e.target.value) || 0
                })}
                placeholder="0"
                className="price-input"
              />
            </div>
            <div className="price-input-group">
              <label>Máximo:</label>
              <input
                type="number"
                value={filters.priceRange.max || ''}
                onChange={(e) => handleFilterChange('priceRange', {
                  ...filters.priceRange,
                  max: parseFloat(e.target.value) || 0
                })}
                placeholder="∞"
                className="price-input"
              />
            </div>
          </div>
        </div>

        {/* Clear filters button */}
        <div className="filter-section">
          <CustomButton
            onClick={onClearFilters}
            variant="outline"
            fullWidth
          >
            Limpiar Filtros
          </CustomButton>
        </div>
      </div>
    </div>
  );
};

export default CatalogFilter; 