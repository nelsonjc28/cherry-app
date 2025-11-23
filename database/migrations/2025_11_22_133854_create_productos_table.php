<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('productos', function (Blueprint $table) {
            $table->string('id')->primary(); // id_articulo como primary key
            $table->string('id_linea')->nullable();
            $table->integer('art_empresa')->default(1);
            $table->string('id_provedor')->nullable();
            $table->string('descripcion')->nullable();
            $table->string('marca')->nullable();
            $table->string('tkmov')->nullable();
            $table->string('tipo_venta')->nullable();
            $table->string('iva')->nullable();
            $table->decimal('costo', 10, 2)->default(0);
            $table->decimal('precio1', 10, 2)->default(0);
            $table->decimal('precio2', 10, 2)->default(0);
            $table->decimal('precio3', 10, 2)->default(0);
            $table->decimal('precio4', 10, 2)->default(0);
            $table->decimal('precio5', 10, 2)->default(0);
            $table->decimal('precio6', 10, 2)->default(0);
            $table->decimal('precio7', 10, 2)->default(0);
            $table->decimal('precio8', 10, 2)->default(0);
            $table->decimal('precio9', 10, 2)->default(0);
            $table->decimal('precio10', 10, 2)->default(0);
            $table->integer('stockmin')->default(0);
            $table->integer('stockmax')->default(0);
            $table->integer('piezas')->default(0);
            $table->string('proporcion')->nullable();
            $table->string('sku')->nullable();
            $table->string('ean')->nullable();
            $table->text('composicion')->nullable();
            $table->text('notas')->nullable();
            $table->string('imagen')->nullable();
            $table->date('fecha_alta')->nullable(); // Campo importante
            $table->integer('activo')->default(0);
            $table->integer('bandvend')->default(0);
            $table->integer('presel')->default(0);
            $table->string('tipoa')->nullable();
            $table->decimal('proma', 10, 2)->default(0);
            $table->decimal('promt', 10, 2)->default(0);
            $table->decimal('promr', 10, 2)->default(0);
            $table->string('id_molde')->nullable();
            $table->decimal('precio_dll', 10, 2)->default(0);
            $table->string('origen')->nullable();
            $table->decimal('precio_porcen1', 10, 2)->default(0);
            $table->decimal('precio_porcen2', 10, 2)->default(0);
            $table->decimal('precio_porcen3', 10, 2)->default(0);
            $table->decimal('precio_porcen4', 10, 2)->default(0);
            $table->text('especificaciones')->nullable();
            $table->text('bom')->nullable();
            $table->string('opc_expl')->nullable();
            $table->string('id_sublinea')->nullable();
            $table->string('nombre_artd')->nullable();
            $table->string('caja_med')->nullable();
            $table->string('caja_peso')->nullable();
            $table->string('id_impresion')->nullable();
            $table->string('medidas_art')->nullable();
            $table->string('medidas_imp')->nullable();
            $table->string('opc_desc')->nullable();
            $table->decimal('precio_mar', 10, 2)->default(0);
            $table->decimal('arancel', 10, 2)->default(0);
            $table->decimal('ancho_articulo', 10, 2)->default(0);
            $table->decimal('alto_articulo', 10, 2)->default(0);
            $table->decimal('ancho_caja', 10, 2)->default(0);
            $table->decimal('largo_caja', 10, 2)->default(0);
            $table->decimal('alto_caja', 10, 2)->default(0);
            $table->decimal('fob_china', 10, 2)->default(0);
            $table->decimal('costo_aduana', 10, 2)->default(0);
            $table->string('opc_web')->nullable();
            $table->string('url_video')->nullable();
            $table->string('id_articulo2')->nullable();
            $table->string('opc_nuevo')->nullable();
            $table->string('opc_promo')->nullable();
            $table->decimal('desc_promo', 10, 2)->default(0);
            $table->string('opc_tinta_azul')->nullable();
            $table->string('segunda_linea')->nullable();
            $table->string('id_prod')->nullable();
            $table->string('id_uni')->nullable();
            $table->decimal('costo_r', 10, 2)->default(0);
            $table->string('imagen_esq')->nullable();
            $table->string('tipoart')->nullable();
            $table->decimal('precio_alto', 10, 2)->default(0);
            $table->decimal('precio_anterior', 10, 2)->default(0);
            $table->decimal('costo_rmb', 10, 2)->default(0);
            $table->decimal('costo_tentativo', 10, 2)->default(0);
            $table->decimal('costo_promedio', 10, 2)->default(0);
            $table->string('familia')->nullable();
            $table->string('familia_1')->nullable();
            $table->string('familia_2')->nullable();
            $table->string('familia_3')->nullable();
            $table->string('familia_4')->nullable();
            $table->string('familia_5')->nullable();
            $table->string('familia_6')->nullable();
            $table->string('familia_7')->nullable();
            $table->string('cod_color')->nullable();
            $table->string('codbarra')->nullable();
            $table->string('codigo_prv')->nullable();
            $table->string('i_raiz')->nullable();
            $table->string('ict')->nullable();
            $table->text('campo_info_prv')->nullable();
            $table->string('unidad')->nullable();
            $table->string('tipo_empaque')->nullable();
            $table->string('temporada')->nullable();
            $table->string('opc_catalogo')->nullable();
            $table->integer('catalogoId')->nullable();
            $table->foreignId('genero_id')->nullable()->constrained('generos')->onDelete('set null');
            $table->foreignId('sector_id')->nullable()->constrained('sectores')->onDelete('set null');
            $table->string('fechaAct')->nullable();
            $table->string('opcinsert')->nullable();
            $table->decimal('cantidad', 10, 2)->default(0);
            $table->decimal('inventario', 10, 2)->default(0);
            $table->integer('idTienda')->default(0);
            $table->decimal('descuento', 10, 2)->default(0);
            $table->timestamps();
            
            // Índices
            $table->index('id_linea');
            $table->index('fecha_alta');
            $table->index('genero_id');
            $table->index('sector_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('productos');
    }
};
