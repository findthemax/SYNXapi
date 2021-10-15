const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.DB_CONN, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true
        });
        // console.log("MongoDb Connected...");
    } catch (e) {
        console.error(e.message);
        //exit process with failure
        process.exit(1);
    }
}

module.exports = connectDB();