const express = require("express");
const {
    getAttendance,
    registerFace,
    loginFace,
    getAttendanceForClassDay,
    getAttendanceForStudent,
} = require("../controllers/attendanceController");

const router = express.Router();

router.post("/registerFace", registerFace);
router.post("/loginFace", loginFace);
router.get("/getAll", getAttendance);
router.get("/getForClassDay", getAttendanceForClassDay);
router.get("/getForStudent", getAttendanceForStudent);

module.exports = router;
