import type { Response } from "express";
import type { AuthRequest } from "@/types/shared.js";
import { processUpload, getAttachmentDownloadUrl, removeAttachment } from "./uploads.service.js";
import type { UploadAttachmentBody } from "./uploads.schema.js";

export const uploadAttachment = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const data = req.body as UploadAttachmentBody;

  const attachment = await processUpload(data, userId);
  res.status(201).json(attachment);
};

export const downloadAttachment = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id as string;
  const url = await getAttachmentDownloadUrl(id, userId);
  res.json({ url });
};

export const deleteAttachment = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id as string;
  await removeAttachment(id, userId);
  res.status(204).send();
};
