import multer from "multer";
import { uploadDirectory } from "./uploadDirectory";
import type { RequestHandler } from "express";
import { trackRequestTask } from "./requestTasks";
import { consumePdfUpload, deleteTemporaryPdf } from "../modules/uploads/uploads.service";
import { readFile, writeFile } from "node:fs/promises";
import { converterImagemFatura, tipoImagemFatura, ImagemFaturaError } from "../services/ocr/imagemFatura";

const multipartUpload = multer({
  dest: uploadDirectory(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_, arquivo, callback) => {
    const parecePdf = arquivo.mimetype === "application/pdf" || /\.pdf$/i.test(arquivo.originalname);
    const pareceImagem = /\.(?:png|jpe?g)$/i.test(arquivo.originalname) && ["image/png", "image/jpeg", "application/octet-stream"].includes(arquivo.mimetype);
    if (!parecePdf && !pareceImagem) return callback(new Error("Envie uma fatura PDF, JPG ou PNG."));
    return callback(null, true);
  },
});

export const upload = {
  single(field: string): RequestHandler {
    const multipart = multipartUpload.single(field);
    return (req, res, next) => {
      if (!req.body?.uploadedFileId) return multipart(req, res, error => {
        if (error || !req.file) return next(error);
        const file = req.file;
        if (!/\.(?:png|jpe?g)$/i.test(file.originalname)) return next();
        res.once("finish", () => trackRequestTask(deleteTemporaryPdf(file.path)));
        void readFile(file.path).then(async buffer => {
          const tipoEsperado = /\.png$/i.test(file.originalname) ? "image/png" : "image/jpeg";
          if (tipoImagemFatura(buffer) !== tipoEsperado) throw new ImagemFaturaError("A foto deve ser um JPG ou PNG válido.");
          const pdf = await converterImagemFatura(buffer);
          await writeFile(file.path, pdf);
          file.originalname = file.originalname.replace(/\.(?:png|jpe?g)$/i, ".pdf");
          file.mimetype = "application/pdf";
          file.size = pdf.length;
          next();
        }).catch(next);
      });
      void consumePdfUpload(req, field).then(file => {
        req.file = file;
        res.once("finish", () => trackRequestTask(deleteTemporaryPdf(file.path)));
        next();
      }, error => res.status(400).json({ message: error instanceof ImagemFaturaError ? error.message : "Envio de fatura inválido, expirado ou já utilizado. Prepare um novo envio." }));
    };
  },
};
