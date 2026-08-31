import multer from "multer";
import path from "path";

export const upload = multer({
  dest: path.resolve("uploads"),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_, arquivo, callback) => {
    const parecePdf = arquivo.mimetype === "application/pdf" || /\.pdf$/i.test(arquivo.originalname);
    if (!parecePdf) return callback(new Error("Envie somente arquivos PDF."));
    return callback(null, true);
  },
});
