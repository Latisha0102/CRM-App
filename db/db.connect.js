const mongoose = require('mongoose')

require("dotenv").config()

const mongoUri = process.env.MONGODB

const initializeDatabase = async() => {
    await mongoose.connect(mongoUri).then(() => {
        console.log('Connected to MongoDB')
    }).catch((error) => {
        console.log('Error connecting to MongoDB:', error)
    })


}

module.exports = {initializeDatabase}