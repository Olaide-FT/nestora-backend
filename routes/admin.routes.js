const express = require("express");
const {getDashboardStats,getPendingProperties,rejectProperty,approveProperty,getAllUsers,toggleUserStatus,getAllProperties,deletePropertyByAdmin} = require("../controller/admin.controller");

const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize");

const router = express.Router();

router.get("/dashboard",protect,authorize("admin"),getDashboardStats);

router.get("/properties/pending",protect,authorize("admin"),getPendingProperties);

router.get("/properties",protect,authorize("admin"),getAllProperties);

router.put("/properties/:id/approve",protect,authorize("admin"),approveProperty);

router.put("/properties/:id/reject",protect,authorize("admin"),rejectProperty);

router.delete("/properties/:id",protect,authorize("admin"),deletePropertyByAdmin);

router.get("/users",protect,authorize("admin"),getAllUsers);

router.put("/users/:id/toggle",protect,authorize("admin"),toggleUserStatus);


module.exports = router;