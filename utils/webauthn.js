const {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} = require("@simplewebauthn/server");

const {isoUint8Array} = require("@simplewebauthn/server/helpers");

const Student = require("../models/studentModel");

// Helper constants
const RP_NAME = "Tech School Hub";
const RP_ID = "localhost"; // Change this for production (e.g., your domain name)
const port = process.env.FRONTEND_URL; // Use https:// for production

module.exports.registerOptionUtil = async (user) => {
    // Generate options for registration
    const options = generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: RP_ID,
        userID: isoUint8Array.fromUTF8String(user._id),
        userName: user.email,
        attestationType: "none",
        authenticatorSelection: {
            residentKey: "required", // Ties credentials to the user and authenticator
            authenticatorAttachment: "platform", // Use only the platform authenticator
            userVerification: "required", // Ensure fingerprint verification
        },
        userVerification: "preferred",
    });

    return options;
};

// Verify registration response
module.exports.verifyRegister = async (response, userId) => {
    const student = await Student.findById(userId);
    console.log(student);

    if (!student || !student.challenge) {
        throw new Error("Invalid user or challenge not found");
    }

    let verification;
    try {
        verification = await verifyRegistrationResponse({
            response,
            expectedChallenge: student.challenge,
            expectedOrigin: port,
            expectedRPID: RP_ID,
        });
    } catch (error) {
        console.error("Error verifying registration response:", error);
        return false;
    }

    const {verified, registrationInfo} = verification;

    if (!verified) {
        throw new Error("Error registering user");
    }

    return registrationInfo;
};

// Generate authentication options
module.exports.loginOptionsUtil = async (user) => {
    const options = generateAuthenticationOptions({
        rpID: RP_ID,
        allowCredentials: [
            {
                id: user.fingerPrint.credentialId,
                type: "public-key",
            },
        ],
        userVerification: "preferred",
    });

    return options;
};

// Verify authentication response
module.exports.verifyLogin = async (response, userId) => {
    const student = await Student.findById(userId);

    if (!student || !student.challenge || !student.fingerPrint) {
        throw new Error("Invalid user or missing credentials");
    }

    const {credentialId, publicKey, counter} = student.fingerPrint;
    const credentialPublicKey = publicKey.includes(",")
        ? Uint8Array.from(publicKey.split(",").map(Number)) // Byte array string
        : Uint8Array.from(Buffer.from(publicKey, "base64")); // Base64-encoded

    let verification;
    try {
        verification = await verifyAuthenticationResponse({
            response,
            expectedChallenge: student.challenge,
            expectedOrigin: port,
            expectedRPID: RP_ID,
            authenticator: {
                credentialID: Buffer.from(credentialId, "base64"),
                credentialPublicKey: credentialPublicKey,
                counter: counter,
            },
            credential: {
                type: "public-key",
                id: Buffer.from(credentialId, "base64"),
                counter,
                publicKey: credentialPublicKey,
            },
        });
    } catch (error) {
        console.error("Error verifying authentication response:", error);
        return false;
    }

    const {verified} = verification;

    return verified;
};
