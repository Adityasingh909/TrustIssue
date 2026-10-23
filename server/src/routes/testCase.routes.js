const express = require('express');
const testCaseController = require('../controllers/testCase.controller');

const router = express.Router();

router.get('/', (req, res, next) => testCaseController.listTestCases(req, res, next));
router.get('/:id', (req, res, next) => testCaseController.getTestCaseById(req, res, next));

module.exports = router;
