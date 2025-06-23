const Usuario = require('../Usuarios/model')
const Venta = require('./model')
const Producto = require('./../Productos/model')
const nodemailer = require('nodemailer');
const Descuento = require('../Descuentos/model')
const axios = require('axios');

const paypal = require('paypal-rest-sdk');

// Configurar el SDK de PayPal utilizando las variables de entorno
paypal.configure({
  mode: process.env.PAYPAL_MODE, // 'sandbox' o 'live'
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_CLIENT_SECRET
});

exports.crearOrden = async (req, res) => {
  const usuarioId = req.session.usuarioId;

  try {
    const usuario = await Usuario.findById(usuarioId).populate('carrito.producto');

    if (!usuario || !usuario.carrito || usuario.carrito.length === 0) {
      return res.status(400).send('Carrito vacío');
    }

    const hoy = new Date();
    let total = 0;

    // ✅ Calcular total considerando descuentos activos
    for (const item of usuario.carrito) {
      const producto = item.producto;
      if (!producto) continue;

      let precioFinal = producto.precio;

      const descuento = await Descuento.findOne({
        producto: producto._id,
        activo: true,
        fechaInicio: { $lte: hoy },
        fechaFin: { $gte: hoy }
      });

      if (descuento) {
        const precioConDescuento = +(producto.precio * (1 - descuento.porcentaje / 100)).toFixed(2);
        precioFinal = precioConDescuento;
      }

      total += precioFinal * item.cantidad;
    }

    total = total.toFixed(2);

    // 1. Obtener token de acceso
    const basicAuth = Buffer.from(
      `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
    ).toString('base64');

    const tokenResponse = await axios.post(
      'https://api.sandbox.paypal.com/v1/oauth2/token',
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // 2. Crear la orden en PayPal
    const orderResponse = await axios.post(
      'https://api.sandbox.paypal.com/v2/checkout/orders',
      {
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'MXN',
            value: total
          }
        }]
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const orderID = orderResponse.data.id;
    res.json({ id: orderID });

  } catch (error) {
    console.error('Error al crear la orden:', error.response?.data || error);
    res.status(500).send('Error al crear la orden de PayPal');
  }
};

exports.capturarOrden = async (req, res) => {
  const { paymentID } = req.body;
  const userId = req.session.usuarioId;
  const direccionId = req.session.direccionSeleccionada;

  try {
    const usuario = await Usuario.findById(userId).populate('carrito.producto');

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const direccion = usuario.direcciones.id(direccionId);
    if (!direccion) {
      return res.status(400).json({ error: 'Dirección no encontrada' });
    }

    let total = 0;
    const productosVendidos = [];
    const carritoValido = [];
    let carritoModificado = false;
    const hoy = new Date();

    for (const item of usuario.carrito) {
      const producto = item.producto;

      if (!producto) {
        carritoModificado = true;
        continue;
      }

      if (!item.esRegalo && producto.stock < item.cantidad) {
        return res.status(400).json({
          error: `Stock insuficiente para el producto: ${producto.nombre}`
        });
      }

      if (!item.esRegalo) {
        producto.stock -= item.cantidad;
        await producto.save();
      }

      // ✅ Verificar si tiene descuento
      let precioFinal = item.esRegalo ? 0 : producto.precio;

      if (!item.esRegalo) {
        const descuento = await Descuento.findOne({
          producto: producto._id,
          activo: true,
          fechaInicio: { $lte: hoy },
          fechaFin: { $gte: hoy }
        });

        if (descuento) {
          precioFinal = +(producto.precio * (1 - descuento.porcentaje / 100)).toFixed(2);
        }
      }

      productosVendidos.push({
        producto: producto._id,
        nombre: producto.nombre,
        cantidad: item.cantidad,
        precioUnitario: precioFinal,
        esRegalo: item.esRegalo || false
      });

      if (!item.esRegalo) {
        total += precioFinal * item.cantidad;
      }

      carritoValido.push(item);
    }

    if (productosVendidos.length === 0) {
      return res.status(400).json({
        error: 'Todos los productos en tu carrito fueron eliminados o son inválidos.'
      });
    }

    if (carritoModificado) {
      usuario.carrito = carritoValido;
      await usuario.save();

      req.session.errorMessage = 'Uno de los productos ya no está disponible. Se actualizó tu carrito.';
      return res.status(200).json({ success: false });
    }

    // Crear la venta
    await Venta.create({
      usuario: userId,
      productos: productosVendidos,
      total: total.toFixed(2),
      direccionEnvio: direccion,
      referenciaPaypal: paymentID
    });

    // Vaciar carrito tras compra exitosa
    usuario.carrito = [];
    await usuario.save();

    res.json({ success: true });

  } catch (error) {
    console.error('❌ Error al registrar la orden:', error);
    res.status(500).json({ error: 'Error al registrar la orden localmente' });
  }
};




const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'reccontra965@gmail.com',
    pass: 'phgt qabd gpii aqmk' // tu app password
  }
});

// Verifica conexión SMTP al iniciar
transporter.verify((error, success) => {
  if (error) console.error('❌ SMTP no listo:', error);
  else console.log('✅ Servidor SMTP listo para enviar correos');
});




exports.pagoExitoso = async (req, res) => {
  const userId = req.session.usuarioId;
  if (!userId) return res.redirect('/usuarios/login');

  try {
    const venta = await Venta.findOne({ usuario: userId }).sort({ fecha: -1 });

    if (!venta) return res.render('pagoCancelado', {
      mensaje: 'No se encontró una venta reciente para confirmar.'
    });

    const usuario = await Usuario.findById(userId);
    if (!usuario) return res.redirect('/usuarios/login');

    // Solo enviar el correo si aún no se envió
    if (!venta.correoEnviado) {
      const mailOptions = {
        from: '"Papelería Estrella" <reccontra965@gmail.com>',
        to: usuario.email,
        subject: 'Confirmación de Compra - Gracias por tu pedido',
        html: `
          <div style="font-family:Arial,sans-serif;padding:20px">
            <h2>¡Gracias por tu compra!</h2>
            <p>Tu pedido será enviado a:</p>
            <p><strong>${venta.direccionEnvio.calle}, ${venta.direccionEnvio.ciudad}, CP ${venta.direccionEnvio.codigoPostal}, ${venta.direccionEnvio.pais}</strong></p>
            <h3>Detalles:</h3>
            <ul>
              ${venta.productos.map(p => `
                <li>${p.cantidad} x ${p.nombre} — $${p.precioUnitario.toFixed(2)}</li>
              `).join('')}
            </ul>
            <p><strong>Total pagado:</strong> $${venta.total}</p>
            <p><em>Fecha: ${new Date(venta.fecha).toLocaleString()}</em></p>
            <p>¡Gracias por confiar en nosotros! 😊</p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Correo de confirmación enviado a ${usuario.email} para venta ${venta._id}`);

      // Marcar como enviado
      venta.correoEnviado = true;
      await venta.save();
    }

    res.render('pagoExitoso', { mensaje: 'Compra confirmada. Revisa tu correo.', venta });

  } catch (error) {
    console.error('❌ Error en pagoExitoso:', error);
    res.render('pagoCancelado', {
      mensaje: 'Ocurrió un error al mostrar tu compra. Por favor revisa tu historial.'
    });
  }
};



exports.pagoCancelado = (req, res) => {
  try {
    res.render('pagoCancelado'); // Renderiza la vista de pago cancelado
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al mostrar la página de pago cancelado');
  }
};





exports.agregarDireccion = async (req, res) => {
    const { calle, ciudad, codigoPostal, pais } = req.body;
    const userId = req.session.usuarioId; // Asumiendo que manejas sesiones
  
    try {
      const usuario = await Usuario.findById(userId);
  
      if (!usuario) {
        return res.status(404).send('Usuario no encontrado');
      }
  
      if (usuario.direcciones.length >= 3) {
        return res.status(400).send('No puedes agregar más de 3 direcciones');
      }
  
      usuario.direcciones.push({ calle, ciudad, codigoPostal, pais });
      await usuario.save();
  
      res.redirect('/pago/SeleccionarDireccion'); // Redirige a la vista
    } catch (error) {
      console.error(error);
      res.status(500).send('Error al guardar la dirección');
    }
  };
  exports.verDirecciones = async (req, res) => {
  const userId = req.session.usuarioId;

  try {
    const usuario = await Usuario.findById(userId).populate('carrito.producto');

    if (!usuario) {
      return res.status(404).send('Usuario no encontrado');
    }

    let carritoValido = [];
    let productosEliminados = false;
    let regaloEliminado = false;

    for (const item of usuario.carrito) {
      if (item.producto) {
        carritoValido.push(item);
      } else {
        productosEliminados = true;

        if (item.esRegalo) {
          regaloEliminado = true;
        }
      }
    }

    if (productosEliminados) {
      usuario.carrito = carritoValido;
      await usuario.save();
    }

    if (carritoValido.length === 0) {
      req.session.errorMessage = 'Tu carrito está vacío o todos los productos fueron eliminados.';
      return res.redirect('/productos/catalogo');
    }

    // ✅ Mostrar mensaje específico si se eliminó un regalo
    if (regaloEliminado) {
      req.session.errorMessage = 'La promoción ya no está disponible. Se ha actualizado tu carrito.';
      return res.redirect('/usuarios/carrito');
    }

    res.render('Direcciones', {
      direcciones: usuario.direcciones
    });

  } catch (error) {
    console.error(error);
    res.status(500).send('Error al obtener direcciones');
  }
};

  

  
exports.eliminarDireccion = async (req, res) => {
    try {
        const userId = req.session.usuarioId; // Asumiendo que el ID del usuario está en la sesión
        const direccionId = req.params.id;

        // Buscar usuario
        const usuario = await Usuario.findById(userId);
        if (!usuario) return res.redirect('/usuarios/login')

        // Filtrar la dirección a eliminar
        usuario.direcciones = usuario.direcciones.filter(
            direccion => direccion._id.toString() !== direccionId
        );

        await usuario.save();

        res.redirect('/pago/seleccionarDireccion');
    } catch (err) {
        console.error('Error al eliminar dirección:', err);
        res.status(500).send('Error del servidor');
    }
};

exports.pagoPaypal = async (req, res) => {
  const userId = req.session.usuarioId;
  const { direccionSeleccionada } = req.body;
console.log(direccionSeleccionada)
  try {
    const usuario = await Usuario.findById(userId);

    if (!usuario) {
      return res.status(404).send('Usuario no encontrado');
    }

    if (!direccionSeleccionada) {
      return res.redirect('/direcciones?mensaje=Debes seleccionar una dirección');
    }

    // Guarda la dirección seleccionada en la sesión para usarla luego en la venta
    req.session.direccionSeleccionada = direccionSeleccionada;

    res.render('pagoPaypal'); // Aquí renderizas la vista con el botón de pagar con PayPal
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al acceder a la vista de pagos');
  }
};
