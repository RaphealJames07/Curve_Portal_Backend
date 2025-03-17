const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Student = require("../models/studentModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const sendEmail = require("../utils/email");

const signToken = (id, jwtVersion) =>
    jwt.sign({id, jwtVersion}, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });

const createSendToken = (student, statusCode, res) => {
    const token = signToken(student._id, student.jwtVersion);
    const cookieOptions = {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
    };
    if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

    res.cookie("jwt", token, cookieOptions);
    student.password = undefined;

    res.status(statusCode).json({
        status: "success",
        token,
        data: {
            student,
        },
    });
};

exports.updateStudent = catchAsync(async (req, res, next) => {
    const {firstName, email, admissionCode} = req.body;
    const student = await Student.findOne({email}).select("+hasOnboarded");

    if (!student) {
        return next(
            new AppError(
                ` Dear ${firstName}, You have not been invited to this cohort, please contact admin`,
                401
            )
        );
    }
    if (student.hasOnboard) {
        return next(
            new AppError("Account already created, proceed to login", 404)
        );
    }
    if (student.admissionCode !== admissionCode) {
        return next(new AppError("Invalid Admission Code", 404));
    }

    student.firstName = req.body.firstName;
    student.lastName = req.body.lastName;
    student.stack = req.body.stack;
    student.gender = req.body.gender;
    student.password = req.body.password;
    student.confirmPassword = req.body.confirmPassword;
    student.hasOnboard = true;

    await student.save();
    const message = `Dear ${firstName}, Welcome onboard to The Curve Africa. bla bla bla...`;
    await sendEmail({
        email,
        subject: "The Curve Africa Student Account",
        message,
    });
    createSendToken(student, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
    const {email, password} = req.body;

    // 1) Check if email and password exist
    if (!email || !password) {
        return next(new AppError("Please provide email and password", 400));
    }
    // 2) Check if student exists && password is correct
    const student = await Student.findOne({email}).select("+password");

    if (
        !student ||
        !(await student.correctPassword(password, student.password))
    ) {
        return next(new AppError("Incorrect email or password", 401));
    }
    // 3) if everything ok, send token to client
    createSendToken(student, 200, res);
});

exports.forgetPassword = catchAsync(async (req, res, next) => {
    // 1) Get user based on POSTed email
    const user = await Student.findOne({email: req.body.email});

    if (!user) {
        return next(new AppError("There is no user with email address", 404));
    }

    // 2) Generate the random reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({validateBeforeSave: false});

    // 3) sent it to the user's email
    const resetUrl = `${req.protocol}://${req.get("host")}/api/v1/student/resetPassword/${resetToken}`;

    const message = `Forgot your password? Submit a PATCH request with your new password and confirmPassword to: ${resetUrl}. \nIf you didn't forget your password, please ignore this email`;
    try {
        await sendEmail({
            email: user.email,
            subject: "Your password reset token is valid for 10 minutes",
            message,
        });
        res.status(200).json({
            status: "success",
            message: "Token sent to email",
        });
    } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({validateBeforeSave: false});
        return next(new AppError("Error sending email. Try again later.", 500));
    }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
    // 1) Get user based on the token
    const hashedToken = crypto
        .createHash("sha256")
        .update(req.params.token)
        .digest("hex");

    const user = await Student.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: {$gt: Date.now()},
    });

    // 2) If token has not expired, and there is user, set the new password
    if (!user) {
        return next(new AppError("Token is invalid or has expired", 400));
    }
    user.password = req.body.password;
    user.confirmPassword = req.body.confirmPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.status(200).json({
        status: "success",
        message:
            "Password changed successfully, now log in with your new password.",
    });
});

exports.updatePassword = catchAsync(async (req, res, next) => {
    // 1) Get user from collection
    const user = await Student.findById(req.user.id).select("+password");
    // console.log(user)

    // 2) Check if POSTed current password is correct
    if (
        !(await user.correctPassword(req.body.currentPassword, user.password))
    ) {
        return next(new AppError("Your current password is wrong.", 401));
    }
    // 3) If so, update password
    user.password = req.body.password;
    user.confirmPassword = req.body.confirmPassword;
    await user.save();

    //4) Log user in, send JWT
    createSendToken(user, 200, res);
});

const filterObj = (obj, ...allowedFields) => {
    const newObj = {};
    Object.keys(obj).forEach((el) => {
        if (allowedFields.includes(el)) newObj[el] = obj[el];
    });
    return newObj;
};

exports.updateMe = catchAsync(async (req, res, next) => {
    // 1) Create error if user POSTs password data
    if (req.body.password || req.body.confirmPassword) {
        return next(
            new AppError(
                "This route is not for password updates. Please use /updatePassword.",
                400
            )
        );
    }
    // 2) Filtered out unwanted fields names not allowed to be updated
    const filteredBody = filterObj(req.body, "firstName", "lastName", "gender");

    // 3) Update user document
    const updatedUser = await Student.findByIdAndUpdate(
        req.user.id,
        filteredBody,
        {
            new: true,
            runValidators: true,
        }
    );

    res.status(200).json({
        status: "success",
        data: {
            user: updatedUser,
        },
    });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
    await Student.findByIdAndUpdate(req.user.id, {active: false});

    res.status(204).json({
        status: "success",
        data: null,
    });
});

exports.logout = catchAsync(async (req, res, next) => {
    await Student.findByIdAndUpdate(req.user.id, {$inc: {jwtVersion: 1}});

    res.cookie("jwt", "loggedout", {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
    });

    res.status(200).json({status: "success"});
});

exports.getAllStudents = catchAsync(async (req, res, next) => {
    const allStudents = await Student.find().select("-password");
    res.status(200).json({
        status: "success",
        result: allStudents.length,
        data: {
            allStudents,
        },
    });
});
