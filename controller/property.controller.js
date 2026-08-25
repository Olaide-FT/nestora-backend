const jwt = require("jsonwebtoken");
const Property = require("../models/property.model");
const uploadToCloudinary = require("../utils/uploadToCloudinary");

const getRequestUser = (req) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }

    try {
        const token = authHeader.split(" ")[1];
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return null;
    }
};

const createProperty = async (req, res) => {
    try {
        const {
            title,
            description,
            listingType,
            propertyType,
            price,
            bedrooms,
            bathrooms,
            squareFootage,
            address,
            city,
            state,
            zipCode,
            amenities,
            images: bodyImages,
            location,
        } = req.body;

        const resolvedAddress = address || location;

        if (!title ||!description || !listingType ||!propertyType ||price === undefined ||!resolvedAddress ||!city ||!state) {
            return res.status(400).json({message:"Please provide all required property fields"});
        }

        if (Number(price) < 0) {
            return res.status(400).json({message: "Price cannot be negative"});
        }

        const images = [];

        if (Array.isArray(bodyImages) && bodyImages.length > 0) {
            bodyImages
                .filter((image) => typeof image === "string" && image.trim())
                .forEach((image) => images.push(image.trim()));
        }

        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const result =
                    await uploadToCloudinary(file.buffer);

                images.push(result.secure_url);
            }
        }

        let parsedAmenities = [];

        if (amenities) {
            try {
                parsedAmenities = typeof amenities === "string" ? JSON.parse(amenities) : amenities;
            } catch (error) {
                return res.status(400).json({message: "Invalid amenities format"});
            }
        }

        const property = await Property.create({
            owner: req.user.userId,

            title,
            description,
            listingType,
            propertyType,

            price: Number(price),

            bedrooms: Number(bedrooms) || 0,
            bathrooms: Number(bathrooms) || 0,

            squareFootage: squareFootage ? Number(squareFootage): undefined,

            address: resolvedAddress,
            city,
            state,
            zipCode,

            images,

            amenities: parsedAmenities,

            approvalStatus: "pending",

            availabilityStatus: "available",

            views: 0,
        });

        res.status(201).json({message: "Property created successfully",property});
    } catch (error) {
        console.error("Create Property Error:",error);

        res.status(500).json({message: "Failed to create property"});
    }
};

const getProperties = async (req, res) => {
    try {
        const {
            search,
            listingType,
            propertyType,
            city,
            state,
            minPrice,
            maxPrice,
            bedrooms,
            bathrooms,
            sort,
            page = 1,
            limit = 12,
        } = req.query;

        const filter = {
            approvalStatus: "approved",
            availabilityStatus: "available",
        };

        // Search by title, city, or state
        if (search) {
            filter.$or = [
                {
                    title: {
                        $regex: search,
                        $options: "i",
                    },
                },
                {
                    city: {
                        $regex: search,
                        $options: "i",
                    },
                },
                {
                    state: {
                        $regex: search,
                        $options: "i",
                    },
                },
            ];
        }

        if (listingType) {
            filter.listingType = listingType;
        }

        if (propertyType) {
            filter.propertyType = propertyType;
        }

        if (city) {
            filter.city = { $regex: city, $options: "i"};
        }

        if (state) {
            filter.state = {$regex: state,$options: "i"};
        }

        if (minPrice || maxPrice) {
            filter.price = {};

            if (minPrice) {
                filter.price.$gte = Number(minPrice);
            }

            if (maxPrice) {
                filter.price.$lte = Number(maxPrice);
            }
        }

        if (bedrooms) {
            filter.bedrooms = {$gte: Number(bedrooms)};
        }

        if (bathrooms) {
            filter.bathrooms = {$gte: Number(bathrooms)};
        }

        let sortOption = {createdAt: -1};

        if (sort === "price-low") {
            sortOption = {price: 1};
        }

        if (sort === "price-high") {
            sortOption = {price: -1};
        }

        if (sort === "oldest") {
            sortOption = {createdAt: 1};
        }

        if (sort === "views") {
            sortOption = {views: -1};
        }

        const currentPage = Math.max(Number(page),1);

        const pageLimit = Math.min(Math.max(Number(limit), 1),50);

        const skip = (currentPage - 1) * pageLimit;

        const properties =
            await Property.find(filter)
                .populate("owner","firstName lastName email phone")
                .sort(sortOption)
                .skip(skip)
                .limit(pageLimit);

        // Get total number of matching properties
        const total =
            await Property.countDocuments(filter);

        res.status(200).json({
            count: properties.length,
            total,
            page: currentPage,
            totalPages: Math.ceil(total / pageLimit),
            properties,
        });
    } catch (error) {
        console.error("Get Properties Error:",error);

        res.status(500).json({
            message: "Failed to get properties",
        });
    }
};

const getProperty = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = getRequestUser(req);

        const property = await Property.findById(id).populate("owner", "firstName lastName email phone");

        if (!property) {
            return res.status(404).json({ message: "Property not found" });
        }

        const isPubliclyVisible =
            property.approvalStatus === "approved" &&
            property.availabilityStatus === "available";

        const isAuthorizedViewer =
            currentUser && (
                currentUser.role === "admin" ||
                (property.owner && property.owner._id && currentUser.userId && property.owner._id.toString() === currentUser.userId.toString())
            );

        if (!isPubliclyVisible && !isAuthorizedViewer) {
            return res.status(404).json({ message: "Property not found" });
        }

        if (isPubliclyVisible) {
            const viewedProperty = await Property.findByIdAndUpdate(
                id,
                {
                    $inc: {
                        views: 1,
                    },
                },
                {
                    new: true,
                }
            ).populate("owner", "firstName lastName email phone");

            return res.status(200).json({ property: viewedProperty });
        }

        return res.status(200).json({ property });
    } catch (error) {
        console.error("Get Property Error:", error);

        res.status(500).json({ message: "Failed to get property" });
    }
};

const getMyProperties = async (req, res) => {
    try {
        const properties =
            await Property.find({
                owner: req.user.userId,
            }).sort({
                createdAt: -1,
            });

        res.status(200).json({count: properties.length, properties});
    } catch (error) {
        console.error("Get My Properties Error:",error);

        res.status(500).json({message:"Failed to get your properties",error});
    }
};

const updateProperty = async (req, res) => {
    try {
        const { id } = req.params;

        const property =
            await Property.findById(id);

        if (!property) {
            return res.status(404).json({message: "Property not found"});
        }

        // Check ownership
        if (property.owner.toString() !==req.user.userId.toString()) {
            return res.status(403).json({message:"You are not authorized to update this property"});
        }

        const allowedFields = [
            "title",
            "description",
            "listingType",
            "propertyType",
            "price",
            "bedrooms",
            "bathrooms",
            "squareFootage",
            "address",
            "city",
            "state",
            "zipCode",
            "amenities",
        ];

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                property[field] =req.body[field];
            }
        });

        if (req.body.price !== undefined && Number(req.body.price) < 0) {
            return res.status(400).json({message:"Price cannot be negative"});
        }

        // Updating a property sends it back for admin review
        property.approvalStatus = "pending";
        property.rejectionReason = null;

        await property.save();

        res.status(200).json({message:"Property updated and sent for review",property});
    } catch (error) {
        console.error("Update Property Error:",error);

        res.status(500).json({message:"Failed to update property"});
    }
};

const updateAvailabilityStatus = async (req,res) => {
    try {
        const { id } = req.params;

        const { availabilityStatus } = req.body;

        const allowedStatuses = ["available","sold","rented",];

        if (!allowedStatuses.includes(availabilityStatus)
        ) {
            return res.status(400).json({message:"Invalid availability status"});
        }

        const property = await Property.findById(id);

        if (!property) {
            return res.status(404).json({ message: "Property not found"});
        }

        // Check ownership
        if (
            property.owner.toString() !== req.user.userId.toString()) {
            return res.status(403).json({message:"You are not authorized to update this property"});
        }

        // Property must be approved first
        if (property.approvalStatus !=="approved") {
            return res.status(400).json({ message:"Only approved properties can have their availability status changed"});
        }

        property.availabilityStatus = availabilityStatus;

        await property.save();

        res.status(200).json({
            message: "Property availability updated successfully", property});
    } catch (error) {
        console.error("Update Availability Error:", error);

        res.status(500).json({message:"Failed to update property availability"});
    }
};

const deleteProperty = async (req, res) => {
    try {
        const { id } = req.params;

        const property =
            await Property.findById(id);

        if (!property) {
            return res.status(404).json({
                message: "Property not found",
            });
        }

        if (property.owner.toString() !==req.user.userId.toString()) {
            return res.status(403).json({message:"You are not authorized to delete this property"});
        }

        await property.deleteOne();

        res.status(200).json({message:"Property deleted successfully"});
    } catch (error) {
        console.error("Delete Property Error:",error);

        res.status(500).json({message:"Failed to delete property"});
    }
};

module.exports = {
    createProperty,
    getProperties,
    getProperty,
    getMyProperties,
    updateProperty,
    updateAvailabilityStatus,
    deleteProperty,
};