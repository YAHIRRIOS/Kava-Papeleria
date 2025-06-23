// src/Modelos/Descuento.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const descuentoSchema = new Schema({
  producto: {
    type: Schema.Types.ObjectId,
    ref: 'Producto',
    required: true,
    unique: true // Un producto solo puede tener un descuento activo a la vez
  },
  porcentaje: {
    type: Number,
    required: true,
    min: 1,
    max: 100
  },
  fechaInicio: {
    type: Date,
    default: Date.now
  },
  fechaFin: {
    type: Date,
    required: true
  },
  activo: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model('Descuento', descuentoSchema);
