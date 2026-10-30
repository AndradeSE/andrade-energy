import multer from "multer";
import { uploadDirectory } from "./uploadDirectory";
import type { RequestHandler } from "express";
import { trackRequestTask } from "./requestTasks";
import { consumePdfUpload, deleteTemporaryPdf } from "../modules/uploads/uploads.service";

const multipartUpload = multer({
  dest: uploadDirectory(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_, arquivo, callback) => {
    const parecePdf = arquivo.mimetype === "application/pdf" || /\.pdf$/i.test(arquivo.originalname);
    if (!parecePdf) return callback(new Error("Envie somente arquivos PDF."));
    return callback(null, true);
  },
});

export const upload = {
  single(field: string): RequestHandler {
    const multipart = multipartUpload.single(field);
    return (req, res, next) => {
      if (!req.body?.uploadedFileId) return multipart(req, res, next);
      void consumePdfUpload(req, field).then(file => {
        req.file = file;
        res.once("finish", () => trackRequestTask(deleteTemporaryPdf(file.path)));
        next();
      }, () => res.status(400).json({ message: "Envio de PDF inválido, expirado ou já utilizado. Prepare um novo envio." }));
    };
  },
};
