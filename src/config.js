require('dotenv').config();

module.exports = {
    app:{
        port: process.env.PORT || 3000
    },
    db: {
        mongoURI: process.env.MONGO_URI 
    },
    secreto:{
        Hash: process.env.SECRETO
    }
}