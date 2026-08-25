const Favorite = require("../models/favorite.model");
const Property = require("../models/property.model");

const addFavorite = async (req, res) => {
    try {
        const { propertyId } = req.body;

        if (!propertyId) {
            return res.status(400).json({ message: "Property ID is required" });
        }

        const property = await Property.findOne({ _id: propertyId, approvalStatus: "approved", availabilityStatus: "available" });

        if (!property) {
            return res.status(404).json({message:"Property not found or unavailable"});
        }

        const existingFavorite = await Favorite.findOne({ user: req.user.userId, property: propertyId});

        if (existingFavorite) {
            return res.status(409).json({message: "Property is already in your favorites"});
        }

        const favorite = await Favorite.create({ user: req.user.userId,property: propertyId});

        res.status(201).json({ message:"Property added to favorites",favorite});

    } catch (error) {
        console.error("Add Favorite Error:",error);

        res.status(500).json({message:"Failed to add property to favorites"});
    }
};

const getFavorites = async (req, res) => {
    try {
        const favorites = await Favorite.find({ user: req.user.userId})
                .populate({
                    path: "property",
                    populate: {
                        path: "owner",
                        select:
                            "firstName lastName email phone",
                    },
                })
                .sort({
                    createdAt: -1,
                });

        res.status(200).json({ count: favorites.length, favorites});

    } catch (error) {
        console.error("Get Favorites Error:",error);

        res.status(500).json({message:"Failed to get favorites"});
    }
};

const removeFavorite = async (req, res) => {
    try {
        const { propertyId } = req.params;

        const favorite = await Favorite.findOneAndDelete({user: req.user.userId, property: propertyId});

        if (!favorite) {
            return res.status(404).json({message:"Property is not in your favorites"});
        }

        res.status(200).json({message: "Property removed from favorites"});

    } catch (error) {
        console.error("Remove Favorite Error:", error);

        res.status(500).json({message:"Failed to remove favorite"});
    }
};

module.exports = {
    addFavorite,
    getFavorites,
    removeFavorite,
};