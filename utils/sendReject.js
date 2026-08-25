const sendMail = require("../services/nodemailer");

const sendRejectEmail = async (property, rejectionReason) => {

    try {
        await sendMail({
            to: property.owner.email,

            subject:
                "Property Listing Rejected",

            html: `
                    <h2>Property Listing Rejected</h2>

                    <p>
                        Hello ${property.owner.firstName},
                    </p>

                    <p>
                        Your property
                        <strong>
                            ${property.title}
                        </strong>
                        was not approved.
                    </p>

                    <p>
                        <strong>Reason:</strong>
                    </p>

                    <p>
                        ${rejectionReason}
                    </p>

                    <p>
                        Please update your property
                        and submit it again for review.
                    </p>
                `,
        });
    } catch (emailError) {
        console.error("Rejection email failed:", emailError);
    }
}

module.exports = sendRejectEmail;