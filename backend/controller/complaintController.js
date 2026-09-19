const createComplaint = async (req, res) => {

    try {

        const complaint = await Complaint.create({

            title: req.body.title,

            category: req.body.category,

            location: req.body.location,

            description: req.body.description,

            reportedBy: req.user.userId,

            image: req.file
                ? req.file.path
                : null,

            status: "Pending"

        });

        res.status(201).json({
            message: "Complaint created successfully",
            complaint
        });

    } catch (error) {

        res.status(500).json({
            message: "Failed to create complaint",
            error: error.message
        });

    }
};



module.exports = {
    createComplaint
}