// this controller creates a new cohort and other CRUD operations concerning a cohort

const ExcelJS = require("exceljs");
const crypto = require("crypto");
const Cohort = require("../models/cohortModel");
const Scheme = require("../models/schemeModel");
const Student = require("../models/studentModel");
const Attendance = require("../models/attendanceModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const sendEmail = require("../utils/email");

const generateAdmissionCode = () => crypto.randomBytes(4).toString("hex");

exports.createCohort = catchAsync(async (req, res, next) => {
    // Step 1: Parse the uploaded Excel sheet to get student details
    const cohortData = req.body; // Cohort details (startDate, endDate)
    // Create an instance of ExcelJS Workbook
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer); // Load the file from the buffer

    const worksheet = workbook.worksheets[0]; // Get the first worksheet

    // Array to hold student data
    const studentsFromExcel = [];

    worksheet.eachRow((row, rowIndex) => {
        if (rowIndex > 1) {
            // Skip header row
            const student = {
                firstName: row.getCell(1).value, // Assuming first name is in column 1
                lastName: row.getCell(2).value, // Assuming last name is in column 2
                email: row.getCell(3).value, // Assuming email is in column 3
                stack: row.getCell(4).value, // Assuming stack is in column 4
                gender: row.getCell(5).value, // Assuming gender is in column 5
            };
            studentsFromExcel.push(student);
        }
    });

    const {cohortNumber} = cohortData;
    const prevCohort = await Cohort.findOne({cohortNumber});
    if (prevCohort) {
        return next(new AppError("Cohort already exists", 400));
    }
    await Scheme.create({
        cohortNumber: cohortData.cohortNumber,
        schemes: {
            frontendScheme: [],
            backendScheme: [],
            productDesignScheme: [],
        },
    });
    // Step 3: Create student profiles and send admission codes using forEach
    const studentPromises = studentsFromExcel.map(async (student) => {
        const admissionCode = generateAdmissionCode(); // A function that generates a unique code
        await Student.create({
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email,
            admissionCode,
            cohort: cohortData.cohortNumber,
            stack: student.stack,
            // active:false
        });

        // Send email to student with the admission code
        const message = `Welcome! Your admission code is ${admissionCode}. Please use this to register.`;
        await sendEmail({
            email: student.email,
            subject: "Your Admission Code",
            message,
        });
    });

    // Use Promise.all to ensure all emails are sent before responding
    await Promise.all(studentPromises);
    // Step 2: Create the cohort

    const newCohort = await Cohort.create({
        cohortNumber: cohortData.cohortNumber,
        startDate: cohortData.startDate,
        endDate: cohortData.endDate,
    });

    const students = await Student.find({ cohort: cohortData.cohortNumber });


    // Generate class days (Monday, Wednesday, Friday)
    const start = new Date(cohortData.startDate);
    const end = new Date(cohortData.endDate);
    const classDays = [];
    const daysOfWeek = [1, 3, 5]; // Mon, Wed, Fri (0 = Sunday, 6 = Saturday)

    while (start <= end) {
        if (daysOfWeek.includes(start.getDay())) {
            classDays.push({
                day: classDays.length + 1,
                date: new Date(start),
                students: students.map((student) => ({
                    studentId: student._id,
                    status: "Absent",
                })),
            });
        }
        start.setDate(start.getDate() + 1);
    }

    // Create the attendance sheet for the cohort
     await Attendance.create({
        cohortId: newCohort._id,
        classDays,
    });
    res.status(201).json({
        status: "success",
        message: "Cohort created and students onboarded.",
        cohort: newCohort,
        studentsOnboarded: studentsFromExcel.length,
    });
    
});
