const express = require("express");

const router = express.Router();

const {addFavorite,getFavorites,removeFavorite} = require("../controller/favorite.controller");

const protect = require("../middleware/auth.middleware");

const authorize = require("../middleware/authorize");

router.post("/",protect, authorize("buyer"),addFavorite);

router.get("/",protect,authorize("buyer"),getFavorites );

router.delete( "/:propertyId", protect,authorize("buyer"),removeFavorite);


module.exports = router;