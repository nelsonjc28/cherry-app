/**
 * Campos del formulario con el mismo estilo del módulo de Gestión de Clientes.
 * Cada affiliate-manager__form-row es un grid de 2 columnas: agrupa los campos
 * de dos en dos para llenar ambas columnas (igual que client-manager__form-row).
 * fields: [{ name, label, type: text|number|date|textarea|select|switch, required, options, rows }]
 */

const renderField = (f, form, setField) => {
  if (f.type === 'switch') {
    return (
      <>
        <label>{f.label}</label>
        <input type="checkbox" checked={!!form[f.name]} onChange={(e) => setField(f.name, e.target.checked)} />
      </>
    );
  }
  if (f.type === 'select') {
    return (
      <>
        <label>{f.label}</label>
        <select value={form[f.name] ?? ''} onChange={(e) => setField(f.name, e.target.value)}>
          {f.options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </>
    );
  }
  return (
    <>
      <label>{f.label}</label>
      {f.type === 'textarea' ? (
        <textarea rows={f.rows || 3} value={form[f.name] ?? ''} onChange={(e) => setField(f.name, e.target.value)} required={f.required} />
      ) : (
        <input type={f.type || 'text'} value={form[f.name] ?? ''} onChange={(e) => setField(f.name, e.target.value)} required={f.required} />
      )}
    </>
  );
};

const AffiliateCrudFormFields = ({ fields, form, setField, imageFile, setImageFile, preview, withImage, editing }) => {
  const rows = [];
  for (let i = 0; i < fields.length; i += 2) {
    rows.push(fields.slice(i, i + 2));
  }

  return (
    <div className="affiliate-manager__form-content">
      {rows.map((pair, idx) => (
        <div key={idx} className="affiliate-manager__form-row">
          {pair.map((f) => (
            <div key={f.name} className="affiliate-manager__form-group" style={{ gridColumn: 'span 1' }}>
              {renderField(f, form, setField)}
            </div>
          ))}
        </div>
      ))}

      {withImage && (
        <div className="affiliate-manager__form-row">
          <div className="affiliate-manager__form-group" style={{ gridColumn: 'span 2' }}>
            <label>Imagen{!editing ? ' *' : ''}</label>
            <input type="file" accept="image/*" onChange={(e) => {
              const file = e.target.files[0];
              setImageFile(file);
              setPreview(file ? URL.createObjectURL(file) : preview);
            }} />
          </div>
        </div>
      )}

      {preview && (
        <div className="affiliate-manager__form-row">
          <img src={preview} alt="Vista previa" className="affiliate-admin__preview" style={{ gridColumn: 'span 2' }} />
        </div>
      )}
    </div>
  );
};

export default AffiliateCrudFormFields;