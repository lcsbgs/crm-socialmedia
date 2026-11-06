"use client";

import * as Menu from "@radix-ui/react-dropdown-menu";
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";
import { cn } from "@/lib/utils";

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;
export const DropdownMenuGroup = Menu.Group;

export const DropdownMenuContent = forwardRef<
  ElementRef<typeof Menu.Content>,
  ComponentPropsWithoutRef<typeof Menu.Content>
>(function DropdownMenuContent({ className, sideOffset = 6, align = "start", ...props }, ref) {
  return (
    <Menu.Portal>
      <Menu.Content
        ref={ref}
        sideOffset={sideOffset}
        align={align}
        collisionPadding={8}
        className={cn(
          "anim-pop z-50 min-w-48 rounded-inner border border-border bg-surface p-1 shadow-pop",
          className,
        )}
        {...props}
      />
    </Menu.Portal>
  );
});

export const DropdownMenuItem = forwardRef<
  ElementRef<typeof Menu.Item>,
  ComponentPropsWithoutRef<typeof Menu.Item>
>(function DropdownMenuItem({ className, ...props }, ref) {
  return (
    <Menu.Item
      ref={ref}
      className={cn(
        "flex h-9 cursor-default items-center gap-2 rounded-[10px] px-2.5 text-base outline-none select-none data-[disabled]:opacity-50 data-[highlighted]:bg-hover [&_svg]:size-4 [&_svg]:text-muted",
        className,
      )}
      {...props}
    />
  );
});

export function DropdownMenuLabel({ children }: { children: React.ReactNode }) {
  return <Menu.Label className="px-2 py-1.5 text-xs text-muted">{children}</Menu.Label>;
}

export function DropdownMenuSeparator() {
  return <Menu.Separator className="my-1 h-px bg-border" />;
}
