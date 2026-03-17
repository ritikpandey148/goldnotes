const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("./cloudinary");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "goldnotes",
    resource_type: "auto",
  },
});

const upload = multer({ storage });

module.exports = upload;