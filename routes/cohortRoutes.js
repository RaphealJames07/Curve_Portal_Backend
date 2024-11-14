const multer = require("multer");

const storage = multer.memoryStorage(); // Store the file in memory

const upload = multer({storage: storage});
const express = require("express");
const cohortController = require("../controllers/cohortController");

// const authController = require('../controllers/authController');

const router = express.Router();

router.post("/createCohort", upload.single("file"), cohortController.createCohort);

module.exports = router;
