const mongoose = require("mongoose");

const cohortSchema = new mongoose.Schema({
    cohortNumber: {
        type: Number,
        required: true,
        unique: true,
    },
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        required: true,
    },
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active",
    },
    students: [
        {
            type: mongoose.Schema.ObjectId,
            ref: "student",
        },
    ],
    bestStudents: [
        {
            type: mongoose.Schema.ObjectId,
            ref: "Student",
        },
    ],
});

const Cohort = mongoose.model("Cohort", cohortSchema);

module.exports = Cohort;
