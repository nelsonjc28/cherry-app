import { useState, useEffect } from 'react';
import './CatalogFilter.css';
import { getIconPath } from '../../utils/assetPaths';
import CustomButton from '../CustomButton';
import { useAvailableColors, useAvailableCategories } from '../../hooks/useProducts';
import colorConverter from '../../services/colorConverter';
import api from '../../services/api';

const CatalogFilter = ({
  filters,
  onFilterChange,
  onClearFilters,
  isMobile = false,
  onClose,
  catalogs = [],
  catalogLoading = false,
  hideCatalogSelector = false,
  hideCategorySelector = false, // Mostrar categorías por defecto
  availableColors = [],
  availableSizes = [],
  availableCategories: propAvailableCategories = null // Categorías pasadas como prop (prioridad)
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
  const { data: apiAvailableCategories = [], isLoading: isLoadingApiCategories } = useAvailableCategories(filters.catalog);
  
  // Estado para categorías cargadas desde el endpoint /api/categories
  const [categoriesFromAPI, setCategoriesFromAPI] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  
  // Cargar categorías desde el endpoint /api/categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategoriesLoading(true);
        console.log('🔄 Iniciando carga de categorías desde /api/categories...');
        
        // Intentar cargar categorías con timeout
        const response = await Promise.race([
          api.get('/categories'),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout: La solicitud tardó más de 10 segundos')), 10000)
          )
        ]);
        
        console.log('📡 Respuesta de /api/categories:', {
          success: response.data?.success,
          hasCategories: !!response.data?.categories,
          categoriesCount: response.data?.categories?.length || 0,
          responseData: response.data
        });
        
        if (response.data && response.data.success && response.data.categories && Array.isArray(response.data.categories)) {
          // Mapear las categorías al formato esperado por CatalogFilter
          const mappedCategories = response.data.categories
            .filter(category => category && category.name) // Filtrar categorías inválidas
            .map(category => ({
              code: category.code || category.id?.toString() || null,
              name: category.name
            }))
            .filter(category => category.code !== null); // Filtrar categorías sin code válido
          
          console.log('✅ Categorías mapeadas desde /api/categories:', {
            count: mappedCategories.length,
            sample: mappedCategories.slice(0, 3)
          });
          setCategoriesFromAPI(mappedCategories);
        } else {
          console.warn('⚠️ Respuesta de /api/categories no tiene el formato esperado:', {
            hasData: !!response.data,
            success: response.data?.success,
            hasCategories: !!response.data?.categories,
            isArray: Array.isArray(response.data?.categories),
            responseData: response.data
          });
          setCategoriesFromAPI([]);
        }
      } catch (error) {
        console.error('❌ Error cargando categorías desde /api/categories:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          fullError: error
        });
        
        // Si es un error 404 o 500, puede ser un problema del servidor
        if (error.response?.status === 404) {
          console.warn('⚠️ Endpoint /api/categories no encontrado (404). Verificar rutas en producción.');
        } else if (error.response?.status === 500) {
          console.error('❌ Error del servidor (500) al obtener categorías. Revisar logs del servidor.');
        } else if (!error.response) {
          console.error('❌ Error de red al obtener categorías. Verificar conexión y configuración de API.');
        }
        
        // No establecer como array vacío, dejar que use el fallback de apiAvailableCategories
        setCategoriesFromAPI([]);
      } finally {
        setCategoriesLoading(false);
      }
    };

    // Verificar que api esté disponible antes de hacer la llamada
    if (typeof api !== 'undefined' && api) {
      loadCategories();
    } else {
      console.error('❌ API no está disponible. Verificar configuración de axios.');
      setCategoriesLoading(false);
    }
  }, []); // Solo ejecutar una vez al montar el componente
  
  // Log adicional para verificar que el useEffect se ejecutó
  useEffect(() => {
    console.log('🔄 CatalogFilter montado, iniciando carga de categorías...', {
      apiAvailable: typeof api !== 'undefined',
      baseURL: api?.defaults?.baseURL || 'no configurado'
    });
  }, []);
  
  // Usar categorías pasadas como prop si están disponibles, sino usar las del endpoint /api/categories, sino las de la API externa
  // Prioridad: prop > categoriesFromAPI > apiAvailableCategories
  let availableCategories = [];
  
  if (propAvailableCategories !== null && Array.isArray(propAvailableCategories) && propAvailableCategories.length > 0) {
    availableCategories = propAvailableCategories;
    console.log('✅ Usando categorías desde prop');
  } else if (categoriesFromAPI.length > 0) {
    availableCategories = categoriesFromAPI;
    console.log('✅ Usando categorías desde /api/categories:', categoriesFromAPI.length);
  } else if (apiAvailableCategories && Array.isArray(apiAvailableCategories) && apiAvailableCategories.length > 0) {
    availableCategories = apiAvailableCategories;
    console.log('✅ Usando categorías desde API externa (fallback):', apiAvailableCategories.length);
  } else {
    console.warn('⚠️ No hay categorías disponibles de ninguna fuente');
    availableCategories = [];
  }
  
  // Si aún no hay categorías y ya terminó de cargar, intentar usar apiAvailableCategories aunque esté vacío inicialmente
  // Esto es para casos donde la carga es asíncrona
  if (availableCategories.length === 0 && !categoriesLoading && !isLoadingApiCategories && apiAvailableCategories && apiAvailableCategories.length > 0) {
    console.log('🔄 Reintentando con apiAvailableCategories después de carga completa');
    availableCategories = apiAvailableCategories;
  }
  
  // Debug: Log para verificar categorías disponibles (siempre mostrar para debugging)
  console.log('🔍 Categorías en filtros:', {
    hideCategorySelector,
    propAvailableCategories: propAvailableCategories?.length || 0,
    categoriesFromAPI: categoriesFromAPI.length,
    categoriesFromAPISample: categoriesFromAPI.slice(0, 3), // Primeras 3 para debug
    apiAvailableCategories: apiAvailableCategories?.length || 0,
    apiAvailableCategoriesSample: apiAvailableCategories?.slice(0, 3), // Primeras 3 para debug
    isLoadingApiCategories,
    availableCategories: availableCategories.length,
    categoriesLength: availableCategories.length,
    categoriesLoading,
    finalCategories: availableCategories.slice(0, 5), // Mostrar solo las primeras 5 para no saturar
    source: propAvailableCategories?.length > 0 ? 'prop' : categoriesFromAPI.length > 0 ? 'api/categories' : apiAvailableCategories?.length > 0 ? 'api-externa' : 'ninguna',
    filtersCatalog: filters.catalog, // Para ver qué catálogo se está usando
    // Información adicional para debugging
    hasPropCategories: !!propAvailableCategories,
    hasCategoriesFromAPI: categoriesFromAPI.length > 0,
    hasApiCategories: apiAvailableCategories && apiAvailableCategories.length > 0
  });

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
        console.log('🔍 Filtro de categoría cambiado:', {
          categoryValue: value,
          availableCategories: availableCategories.find(cat => (cat.code || cat.id) == value)
        });
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

  // Available filter options - ya no se usa catalogOptions, se usa catalogs directamente


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
          <h6>Filtros</h6>
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

                    {catalogs.map((catalog) => (
                      <option key={catalog.id} value={catalog.id}>{catalog.name}</option>
                    ))}
                  </select>
                )}

              </div>
            )}

            {/* Category selector - mostrar siempre si no está oculto explícitamente */}
            {!hideCategorySelector && (
              <div className="filter-section expandable">
                <button
                  className="filter-section-header"
                  onClick={() => toggleSection('category')}
                >
                  <h3 className="filter-title">Categoría</h3>
                  <img src={getIconPath('Chevron Down.svg')} alt="Filter" className={`chevron ${expandedSections.category ? 'expanded' : ''}`} />
                </button>
                {expandedSections.category && (
                  <select
                    value={filters.category || ''}
                    onChange={(e) => {
                      const selectedValue = e.target.value;
                      console.log('🔍 Select de categoría cambiado:', {
                        selectedValue,
                        selectedCategory: availableCategories.find(cat => String(cat.code || cat.id) === String(selectedValue))
                      });
                      handleFilterChange('category', selectedValue);
                    }}
                    className="filter-select"
                  >
                    <option value="">Todas las categorías</option>
                    {availableCategories.length > 0 ? (
                      availableCategories.map((category) => {
                        const categoryCode = String(category.code || category.id);
                        return (
                          <option key={categoryCode} value={categoryCode}>
                            {category.name}
                          </option>
                        );
                      })
                    ) : (
                      <option value="" disabled>Cargando categorías...</option>
                    )}
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
