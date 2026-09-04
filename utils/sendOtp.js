const sendMail = require("../services/nodemailer");

async function sendOtp(email, otp) {

    return sendMail({

        from: process.env.EMAIL,

        to: email,

        subject: "Verify your Nestora account",
        text: `Your Nestora verification code is ${otp}. This code expires in 5 minutes.`,
        html: `
            <div style="margin:0;padding:32px 16px;background:#f7f5f0;font-family:Arial,sans-serif;color:#17352b;">
              <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e1d8;">
                <div style="padding:24px 32px;background:#17352b;color:#ffffff;">
                  <div style="font-size:24px;font-weight:700;letter-spacing:-0.5px;">Nestora</div>
                </div>
                <div style="padding:32px;">
                  <div style="font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#c9a45c;">Email verification</div>
                  <h1 style="margin:12px 0 16px;font-size:28px;line-height:1.2;color:#17352b;">Verify your account</h1>
                  <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#63736c;">Use the verification code below to complete your Nestora registration.</p>
                  <div style="padding:18px;text-align:center;background:#f7f5f0;border:1px solid #e5e1d8;border-radius:8px;">
                    <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#17352b;">${otp}</span>
                  </div>
                  <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#63736c;">This code expires in 5 minutes. If you did not create a Nestora account, you can ignore this email.</p>
                </div>
                <div style="padding:18px 32px;border-top:1px solid #e5e1d8;font-size:12px;color:#8a9790;">© ${new Date().getFullYear()} Nestora</div>
              </div>
            </div>
        `
    });

}

module.exports = sendOtp;
