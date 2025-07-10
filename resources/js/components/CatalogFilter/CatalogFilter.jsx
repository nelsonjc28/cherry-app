import { useState } from 'react';
import './CatalogFilter.css';
import { getIconPath } from '../../utils/assetPaths';
import CustomButton from '../CustomButton';

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
      case 'colors':
        if (newFilters.colors.includes(value)) {
          newFilters.colors = newFilters.colors.filter(color => color !== value);
        } else {
          newFilters.colors = [...newFilters.colors, value];
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
    'Blusas',
    'Vestidos',
    'Pantalones',
    'Faldas',
    'Chaquetas',
    'Accesorios'
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

  const colors = [
    { name: 'Rojo', value: 'red', hex: '#e74c3c' },
    { name: 'Azul', value: 'blue', hex: '#3498db' },
    { name: 'Verde', value: 'green', hex: '#27ae60' },
    { name: 'Amarillo', value: 'yellow', hex: '#f1c40f' },
    { name: 'Negro', value: 'black', hex: '#373737' },
    { name: 'Blanco', value: 'white', hex: '#ecf0f1' },
    { name: 'Rosa', value: 'pink', hex: '#e91e63' },
    { name: 'Morado', value: 'purple', hex: '#9b59b6' }
  ];

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
          {/* Status indicator */}
          <div style={{ 
            fontSize: '11px', 
            color: '#7f8c8d', 
            marginTop: '8px', 
            padding: '4px 8px',
            background: filters.availability === 'con-existencia' ? '#e8f5e8' : '#f8f9fa',
            borderRadius: '4px',
            border: `1px solid ${filters.availability === 'con-existencia' ? '#27ae60' : '#ddd'}`
          }}>
            <strong>Estado:</strong> {filters.availability === 'todos' ? 'Mostrando todos los productos' : 'Mostrando solo productos con stock'}
          </div>
        </div>

        {/* Filter button */}
        <CustomButton
          onClick={() => setShowAccordion((prev) => !prev)}
          iconLeft={<img className="filter-icon" src={getIconPath('Filter.svg')} alt="Comparar clientes" />}
          iconRight={<img src={getIconPath('Chevron Down.svg')} alt="Chevro" />}
          variant="outlined"
          size="medium"
          className="filters-btn"
        >
          Filtros
        </CustomButton>

        {/* Accordion content */}
        {showAccordion && (
          <>
            <div className="accordion-filter-content">
              {/* Sort by */}
              <div className="filter-section expandable">
                <button
                  className="filter-section-header"
                  onClick={() => toggleSection('sortBy')}
                >
                  <span>Ordenar por</span>
                  <img src={getIconPath('Chevron Down.svg')} alt="Filter" />
                </button>
                {expandedSections.sortBy && (
                  <div className="filter-section-content">
                    {/* Sort options would go here */}
                  </div>
                )}
              </div>

              {/* Clothing category */}
              <div className="filter-section expandable">
                <button
                  className="filter-section-header"
                  onClick={() => toggleSection('clothing')}
                >
                  <span>Ropa</span>
                  <img src={getIconPath('Chevron Down.svg')} alt="Filter" />
                </button>
                {expandedSections.clothing && (
                  <div className="filter-section-content">
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
                )}
              </div>

              {/* Department */}
              <div className="filter-section expandable">
                <button
                  className="filter-section-header"
                  onClick={() => toggleSection('department')}
                >
                  <span>Departamento</span>
                  <img src={getIconPath('Chevron Down.svg')} alt="Filter" />
                </button>
                {expandedSections.department && (
                  <div className="filter-section-content">
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
                )}
              </div>
              {/* Sector */}
              <div className="filter-section expandable">
                <button
                  className="filter-section-header"
                  onClick={() => toggleSection('sector')}
                >
                  <span>Sector</span>
                  <img src={getIconPath('Chevron Down.svg')} alt="Filter" />
                </button>
                {expandedSections.sector && (
                  <div className="filter-section-content">
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
                )}
              </div>

              {/* Sizes */}
              <div className="filter-section expandable">
                <button
                  className="filter-section-header"
                  onClick={() => toggleSection('sizes')}
                >
                  <span>Tallas</span>
                  <img src={getIconPath('Chevron Down.svg')} alt="Filter" />
                </button>
                {expandedSections.sizes && (
                  <div className="filter-section-content">
                    <div className="size-grid">
                      {sizes.map((size) => (
                        <label key={size} className="size-option">
                          <input
                            type="checkbox"
                            checked={filters.sizes.includes(size)}
                            onChange={() => handleFilterChange('sizes', size)}
                          />
                          <span className="size-text">{size}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Colors */}
              <div className="filter-section expandable">
                <button
                  className="filter-section-header"
                  onClick={() => toggleSection('colors')}
                >
                  <span>Colores</span>
                  <img src={getIconPath('Chevron Down.svg')} alt="Filter" className={`chevron ${expandedSections.clothing ? 'expanded' : ''}`} />
                </button>
                {expandedSections.colors && (
                  <div className="filter-section-content">
                    <div className="color-grid">
                      {colors.map((color) => (
                        <label key={color.value} className="color-option">
                          <input
                            type="checkbox"
                            checked={filters.colors.includes(color.value)}
                            onChange={() => handleFilterChange('colors', color.value)}
                          />
                          <span
                            className="color-swatch"
                            style={{ backgroundColor: color.hex }}
                            title={color.name}
                          ></span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Price range */}
            <div className="filter-section">
              <h3 className="filter-title">Precio | MXN</h3>
              <div className="price-inputs">
                <input
                  type="number"
                  placeholder="0.0"
                  value={filters.priceRange.min || ''}
                  onChange={(e) => handleFilterChange('priceRange', {
                    ...filters.priceRange,
                    min: parseFloat(e.target.value) || 0
                  })}
                  className="price-input"
                />
                <input
                  type="number"
                  placeholder="0.0"
                  value={filters.priceRange.max || ''}
                  onChange={(e) => handleFilterChange('priceRange', {
                    ...filters.priceRange,
                    max: parseFloat(e.target.value) || 0
                  })}
                  className="price-input"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="filter-actions">
              <CustomButton
                onClick={onClearFilters}
                iconLeft={<img className="filter-icon" src={getIconPath('Filter.svg')} alt="Comparar clientes" />}
                variant="outlined"
                size="medium"
              >
                Limpiar Filtros
              </CustomButton>
             
              {isMobile && (
                <CustomButton
                  onClick={onClose}
                  variant="filled"
                  size="medium"
                >
                  Aplicar filtros
                </CustomButton>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CatalogFilter; 