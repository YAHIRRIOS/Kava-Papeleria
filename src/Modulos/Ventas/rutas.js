const express = require('express')
const router = express.Router();
const pagoController = require('./controller')


router.get('/seleccionarDireccion', pagoController.verDirecciones);
router.post('/pagoPaypal', pagoController.pagoPaypal)

// Ruta para crear la orden en PayPal
router.post('/crear-orden', pagoController.crearOrden);
// Ruta para capturar la orden de PayPal
router.post('/capturar-orden', pagoController.capturarOrden);

router.post('/agregarDireccion', pagoController.agregarDireccion);
router.post('/eliminarDireccion/:id', pagoController.eliminarDireccion);

// Nuevas rutas para pago exitoso y cancelado
router.get('/pagoExitoso', pagoController.pagoExitoso);
router.get('/pagoCancelado', pagoController.pagoCancelado);



module.exports = router;