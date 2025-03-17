const {promisify} = require("util");
const jwt = require("jsonwebtoken");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

exports.protect = (Model)=> catchAsync(async (req, res, next) => {
    // 1) Getting token and check of it's there
    let token;
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
        return next(new AppError("You are not logged in, Please log in", 401));
    }

    // 2) Verificattion token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3) Check if user exists
    const currentUser = await Model.findById(decoded.id);
    if (!currentUser) {
        return next(
            new AppError(
                "The user belonging to this token does no longer exist",
                401
            )
        );
    }

    // 4) Check if user changed password after token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next(
            new AppError(
                "User recently changed password! Please log in again.",
                401
            )
        );
    }

    // Check if the jwtVersion matches
    if (decoded.jwtVersion !== currentUser.jwtVersion) {
      return next(new AppError("Token is invalid or has expired", 401));
    }

    req.user = currentUser;
    next();
});

exports.isAdmin = catchAsync(async (req, res, next) => {
    if (req.user.isAdmin) {
        next();
    } else {
      return next(new AppError("You do not have permission to perform this action", 403));
    }
});
