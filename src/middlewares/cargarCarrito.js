const Usuario = require('../Modulos/Usuarios/model');
const Descuento = require('../Modulos/Descuentos/model'); // importar modelo descuento
const moment = require('moment'); // para manejo fechas, si no quieres usar moment, puedes usar Date nativo

module.exports = async (req, res, next) => {
  try {
    if (!req.session.usuarioId) {
      res.locals.carrito = [];
      return next();
    }

    const usuario = await Usuario.findById(req.session.usuarioId).populate('carrito.producto');

    if (!usuario) {
      res.locals.carrito = [];
      return next();
    }

    // Limpiar productos nulos
    let carritoLimpio = usuario.carrito.filter(item => item.producto !== null);

    // Eliminar productos regalo si no hay principal
    const tieneProductoPrincipal = carritoLimpio.some(item => !item.esRegalo);
    if (!tieneProductoPrincipal) {
      carritoLimpio = carritoLimpio.filter(item => !item.esRegalo);
    }

    // Para optimizar, obtener todos los descuentos activos para productos en el carrito
    const idsProductos = carritoLimpio.map(item => item.producto._id);

    // Obtener descuentos activos y vigentes
    const hoy = new Date();
    const descuentosActivos = await Descuento.find({
      producto: { $in: idsProductos },
      activo: true,
      fechaInicio: { $lte: hoy },
      fechaFin: { $gte: hoy }
    });

    // Mapeo rápido de productoId -> descuento
    const descuentosMap = {};
    descuentosActivos.forEach(d => {
      descuentosMap[d.producto.toString()] = d.porcentaje;
    });

    // Ahora construir carrito con precios con descuento aplicados
    const carritoConDescuentos = carritoLimpio.map(item => {
      const p = item.producto.toObject();

      const descuento = descuentosMap[p._id.toString()] ?? 0;
      if (descuento > 0) {
        const precioOriginal = p.precio;
        const precioConDescuento = +(precioOriginal - (precioOriginal * (descuento / 100))).toFixed(2);
        p.precioOriginal = precioOriginal;
        p.precioConDescuento = precioConDescuento;
      } else {
        p.precioOriginal = null;
        p.precioConDescuento = null;
      }

      return {
        ...item.toObject(),
        producto: p
      };
    });

    // Guardar si cambió carrito limpio
    if (carritoLimpio.length !== usuario.carrito.length) {
      usuario.carrito = carritoLimpio;
      await usuario.save();
    }

    res.locals.carrito = carritoConDescuentos;

    console.log('🛒 Carrito cargado (middleware):');
    carritoConDescuentos.forEach(item => {
      const p = item.producto;
      console.log(`- ${p.nombre} | Precio: $${p.precio} | Descuento: ${p.precioConDescuento ? '$' + p.precioConDescuento : 'Sin descuento'}`);
    });

    next();

  } catch (err) {
    console.error('❌ Error al cargar el carrito:', err);
    res.locals.carrito = [];
    next();
  }
};
