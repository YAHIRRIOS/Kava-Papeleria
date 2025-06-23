const listaController = require('./controller')
const express = require('express');
const router = express.Router();
// Lista de deseos
router.get('/verListaDeseos', listaController.verListaDeseos);
router.post('/listaDeseos/agregar/:id', listaController.agregarListaDeseos);
router.post('/listaDeseos/eliminar/:id', listaController.eliminarDeListaDeseos);


module.exports = router;