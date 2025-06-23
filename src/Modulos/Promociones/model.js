const mongoose = require('mongoose');

const promocionSchema = new mongoose.Schema({
    productoAComprar: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
    cantidadAComprar: { type: Number, required: true },
    productoRegalo: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
    cantidadRegalo: { type: Number, required: true },
    fechaInicio: { type: Date, default: Date.now },
    duracionDias: { type: Number, required: true },
});

module.exports = mongoose.model('Promocion', promocionSchema);
