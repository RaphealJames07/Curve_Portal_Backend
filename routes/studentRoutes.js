const express = require("express");
const studentController = require("../controllers/studentController");
const {protect} = require("../middlewares/authMiddleware");
const Student = require("../models/studentModel");

const router = express.Router();

router.put("/createStudent", studentController.updateStudent);
router.post("/login", studentController.login);
router.post("/forgetPassword", studentController.forgetPassword);
router.patch("/resetPassword/:token", studentController.resetPassword);
router.patch(
    "/updatePassword",
    protect(Student),
    studentController.resetPassword
);

router.patch('/updateMe', protect(Student), studentController.updateMe);
router.delete('/deleteMe', protect(Student), studentController.deleteMe);
router.get('/logout', protect(Student), studentController.logout);
router.get('/getAllStudents', studentController.getAllStudents);

module.exports = router;
