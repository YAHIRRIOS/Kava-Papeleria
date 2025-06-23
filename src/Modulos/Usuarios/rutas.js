const express = require('express');
const router = express.Router();
const usuarioController = require('./controller');

// ✅ Middleware para proteger rutas
function verificarSesion(req, res, next) {
  if (req.session && req.session.usuarioId) {
    next();
  } else {
    res.redirect('/usuarios/login?mensaje=Debes iniciar sesión primero');
  }
}

// Formularios públicos
router.get('/login', usuarioController.loginForm);
router.get('/registerForm', usuarioController.registerForm);
router.get('/recuperar', usuarioController.recuperarContrasenaForm);

// Formularios protegidos
router.get('/modificarDatos', verificarSesion, usuarioController.modificardatosForm);
router.get('/historial-pedidos', verificarSesion, usuarioController.obtenerHistorialPedidos);

// Acciones públicas
router.post('/register', usuarioController.crearUsuario);
router.post('/login', usuarioController.loginUsuario);
router.post('/recuperar/enviar-codigo', usuarioController.enviarCodigoRecuperacion);
router.post('/recuperar/actualizar-contrasena', usuarioController.actualizarContrasena);

// Acciones protegidas
router.post('/modificarDatos', verificarSesion, usuarioController.modificarDatos);

// Carrito (todas protegidas)
router.post('/carrito/agregar', verificarSesion, usuarioController.agregarAlCarrito);
router.get('/carrito', verificarSesion, usuarioController.mostrarCarrito);
router.post('/carrito/actualizar', verificarSesion, usuarioController.actualizarCantidadCarrito);
router.get('/carrito/eliminar/:productoId', verificarSesion, usuarioController.eliminarDelCarrito);


// Logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/usuarios/login?mensaje=Sesión cerrada correctamente');
  });
});

module.exports = router;
