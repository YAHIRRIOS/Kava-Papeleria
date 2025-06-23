const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configura la ruta absoluta para la carpeta uploads dentro de src
const uploadPath = path.join(__dirname, 'public', 'uploads');  // Dentro de src/public/uploads

if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
    console.log('✅ Carpeta uploads creada en src/public/uploads');
}

// Configurar multer para guardar en disco local
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadPath); // Guarda en /src/public/uploads
    },
    filename: function (req, file, cb) {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueName + path.extname(file.originalname)); // nombre-unico.jpg
    }
});

const upload = multer({ storage });

module.exports = upload;
