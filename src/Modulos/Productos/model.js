const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    descripcion: { type: String, required: true },
    precio: { type: Number, required: true },
    stock: { type: Number, required: true },
    imagen: { type: String, required: true }, // Ruta de la imagen
    creadoEn: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Producto', productoSchema);