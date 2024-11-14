const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const validator = require("validator");
const crypto = require("crypto");

const studentSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        validate: [validator.isEmail, "Please fill a valid email address"],
        lowercase: true,
    },
    admissionCode: {
        type: String,
        required: true,
        unique: true,
    },
    cohort: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ["active", "alumni"],
        default: "active",
    },
    stack: {
        type: String,
        enum: ["frontend", "backend", "product-design"],
        // required: true,
    },
    gender: {
        type: String,
        enum: ["male", "female"],
        // required: true,
    },
    password: {
        type: String,
        // required: [true, "Please enter your password"],
        minLength: 8,
        // trim: true,
        select: false,
    },
    confirmPassword: {
        type: String,
        // required: [true, "Please confirm your password"],
        // trim: true,
        validate: {
            // This only works on CREATE and SAVE
            validator: function (el) {
                return el === this.password;
            },
            message: "Passwords are not the same",
        },
    },
    passwordChangedAt: {
        type: Date,
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
        type: Boolean,
        default: true,
        select: false,
    },
});

studentSchema.pre("save", async function (next) {
    // Only run this function if password was actually modified
    if (!this.isModified("password")) return next();

    // Create salt and hash
    this.password = await bcrypt.hashSync(this.password, 12);

    // Delete the confirmPassword Fielld
    this.confirmPassword = undefined;
    next();
});

studentSchema.pre("save", function (next) {
    if (!this.isModified("password") || this.isNew) return next();
    this.passwordChangedAt = Date.now() - 1000;
    next();
});

studentSchema.pre(/^find/, function (next) {
    this.find({active: {$ne: false}});
    next();
});

studentSchema.methods.correctPassword = async function (
    userPassword,
    dbPassword
) {
    return await bcrypt.compare(userPassword, dbPassword);
};

studentSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(
            this.passwordChangedAt.getTime() / 1000,
            10
        );
        // console.log(changedTimestamp, JWTTimestamp);
        return JWTTimestamp < changedTimestamp;
    }
    return false;
};

studentSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString("hex");

    this.passwordResetToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

    return resetToken;
};

const Student = mongoose.model("Student", studentSchema);

module.exports = Student;
