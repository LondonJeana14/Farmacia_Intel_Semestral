const API_BASE_URL = "https://localhost:7201/api";
async function cargarProductos() {
    try {
        
        const response = await fetch(`${API_BASE_URL}/Medicamentos`);
        
        if (!response.ok) {
            throw new Error("Error cargando medicamentos");
        }
        
        const productos = await response.json();
        const contenedor = document.getElementById("lista-productos");
        contenedor.innerHTML = "";
        
        productos.forEach(prod => {
           
            // Convertir Byte[] → Base64
            
            let imagenSrc = "imagenes/default.png"; 
            
            if (prod.imagen && prod.imagen.length > 0) {
                const base64String = btoa(
                    String.fromCharCode.apply(null, prod.imagen)
                );
                
                imagenSrc = `data:image/jpeg;base64,${base64String}`;
            }
            
            // Crear card
            const card = document.createElement("div");
            card.classList.add("card-producto");
            card.innerHTML = `
                <span class="stock">Stock: ${prod.cantidad_disponible}</span>
                <img src="${imagenSrc}" alt="${prod.nombre}">
                <h3>${prod.nombre}</h3>
                <p class="precio">$${prod.precio_unitario.toFixed(2)}</p>
                <button class="btn-agregar"
                    onclick="agregarAlCarrito(${prod.id}, '${prod.nombre}', ${prod.precio_unitario}, ${prod.cantidad_disponible})">
                    Agregar
                </button>
            `;
            contenedor.appendChild(card);
        });
    } catch (error) {
        console.error("Error cargando productos:", error);
        document.getElementById("lista-productos").innerHTML = `
            <div style="padding:20px;text-align:center;color:red;">
                Error al cargar productos. Verifica que el servidor esté corriendo.
            </div>
        `;
    }
}


function agregarAlCarrito(id, nombre, precio, stock) {
    let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    
    // Buscar si ya existe el producto
    const productoExistente = carrito.find(item => item.id === id);
    
    if (productoExistente) {
        // Si existe, aumentar cantidad
        productoExistente.cantidad++;
    } else {
        // Si no existe, agregarlo con cantidad 1
        carrito.push({ 
            id: id, 
            nombre: nombre, 
            precio: precio, 
            cantidad: 1,
            stockDisponible: stock
        });
    }
    
    localStorage.setItem("carrito", JSON.stringify(carrito));
    
    // Feedback visual
    alert(`${nombre} agregado al carrito`);
}


cargarProductos();
