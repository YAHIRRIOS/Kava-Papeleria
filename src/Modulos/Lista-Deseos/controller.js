const Usuario = require('../Usuarios/model')

exports.verListaDeseos = async (req, res) => {
    try {
      const usuario = await Usuario.findById(req.session.usuarioId).populate('listaDeseos');
  
      if (!usuario) return res.status(404).send('Usuario no encontrado');
  
      // Filtrar productos con stock > 0
      const productosValidos = usuario.listaDeseos.filter(prod => prod && prod.stock > 0);
  
      // Actualizar el usuario si hubo productos eliminados
      if (productosValidos.length !== usuario.listaDeseos.length) {
        usuario.listaDeseos = productosValidos.map(prod => prod._id);
        await usuario.save();
      }
  
      res.render('listaDeseos', {
        productos: productosValidos,
        mensaje: req.session.mensaje || null
      });
  
      delete req.session.mensaje;
    } catch (error) {
      console.error('Error al cargar lista de deseos:', error);
      res.status(500).send('Error del servidor');
    }
  };

  exports.agregarListaDeseos = async (req, res) => {
    try {
      const usuarioId = req.session.usuarioId;
      const productoId = req.params.id;
  
      const usuario = await Usuario.findById(usuarioId);
      if (!usuario) return res.status(404).send('Usuario no encontrado');
  
      // Evitar duplicados
      if (usuario.listaDeseos.includes(productoId)) {
        return res.redirect('/listaDeseos/verListaDeseos'); // Cambia esto según desde dónde se agregue
      }
  
      usuario.listaDeseos.push(productoId);
      await usuario.save();
  
      req.session.mensaje = { texto: 'Producto agregado a tu lista de deseos' };
      res.redirect('/productos/catalogo');
    } catch (error) {
      console.error(error);
      res.status(500).send('Error al agregar a la lista de deseos');
    }
  };

  exports.eliminarDeListaDeseos = async (req, res) => {
    try {
      const productoId = req.params.id;
      const usuario = await Usuario.findById(req.session.usuarioId);
  
      if (!usuario) return res.status(404).send('Usuario no encontrado');
  
      usuario.listaDeseos = usuario.listaDeseos.filter(id => id.toString() !== productoId);
      await usuario.save();
  
      req.session.mensaje = { tipo: 'exito', texto: 'Producto eliminado de la lista de deseos' };
      res.redirect('/listaDeseos/verListaDeseos');
    } catch (error) {
      console.error(error);
      res.status(500).send('Error al eliminar el producto de la lista');
    }
  };
  