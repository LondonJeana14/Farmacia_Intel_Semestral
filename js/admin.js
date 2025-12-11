// admin.js - Panel de Administración REFACTORIZADO
const API_BASE = "https://localhost:7201/api/";

let modalEditar = null;
let refrescoIntervalId = null;

// ========================================
// INICIALIZACIÓN
// ========================================
window.addEventListener("DOMContentLoaded", async () => {
    const usuario = obtenerUsuarioActual();

    if (!usuario) {
        alert("Debes iniciar sesión");
        window.location.href = "login.html";
        return;
    }

    if (usuario.rol.toLowerCase() !== "admin") {
        alert("No tienes permisos de administrador");
        window.location.href = "index.html";
        return;
    }

    // Inicializar modal
    modalEditar = new bootstrap.Modal(document.getElementById('modalEditar'));

    // Mostrar info del usuario
    document.getElementById("infoUsuario").textContent =
        `👤 Bienvenido: ${usuario.nombre} ${usuario.apellido} (${usuario.rol})`;

    // Reloj en tiempo real
    actualizarHoraServidor();
    setInterval(actualizarHoraServidor, 1000);

    // Cargas iniciales
    await cargarMedicamentos();
    await cargarPredicciones();

    // Refresco automático cada 60 segundos
    if (refrescoIntervalId) clearInterval(refrescoIntervalId);
    refrescoIntervalId = setInterval(async () => {
        await cargarMedicamentos(false);
        await cargarPredicciones(false);
    }, 60000);

    // Listeners de pestañas
    document.getElementById('vencimientos-tab')?.addEventListener('shown.bs.tab', async () => {
        await cargarVencidos();
        await cargarPorVencer();
    });

    document.getElementById('prediccion-tab')?.addEventListener('shown.bs.tab', async () => {
        await cargarPredicciones();
    });
});

// ========================================
// HORA DEL SERVIDOR EN TIEMPO REAL
// ========================================
function actualizarHoraServidor() {
    const ahora = new Date();
    const hora = ahora.toLocaleTimeString('es-PA', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    const fecha = ahora.toLocaleDateString('es-PA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    document.getElementById("horaServidor").innerHTML =
        `🕐 Hora del servidor: ${hora}<br><small>${fecha}</small>`;
}

// ========================================
// PREVISUALIZAR IMAGEN (CREAR)
// ========================================
function previsualizarImagen(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        mostrarMensaje("warning", "⚠️ La imagen es muy grande. Máximo 2MB");
        event.target.value = '';
        return;
    }

    const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!tiposPermitidos.includes(file.type)) {
        mostrarMensaje("warning", "⚠️ Formato no permitido. Solo JPG, PNG, WEBP");
        event.target.value = '';
        return;
    }

    window.archivoImagen = file;

    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('imagePreview').src = e.target.result;
        document.getElementById('previewContainer').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function limpiarImagen() {
    document.getElementById('imagen').value = '';
    document.getElementById('imagePreview').src = '';
    document.getElementById('previewContainer').style.display = 'none';
    window.archivoImagen = null;
}

// ========================================
// PREVISUALIZAR IMAGEN (EDITAR)
// ========================================
function previsualizarImagenEditar(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        mostrarMensajeModal("warning", "⚠️ La imagen es muy grande. Máximo 2MB");
        event.target.value = '';
        return;
    }

    const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!tiposPermitidos.includes(file.type)) {
        mostrarMensajeModal("warning", "⚠️ Formato no permitido. Solo JPG, PNG, WEBP");
        event.target.value = '';
        return;
    }

    window.archivoImagenEditar = file;

    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('imagePreviewEdit').src = e.target.result;
        document.getElementById('previewContainerEdit').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function limpiarImagenEditar() {
    document.getElementById('editImagen').value = '';
    document.getElementById('imagePreviewEdit').src = '';
    document.getElementById('previewContainerEdit').style.display = 'none';
    window.archivoImagenEditar = null;
}

// ========================================
// CONVERTIR IMAGEN A BYTE ARRAY
// ========================================
async function convertirImagenAByteArray(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const arrayBuffer = e.target.result;
            const byteArray = Array.from(new Uint8Array(arrayBuffer));
            resolve(byteArray);
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// ========================================
// CREAR MEDICAMENTO
// ========================================
async function crearMedicamento(event) {
    event.preventDefault();

    let imagenByteArray = null;

    if (window.archivoImagen) {
        try {
            imagenByteArray = await convertirImagenAByteArray(window.archivoImagen);
        } catch (error) {
            mostrarMensaje("danger", "❌ Error al procesar la imagen");
            return;
        }
    }

    const fechaVenc = document.getElementById("fechaVencimiento").value;
    let fechaVencimientoUTC = null;
    
    if (fechaVenc) {
        // Convertir fecha local a UTC para enviar a la API
        const fechaLocal = new Date(fechaVenc + 'T00:00:00');
        fechaVencimientoUTC = fechaLocal.toISOString();
    }

    const medicamento = {
        nombre: document.getElementById("nombre").value.trim(),
        imagen: imagenByteArray,
        cantidad_disponible: parseInt(document.getElementById("cantidad").value),
        precio_unitario: parseFloat(document.getElementById("precio").value),
        fecha_vencimiento: fechaVencimientoUTC
    };

    const btn = document.getElementById("btnGuardar");
    btn.disabled = true;
    btn.textContent = "Guardando...";

    try {
        const response = await fetch(API_BASE + "Medicamentos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(medicamento)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Error al crear medicamento");
        }

        mostrarMensaje("success", "✅ Medicamento creado exitosamente en la base de datos");
        document.getElementById("formMedicamento").reset();
        limpiarImagen();
        await cargarMedicamentos();
    } catch (error) {
        console.error(error);
        mostrarMensaje("danger", `❌ ${error.message}`);
    } finally {
        btn.disabled = false;
        btn.textContent = "Guardar Medicamento";
    }
}

// ========================================
// CALCULAR ESTADO DE VENCIMIENTO
// ========================================
function calcularEstadoVencimiento(fechaIso) {
    if (!fechaIso) return { dias: null, estado: 'sin-fecha' };

    const fecha = new Date(fechaIso);
    const hoy = new Date();
    
    // Comparar solo las fechas sin hora
    fecha.setHours(0, 0, 0, 0);
    hoy.setHours(0, 0, 0, 0);

    const diffMs = fecha - hoy;
    const dias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (dias < 0) return { dias: Math.abs(dias), estado: 'vencido' };
    if (dias <= 30) return { dias, estado: 'por-vencer' };
    return { dias, estado: 'ok' };
}

// ========================================
// FORMATEAR FECHA
// ========================================
function formatearFecha(fechaIso) {
    if (!fechaIso) return 'Sin fecha';
    const fecha = new Date(fechaIso);
    return fecha.toLocaleDateString('es-PA', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// ========================================
// CARGAR MEDICAMENTOS
// ========================================
async function cargarMedicamentos(showError = true) {
    try {
        const response = await fetch(API_BASE + "Medicamentos");
        if (!response.ok) throw new Error("Error al cargar medicamentos");
        const medicamentos = await response.json();

        if (!medicamentos || medicamentos.length === 0) {
            document.getElementById("listaMedicamentos").innerHTML =
                '<div class="col-12"><p class="text-center text-muted">No hay medicamentos registrados</p></div>';
            return;
        }

        const html = medicamentos.map(m => {
            let imagenSrc = null;
            if (m.imagen && m.imagen.length > 0) {
                const base64String = btoa(String.fromCharCode.apply(null, m.imagen));
                imagenSrc = `data:image/jpeg;base64,${base64String}`;
            }

            const estado = calcularEstadoVencimiento(m.fecha_vencimiento);
            let vencimientoHtml = '';
            
            if (estado.estado === 'sin-fecha') {
                vencimientoHtml = `<p class="mb-2"><small>📅 Sin fecha de vencimiento</small></p>`;
            } else if (estado.estado === 'vencido') {
                vencimientoHtml = `
                    <p class="mb-2 text-danger">
                        <strong>❌ VENCIDO hace ${estado.dias} día(s)</strong><br>
                        <small>Fecha: ${formatearFecha(m.fecha_vencimiento)}</small>
                    </p>`;
            } else if (estado.estado === 'por-vencer') {
                vencimientoHtml = `
                    <p class="mb-2 text-warning">
                        <strong>⚠️ Por vencer en ${estado.dias} día(s)</strong><br>
                        <small>Fecha: ${formatearFecha(m.fecha_vencimiento)}</small>
                    </p>`;
            } else {
                vencimientoHtml = `
                    <p class="mb-2">
                        <small>📅 Vence: ${formatearFecha(m.fecha_vencimiento)}</small><br>
                        <small class="text-muted">(en ${estado.dias} días)</small>
                    </p>`;
            }

            return `
                <div class="col-md-6 col-lg-4">
                    <div class="card card-medicamento mb-3">
                        ${imagenSrc ?
                            `<img src="${imagenSrc}" class="card-img-top" alt="${m.nombre}" style="height:180px;object-fit:cover;">`
                            :
                            `<div class="card-img-top bg-secondary d-flex align-items-center justify-content-center" style="height:180px">
                                <span class="text-white fs-1">💊</span>
                            </div>`
                        }
                        <div class="card-body">
                            <h5 class="card-title">${m.nombre}</h5>
                            <p class="mb-1"><strong>Precio:</strong> $${m.precio_unitario.toFixed(2)}</p>
                            <p class="mb-1">
                                <strong>Stock:</strong>
                                <span class="badge ${m.cantidad_disponible > 20 ? 'bg-success' :
                                    m.cantidad_disponible > 10 ? 'bg-warning' : 'bg-danger'}">
                                    ${m.cantidad_disponible} unidades
                                </span>
                            </p>
                            ${vencimientoHtml}
                            <div class="btn-group w-100" role="group">
                                <button class="btn btn-sm btn-info" onclick="abrirModalEditar(${m.id})" title="Editar">✏️</button>
                                <button class="btn btn-sm btn-warning" onclick="reabastecer(${m.id})" title="Reabastecer">📦 +10</button>
                                <button class="btn btn-sm btn-danger" onclick="eliminarMedicamento(${m.id})" title="Eliminar">🗑️</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        document.getElementById("listaMedicamentos").innerHTML = html;
    } catch (error) {
        console.error(error);
        if (showError) {
            document.getElementById("listaMedicamentos").innerHTML =
                '<div class="col-12"><p class="text-danger text-center">❌ Error al cargar medicamentos. Verifica que la API esté corriendo en https://localhost:7201</p></div>';
        }
    }
}

// ========================================
// ABRIR MODAL DE EDITAR
// ========================================
async function abrirModalEditar(id) {
    try {
        const response = await fetch(API_BASE + `Medicamentos/${id}`);
        if (!response.ok) throw new Error("Error al cargar medicamento");

        const medicamento = await response.json();

        document.getElementById("editId").value = medicamento.id;
        document.getElementById("editNombre").value = medicamento.nombre;
        document.getElementById("editCantidad").value = medicamento.cantidad_disponible;
        document.getElementById("editPrecio").value = medicamento.precio_unitario;

        if (medicamento.fecha_vencimiento) {
            const fecha = new Date(medicamento.fecha_vencimiento);
            const year = fecha.getFullYear();
            const month = String(fecha.getMonth() + 1).padStart(2, '0');
            const day = String(fecha.getDate()).padStart(2, '0');
            document.getElementById("editFechaVencimiento").value = `${year}-${month}-${day}`;
        } else {
            document.getElementById("editFechaVencimiento").value = '';
        }

        limpiarImagenEditar();
        document.getElementById("mensajeModal").innerHTML = '';
        modalEditar.show();

    } catch (error) {
        console.error(error);
        mostrarMensaje("danger", "❌ Error al cargar datos del medicamento");
    }
}

// ========================================
// GUARDAR EDICIÓN
// ========================================
async function guardarEdicion(event) {
    event.preventDefault();

    const id = document.getElementById("editId").value;
    let imagenByteArray = null;

    if (window.archivoImagenEditar) {
        try {
            imagenByteArray = await convertirImagenAByteArray(window.archivoImagenEditar);
        } catch (error) {
            mostrarMensajeModal("danger", "❌ Error al procesar la imagen");
            return;
        }
    } else {
        try {
            const respActual = await fetch(API_BASE + `Medicamentos/${id}`);
            const medicamentoActual = await respActual.json();
            imagenByteArray = medicamentoActual.imagen;
        } catch (error) {
            console.error("Error al obtener imagen actual:", error);
        }
    }

    const fechaVenc = document.getElementById("editFechaVencimiento").value;
    let fechaVencimientoUTC = null;
    
    if (fechaVenc) {
        const fechaLocal = new Date(fechaVenc + 'T00:00:00');
        fechaVencimientoUTC = fechaLocal.toISOString();
    }

    const medicamentoActualizado = {
        id: parseInt(id),
        nombre: document.getElementById("editNombre").value.trim(),
        imagen: imagenByteArray,
        cantidad_disponible: parseInt(document.getElementById("editCantidad").value),
        precio_unitario: parseFloat(document.getElementById("editPrecio").value),
        fecha_vencimiento: fechaVencimientoUTC
    };

    const btn = document.getElementById("btnActualizar");
    btn.disabled = true;
    btn.textContent = "Actualizando...";

    try {
        const response = await fetch(API_BASE + `Medicamentos/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(medicamentoActualizado)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Error al actualizar medicamento");
        }

        mostrarMensaje("success", "✅ Medicamento actualizado exitosamente en la base de datos");
        modalEditar.hide();
        await cargarMedicamentos();
    } catch (error) {
        console.error(error);
        mostrarMensajeModal("danger", `❌ ${error.message}`);
    } finally {
        btn.disabled = false;
        btn.textContent = "Actualizar Medicamento";
    }
}

// ========================================
// REABASTECER
// ========================================
async function reabastecer(id) {
    try {
        const response = await fetch(API_BASE + `Medicamentos/${id}/reabastecer`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ extra: 10 })
        });

        if (!response.ok) throw new Error("Error al reabastecer");

        await cargarMedicamentos();
        mostrarMensaje("success", "✅ Reabastecido +10 unidades en la base de datos");
    } catch (error) {
        console.error(error);
        mostrarMensaje("danger", "❌ Error al reabastecer");
    }
}

// ========================================
// ELIMINAR MEDICAMENTO
// ========================================
async function eliminarMedicamento(id) {
    if (!confirm("⚠️ ¿Estás seguro de eliminar este medicamento de la base de datos?")) return;

    try {
        const response = await fetch(API_BASE + `Medicamentos/${id}`, {
            method: "DELETE"
        });

        if (!response.ok) throw new Error("Error al eliminar");

        await cargarMedicamentos();
        mostrarMensaje("success", "✅ Medicamento eliminado correctamente de la base de datos");
    } catch (error) {
        console.error(error);
        mostrarMensaje("danger", "❌ Error al eliminar el medicamento");
    }
}

// ========================================
// CARGAR VENCIDOS
// ========================================
async function cargarVencidos() {
    try {
        const response = await fetch(API_BASE + "Medicamentos/vencidos");
        if (!response.ok) throw new Error("Error al cargar vencidos");

        const vencidos = await response.json();

        const html = vencidos.length > 0 ? vencidos.map(m => `
            <div class="alert alert-danger">
                <strong>💊 ${m.nombre}</strong><br>
                Vencido el: ${formatearFecha(m.fecha_vencimiento)}<br>
                <small>Stock: ${m.cantidad_disponible} unidades</small>
            </div>
        `).join('') : '<p class="text-muted">✅ No hay medicamentos vencidos</p>';

        document.getElementById("medicamentosVencidos").innerHTML = html;
    } catch (error) {
        console.error(error);
        document.getElementById("medicamentosVencidos").innerHTML =
            '<p class="text-danger">❌ Error al cargar medicamentos vencidos</p>';
    }
}

// ========================================
// CARGAR POR VENCER (30 días)
// ========================================
async function cargarPorVencer() {
    try {
        const response = await fetch(API_BASE + "Medicamentos/por-vencer/30");
        if (!response.ok) throw new Error("Error al cargar por vencer");

        const porVencer = await response.json();

        const html = porVencer.length > 0 ? porVencer.map(m => {
            const estado = calcularEstadoVencimiento(m.fecha_vencimiento);
            return `
                <div class="alert alert-warning">
                    <strong>💊 ${m.nombre}</strong><br>
                    Vence el: ${formatearFecha(m.fecha_vencimiento)}<br>
                    <small>Faltan ${estado.dias} día(s) | Stock: ${m.cantidad_disponible} unidades</small>
                </div>
            `;
        }).join('') : '<p class="text-muted">✅ No hay medicamentos por vencer en los próximos 30 días</p>';

        document.getElementById("medicamentosPorVencer").innerHTML = html;
    } catch (error) {
        console.error(error);
        document.getElementById("medicamentosPorVencer").innerHTML =
            '<p class="text-danger">❌ Error al cargar medicamentos por vencer</p>';
    }
}

// ========================================
// CARGAR PREDICCIONES
// ========================================
async function cargarPredicciones(showError = true) {
    try {
        const response = await fetch(API_BASE + "Medicamentos/predicciones");
        if (!response.ok) throw new Error("Error al cargar predicciones");

        const predic = await response.json();

        if (!predic || predic.length === 0) {
            document.getElementById("listaPredicciones").innerHTML =
                '<p class="text-center text-muted">No hay predicciones disponibles</p>';
            return;
        }

        let maxVendido = Math.max(...predic.map(p => p.totalVendido || 0));

        const html = predic.map(p => {
            const esTop = (p.totalVendido || 0) === maxVendido && maxVendido > 0;
            return `
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h6 class="mb-1">
                                    💊 ${p.medicamento} 
                                    ${esTop ? '<span class="badge bg-success ms-2">🏆 Más vendido</span>' : ''}
                                </h6>
                                <p class="mb-1"><strong>Total vendido:</strong> ${p.totalVendido || 0} unidades</p>
                                ${p.mensaje ? `<small class="text-muted">📊 ${p.mensaje}</small>` : ''}
                            </div>
                            <button class="btn btn-sm btn-outline-primary" 
                                    onclick="buscarMedicamentoPorNombre('${encodeURIComponent(p.medicamento)}')">
                                Ver detalles
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        document.getElementById("listaPredicciones").innerHTML = html;
    } catch (error) {
        console.error(error);
        if (showError) {
            document.getElementById("listaPredicciones").innerHTML =
                '<p class="text-danger text-center">❌ Error al cargar predicciones</p>';
        }
    }
}

// ========================================
// BUSCAR MEDICAMENTO POR NOMBRE
// ========================================
async function buscarMedicamentoPorNombre(nombreEncoded) {
    const nombre = decodeURIComponent(nombreEncoded);
    try {
        const response = await fetch(API_BASE + "Medicamentos");
        if (!response.ok) throw new Error("Error al cargar medicamentos");
        
        const medicamentos = await response.json();
        const filtrados = medicamentos.filter(m => 
            m.nombre && m.nombre.toLowerCase().includes(nombre.toLowerCase())
        );
        
        if (filtrados.length === 0) {
            alert("No se encontró el medicamento en la lista actual");
            return;
        }

        await cargarMedicamentos();
        
        const triggerEl = document.querySelector('#medicamentos-tab');
        const tab = bootstrap.Tab.getOrCreateInstance(triggerEl);
        tab.show();
        
        setTimeout(() => {
            const cards = document.querySelectorAll('.card-medicamento');
            cards.forEach(card => {
                const titulo = card.querySelector('.card-title');
                if (titulo && titulo.textContent.toLowerCase().includes(nombre.toLowerCase())) {
                    card.style.border = '3px solid #0d6efd';
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
        }, 500);
        
    } catch (err) {
        console.error(err);
        alert("Error al buscar medicamento");
    }
}

// ========================================
// MENSAJES
// ========================================
function mostrarMensajeModal(tipo, texto) {
    const mensaje = document.getElementById("mensajeModal");
    mensaje.innerHTML = `
        <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
            ${texto}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
}

function mostrarMensaje(tipo, texto) {
    const cont = document.getElementById("mensaje");
    cont.innerHTML = `
        <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
            ${texto}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    setTimeout(() => cont.innerHTML = '', 5000);
}

// ========================================
// EXPORTAR FUNCIONES GLOBALES
// ========================================
window.previsualizarImagen = previsualizarImagen;
window.limpiarImagen = limpiarImagen;
window.previsualizarImagenEditar = previsualizarImagenEditar;
window.limpiarImagenEditar = limpiarImagenEditar;
window.crearMedicamento = crearMedicamento;
window.abrirModalEditar = abrirModalEditar;
window.guardarEdicion = guardarEdicion;
window.reabastecer = reabastecer;
window.eliminarMedicamento = eliminarMedicamento;
window.buscarMedicamentoPorNombre = buscarMedicamentoPorNombre;