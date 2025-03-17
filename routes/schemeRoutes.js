const express = require("express");
const multer = require("multer");
const {
    createScheme,
    getAllScheme,
    getSchemeByName,
    deleteSchemeByName,
} = require("../controllers/schemeController");
const {protect} = require("../middlewares/authMiddleware");
const Student = require("../models/studentModel");
const parseExcel = require("../middlewares/parseMiddleware");

const upload = multer({dest: "uploads/"}); // Temporary storage for uploaded files

const router = express.Router();

router.put(
    "/createScheme",
    protect(Student),
    upload.single("schemeFile"), // Handle file upload
    parseExcel.parseExcel, // Parse Excel file
    createScheme // Process parsed data
);
router.get("/getAllScheme", getAllScheme);
router.get("/getScheme", getSchemeByName);
router.delete("/deleteScheme", deleteSchemeByName);

module.exports = router;
