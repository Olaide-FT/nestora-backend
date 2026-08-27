const express = require("express");
const Property = require("../models/property.model");

const {createProperty,getProperties,getProperty,getMyProperties,updateProperty,deleteProperty, updateAvailabilityStatus,} = require("../controller/property.controller");

const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize");
const upload = require("../middleware/upload.middleware");

const router = express.Router();

router.get("/", getProperties);

router.get("/:id", getProperty);

router.post("/create",protect,authorize("owner"),upload.array("images", 10),createProperty);

router.get("/owner/my-properties",protect,authorize("owner"),getMyProperties);

router.put("/:id",protect,authorize("owner"),upload.array("images", 10),updateProperty);

router.put("/:id/availability",protect,authorize("owner"),updateAvailabilityStatus);

router.delete("/delete/:id",protect,authorize("owner", "admin"),deleteProperty);    


module.exports = router;
