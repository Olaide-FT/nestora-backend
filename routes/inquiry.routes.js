const express = require("express");

const router = express.Router();

const {createInquiry,getReceivedInquiries,getSentInquiries,getInquiry,respondToInquiry,closeInquiry,} = require("../controller/inquiry.controller");

const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize");

router.post("/",protect,authorize("buyer"),createInquiry);

router.get("/sent",protect,authorize("buyer"),getSentInquiries);

router.get("/received",protect,authorize("owner"),getReceivedInquiries);

router.put("/:id/respond",protect,authorize("owner"),respondToInquiry);

router.put("/:id/close",protect,authorize("owner"),closeInquiry);

router.get( "/:id", protect,authorize("buyer", "owner"), getInquiry);


module.exports = router;