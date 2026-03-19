"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils/helpers";

type ProductImageProps = Omit<ImageProps, "onError"> & {
  fallbackClassName?: string;
};

export function ProductImage({
  className,
  fallbackClassName,
  alt,
  ...props
}: ProductImageProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-secondary",
          fallbackClassName || className
        )}
      >
        <Package className="h-8 w-8 text-muted-foreground/20" />
      </div>
    );
  }

  return (
    <Image
      className={className}
      alt={alt}
      onError={() => setError(true)}
      {...props}
    />
  );
}
