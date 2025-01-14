const router = require('express').Router();

const {watch} = require('../controllers/watch.controller');

router.get('/', watch);

module.exports = router;