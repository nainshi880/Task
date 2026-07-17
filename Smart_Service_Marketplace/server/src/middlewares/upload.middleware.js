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

export const uploadProfilePhoto = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: imageFilter,
}).single("profilePhoto");

export const uploadCustomerAvatar = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: imageFilter,
}).single("avatar");

const identityProofFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
  const allowed = /jpeg|jpg|png|webp|pdf/;
  const mimeOk =
    file.mimetype.startsWith("image/") || file.mimetype === "application/pdf";

  if (allowed.test(ext) && mimeOk) {
    return cb(null, true);
  }

  return cb(
    new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Identity proof must be an image or PDF."
    ),
    false
  );
};

export const uploadIdentityProof = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: identityProofFilter,
}).single("identityProof");

export const uploadCertificationDocument = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: identityProofFilter,
}).single("document");

const registrationFileFilter = (_req, file, cb) => {
  const field = file.fieldname;
  const ext = path.extname(file.originalname).toLowerCase().replace(".", "");

  if (field === "profileImage" || field === "profilePhoto") {
    const allowed = /jpeg|jpg|png|webp/;
    if (allowed.test(ext) && file.mimetype.startsWith("image/")) {
      return cb(null, true);
    }
    return cb(
      new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Profile image must be JPEG, PNG, or WEBP."
      ),
      false
    );
  }

  if (field === "identityProof") {
    const allowed = /jpeg|jpg|png|webp|pdf/;
    const mimeOk =
      file.mimetype.startsWith("image/") || file.mimetype === "application/pdf";
    if (allowed.test(ext) && mimeOk) {
      return cb(null, true);
    }
    return cb(
      new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Identity proof must be an image or PDF."
      ),
      false
    );
  }

  return cb(
    new ApiError(HTTP_STATUS.BAD_REQUEST, "Unexpected file field."),
    false
  );
};

export const uploadTechnicianRegistrationFiles = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 2,
  },
  fileFilter: registrationFileFilter,
}).fields([
  { name: "profileImage", maxCount: 1 },
  { name: "identityProof", maxCount: 1 },
]);

export const optionalIssueImagesUpload = (req, res, next) => {
  const contentType = req.headers["content-type"] || "";

  if (contentType.includes("multipart/form-data")) {
    return uploadIssueImages(req, res, next);
  }

  return next();
};

const chatFileFilter = (_req, file, cb) => {
  const allowedExt =
    /jpeg|jpg|png|webp|gif|pdf|doc|docx|txt|xls|xlsx|zip|rar/;
  const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
  const mime = file.mimetype || "";

  const mimeOk =
    mime.startsWith("image/") ||
    mime.startsWith("application/") ||
    mime.startsWith("text/");

  if (allowedExt.test(ext) && mimeOk) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Unsupported file type. Allowed: images, PDF, DOC, TXT, XLS, ZIP."
      ),
      false
    );
  }
};

export const uploadChatAttachments = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 5,
  },
  fileFilter: chatFileFilter,
}).array("files", 5);

export default uploadIssueImages;
