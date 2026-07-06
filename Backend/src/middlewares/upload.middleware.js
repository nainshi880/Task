import multer from "multer";

const storage = multer.diskStorage({});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/webp",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only JPG, JPEG, PNG and WEBP images are allowed."
      ),
      false
    );
  }
}


  const upload = multer({
    storage,
     fileFilter,

  limits: {
    fileSize: 2 * 1024 * 1024,
  },
  
});

export default upload;