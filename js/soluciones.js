// soluciones.js
const API_BASE = "https://localhost:7201/api/";

// ========================================
// FUNCIONES COMPARTIDAS
// ========================================
function mostrarMensaje(tipo, texto, idElemento = "mensaje") {
    const mensaje = document.getElementById(idElemento);
    if (!mensaje) return;
    
    mensaje.innerHTML = `
        <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
            ${texto}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    if (tipo !== 'danger') {
        setTimeout(() => {
            mensaje.innerHTML = '';
        }, 5000);
    }
}

// ========================================
// LOGIN
// ========================================
async function login(event) {
    event.preventDefault();
    
    const correo = document.getElementById("correo").value.trim();
    const contrasena = document.getElementById("contrasena").value.trim();
    const btnLogin = document.getElementById("btnLogin");
    
    if (!correo || !contrasena) {
        mostrarMensaje("warning", "⚠️ Todos los campos son obligatorios.");
        return;
    }

    const credenciales = { correo, contrasena };
    
    btnLogin.disabled = true;
    btnLogin.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Iniciando...';

    try {
        const response = await fetch(API_BASE + "Usuarios/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credenciales)
        });

        if (!response.ok) {
            let errorMsg = "Correo o contraseña incorrectos";
            if (response.status === 500) errorMsg = "Error del servidor";
            mostrarMensaje("danger", `❌ ${errorMsg}`);
            return;
        }

        const usuario = await response.json();
        localStorage.setItem("usuario", JSON.stringify(usuario));
        
        mostrarMensaje("success", `✅ ¡Bienvenido ${usuario.nombre}!`);

        setTimeout(() => {
            if (usuario.rol && usuario.rol.toLowerCase() === "admin") {
                window.location.href = "administrador.html";
            } else {
                window.location.href = "cliente.html";
            }
        }, 1500);

    } catch (error) {
        console.error("Error:", error);
        mostrarMensaje("danger", "❌ No se pudo conectar con el servidor");
    } finally {
        btnLogin.disabled = false;
        btnLogin.innerHTML = 'Iniciar Sesión';
    }
}

// ========================================
// REGISTRO (CON DEBUGGING COMPLETO)
// ========================================
async function registrar(event) {
    event.preventDefault();
    
    console.log("🔵 INICIO DEL REGISTRO");
    
    const nombre = document.getElementById("nombre").value.trim();
    const apellido = document.getElementById("apellido").value.trim();
    const correo = document.getElementById("correo").value.trim();
    const contrasena = document.getElementById("contrasena").value;
    const confirmarContrasena = document.getElementById("confirmarContrasena").value;
    const btnRegistrar = document.getElementById("btnRegistrar");
    
    console.log("📝 Datos capturados:", { nombre, apellido, correo, contrasena });
    
    // Validaciones
    if (!nombre || !apellido || !correo || !contrasena) {
        console.log("❌ Validación fallida: Campos vacíos");
        mostrarMensaje("warning", "⚠️ Completa todos los campos obligatorios");
        return;
    }
    
    if (contrasena !== confirmarContrasena) {
        console.log("❌ Validación fallida: Contraseñas no coinciden");
        mostrarMensaje("danger", "❌ Las contraseñas no coinciden");
        return;
    }
    
    if (contrasena.length < 6) {
        console.log("❌ Validación fallida: Contraseña muy corta");
        mostrarMensaje("warning", "⚠️ La contraseña debe tener al menos 6 caracteres");
        return;
    }

    const nuevoUsuario = { nombre, apellido, correo, contrasena };
    
    console.log("📤 Enviando a API:", API_BASE + "Usuarios");
    console.log("📦 Payload:", JSON.stringify(nuevoUsuario, null, 2));
    
    btnRegistrar.disabled = true;
    btnRegistrar.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Registrando...';

    try {
        const response = await fetch(API_BASE + "Usuarios", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(nuevoUsuario)
        });

        console.log(" Status de respuesta:", response.status);
        console.log(" Response completo:", response);

        if (!response.ok) {
            let errorMsg = "Error al registrar";
            
            try {
                const errorData = await response.json();
                console.error("❌ Error de la API:", errorData);
                
                if (response.status === 400) {
                    errorMsg = "Datos inválidos o correo ya existe";
                } else if (response.status === 500) {
                    errorMsg = errorData || "Error del servidor. Verifica PostgreSQL.";
                }
            } catch (e) {
                console.error("❌ No se pudo parsear error:", e);
            }
            
            console.log("❌ Mostrando error:", errorMsg);
            mostrarMensaje("danger", `❌ ${errorMsg}`);
            return;
        }

        const usuarioCreado = await response.json();
        console.log("✅ Usuario creado exitosamente:", usuarioCreado);
        
        mostrarMensaje("success", `✅ ¡Registro exitoso! Usuario: ${usuarioCreado.nombre} ${usuarioCreado.apellido} - Rol: ${usuarioCreado.rol}`);
        
        console.log("🧹 Limpiando formulario...");
        document.getElementById("formRegistro").reset();
        
        console.log("⏳ Esperando 3 segundos antes de redirigir...");
        setTimeout(() => {
            console.log("➡️ Redirigiendo a login.html");
            window.location.href = "login.html";
        }, 3000); // Cambiado a 3 segundos para que veas el mensaje

    } catch (error) {
        console.error("❌ Error completo en catch:", error);
        console.error("❌ Tipo de error:", error.name);
        console.error("❌ Mensaje:", error.message);
        console.error("❌ Stack:", error.stack);
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            mostrarMensaje("danger", "❌ No se pudo conectar con el servidor. ¿Está corriendo en https://localhost:7201?");
        } else {
            mostrarMensaje("danger", `❌ Error inesperado: ${error.message}`);
        }
    } finally {
        console.log("🔄 Restaurando botón");
        btnRegistrar.disabled = false;
        btnRegistrar.innerHTML = 'Registrarse';
    }
}

// ========================================
// VALIDACIÓN EN TIEMPO REAL
// ========================================
document.addEventListener("DOMContentLoaded", () => {
    const confirmarContrasena = document.getElementById("confirmarContrasena");
    if (confirmarContrasena) {
        confirmarContrasena.addEventListener("input", function() {
            const contrasena = document.getElementById("contrasena").value;
            if (this.value && contrasena !== this.value) {
                this.classList.add("is-invalid");
            } else {
                this.classList.remove("is-invalid");
            }
        });
    }
});

// ========================================
// UTILIDADES
// ========================================
function obtenerUsuarioActual() {
    const usuarioStr = localStorage.getItem("usuario");
    if (usuarioStr) {
        try {
            return JSON.parse(usuarioStr);
        } catch (e) {
            return null;
        }
    }
    return null;
}

function cerrarSesion() {
    localStorage.removeItem("usuario");
    window.location.href = "index.html";
}

function verificarAutenticacion() {
    const usuario = obtenerUsuarioActual();
    if (!usuario) {
        window.location.href = "login.html";
        return false;
    }
    return true;
}

// Exportar funciones globales
window.login = login;
window.registrar = registrar;
window.obtenerUsuarioActual = obtenerUsuarioActual;
window.cerrarSesion = cerrarSesion;
window.verificarAutenticacion = verificarAutenticacion;