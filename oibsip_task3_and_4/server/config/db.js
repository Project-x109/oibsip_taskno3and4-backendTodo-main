const mongoose = require("mongoose");

const connectDatabase = async () => {
  const mongoDB = "mongodb+srv://amanuelgirma108:gondar2022@clusterpizza.lyachjx.mongodb.net/?retryWrites=true&w=majority";
  
  mongoose.set("strictQuery", false);
  
  try {
    mongoose.connect(mongoDB, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    const db = mongoose.connection;
    
    db.on("connected", () => {
      console.log("Database is connected Successfully");
    });
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
  }
};

module.exports = connectDatabase;
