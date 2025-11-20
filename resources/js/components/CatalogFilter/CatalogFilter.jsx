import { useState, useEffect } from 'react';
import './CatalogFilter.css';
import { getIconPath } from '../../utils/assetPaths';
import CustomButton from '../CustomButton';
import { useAvailableColors, useAvailableCategories } from '../../hooks/useProducts';
import colorConverter from '../../services/colorConverter';

const CatalogFilter = ({
  filters,
  onFilterChange,
  onClearFilters,
  isMobile = false,
  onClose,
  catalogs = [],
  catalogLoading = false,
  hideCatalogSelector = false,
  availableColors = [],
  availableSizes = []
}) => {
  // Local state for expandable sections
  const [expandedSections, setExpandedSections] = useState({
    sortBy: false,
    sizes: false,
    colors: false,
    catalog: false,
    category: false,
    price: false,
  });

  // State to show/hide the accordion
  const [showAccordion, setShowAccordion] = useState(true);

  // Get dynamic data from API
  const { data: apiColors = [] } = useAvailableColors(filters.catalog);
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
        newFilters.category = '';
        break;
      case 'category':
        newFilters.category = value;
        break;
      case 'availability':
        newFilters.availability = value;
        break;
      case 'sortBy':
        newFilters.sortBy = value;
        break;
      case 'sizes':
        if (newFilters.sizes.includes(value)) {
          newFilters.sizes = newFilters.sizes.filter(size => size !== value);
        } else {
          newFilters.sizes = [...newFilters.sizes, value];
        }
        break;
      case 'colors':
        // Ensure colors array exists
        if (!newFilters.colors) {
          newFilters.colors = [];
        }
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
  const catalogOptions = catalogs.length > 0
    ? [...catalogs.map(catalog => [{ name: catalog.name, 'code': catalog.code }])]
    : ['Seleccione', [{ name: 'Cargando catálogos...', code: 'Cargando catálogos...' }]];


  const availabilityOptions = [
    { value: 'todos', label: 'Todos' },
    { value: 'con-existencia', label: 'Con existencia' }
  ];


  // Get available sizes from props instead of static array
  const sizes = availableSizes.length > 0 ? availableSizes : ['XS', 'S', 'M', 'L', 'XL', 'XXL'];;;;

  // Create color options from props data with real hex values
  const colors = availableColors.map(color => ({
    name: color,
    value: color,
    hex: colorConverter.getColorHex(color) || '#666666' // Get real color hex or default
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

        {/* Filter button */}
        {!isMobile && (
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
        )}
        {/* Accordion content */}
        {showAccordion && (
          <>
            {/* Catalog selector - solo mostrar si no está oculto */}
            {!hideCatalogSelector && (
              <div className="filter-section expandable">
                <button
                  className="filter-section-header"
                  onClick={() => toggleSection('catalog')}
                >
                  <h3 className="filter-title">Catálogo</h3>
                  <img src={getIconPath('Chevron Down.svg')} alt="Filter" className={`chevron ${expandedSections.catalog ? 'expanded' : ''}`} />
                </button>
                {expandedSections.catalog && (
                  <select
                    value={filters.catalog}
                    onChange={(e) => handleFilterChange('catalog', e.target.value)}
                    className="filter-select"
                  >
                    <option value=''>Seleccione</option>

                    {catalogOptions.map((option) => (
                      <option key={option[0].code} value={option[0].code}>{option[0].name}</option>
                    ))}
                  </select>
                )}

              </div>
            )}

            {/* Category selector */}
            {availableCategories.length > 0 && (
              <div className="filter-section  expandable">
                <button
                  className="filter-section-header"
                  onClick={() => toggleSection('category')}
                >
                  <h3 className="filter-title">Categoría</h3>
                  <img src={getIconPath('Chevron Down.svg')} alt="Filter" className={`chevron ${expandedSections.clothing ? 'expanded' : ''}`} />
                </button>
                {expandedSections.category && (
                  <select
                    value={filters.category || ''}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    className="filter-select"
                  >
                    <option value="">Todas las categorías</option>
                    {availableCategories.map((category) => (
                      <option key={category.code} value={category.code}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
            {/* <div className="filter-section">
              <h3 className="filter-title">Filtrar por:</h3>
              <div className="radio-group">
                {availabilityOptions.map((option) => (
                  <label key={option.value} className="radio-label">
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleFilterChange('availability', option.value)}
                      className={`availability-button ${filters.availability === option.value ? 'selected' : ''}`}
                    >
                      <div className="availability-indicator"></div>
                      <span className="radio-text">
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
                  </label>
                ))}
              </div>
            </div> */}

            <div className="accordion-filter-content">
              {/* Sort by */}


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
                            checked={filters.colors && filters.colors.includes(color.value)}
                            onChange={() => handleFilterChange('colors', color.value)}
                          />
                          <div className="color-box">
                            <span
                              className="color-swatch"
                              style={{ backgroundColor: color.hex }}
                              title={color.name}
                            ></span>
                            <span className="color-name">{color.name}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>


            {/* Price range */}
            <div className="filter-section">
              <button
                className="filter-section-header"
                onClick={() => toggleSection('price')}
              >
                <h3 className="filter-title">Precio | MXN</h3>
                <img src={getIconPath('Chevron Down.svg')} alt="Filter" className={`chevron ${expandedSections.clothing ? 'expanded' : ''}`} />
              </button>
              {expandedSections.price && (
                <div className="price-inputs">
                  <div className="price-input-group">
                    <label htmlFor="price-min" className="price-label">Mínimo</label>
                    <input
                      id="price-min"
                      type="number"
                      placeholder="Precio mínimo"
                      value={filters.priceRange && filters.priceRange.min ? filters.priceRange.min : ''}
                      onChange={(e) => {
                        const minValue = parseFloat(e.target.value) || 0;
                        handleFilterChange('priceRange', {
                          ...filters.priceRange,
                          min: minValue
                        });
                      }}
                      className="price-input"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="price-input-group">
                    <label htmlFor="price-max" className="price-label">Máximo</label>
                    <input
                      id="price-max"
                      type="number"
                      placeholder="Precio máximo"
                      value={filters.priceRange && filters.priceRange.max ? filters.priceRange.max : ''}
                      onChange={(e) => {
                        const maxValue = parseFloat(e.target.value) || 0;
                        handleFilterChange('priceRange', {
                          ...filters.priceRange,
                          max: maxValue
                        });
                      }}
                      className="price-input"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              )}
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

              <CustomButton
                onClick={onClose}
                variant="filled"
                size="medium"
              >
                Aplicar filtros
              </CustomButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CatalogFilter; 
