module.exports = {
    asegurarAutenticado: (req, res, next) => {
      if (req.session && req.session.usuarioId) {
        return next(); // Si hay sesión, continúa
      }
      res.redirect('/'); // Redirige al login si no hay sesión
    }
  };