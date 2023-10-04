const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
const port = 8000;
const router = require('./routers/mainRouters');
const {createServer} = require('node:http');
const server = createServer(app);
require('./modules/sockets')(server);
require('dotenv').config();

mongoose.connect(process.env.DB_KEY)
    .then(() => {
        console.log('connected to DB successfully')
    }).catch(e => {
    console.log('error while connecting to DB', e)
})


app.use(cors());
app.use(express.json());
app.use('/', router)

server.listen(port, () => {
    console.log('server running on localhost:'+port);
});