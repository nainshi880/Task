import fs from "fs";
import path from "path";
import multer from "multer";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";

const tempDir = path.join(process.cwd(), "uploads", "temp");

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, tempDir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const imageFilter = (_req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const extOk = allowed.test(
    path.extname(file.originalname).toLowerCase().replace(".", "")
  );
  const mimeOk = allowed.test(file.mimetype.split("/")[1] || "");

  if (extOk && mimeOk) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Only JPEG, PNG, and WEBP images are allowed."
      ),
      false
    );
  }
};

export const uploadIssueImages = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5,
  },
  fileFilter: imageFilter,
}).array("issueImages", 5);

export const optionalIssueImagesUpload = (req, res, next) => {
  const contentType = req.headers["content-type"] || "";

  if (contentType.includes("multipart/form-data")) {
    return uploadIssueImages(req, res, next);
  }

  return next();
};

export default uploadIssueImages;
