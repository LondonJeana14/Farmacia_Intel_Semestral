const API_BASE_URL = "https://localhost:7201/api";  
let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
let nombreUsuario = localStorage.getItem("usuarioNombre") || "Cliente";

function cargarCarrito() {
    let body = document.getElementById("cart-body");
    body.innerHTML = "";

    carrito.forEach((item, index) => {
        let subtotal = item.precio * item.cantidad;

        body.innerHTML += `
            <tr>
                <td>${item.nombre}</td>
                <td>$${item.precio.toFixed(2)}</td>
                <td>${item.cantidad}</td>
                <td>$${subtotal.toFixed(2)}</td>
                <td><button onclick="eliminarItem(${index})">Eliminar</button></td>
            </tr>
        `;
    });

    calcularTotal();
}

function calcularTotal() {
    let total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    document.getElementById("total").innerText = total.toFixed(2);
}


function eliminarItem(index) {
    carrito.splice(index, 1);
    localStorage.setItem("carrito", JSON.stringify(carrito));
    cargarCarrito();
}


document.getElementById("btn-pagar").addEventListener("click", async () => {

    if (carrito.length === 0) {
        alert("El carrito está vacío.");
        return;
    }

    try {
        
        for (const item of carrito) {
            
            // 1Obtener medicamento de la api
            const response = await fetch(`${API_BASE_URL}/Medicamentos/${item.id}`);
            
            if (!response.ok) {
                throw new Error(`Error obteniendo medicamento ${item.id}`);
            }
            
            const medicamento = await response.json();
            
            //  Verificar stock suficiente
            if (medicamento.cantidad_disponible < item.cantidad) {
                alert(`Stock insuficiente para ${item.nombre}`);
                return;
            }
            
            // Calcular nuevo stock
            const nuevoStock = medicamento.cantidad_disponible - item.cantidad;
            
            // Actualizar medicamento completo con PUT
            await fetch(`${API_BASE_URL}/Medicamentos/${item.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...medicamento,  // ✅ Enviar TODO el objeto
                    cantidad_disponible: nuevoStock  // ✅ Solo cambiar el stock
                })
            });
        }

        const compraResponse = await fetch(`${API_BASE_URL}/Compras`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                usuario: nombreUsuario,
                fecha: new Date().toISOString(),
                total: carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0),
                detalles: carrito
            })
        });

        if (!compraResponse.ok) {
            console.warn("No se pudo guardar la compra en el historial");
        }

        // ======================================================
        // MOSTRAR FACTURA
        // ======================================================
        generarFactura();

        alert("Pago realizado correctamente. ¡Gracias por su compra!");

        // Vaciar carrito
        carrito = [];
        localStorage.setItem("carrito", JSON.stringify([]));
        cargarCarrito();

    } catch (error) {
        console.error("Error al procesar el pago:", error);
        alert("Error al procesar el pago. Intente nuevamente.");
    }
});

// ======================================================
// GENERAR FACTURA
// ======================================================
function generarFactura() {
    let total = document.getElementById("total").innerText;
    let fecha = new Date().toLocaleDateString('es-PA');

    document.getElementById("factura-nombre").innerText = nombreUsuario;
    document.getElementById("factura-fecha").innerText = fecha;
    document.getElementById("factura-total").innerText = total;
    
    // Agregar detalle de productos (opcional)
    let detalleHTML = "<ul>";
    carrito.forEach(item => {
        detalleHTML += `<li>${item.cantidad}x ${item.nombre} - $${(item.precio * item.cantidad).toFixed(2)}</li>`;
    });
    detalleHTML += "</ul>";
    document.getElementById("factura-detalle").innerHTML = detalleHTML;
    
    document.getElementById("factura").style.display = "block";
}

cargarCarrito();
