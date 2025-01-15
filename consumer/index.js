const express = require('express');
const cors = require('cors');
const app = express();
const {connect} = require('./config/database');
const {transcoder} = require('./consumer/transcoder');

connect();

app.use(cors());
app.use(express.json());

transcoder();

app.listen(3001);
