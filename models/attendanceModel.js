const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
    cohortId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Cohort",
        required: true,
    },
    classDays: [
        {
            day: { type: Number, required: true }, // Sequential day number (e.g., Day 1, Day 2)
            date: { type: Date, required: true }, // Exact date of the class
            students: [
                {
                    studentId: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: "Student",
                        required: true,
                    },
                    status: {
                        type: String,
                        enum: ["Absent", "Present"],
                        default: "Absent",
                    },
                    checkInTime: { type: Date }, // Only filled if marked Present
                    checkOutTime: { type: Date }, // Optional for future features
                    score: { type: Number, default: 0 }, // Attendance score
                },
            ],
        },
    ],
});

// Pre-hook to populate studentId with firstName and lastName
attendanceSchema.pre(/^find/, function (next) {
    this.populate("classDays.students.studentId", "firstName lastName");
    next();
});
// Pre-hook to populate studentId with firstName and lastName
attendanceSchema.pre(/^findOne/, function (next) {
    this.populate("classDays.students.studentId", "firstName lastName");
    next();
});

const Attendance = mongoose.model("Attendance", attendanceSchema);
module.exports = Attendance;

