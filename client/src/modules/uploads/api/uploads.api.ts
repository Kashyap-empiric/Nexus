import { api } from "@/shared/lib/api";

export interface AttachmentResponseDto {
  id: string;
  conversationId: string;
  messageId: string | null;
  originalName: string;
  size: number;
  mimeType: string;
  storagePath: string;
  createdAt: string;
  createdBy: string;
  downloadUrl?: string;
}

export const uploadsApi = {
  createAttachmentRecord: async (data: {
    conversationId: string;
    originalName: string;
    size: number;
    mimeType: string;
    extension: string;
    fileName: string;
  }): Promise<AttachmentResponseDto> => {
    const res = await api.post("/uploads", data);
    return res.data;
  },

  deleteAttachmentRecord: async (id: string): Promise<void> => {
    await api.delete(`/uploads/${id}`);
  },

  getAttachmentDownloadUrl: async (id: string): Promise<{ url: string }> => {
    const res = await api.get(`/uploads/${id}/download`);
    return res.data;
  },
};
