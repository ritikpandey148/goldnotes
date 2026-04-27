const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("./cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder: "goldnotes",
      resource_type: "auto",
    };
  },
});

const upload = multer({ storage });

module.exports = upload;