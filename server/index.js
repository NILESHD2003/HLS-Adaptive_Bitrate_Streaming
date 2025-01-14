const express = require('express');
const cors = require('cors');
const app = express();
const server = require('http').createServer(app);
const {initializeSocket} = require('./utils/socketManager.utils');
const {connect} = require('./config/database');
const {transcoder} = require('./consumer/transcoder');
const {schedulePARGeneration} = require('./utils/parGenerator.utils');

app.use(express.json());
connect();

app.use(cors());

const io = initializeSocket(server);

app.get('/', (req, res) => {
    res.send('Hello World!');
});

schedulePARGeneration();
transcoder();

const uploadRoute = require('./routes/upload.route');
const webhookRoute = require('./routes/webhook.route');
const watchRoute = require('./routes/watch.route');
app.use('/upload', uploadRoute);
app.use('/webhook', webhookRoute);
app.use('/watch', watchRoute);

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});