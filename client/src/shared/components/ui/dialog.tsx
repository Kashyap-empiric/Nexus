"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { XIcon } from "lucide-react"
import { OVERLAY_ANIMATIONS } from "@/shared/constants/overlays"





function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}



function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate",
        "bg-[var(--overlay-bg,oklch(0_0_0/0.55))]",
        "backdrop-blur-[var(--overlay-blur,4px)]",
        "data-open:animate-in data-open:fade-in-0",
        "data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}



type DialogSize = "sm" | "md" | "lg" | "xl" | "2xl"
type DialogElevation = "sm" | "md" | "lg"

interface DialogContentProps extends DialogPrimitive.Popup.Props {
  showCloseButton?: boolean
  size?: DialogSize
  elevation?: DialogElevation
  fullscreenMobile?: boolean
  drawer?: boolean
  loading?: boolean
}

const SIZE_MAP: Record<DialogSize, string> = {
  sm: "md:max-w-[480px]",
  md: "md:max-w-[640px]",
  lg: "md:max-w-[800px]",
  xl: "md:max-w-[1000px]",
  "2xl": "xl:max-w-[1280px]",
}

const ELEVATION_MAP: Record<DialogElevation, string> = {
  sm: "shadow-lg ring-1 ring-border/50",
  md: "shadow-xl ring-1 ring-border/50",
  lg: "shadow-2xl ring-1 ring-border/50",
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  size = "sm",
  elevation = "md",
  fullscreenMobile = false,
  drawer = false,
  loading = false,
  ...props
}: DialogContentProps) {
  return (
    <DialogPortal>
      {}
      <div className="relative z-[var(--z-dialog)]">
        <DialogOverlay />
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className={cn(
            
            "flex flex-col w-full bg-popover text-sm text-popover-foreground",
            
            ELEVATION_MAP[elevation],
            
            OVERLAY_ANIMATIONS.dialog,
            
            drawer
              ? cn(
                  
                  "fixed inset-0",
                  "w-full",
                  "h-dvh",
                  "overflow-y-auto",
                  "rounded-none",
                  
                  "data-open:slide-in-from-bottom-4",
                  "data-closed:slide-out-to-bottom-4",
                  
                  "md:inset-auto md:top-1/2 md:left-1/2",
                  "md:-translate-x-1/2 md:-translate-y-1/2",
                  "md:w-auto md:h-auto",
                  "md:max-w-[calc(100%-2rem)] md:max-h-[85vh]",
                  "md:rounded-xl",
                  SIZE_MAP[size],
                )
              : fullscreenMobile
                ? cn(
                    "fixed",
                    "inset-0",
                    "w-full h-full max-w-none max-h-none",
                    "rounded-none",
                    "md:inset-auto md:top-1/2 md:left-1/2",
                    "md:-translate-x-1/2 md:-translate-y-1/2",
                    "md:w-auto md:h-auto",
                    "md:max-w-[calc(100%-2rem)] md:max-h-[85vh]",
                    "md:rounded-xl md:shadow-xl",
                    SIZE_MAP[size],
                  )
                : cn(
                    "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
                    "max-w-[calc(100%-2rem)] max-h-[85vh]",
                    "rounded-xl",
                    SIZE_MAP[size],
                  ),
            className
          )}
          {...props}
        >
          {}
          {loading ? (
            <DialogSkeleton />
          ) : drawer ? (
            
            <div className="flex flex-col mt-auto mb-auto w-full">
              {children}
            </div>
          ) : (
            children
          )}

          {showCloseButton && !loading && (
            <DialogPrimitive.Close
              data-slot="dialog-close"
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-4 right-4 rounded-full"
                />
              }
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Popup>
      </div>
    </DialogPortal>
  )
}



function DialogSkeleton({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0",
        "animate-pulse",
        "p-6",
        className,
      )}
      {...props}
    >
      {}
      <div className="h-5 w-1/3 bg-muted rounded-md" />
      <div className="mt-4 space-y-3">
        <div className="h-4 w-full bg-muted rounded-md" />
        <div className="h-4 w-4/5 bg-muted rounded-md" />
        <div className="h-4 w-3/5 bg-muted rounded-md" />
      </div>
      {}
      <div className="mt-6 flex justify-end gap-3">
        <div className="h-9 w-20 bg-muted rounded-md" />
        <div className="h-9 w-24 bg-muted/60 rounded-md" />
      </div>
    </div>
  )
}



function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "flex flex-col gap-1.5 shrink-0",
        "px-6 pt-4 pb-3",
        className
      )}
      {...props}
    />
  )
}



function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn(
        "flex-1 overflow-y-auto",
        "px-6 pb-4",
        className
      )}
      {...props}
    />
  )
}



function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-3 shrink-0",
        "sm:flex-row sm:justify-end",
        "rounded-b-xl border-t px-6 py-4",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  )
}



function DialogTitle({
  className,
  ...props
}: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "text-base font-semibold leading-tight text-foreground",
        className
      )}
      {...props}
    />
  )
}



function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground",
        "*:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}



export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogSkeleton,
  DialogTitle,
  DialogTrigger,
}
export type { DialogContentProps, DialogElevation, DialogSize }
