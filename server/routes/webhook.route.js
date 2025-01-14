const router = require('express').Router();

const { uploadSuccessful } = require('../controllers/upload.controller');
const { transcodeSuccessful } = require('../controllers/watch.controller');

router.post('/upload-success', uploadSuccessful);
router.post('/transcode-success', transcodeSuccessful);

module.exports = router;