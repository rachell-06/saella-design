"use client"

import * as React from "react"
import { cn } from "cn"
import { Separator as SeparatorPrimitive } from "radix-ui"

// A vertical separator stretches to the row by default. Given a fixed height (h-5), it stops stretching and sits at
// the top, so pair it with self-center: `data-vertical:h-5 data-vertical:self-center`.
function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
