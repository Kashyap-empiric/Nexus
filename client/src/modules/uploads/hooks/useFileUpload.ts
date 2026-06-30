import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/shared/lib/supabase";
import { uploadsApi, type AttachmentResponseDto } from "../api/uploads.api";
import { UPLOAD_RULES } from "@/modules/uploads/utils/uploads.constants";

interface UseFileUploadOptions {
  conversationId: string;
}

export type UploadTaskState = "pending" | "uploading" | "processing" | "success" | "error";

export interface UploadTask {
  id: string;
  file: File;
  state: UploadTaskState;
  error?: string;
  attachment?: AttachmentResponseDto;
}

export function useFileUpload({ conversationId }: UseFileUploadOptions) {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const cancelledTasksRef = useRef<Set<string>>(new Set());
  const activeWorkersRef = useRef<number>(0);

  const processQueue = () => {
    if (activeWorkersRef.current >= UPLOAD_RULES.DEFAULT_UPLOAD_CONCURRENCY) return;

    setTasks(currentTasks => {
      const pendingTaskIndex = currentTasks.findIndex(t => t.state === "pending" && !cancelledTasksRef.current.has(t.id));
      
      if (pendingTaskIndex === -1) return currentTasks;

      const task = currentTasks[pendingTaskIndex];
      const newTasks = [...currentTasks];
      newTasks[pendingTaskIndex] = { ...task, state: "uploading" };
      
      activeWorkersRef.current += 1;
      
      // Fire and forget worker for this task
      (async () => {
        try {
          const userRes = await supabase.auth.getUser();
          const userId = userRes.data.user?.id;
          if (!userId) throw new Error("User not authenticated");

          const fileExt = task.file.name.split(".").pop();
          const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
          const storagePath = `${userId}/${conversationId}/${fileName}`;
          const bucketName = process.env.NEXT_PUBLIC_SUPABASE_ATTACHMENTS_BUCKET || "attachments";

          const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(storagePath, task.file, {
              cacheControl: "3600",
              upsert: false,
            });

          if (cancelledTasksRef.current.has(task.id)) {
            if (!uploadError) {
              await supabase.storage.from(bucketName).remove([storagePath]);
            }
            return;
          }

          if (uploadError) throw uploadError;

          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, state: "processing" } : t));

          const attachment = await uploadsApi.createAttachmentRecord({
            conversationId,
            originalName: task.file.name,
            size: task.file.size,
            mimeType: task.file.type || "application/octet-stream",
            extension: fileExt || "unknown",
            fileName,
          });

          if (cancelledTasksRef.current.has(task.id)) {
            await uploadsApi.deleteAttachmentRecord(attachment.id).catch(console.error);
            return;
          }

          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, state: "success", attachment } : t));

        } catch (err) {
          if (cancelledTasksRef.current.has(task.id)) return;
          console.error("Upload error:", err);
          const errorMsg = err instanceof Error ? err.message : "Failed to upload file";
          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, state: "error", error: errorMsg } : t));
        } finally {
          activeWorkersRef.current -= 1;
          processQueue(); // Trigger next task
        }
      })();

      return newTasks;
    });
  };

  const uploadFiles = useCallback((files: File[]) => {
    const newTasks = files.map(file => ({
      id: crypto.randomUUID(),
      file,
      state: "pending" as UploadTaskState
    }));

    setTasks(prev => [...prev, ...newTasks]);
  }, []);

  // Whenever tasks change, try to process queue
  useEffect(() => {
    processQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  // Cleanup on unmount / conversation switch
  useEffect(() => {
    const cancelledRef = cancelledTasksRef;
    return () => {
      // Mark all non-success/non-error tasks as cancelled so active workers stop
      setTasks(currentTasks => {
        currentTasks.forEach(task => {
          if (task.state === "pending" || task.state === "uploading" || task.state === "processing") {
            cancelledRef.current.add(task.id);
          }
        });
        return currentTasks;
      });
    };
  }, [conversationId]);

  const retry = useCallback((taskId: string) => {
    cancelledTasksRef.current.delete(taskId);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, state: "pending", error: undefined } : t));
  }, []);

  const cancel = useCallback((taskId: string) => {
    cancelledTasksRef.current.add(taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }, []);

  const remove = useCallback(async (taskId: string) => {
    cancelledTasksRef.current.add(taskId);
    setTasks(prev => {
      const task = prev.find(t => t.id === taskId);
      if (task && task.attachment) {
        uploadsApi.deleteAttachmentRecord(task.attachment.id).catch(err => {
          console.error("Failed to delete attachment record:", err);
        });
      }
      return prev.filter(t => t.id !== taskId);
    });
  }, []);

  const clearUploads = useCallback(() => {
    setTasks([]);
  }, []);

  return {
    tasks,
    uploadFiles,
    retry,
    cancel,
    remove,
    clearUploads,
    isUploading: tasks.some(t => t.state === "uploading" || t.state === "processing" || t.state === "pending")
  };
}
