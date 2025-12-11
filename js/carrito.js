let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

// Nombre del usuario guardado previamente
let nombreUsuario = localStorage.getItem("usuarioNombre") || "Cliente";

// === Cargar carrito en tabla ===
function cargarCarrito() {
    let body = document.getElementById("cart-body");
    body.innerHTML = "";

    carrito.forEach((item, index) => {
        let subtotal = item.precio * item.cantidad;

        body.innerHTML += `
            <tr>
                <td>${item.nombre}</td>
                <td>$${item.precio}</td>
                <td>${item.cantidad}</td>
                <td>$${subtotal}</td>
                <td><button onclick="eliminarItem(${index})">Eliminar</button></td>
            </tr>
        `;
    });

    calcularTotal();
}

// === Calcular total ===
function calcularTotal() {
    let total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    document.getElementById("total").innerText = total.toFixed(2);
}

// === Eliminar item ===
function eliminarItem(index) {
    carrito.splice(index, 1);
    localStorage.setItem("carrito", JSON.stringify(carrito));
    cargarCarrito();
}


// === BOTÓN PAGAR: AQUI SE LLAMA TU API ===
document.getElementById("btn-pagar").addEventListener("click", async () => {
    if (carrito.length === 0) {
        alert("El carrito está vacío.");
        return;
    }

    try {
        // Simular llamada a API para procesar pago
        await fetch("", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ carrito: carrito, usuario: nombreUsuario })
        });
        

        // Mostrar mensaje
        alert("Pago realizado correctamente.");

        // Mostrar factura en pantalla
        generarFactura();

        // Vaciar carrito local
        carrito = [];
        localStorage.setItem("carrito", JSON.stringify([]));

        cargarCarrito();

    } catch (error) {
        console.error(error);
        alert("Error al procesar el pago.");
    }
});


// === Generar factura ===
function generarFactura() {
    let total = document.getElementById("total").innerText;

    document.getElementById("factura-nombre").innerText = nombreUsuario;
    document.getElementById("factura-total").innerText = total;
    document.getElementById("factura").style.display = "block";
}


// Inicializar carrito al cargar
cargarCarrito();