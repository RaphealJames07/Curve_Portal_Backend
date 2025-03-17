const mongoose = require("mongoose");

const schemeSchema = new mongoose.Schema({
    cohortId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Cohort",
    },
    cohortNumber: {
        type: Number,
        required: true,
    },
    schemes: {
        frontendScheme: [
            {
                day: Number,
                subject: String,
                date: Date,
            },
        ],
        backendScheme: [
            {
                day: Number,
                subject: String,
                date: Date,
            },
        ],
        productDesignScheme: [
            {
                day: Number,
                subject: String,
                date: Date,
            },
        ],
    },
});

const Scheme = mongoose.model("Scheme", schemeSchema);

module.exports = Scheme;
