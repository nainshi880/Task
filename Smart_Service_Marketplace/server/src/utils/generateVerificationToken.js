import crypto from "crypto";

const generateVerificationToken = () => {

    const verificationToken =
        crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto
        .createHash("sha256")
        .update(verificationToken)
        .digest("hex");

    return {
        verificationToken,
        hashedToken,
    };

};

export default generateVerificationToken;