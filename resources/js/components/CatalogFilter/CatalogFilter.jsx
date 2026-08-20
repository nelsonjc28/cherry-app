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
  hideCategorySelector = false,
  availableColors = [],
  availableSizes = [],
  availableCategories: propAvailableCategories = null,
  isProximamente = false
}) => {
  // Local state for expandable sections
  const [expandedSections, setExpandedSections] = useState({
    sortBy: false,
    sizes: false,
    colors: false,
    catalog: false,
    category: false,
    price: false,
    availability: false,
  });

  // State to show/hide the accordion
  const [showAccordion, setShowAccordion] = useState(true);

  // Get dynamic data from API - usar primer catálogo seleccionado o el catálogo único
  const selectedCatalogsForAPI = Array.isArray(filters.catalogs) && filters.catalogs.length > 0
    ? filters.catalogs[0]
    : (filters.catalog || 'Cherry 2025 - 2026');
  const { data: apiColors = [] } = useAvailableColors(selectedCatalogsForAPI);
  const { data: apiAvailableCategories = [], isLoading: isLoadingApiCategories } = useAvailableCategories(selectedCatalogsForAPI);
  
  // Estado para categorías cargadas desde el endpoint /api/categories
  const [categoriesFromAPI, setCategoriesFromAPI] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  
  // Cargar categorías desde el endpoint /api/categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategoriesLoading(true);
        
        // Intentar cargar categorías con timeout
        const response = await Promise.race([
          api.get('/categories'),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout: La solicitud tardó más de 10 segundos')), 10000)
          )
        ]);
        
        
        
        if (response.data && response.data.success && response.data.categories && Array.isArray(response.data.categories)) {
          // Mapear las categorías al formato esperado por CatalogFilter
          const mappedCategories = response.data.categories
            .filter(category => category && category.name) // Filtrar categorías inválidas
            .map(category => ({
              code: category.code || category.id?.toString() || null,
              name: category.name
            }))
            .filter(category => category.code !== null); // Filtrar categorías sin code válido
          
          
          setCategoriesFromAPI(mappedCategories);
        } else {
          
          setCategoriesFromAPI([]);
        }
      } catch (error) {
        
        
        // Si es un error 404 o 500, puede ser un problema del servidor
        if (error.response?.status === 404) {
        } else if (error.response?.status === 500) {
        } else if (!error.response) {
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
        // Normalizar value a string para comparación consistente
        const catalogValue = String(value);
        
        // Manejar como array para selección múltiple
        if (!newFilters.catalogs) {
          newFilters.catalogs = [];
        }
        if (Array.isArray(newFilters.catalog)) {
          // Si ya es array, convertir todos a strings
          newFilters.catalogs = newFilters.catalog.map(cat => String(cat));
        } else if (newFilters.catalog) {
          // Si es string, convertir a array con ese valor (normalizado a string)
          newFilters.catalogs = [String(newFilters.catalog)];
        }
        
        // Normalizar todos los valores del array a strings para comparación consistente
        newFilters.catalogs = newFilters.catalogs.map(cat => String(cat));
        
        // Toggle del valor en el array (comparación con strings)
        if (newFilters.catalogs.includes(catalogValue)) {
          newFilters.catalogs = newFilters.catalogs.filter(cat => String(cat) !== catalogValue);
        } else {
          newFilters.catalogs = [...newFilters.catalogs, catalogValue];
        }
        
        // Mantener compatibilidad con filtro único (para páginas que aún lo usan)
        newFilters.catalog = newFilters.catalogs.length === 1 ? newFilters.catalogs[0] : (newFilters.catalogs.length > 0 ? newFilters.catalogs : '');
        break;
      case 'category':
        // Normalizar value a string para comparación consistente
        const categoryValue = String(value);
        
        // Manejar como array para selección múltiple
        if (!newFilters.categories) {
          newFilters.categories = [];
        }
        if (Array.isArray(newFilters.category)) {
          // Si ya es array, convertir todos a strings
          newFilters.categories = newFilters.category.map(cat => String(cat));
        } else if (newFilters.category) {
          // Si es string, convertir a array con ese valor (normalizado a string)
          newFilters.categories = [String(newFilters.category)];
        }
        
        // Normalizar todos los valores del array a strings para comparación consistente
        newFilters.categories = newFilters.categories.map(cat => String(cat));
        
        // Toggle del valor en el array (comparación con strings)
        if (newFilters.categories.includes(categoryValue)) {
          newFilters.categories = newFilters.categories.filter(cat => String(cat) !== categoryValue);
        } else {
          newFilters.categories = [...newFilters.categories, categoryValue];
        }
        
        // Mantener compatibilidad con filtro único (para páginas que aún lo usan)
        newFilters.category = newFilters.categories.length === 1 ? newFilters.categories[0] : (newFilters.categories.length > 0 ? newFilters.categories : '');
        
        console.log('🔍 Filtro de categoría cambiado:', {
          categoryValue: categoryValue,
          categoriesArray: newFilters.categories,
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
  // Ahora la disponibilidad se maneja con un checkbox "Con existencia":
  // - desmarcado → availability = 'todos' (muestra todo, incluye agotados)
  // - marcado    → availability = 'con-existencia' (solo con stock)


  // Get available sizes from props instead of static array
  // Ordenar tallas: primero números, luego letras
  const rawSizes = availableSizes.length > 0 ? availableSizes : ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const sizes = [...rawSizes].sort((a, b) => {
    const aIsNumber = !isNaN(parseInt(a));
    const bIsNumber = !isNaN(parseInt(b));
    
    // Si ambos son números o ambos son letras, ordenar normalmente
    if (aIsNumber && bIsNumber) {
      return parseInt(a) - parseInt(b);
    }
    if (!aIsNumber && !bIsNumber) {
      return a.localeCompare(b);
    }
    
    // Si uno es número y otro es letra, el número va primero
    return aIsNumber ? -1 : 1;
  });

  // Create color options from props data with real hex values
  const colors = availableColors.map(color => ({
    name: color,
    value: color,
    hex: colorConverter.getColorHex(color) || '#666666' // Get real color hex or default
  }));

  return (
    <div 
      className={`catalog-filter ${isMobile ? 'mobile' : 'desktop'}`}
      onWheel={(e) => {
        // Prevenir que el scroll se propague al contenedor padre
        const target = e.currentTarget;
        const filterContent = target.querySelector('.filter-content');
        if (filterContent) {
          const { scrollTop, scrollHeight, clientHeight } = filterContent;
          const isAtTop = scrollTop === 0;
          const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
          
          // Si estamos en el top y scrolleamos hacia arriba, o en el bottom y scrolleamos hacia abajo
          // permitir que el scroll se propague
          if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
            return; // Permitir scroll del padre
          }
          
          // De lo contrario, prevenir la propagación
          e.stopPropagation();
        }
      }}
    >
      {/* Mobile header */}
      {isMobile && (
        <div className="filter-mobile-header">
          <h6>Filtros</h6>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
      )}

      <div className="filter-content" onWheel={(e) => e.stopPropagation()}>

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
                  <div className="filter-section-content">
                    <div className="multiselect-container">
                      <label className="multiselect-option">
                        <input
                          type="checkbox"
                          checked={(() => {
                            const selectedCatalogs = Array.isArray(filters.catalogs) 
                              ? filters.catalogs.map(cat => String(cat))
                              : (filters.catalog ? [String(filters.catalog)] : []);
                            return selectedCatalogs.includes('todos');
                          })()}
                          onChange={(e) => {
                            const selectedCatalogs = Array.isArray(filters.catalogs) 
                              ? filters.catalogs.map(cat => String(cat))
                              : (filters.catalog ? [String(filters.catalog)] : []);
                            const newFilters = { ...filters };
                            
                            if (e.target.checked) {
                              newFilters.catalogs = ['todos', ...selectedCatalogs.filter(cat => cat !== 'todos')];
                            } else {
                              newFilters.catalogs = selectedCatalogs.filter(cat => cat !== 'todos');
                            }
                            
                            // Si no hay catálogos seleccionados, limpiar el filtro completamente
                            if (newFilters.catalogs.length === 0) {
                              newFilters.catalogs = [];
                              newFilters.catalog = 'Seleccione';
                            } else {
                              newFilters.catalog = newFilters.catalogs.length === 1 && !newFilters.catalogs.includes('todos') 
                                ? newFilters.catalogs[0] 
                                : (newFilters.catalogs.length > 0 ? newFilters.catalogs : 'Seleccione');
                            }
                            
                            onFilterChange(newFilters);
                          }}
                        />
                        <span className="multiselect-label" style={{ fontWeight: 'bold' }}>Seleccione</span>
                      </label>
                      {catalogs.map((catalog) => {
                        const catalogCode = String(catalog.code || catalog.id);
                        const selectedCatalogs = Array.isArray(filters.catalogs) 
                          ? filters.catalogs.map(cat => String(cat))
                          : (filters.catalog ? [String(filters.catalog)] : []);
                        const isChecked = selectedCatalogs.includes(catalogCode);
                        
                        return (
                          <label key={catalog.id} className="multiselect-option">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const currentSelected = Array.isArray(filters.catalogs) 
                                  ? filters.catalogs.map(cat => String(cat))
                                  : (filters.catalog ? [String(filters.catalog)] : []);
                                const newFilters = { ...filters };
                                
                                if (e.target.checked) {
                                  newFilters.catalogs = [...currentSelected.filter(cat => cat !== 'todos'), catalogCode];
                                } else {
                                  newFilters.catalogs = currentSelected.filter(cat => cat !== catalogCode);
                                }
                                
                                if (newFilters.catalogs.length === 0) {
                                  newFilters.catalogs = [];
                                  newFilters.catalog = 'Seleccione';
                                } else {
                                  newFilters.catalog = newFilters.catalogs.length === 1 && !newFilters.catalogs.includes('todos') 
                                    ? newFilters.catalogs[0] 
                                    : (newFilters.catalogs.length > 0 ? newFilters.catalogs : 'Seleccione');
                                }
                                
                                onFilterChange(newFilters);
                              }}
                            />
                            <span className="multiselect-label">{catalog.name}</span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="filter-selected-count">
                      {(() => {
                        const selectedCatalogs = Array.isArray(filters.catalogs) 
                          ? filters.catalogs.filter(cat => cat !== 'todos' && cat !== 'Seleccione')
                          : (filters.catalog && filters.catalog !== 'Seleccione' && filters.catalog !== '' 
                            ? (Array.isArray(filters.catalog) 
                              ? filters.catalog.filter(cat => cat !== 'todos' && cat !== 'Seleccione')
                              : [String(filters.catalog)])
                            : []);
                        const count = selectedCatalogs.length;
                        
                        return count > 0
                          ? `${count} opción${count !== 1 ? 'es' : ''} seleccionada${count !== 1 ? 's' : ''}`
                          : 'Seleccione un catálogo';
                      })()}
                    </div>
                  </div>
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
                  <div className="filter-section-content">
                    {availableCategories.length > 0 ? (
                      <>
                        <div className="multiselect-container">
                          <label className="multiselect-option">
                            <input
                              type="checkbox"
                              checked={(() => {
                                const selectedCategories = Array.isArray(filters.categories) 
                                  ? filters.categories.map(cat => String(cat))
                                  : (filters.category ? (Array.isArray(filters.category) ? filters.category.map(cat => String(cat)) : [String(filters.category)]) : []);
                                return selectedCategories.includes('todos');
                              })()}
                              onChange={(e) => {
                                const selectedCategories = Array.isArray(filters.categories) 
                                  ? filters.categories.map(cat => String(cat))
                                  : (filters.category ? (Array.isArray(filters.category) ? filters.category.map(cat => String(cat)) : [String(filters.category)]) : []);
                                const newFilters = { ...filters };
                                
                                if (e.target.checked) {
                                  newFilters.categories = ['todos', ...selectedCategories.filter(cat => cat !== 'todos')];
                                } else {
                                  newFilters.categories = selectedCategories.filter(cat => cat !== 'todos');
                                }
                                
                                newFilters.category = newFilters.categories.length === 1 && !newFilters.categories.includes('todos') 
                                  ? newFilters.categories[0] 
                                  : (newFilters.categories.length > 0 ? newFilters.categories : '');
                                
                                onFilterChange(newFilters);
                              }}
                            />
                            <span className="multiselect-label" style={{ fontWeight: 'bold' }}>Seleccione</span>
                          </label>
                          {availableCategories.map((category) => {
                            const categoryCode = String(category.code || category.id);
                            const selectedCategories = Array.isArray(filters.categories) 
                              ? filters.categories.map(cat => String(cat))
                              : (filters.category ? (Array.isArray(filters.category) ? filters.category.map(cat => String(cat)) : [String(filters.category)]) : []);
                            const isChecked = selectedCategories.includes(categoryCode);
                            
                            return (
                              <label key={categoryCode} className="multiselect-option">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const currentSelected = Array.isArray(filters.categories) 
                                      ? filters.categories.map(cat => String(cat))
                                      : (filters.category ? (Array.isArray(filters.category) ? filters.category.map(cat => String(cat)) : [String(filters.category)]) : []);
                                    const newFilters = { ...filters };
                                    
                                    if (e.target.checked) {
                                      newFilters.categories = [...currentSelected.filter(cat => cat !== 'todos'), categoryCode];
                                    } else {
                                      newFilters.categories = currentSelected.filter(cat => cat !== categoryCode);
                                    }
                                    
                                    newFilters.category = newFilters.categories.length === 1 && !newFilters.categories.includes('todos') 
                                      ? newFilters.categories[0] 
                                      : (newFilters.categories.length > 0 ? newFilters.categories : '');
                                    
                                    onFilterChange(newFilters);
                                  }}
                                />
                                <span className="multiselect-label">{category.name}</span>
                              </label>
                            );
                          })}
                        </div>
                        <div className="filter-selected-count">
                          {(() => {
                            const selectedCategories = Array.isArray(filters.categories) 
                              ? filters.categories 
                              : (filters.category ? (Array.isArray(filters.category) ? filters.category : [String(filters.category)]) : []);
                            const count = selectedCategories.length;
                            
                            return count > 0
                              ? `${count} opción${count !== 1 ? 'es' : ''} seleccionada${count !== 1 ? 's' : ''}`
                              : 'Seleccione una categoría';
                          })()}
                        </div>
                      </>
                    ) : (
                      <div className="filter-loading">Cargando categorías...</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* <div className="accordion-filter-content"> */}
              {/* Sort by */}


              {/* Sizes */}
              <div className="filter-section expandable">
                <button
                  className="filter-section-header"
                  onClick={() => toggleSection('sizes')}
                >
                  <h3 className="filter-title">Tallas</h3>
                  <img src={getIconPath('Chevron Down.svg')} alt="Filter" className={`chevron ${expandedSections.sizes ? 'expanded' : ''}`} />
                </button>
                {expandedSections.sizes && (
                  <div className="filter-section-content">
                    <div className="filter-scroll-container">
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
                  </div>
                )}
              </div>

              {/* Colors */}
              <div className="filter-section expandable">
                <button
                  className="filter-section-header"
                  onClick={() => toggleSection('colors')}
                >
                  <h3 className="filter-title">Colores</h3>
                  <img src={getIconPath('Chevron Down.svg')} alt="Filter" className={`chevron ${expandedSections.colors ? 'expanded' : ''}`} />
                </button>
                {expandedSections.colors && (
                  <div className="filter-section-content">
                    <div className="filter-scroll-container">
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
                  </div>
                )}
              </div>
            {/* </div> */}


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

            {/* Availability checkbox - sin desplegable, debajo de Precio */}
            {isProximamente && (
              <p className="filter-info-note">
                En "Próximamente" los productos aún no tienen existencia.
              </p>
            )}
            <label className={`availability-checkbox ${isProximamente ? 'disabled' : ''}`}>
              <input
                type="checkbox"
                checked={filters.availability === 'con-existencia'}
                disabled={isProximamente}
                onChange={(e) => {
                  if (isProximamente) return;
                  handleFilterChange(
                    'availability',
                    e.target.checked ? 'con-existencia' : 'todos'
                  );
                }}
              />
              <span>Con existencia</span>
            </label>

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
