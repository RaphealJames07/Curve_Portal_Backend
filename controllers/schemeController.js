const Scheme = require("../models/schemeModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

exports.createScheme = catchAsync(async (req, res, next) => {
    const {cohortId} = req.body;
    const {schemeType} = req.query;

    if (
        !["frontendScheme", "backendScheme", "productDesignScheme"].includes(
            schemeType
        )
    ) {
        return res.status(400).json({
            status: "fail",
            message: "Invalid scheme type",
        });
    }

    const scheme = await Scheme.findById(cohortId);

    if (!scheme) {
        return next(new AppError("Scheme not found", 404));
    }

    // Add the parsed data to the correct scheme array
    scheme.schemes[schemeType].push(...req.parsedData);

    await scheme.save();

    res.status(200).json({
        status: "success",
        data: {
            updatedScheme: scheme,
        },
    });
});

exports.getAllScheme = catchAsync(async (req, res, next) => {
    const scheme = await Scheme.find();
    res.status(200).json({
        status: "success",
        data: {
            scheme: scheme,
        },
    });
});

exports.getSchemeByName = catchAsync(async (req, res, next) => {
    const {schemeName} = req.query;

    // Validate schemeName
    const validSchemes = {
        frontend: "frontendScheme",
        backend: "backendScheme",
        productdesign: "productDesignScheme",
    };

    const schemeType = validSchemes[schemeName.toLowerCase()];
    if (!schemeType) {
        return res.status(400).json({
            status: "fail",
            message:
                "Invalid scheme name. Use 'frontend', 'backend', or 'productdesign'.",
        });
    }

    // Fetch the scheme from the database
    const scheme = await Scheme.findOne(); // Assuming one scheme document per cohort. Adjust if needed.

    if (!scheme) {
        return next(new AppError("Scheme not found", 404));
    }

    // Extract and return the specific scheme type
    const specificScheme = scheme.schemes[schemeType];

    res.status(200).json({
        status: "success",
        data: {
            name: schemeName,
            scheme: specificScheme,
        },
    });
});

exports.deleteSchemeByName = catchAsync(async (req, res, next) => {
    const {schemeName, id} = req.query;

    // Validate schemeName
    const validSchemes = {
        frontend: "frontendScheme",
        backend: "backendScheme",
        productdesign: "productDesignScheme",
    };

    const schemeType = validSchemes[schemeName.toLowerCase()];
    if (!schemeType) {
        return res.status(400).json({
            status: "fail",
            message:
                "Invalid scheme name. Use 'frontend', 'backend', or 'productdesign'.",
        });
    }

    // Fetch the scheme document (assuming one document per cohort)
    const scheme = await Scheme.findById({_id: id});

    if (!scheme) {
        return next(new AppError("Scheme not found", 404));
    }

    // Clear the specified scheme type array
    scheme.schemes[schemeType] = [];

    // Save the updated document
    await scheme.save();

    res.status(200).json({
        status: "success",
        message: `${schemeName} scheme cleared successfully.`,
        data: {
            updatedScheme: scheme,
        },
    });
});
