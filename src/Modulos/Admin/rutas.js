const express = require('express');
const router = express.Router();
const adminController = require('./controller');

// Middleware para proteger rutas del admin
function verificarAdmin(req, res, next) {
  if (req.session && req.session.admin) {
    next();
  } else {
    res.redirect('/usuarios/login?mensaje=Debes iniciar sesión como administrador');
  }
}

router.get('/gestionarProductos', adminController.gestionarProductos)
router.get('/gestionarStock', adminController.gestionarStock)
router.post('/actualizarStock', adminController.actualizarStock)
// (Puedes agregar más rutas de admin aquí)
// Ruta para generar reportes
router.post('/generarReporte',adminController.generarReporte);
router.get('/generarReportes', adminController.mostrarGenerarReportes);
router.get('/gestionarPromociones', adminController.getGestionarPromociones);
router.post('/gestionarPromociones', async (req, res) => {
    console.log(req.body); //Esto es temporal para depurar
    if (req.body.action === 'add') {
        await adminController.agregarPromocion(req, res);
    } else if (req.body.action === 'delete') {
        await adminController.eliminarPromocion(req, res);
    } else {
        res.status(400).send('Acción no válida');
    }
});
router.get('/descuentos', adminController.formularioDescuentos);
router.post('/descuentos', adminController.procesarDescuento);

// En rutas de usuarios
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/usuarios/login');
  });
});


module.exports = router;
