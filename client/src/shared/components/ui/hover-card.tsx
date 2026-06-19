"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"

import { cn } from "@/shared/lib/utils"
import { OVERLAY_Z_INDEX, OVERLAY_ANIMATIONS } from "@/shared/constants/overlays"

function HoverCard({ ...props }: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="hover-card" {...props} />
}

function HoverCardTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="hover-card-trigger" {...props} />
}

function HoverCardContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: PopoverPrimitive.Popup.Props & Pick<PopoverPrimitive.Positioner.Props, "align" | "sideOffset">) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        align={align}
        sideOffset={sideOffset}
        className={cn("isolate", `z-[${OVERLAY_Z_INDEX.hoverCard}]`)}
      >
        <PopoverPrimitive.Popup
          data-slot="hover-card-content"
          className={cn(
            "w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden",
            `z-[${OVERLAY_Z_INDEX.hoverCard}]`,
            OVERLAY_ANIMATIONS.hover,
            className
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}

export { HoverCard, HoverCardTrigger, HoverCardContent }
