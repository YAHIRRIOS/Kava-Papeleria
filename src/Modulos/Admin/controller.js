const Producto = require('../Productos/model'); // Ajusta la ruta si está diferente
const PDFDocument = require('pdfkit');           // Modelo de ventas
const Usuario = require('../Usuarios/model');       // Para los reportes de clientes
const moment = require('moment')
const fs = require('fs')
const Venta = require('../Ventas/model')
const Promocion = require('../Promociones/model');
const Descuento = require('../Descuentos/model'); // dependiendo de dónde almacenes
// 🔁 Elimina promociones que estén asociadas a un producto dado
const limpiarPromocionesAsociadas = async (productoId) => {
  const promociones = await Promocion.find({
    $or: [
      { productoAComprar: productoId },
      { productoRegalo: productoId }
    ]
  });

  for (const promo of promociones) {
    await Promocion.findByIdAndDelete(promo._id);
    console.log(`🧹 Promoción ${promo._id} eliminada (producto relacionado eliminado o sin stock)`);
  }
};

exports.generarReporte = async (req, res) => {
  const { 'report-type': reportType, 'report-time': reportTime } = req.body;

  try {
    const dias = parseInt(reportTime);
    const fechaInicio = moment().subtract(dias, 'days').startOf('day').toDate();

    let ventas = await Venta.find({ fecha: { $gte: fechaInicio } })
      .populate('usuario')
      .populate('productos.producto');

    const doc = new PDFDocument();

    // Nombre dinámico del archivo PDF con fecha y hora
    const fechaStr = moment().format('YYYY-MM-DD_HH-mm-ss');
    const nombreArchivo = `Reporte_${reportType}_${fechaStr}.pdf`;

    res.setHeader('Content-Disposition', `attachment; filename=${nombreArchivo}`);
    res.setHeader('Content-Type', 'application/pdf');

    doc.pipe(res);

    // Cabecera del reporte
    doc.fontSize(20).text('Papelería Kava', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text(`Reporte de ${reportType} generado el ${moment().format('YYYY-MM-DD HH:mm')}`, { align: 'center' });
    doc.moveDown(2);

    if (reportType === 'ventas') {
      doc.fontSize(14).text(`Ventas de los últimos ${dias} día(s):\n\n`);

      ventas.forEach(venta => {
        doc.fontSize(12).text(`Fecha: ${moment(venta.fecha).format('YYYY-MM-DD HH:mm')}`);
        const nombreUsuario = venta.usuario?.nombre || 'Usuario no disponible';
        doc.text(`Usuario: ${nombreUsuario} (${venta.usuario?.email || 'sin email'})`);

        venta.productos.forEach(prod => {
          doc.text(` - ${prod.nombre} | Cantidad: ${prod.cantidad} | Precio: $${prod.precioUnitario.toFixed(2)}`);
        });

        doc.text(`Total de la venta: $${venta.total.toFixed(2)}\n`);
        doc.moveDown();
      });

    } else if (reportType === 'clientes') {
      doc.fontSize(14).text(`Clientes con compras en los últimos ${dias} día(s):\n\n`);

      const clientes = new Map();

      ventas.forEach(venta => {
        const id = venta.usuario?._id?.toString();
        if (!id) return;

        if (!clientes.has(id)) {
          clientes.set(id, {
            nombre: venta.usuario.nombre,
            email: venta.usuario.email,
            ventas: []
          });
        }

        clientes.get(id).ventas.push(venta);
      });

      clientes.forEach((cliente, id) => {
        doc.fontSize(12).text(`Cliente: ${cliente.nombre} (${cliente.email})`);
        cliente.ventas.forEach(v => {
          doc.text(`  - ${moment(v.fecha).format('YYYY-MM-DD')} | Total: $${v.total.toFixed(2)}`);
        });
        doc.moveDown();
      });
    }

    doc.end();

  } catch (error) {
    console.error('Error al generar el reporte:', error);
    res.status(500).send('Error al generar el reporte');
  }
};

exports.mostrarGenerarReportes = (req, res) => {
  // Puedes pasar los valores predeterminados de reportType y reportTime
  res.render('Admin/generarReportes', { 
    reportType: 'ventas', // Valor predeterminado
    reportTime: '1' // Valor predeterminado (Último Día)
  });
};



exports.gestionarProductos = async (req, res) => {
  try {
    const productos = await Producto.find(); // ← Obtener los productos desde MongoDB

    res.render('Admin/gestionarProductos', {
      admin: req.session.admin,
      mensaje: req.query.mensaje || null,
      productos // ← Pasar productos a la vista
    });
  } catch (error) {
    console.error('❌ Error al obtener productos:', error);
    res.status(500).send('Error al cargar los productos');  
  }
};

exports.gestionarStock = async (req, res) =>{
 try{
  const productos = await Producto.find();

  res.render('Admin/gestionarStock',{
    admin: req.session.admin,
    mensaje: req.query.mensaje || null,
    productos
  });
}catch(err){
  console-log('Error al cargar la vista', err)
}  
}

exports.actualizarStock = async (req, res) => {
  const { productoId, cantidad, action } = req.body;

  try {
    const producto = await Producto.findById(productoId);

    if (!producto) {
      return res.status(404).send('Producto no encontrado');
    }

    const cantidadNumerica = parseInt(cantidad);

    if (action === 'agregar') {
      producto.stock += cantidadNumerica;
    } else if (action === 'eliminar') {
      if (producto.stock < cantidadNumerica) {
        return res.status(400).send('No hay suficiente stock para eliminar esa cantidad');
      }
      producto.stock -= cantidadNumerica;
    }

    await producto.save();
       // Si stock es 0, eliminar promociones asociadas
    if (stock == 0) {
      await limpiarPromocionesAsociadas(producto._id);
    }
    console.log(`✅ Stock actualizado para producto ${producto.nombre}`);
    res.redirect('/admin/gestionarStock');
  } catch (error) {
    console.error('❌ Error al actualizar el stock:', error);
    res.status(500).send('Error al actualizar el stock');
  }
};


// Agregar promoción
exports.agregarPromocion = async (req, res) => {
    try {
        const {
            'product-to-buy': productoAComprar,
            'quantity-to-buy': cantidadAComprar,
            'product-to-gift': productoRegalo,
            'gift-quantity': cantidadRegalo,
            'promotion-duration': duracionDias
        } = req.body;

        const nuevaPromo = new Promocion({
            productoAComprar,
            cantidadAComprar,
            productoRegalo,
            cantidadRegalo,
            duracionDias
        });

        await nuevaPromo.save();
        console.log(`✅ Promoción creada`);
        res.redirect('/admin/gestionarPromociones');
    } catch (error) {
        console.error('❌ Error al agregar la promoción:', error);
        res.status(500).send('Error al agregar la promoción');
    }
};

// Eliminar promoción
exports.eliminarPromocion = async (req, res) => {
    try {
        const { 'promotion-select': promoId } = req.body;
        await Promocion.findByIdAndDelete(promoId);
        console.log(`🗑️ Promoción eliminada`);
        res.redirect('/admin/gestionarPromociones');
    } catch (error) {
        console.error('❌ Error al eliminar la promoción:', error);
        res.status(500).send('Error al eliminar la promoción');
    }
};

// Obtener datos para la vista
exports.getGestionarPromociones = async (req, res) => {
    try {
        const productos = await Producto.find();
        const promociones = await Promocion.find().populate('productoAComprar').populate('productoRegalo');
        res.render('Admin/gestionarPromociones', { productos, promociones });
    } catch (error) {
        console.error('❌ Error al cargar la vista de promociones:', error);
        res.status(500).send('Error al cargar promociones');
    }
};

exports.formularioDescuentos = async (req, res) => {
  const productos = await Producto.find();
  const descuentos = await Descuento.find({ activo: true }).populate('producto');
  res.render('admin/gestionarDescuentos', { productos, descuentos });
};


exports.procesarDescuento = async (req, res) => {
  const { action } = req.body;
console.log('🧾 Datos del formulario:', req.body);

  try {
    if (action === 'add') {
      const { 'product-to-discount': productoId, 'discount-percentage': porcentaje, 'discount-duration': duracionDias } = req.body;


      // Validaciones básicas
      if (!productoId || !porcentaje || !duracionDias) {
        return res.status(400).send('Faltan datos para aplicar el descuento');
      }
      const porcentajeNum = parseInt(porcentaje);
const duracionNum = parseInt(duracionDias);

if (porcentajeNum < 1 || porcentajeNum > 100) {
  return res.status(400).send('El porcentaje debe estar entre 1 y 100.');
}

if (duracionNum <= 0) {
  return res.status(400).send('La duración debe ser mayor a 0 días.');
}


      // Calcular fecha de fin
const fechaInicio = new Date();
const fechaFin = new Date(fechaInicio);
fechaFin.setDate(fechaFin.getDate() + duracionNum);

      // Verificar si ya existe descuento para ese producto
      const descuentoExistente = await Descuento.findOne({ producto: productoId });
      if (descuentoExistente) {
        return res.status(400).send('Este producto ya tiene un descuento activo');
      }

      // Crear descuento
     const nuevoDescuento = new Descuento({
  producto: productoId,
  porcentaje: porcentajeNum,
  fechaInicio,
  fechaFin
});

      await nuevoDescuento.save();
      res.redirect('/admin/descuentos');

    } else if (action === 'delete') {
      const { 'discount-select': descuentoId } = req.body;

      if (!descuentoId) {
        return res.status(400).send('Debes seleccionar un descuento para eliminar');
      }

      await Descuento.findByIdAndDelete(descuentoId);
      res.redirect('/admin/descuentos');
    } else {
      res.status(400).send('Acción no válida');
    }

  } catch (error) {
    console.error('❌ Error al procesar descuento:', error);
    res.status(500).send('Error interno al procesar descuento');
  }
};