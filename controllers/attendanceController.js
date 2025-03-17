const Student = require("../models/studentModel");
const Attendance = require("../models/attendanceModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const {
    euclideanDistance,
    decryptBiometrics,
    getInitializationVector,
    encryptBiometrics
} = require("../utils/faceDetectorUtil");

exports.registerFace = catchAsync(async (req, res, next) => {
    const {studentId, descriptor} = req.body;

    if (!studentId || !descriptor) {
        return next(new AppError("Student ID and Face data are required", 400));
    }

    // Fetch the student
    const student = await Student.findById(studentId);
    if (!student) {
        return next(new AppError("Student not found", 404));
    }

    if (student.descriptor) {
        return next(new AppError("Face already registered", 400));
    }

    // Encrypt the face descriptor
    const iv = getInitializationVector(16)
    const init =  Buffer.from(iv, 'binary').toString('base64')

 
    student.initVector = init;
    student.faceDescriptor  = encryptBiometrics(descriptor, iv);
    await student.save();

    res.status(200).json({
        status: "success",
        message: "Face registered successfully!",
    });
});

exports.loginFace = catchAsync(async (req, res, next) => {
    const {descriptor, classDay, studentId} = req.body;

    if (!descriptor || !studentId) {
        return next(new AppError("Face ID and student ID are required", 400));
    }

    // Fetch the student using their ID
    const studentFound = await Student.findById(studentId);

    if (!studentFound) {
        return next(new AppError("Student not found.", 404));
    }

    // Check if the student has registered a descriptor
    if (!studentFound.faceDescriptor) {
        return next(new AppError("Student has not registered a Face.", 400));
    }

    const iv = Buffer.from(studentFound.initVector, 'base64')
    const distance = euclideanDistance(descriptor, decryptBiometrics(studentFound.faceDescriptor, iv))

    if (distance >= 0.6) {
        return next(new AppError("Face does not match", 400));
    }

    // Check if the student is already marked as present for the class day
    const attendance = await Attendance.findOne({
        "classDays.day": classDay,
    });

    if (!attendance) {
        return next(
            new AppError("Class day not found in attendance sheet.", 404)
        );
    }

    // Find the specific class day entry in the attendance record
    const classDayEntry = attendance.classDays.find(
        // eslint-disable-next-line radix
        (cd) => cd.day === parseInt(classDay)
    );

    if (!classDayEntry) {
        return next(
            new AppError("Class day entry not found in attendance sheet.", 404)
        );
    }

    // Find the student entry in the class day entry
    const studentEntry = classDayEntry.students.find((s) =>
        s.studentId.equals(studentFound._id)
    );

    if (!studentEntry) {
        return next(
            new AppError("Student not found in attendance entry.", 404)
        );
    }

    // Check if the student is already marked as present
    if (studentEntry.status === "Present") {
        return next(
            new AppError(
                `Student ${studentFound.firstName} is already marked as Present for this class day.`,
                400
            )
        );
    }

    // Update the student's attendance status
    studentEntry.status = "Present";
    studentEntry.checkInTime = new Date();
    studentEntry.score = 20;

    // Save the updated attendance record
    await attendance.save();

    // Respond with success
    res.status(200).json({
        status: "success",
        message: `Welcome, ${studentFound.firstName}`,
    });
});

exports.getAttendance = catchAsync(async (req, res, next) => {
    const {cohortId} = req.query;

    if (!cohortId) {
        return next(new AppError("Cohort ID is required", 400));
    }

    const query = {cohortId};

    const attendance = await Attendance.find(query).populate(
        "classDays.students.studentId",
        "firstName lastName"
    );

    if (!attendance.length) {
        return next(new AppError("No attendance records found", 404));
    }

    res.status(200).json({
        status: "success",
        attendance,
    });
});

exports.getAttendanceForClassDay = catchAsync(async (req, res, next) => {
    const {cohortId, classDay} = req.query;

    if (!cohortId || !classDay) {
        return next(new AppError("Cohort ID and class day are required", 400));
    }

    const attendance = await Attendance.findOne({
        cohortId,
        "classDays.day": parseInt(classDay, 10),
    }).populate("classDays.students.studentId", "firstName lastName");

    if (!attendance) {
        return next(
            new AppError("Attendance for the class day not found", 404)
        );
    }

    const classDayAttendance = attendance.classDays.find(
        (cd) => cd.day === parseInt(classDay, 10)
    );

    if (!classDayAttendance) {
        return next(new AppError("Class day not found in attendance", 404));
    }

    res.status(200).json({
        status: "success",
        classDayAttendance,
    });
});

exports.getAttendanceForStudent = catchAsync(async (req, res, next) => {
    const {studentId} = req.query;

    if (!studentId) {
        return next(new AppError("Student ID is required", 400));
    }

    const attendanceHistory = await Attendance.find({
        "classDays.students.studentId": studentId,
    }).populate("classDays.students.studentId", "firstName lastName");

    const result = attendanceHistory
        .map((attendance) =>
            attendance.classDays
                .filter((cd) =>
                    cd.students.some((student) =>
                        student.studentId.equals(studentId)
                    )
                )
                .map((cd) => {
                    const studentData = cd.students.find((s) =>
                        s.studentId.equals(studentId)
                    );
                    return {
                        classDay: cd.day,
                        date: cd.date,
                        status: studentData.status,
                        score: studentData.score,
                    };
                })
        )
        .flat();

    if (!result.length) {
        return res.status(404).json({
            status: "fail",
            message: "No attendance records found for this student",
        });
    }

    res.status(200).json({
        status: "success",
        attendanceHistory: result,
    });
});
