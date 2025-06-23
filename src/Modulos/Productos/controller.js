const Producto = require('./model'); // Ajusta la ruta si tu modelo está en otra carpeta
const Usuario = require('../Usuarios/model')
const path = require('path')
const fs = require('fs')
const Promocion = require('../Promociones/model'); // Ajusta la ruta si es distinta
const Descuento = require('../Descuentos/model')
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

// Agregar un nuevo producto
exports.agregarProducto = async (req, res) => {

    const { nombre, descripcion, precio, stock } = req.body;

    // Verificar si la imagen se ha recibido correctamente
    let imagen = '';
    if (req.file) {
        // Asegurarnos de que la ruta de la imagen es la correcta
        imagen = `/uploads/${req.file.filename}`;
    } else {
        console.log('❌ No se ha recibido archivo de imagen');
    }

    try {
        const nuevoProducto = new Producto({
            nombre,
            descripcion,
            precio,
            stock,
            imagen
        });

        await nuevoProducto.save();
        console.log('✅ Producto agregado correctamente');
        res.redirect('/admin/gestionarProductos');
    } catch (err) {
        console.error('❌ Error al agregar producto:', err);
        res.status(500).send('Error al agregar el producto');
    }
};

exports.eliminarProducto = async (req, res) => {
  const { productoId } = req.body;

  console.log('🆔 ID recibido para eliminar:', productoId);

  try {
    // 1. Buscar el producto para obtener la ruta de la imagen
    const producto = await Producto.findById(productoId);
    if (!producto) {
      console.warn(`⚠️ Producto con ID ${productoId} no encontrado`);
      return res.status(404).send('Producto no encontrado');
    }

    // 2. Eliminar imagen si existe
    if (producto.imagen) {
      const imagenPath = path.join(__dirname, '../../public', producto.imagen); // ← ajusta si cambia la estructura
      if (fs.existsSync(imagenPath)) {
        fs.unlinkSync(imagenPath);
        console.log(`🗑️ Imagen eliminada: ${imagenPath}`);
      } else {
        console.warn(`⚠️ Imagen no encontrada en el sistema de archivos: ${imagenPath}`);
      }
    }
      //Elimina una promocion si es que el producto de esa promocion es eliminado
    await limpiarPromocionesAsociadas(productoId);
    // 3. Eliminar producto de la base de datos
    await Producto.findByIdAndDelete(productoId);
    console.log(`✅ Producto con ID ${productoId} eliminado de la base de datos`);

    res.redirect('/admin/gestionarProductos');
  } catch (err) {
    console.error('❌ Error al eliminar producto:', err);
    res.status(500).send('Error al eliminar el producto');
  }
};

exports.mostrarProductosPublicos = async (req, res) => {
  try {
    const productos = await Producto.find({ stock: { $gt: 0 } });

    // Obtener descuentos activos que no hayan expirado
    const hoy = new Date();
    const descuentos = await Descuento
      .find({ activo: true, fechaInicio: { $lte: hoy }, fechaFin: { $gte: hoy } })
      .populate('producto');

    // Mapear descuentos por ID de producto
    const mapaDesc = {};
    descuentos.forEach(d => {
      if (!d.producto) {
        console.warn(`⚠️ Descuento con ID ${d._id} tiene un producto nulo (probablemente fue eliminado)`);
        return;
      }
      mapaDesc[d.producto._id] = d;
    });

    // Añadir datos de descuento a cada producto
    const productosConDescuento = productos.map(prod => {
      const desc = mapaDesc[prod._id];
      if (desc) {
        const precioDesc = +(prod.precio * (1 - desc.porcentaje / 100)).toFixed(2);
        return {
          ...prod.toObject(),
          descuento: {
            porcentaje: desc.porcentaje,
            precioDesc
          }
        };
      }
      return prod.toObject();
    });

    const carrito = res.locals.carrito || [];

    res.render('Index', {
      productos: productosConDescuento,
      carrito,
      errorMessage: req.session.errorMessage
    });

    delete req.session.errorMessage;

  } catch (err) {
    console.error('❌ Error al cargar productos públicos:', err);
    res.status(500).send('Error al cargar productos');
  }
};


exports.mostrarDetalleProducto = async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id);

    if (!producto) {
      req.session.errorMessage = 'El producto que intentaste ver ya no está disponible.';
      return res.redirect('/productos/catalogo');
    }

    // Buscar si el producto tiene un descuento activo
    const hoy = new Date();
    const descuento = await Descuento.findOne({
      producto: producto._id,
      activo: true,
      fechaInicio: { $lte: hoy },
      fechaFin: { $gte: hoy }
    });

    const productoFinal = producto.toObject(); // Convertir a objeto plano

    if (descuento) {
      const precioDesc = +(producto.precio * (1 - descuento.porcentaje / 100)).toFixed(2);
      productoFinal.descuento = {
        porcentaje: descuento.porcentaje,
        precioDesc,
        fechaFin: descuento.fechaFin
      };
    }

    // ✅ Usar carrito desde el middleware
    const carrito = res.locals.carrito || [];

    res.render('productoSeleccionado', {
      producto: productoFinal,
      carrito,
      session: req.session
    });

  } catch (err) {
    console.error('❌ Error al buscar producto:', err);
    res.status(500).send('Error al obtener el producto');
  }
};


  
  exports.buscarProducto = async (req, res) => {
    const nombreBuscado = req.query.nombre;
  
    try {
      const productos = await Producto.find({
        nombre: { $regex: new RegExp(nombreBuscado, 'i') }  // 'i' ignora mayúsculas/minúsculas
      });
  
      res.render('busquedaResultados', { productos, query: nombreBuscado });
    } catch (error) {
      console.error('Error al buscar productos:', error);
      res.status(500).send('Error al buscar productos');
    }
  };
  


exports.verPromociones = async (req, res) => {
  try {
    const promociones = await Promocion.find()
      .populate('productoAComprar')
      .populate('productoRegalo');

    const hoy = new Date();

    // Obtener todos los productosAComprar de las promociones
    const idsProductos = promociones.map(p => p.productoAComprar?._id).filter(Boolean);

    // Buscar descuentos activos para esos productos
    const descuentos = await Descuento.find({
      producto: { $in: idsProductos },
      activo: true,
      fechaInicio: { $lte: hoy },
      fechaFin: { $gte: hoy }
    });

    // Crear mapa de descuentos por ID de producto
    const mapaDescuentos = {};
    descuentos.forEach(d => {
      const precioDesc = +(d.producto.precio * (1 - d.porcentaje / 100)).toFixed(2);
      mapaDescuentos[d.producto.toString()] = {
        porcentaje: d.porcentaje,
        precioConDescuento: precioDesc
      };
    });

    // Transformar promociones incluyendo descuentos
    const productosPromocion = promociones.map(promo => {
      const producto = promo.productoAComprar;
      const descuento = mapaDescuentos[producto?._id?.toString()];
      let productoAComprarFinal = producto?.toObject();

      if (producto && descuento) {
        productoAComprarFinal.precioOriginal = producto.precio;
        productoAComprarFinal.precioConDescuento = descuento.precioConDescuento;
      }

      return {
        id: promo._id,
        productoAComprar: productoAComprarFinal,
        productoRegalo: promo.productoRegalo,
        cantidadAComprar: promo.cantidadAComprar,
        cantidadRegalo: promo.cantidadRegalo
      };
    });

    const carrito = res.locals.carrito || [];

    res.render('promociones', { productosPromocion, carrito });

  } catch (error) {
    console.error('❌ Error al obtener promociones:', error);
    res.status(500).render('error', { mensaje: 'No se pudieron cargar las promociones.' });
  }
};