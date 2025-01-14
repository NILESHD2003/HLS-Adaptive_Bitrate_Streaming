const router = require('express').Router();

const { uploadUrl } = require('../controllers/upload.controller');

router.post('/upload-url', uploadUrl);

module.exports = router;