const sendMail = require("../services/nodemailer");

async function sendOtp(email, otp) {

    await sendMail({

        from: process.env.EMAIL,

        to: email,

        subject: "Email Verification",

        html: `
            <h2>Verify your account</h2>

            <p>Your OTP is:</p>

            <h1>${otp}</h1>

            <p>This code expires in 5 minutes.</p>
        `
    });

}

module.exports = sendOtp;