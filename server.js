const mongoose = require("mongoose");
const dotenv = require("dotenv");
const app = require("./app");

dotenv.config({path: "./config.env"});

process.on("uncaughtException", (err) => {
    console.log("UNCAUGHT EXCEPTION! Shutting down...");
    console.error(err.name, err.message);
    process.exit(1);
});

const DB = process.env.DATABASE.replace(
    "<PASSWORD>",
    process.env.DATABASE_PASSWORD
);


mongoose.connect(DB).then(() => {
    console.log(`successfully connected to db`);
});

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
    console.log(
        `Rapheal's ${process.env.NODE_ENV} Server is running on port ${port}`
    );
});

process.on("unhandledRejection", (err) => {
    console.log("UNHANDLES REJECTION! Shutting down...");
    console.error(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
    // process.exit(1)
});

// console.log(first);
