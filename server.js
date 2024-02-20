const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', (err) => {
    console.log('UNCAUGHT EXCEPTION! Shutting down');
    console.log(err.name, err.message);
    process.exit(1);
});

dotenv.config({ path: `${__dirname}/config.env` });

const app = require('./app');

const dbPassword = encodeURIComponent(process.env.DATABASE_PASSWORD);
const DB = process.env.DATABASE.replace(`<PASSWORD>`, dbPassword);

mongoose
    .connect(DB, {
        useNewUrlParser: true,
        useCreateIndex: true,
        useFindAndModify: false,
        useUnifiedTopology: true,
    })
    .then(() => console.log(`DB connections successful`));

const port = process.env.PORT || 8000;
const server = app.listen(port, () => {
    console.log(`app running on port ${port} ...`);
});

process.on('unhandledRejection', (err) => {
    console.log(err.name, err.message);
    console.log('UNHANDLED REJECTION! shutting down');
    server.close(() => {
        process.exit(1);
    });
});
