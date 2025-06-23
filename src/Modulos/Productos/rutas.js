const express = require('express');
const router = express.Router();
const productosController = require('./controller');
const upload = require('../../multer'); //  el que cambia según el entorno
const { asegurarAutenticado} = require('../../middlewares/authmiddleware')


router.post('/agregar', upload.single('imagen'), productosController.agregarProducto);
router.post('/eliminar', productosController.eliminarProducto);
router.get('/catalogo',asegurarAutenticado, productosController.mostrarProductosPublicos);
router.get('/detalle/:id',asegurarAutenticado, productosController.mostrarDetalleProducto);
router.get('/buscar', asegurarAutenticado,productosController.buscarProducto);
router.get('/promociones', productosController.verPromociones);

module.exports = router;
