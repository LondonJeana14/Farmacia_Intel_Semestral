const API_BASE_URL = "http://localhost:7201/api"; // Ajusta el puerto según tu configuración

// ========== FUNCIONES PARA MEDICAMENTOS ==========

// Obtener todos los medicamentos disponibles
async function obtenerMedicamentos() {
    try {
        const response = await fetch(`${API_BASE_URL}/Medicamentos`);
        if (!response.ok) {
            throw new Error("Error al obtener medicamentos");
        }
        const medicamentos = await response.json();
        return medicamentos;
    } catch (error) {
        console.error("Error:", error);
        alert("Error al cargar medicamentos");
        return [];
    }
}

// Obtener un medicamento específico por ID
async function obtenerMedicamento(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/Medicamentos/${id}`);
        if (!response.ok) {
            throw new Error("Medicamento no encontrado");
        }
        const medicamento = await response.json();
        return medicamento;
    } catch (error) {
        console.error("Error:", error);
        return null;
    }
}

// ========== GESTIÓN DEL CARRITO ==========

// Agregar medicamento al carrito
async function agregarAlCarrito(idMedicamento) {
    try {
        // Obtener información del medicamento desde la API
        const response = await fetch(`${API_BASE_URL}/Medicamentos/${idMedicamento}`);
        
        if (!response.ok) {
            throw new Error("Medicamento no encontrado");
        }
        
        const medicamento = await response.json();
        
        // Verificar stock disponible
        if (medicamento.cantidad_disponible <= 0) {
            alert("Medicamento sin stock disponible");
            return;
        }
        
        // Obtener carrito del localStorage
        let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
        
        // Verificar si el medicamento ya está en el carrito
        let itemCarrito = carrito.find(item => item.id === medicamento.id);
        
        if (itemCarrito) {
            // Verificar que no exceda el stock
            if (itemCarrito.cantidad >= medicamento.cantidad_disponible) {
                alert("No hay más stock disponible de este medicamento");
                return;
            }
            itemCarrito.cantidad++;
        } else {
            // Agregar nuevo item al carrito
            carrito.push({
                id: medicamento.id,
                nombre: medicamento.nombre,
                precio: medicamento.precio,
                cantidad: 1,
                stockDisponible: medicamento.cantidad_disponible
            });
        }
        
        // Guardar carrito actualizado
        localStorage.setItem("carrito", JSON.stringify(carrito));
        alert(`${medicamento.nombre} agregado al carrito`);
        
        // Actualizar contador visual del carrito
        actualizarContadorCarrito();
        
    } catch (error) {
        console.error(error);
        alert("Error al agregar el medicamento al carrito");
    }
}

// Obtener el carrito actual
function obtenerCarrito() {
    return JSON.parse(localStorage.getItem("carrito")) || [];
}

// Actualizar cantidad de un item en el carrito
function actualizarCantidadCarrito(idMedicamento, nuevaCantidad) {
    let carrito = obtenerCarrito();
    let item = carrito.find(i => i.id === idMedicamento);
    
    if (item) {
        if (nuevaCantidad <= 0) {
            // Eliminar del carrito
            carrito = carrito.filter(i => i.id !== idMedicamento);
        } else if (nuevaCantidad <= item.stockDisponible) {
            item.cantidad = nuevaCantidad;
        } else {
            alert("Cantidad excede el stock disponible");
            return false;
        }
        
        localStorage.setItem("carrito", JSON.stringify(carrito));
        actualizarContadorCarrito();
        return true;
    }
    return false;
}

// Eliminar un item del carrito
function eliminarDelCarrito(idMedicamento) {
    let carrito = obtenerCarrito();
    carrito = carrito.filter(item => item.id !== idMedicamento);
    localStorage.setItem("carrito", JSON.stringify(carrito));
    actualizarContadorCarrito();
}

// Vaciar todo el carrito
function vaciarCarrito() {
    localStorage.removeItem("carrito");
    actualizarContadorCarrito();
}

// Calcular total del carrito
function calcularTotalCarrito() {
    const carrito = obtenerCarrito();
    return carrito.reduce((total, item) => total + (item.precio * item.cantidad), 0);
}

// Actualizar contador visual del carrito
function actualizarContadorCarrito() {
    const carrito = obtenerCarrito();
    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    
    const contadorCarrito = document.getElementById("contadorCarrito");
    if (contadorCarrito) {
        contadorCarrito.textContent = totalItems;
    }
}

// ========== CREAR PEDIDO ==========

// Crear pedido desde el carrito
async function crearPedido(datosPedido) {
    try {
        const response = await fetch(`${API_BASE_URL}/Pedidos`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datosPedido)
        });

        if (!response.ok) {
            throw new Error("Error al crear el pedido");
        }

        const pedidoCreado = await response.json();
        return pedidoCreado;
    } catch (error) {
        console.error("Error:", error);
        return null;
    }
}

// Procesar todos los pedidos del carrito
async function procesarPedido() {
    const carrito = obtenerCarrito();
    
    if (carrito.length === 0) {
        alert("Tu carrito está vacío");
        return false;
    }
    
    try {
        // Crear un pedido por cada medicamento en el carrito
        for (const item of carrito) {
            const pedido = {
                medicamento: item.nombre,
                cantidad: item.cantidad,
                fecha_pedido: new Date().toISOString()
            };
            
            const resultado = await crearPedido(pedido);
            if (!resultado) {
                throw new Error("Error al crear uno de los pedidos");
            }
        }
        
        // Vaciar el carrito después de crear los pedidos exitosamente
        vaciarCarrito();
        alert("¡Pedido realizado exitosamente!");
        return true;
        
    } catch (error) {
        console.error("Error al procesar pedido:", error);
        alert("Error al procesar el pedido");
        return false;
    }
}

// ========== FUNCIONES DE UI ==========

// Mostrar medicamentos en la página
async function mostrarMedicamentos() {
    const medicamentos = await obtenerMedicamentos();
    const contenedor = document.getElementById("listaMedicamentos");
    
    if (!contenedor) return;
    
    if (medicamentos.length === 0) {
        contenedor.innerHTML = '<p class="sin-productos">No hay medicamentos disponibles</p>';
        return;
    }
    
    contenedor.innerHTML = medicamentos.map(med => `
        <div class="medicamento-card">
            <h3>${med.nombre}</h3>
            <p class="precio">$${med.precio.toFixed(2)}</p>
            <p class="stock">Stock disponible: ${med.cantidad_disponible} unidades</p>
            ${med.cantidad_disponible > 0 
                ? `<button class="btn-agregar" onclick="agregarAlCarrito(${med.id})">Agregar al carrito</button>`
                : `<button class="btn-sin-stock" disabled>Sin stock</button>`
            }
        </div>
    `).join('');
}

// Mostrar el carrito
function mostrarCarrito() {
    const carrito = obtenerCarrito();
    const contenedor = document.getElementById("listaCarrito");
    const totalElement = document.getElementById("totalCarrito");
    
    if (!contenedor) return;
    
    if (carrito.length === 0) {
        contenedor.innerHTML = '<p class="carrito-vacio">Tu carrito está vacío</p>';
        if (totalElement) totalElement.textContent = '$0.00';
        return;
    }
    
    contenedor.innerHTML = carrito.map(item => `
        <div class="item-carrito">
            <div class="info-item">
                <h4>${item.nombre}</h4>
                <p class="precio">$${item.precio.toFixed(2)}</p>
            </div>
            <div class="controles-cantidad">
                <button onclick="cambiarCantidad(${item.id}, ${item.cantidad - 1})">-</button>
                <span class="cantidad">${item.cantidad}</span>
                <button onclick="cambiarCantidad(${item.id}, ${item.cantidad + 1})">+</button>
            </div>
            <div class="subtotal">$${(item.precio * item.cantidad).toFixed(2)}</div>
            <button class="btn-eliminar" onclick="eliminarDelCarrito(${item.id}); mostrarCarrito();">🗑️</button>
        </div>
    `).join('');
    
    // Actualizar total
    const total = calcularTotalCarrito();
    if (totalElement) {
        totalElement.textContent = `$${total.toFixed(2)}`;
    }
}

// Cambiar cantidad desde la UI
function cambiarCantidad(id, nuevaCantidad) {
    if (actualizarCantidadCarrito(id, nuevaCantidad)) {
        mostrarCarrito();
    }
}

// Finalizar compra
async function finalizarCompra() {
    const carrito = obtenerCarrito();
    
    if (carrito.length === 0) {
        alert("Tu carrito está vacío");
        return;
    }
    
    if (!confirm("¿Confirmar la compra?")) {
        return;
    }
    
    const resultado = await procesarPedido();
    
    if (resultado) {
        // Actualizar la vista del carrito
        mostrarCarrito();
        // Opcionalmente redirigir a una página de confirmación
        // window.location.href = "confirmacion.html";
    }
}

// ========== INICIALIZACIÓN ==========

document.addEventListener("DOMContentLoaded", function() {
    // Actualizar contador del carrito al cargar la página
    actualizarContadorCarrito();
    
    // Cargar medicamentos si existe el contenedor
    const contenedorMedicamentos = document.getElementById("listaMedicamentos");
    if (contenedorMedicamentos) {
        mostrarMedicamentos();
    }
    
    // Cargar carrito si existe el contenedor
    const contenedorCarrito = document.getElementById("listaCarrito");
    if (contenedorCarrito) {
        mostrarCarrito();
    }
    
    // Botón para finalizar compra
    const btnFinalizarCompra = document.getElementById("btnFinalizarCompra");
    if (btnFinalizarCompra) {
        btnFinalizarCompra.addEventListener("click", finalizarCompra);
    }
});