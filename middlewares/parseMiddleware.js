const xlsx = require("xlsx");
const fs = require("fs");

exports.parseExcel = (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                status: "fail",
                message: "No file uploaded",
            });
        }

        const filePath = req.file.path;
        const workbook = xlsx.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(sheet); // Parse sheet to JSON

        fs.unlinkSync(filePath); // Delete file after processing
        req.parsedData = data; // Attach parsed data to req
        next(); // Proceed to the next middleware/controller
    } catch (error) {
        next(error);
    }
};
