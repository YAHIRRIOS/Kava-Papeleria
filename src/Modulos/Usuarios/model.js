const mongoose = require('mongoose');

const UsuarioSchema = new mongoose.Schema({
  nombre: {  // Nuevo campo 'nombre' agregado
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true  
  },
  password: {
    type: String,
    required: true
  },
  resetCode: String,
  resetCodeExpiration: Date,
  carrito: [
    {
      producto: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Producto'
      },
      cantidad: {
        type: Number,
        default: 1
      },
      esRegalo: {
        type: Boolean,
        default: false
      },
      precio: {
        type: Number
      }
    }
  ],
  listaDeseos: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Producto'
    }
  ],
  direcciones: [
    {
      calle: String,
      ciudad: String,
      codigoPostal: String,
      pais: String
    }
  ]
});

module.exports = mongoose.model('Usuario', UsuarioSchema);








// const mongoose = require('mongoose');

// const UsuarioSchema = new mongoose.Schema({
//   email: {
//     type: String,
//     required: true,
//     unique: true,
//     trim: true  
//   },
//   password: {
//     type: String,
//     required: true
//   },
//   resetCode: String,
//   resetCodeExpiration: Date,
//   carrito: [
//     {
//       producto: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Producto'
//       },
//       cantidad: {
//         type: Number,
//         default: 1
//       }
//     }
//   ],
//   listaDeseos: [
//     {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Producto'
//     }
//   ]
// });

// module.exports = mongoose.model('Usuario', UsuarioSchema);


