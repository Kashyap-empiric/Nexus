import { Router } from "express";
import { authMiddleware } from "@/middlewares/auth.js";
import { validate } from "@/middlewares/validate.js";
import { rejectDeletingAccount } from "@/middlewares/accountStatus.js";
import { uploadAttachment, downloadAttachment, deleteAttachment } from "./uploads.controller.js";
import { uploadAttachmentBodySchema, attachmentIdParamsSchema } from "./uploads.schema.js";

const router = Router({ mergeParams: true });

router.post(
  "/",
  authMiddleware,
  rejectDeletingAccount,
  validate({ body: uploadAttachmentBodySchema }),
  uploadAttachment
);

router.get(
  "/:id/download",
  authMiddleware,
  validate({ params: attachmentIdParamsSchema }),
  downloadAttachment
);

router.delete(
  "/:id",
  authMiddleware,
  rejectDeletingAccount,
  validate({ params: attachmentIdParamsSchema }),
  deleteAttachment
);

export default router;
