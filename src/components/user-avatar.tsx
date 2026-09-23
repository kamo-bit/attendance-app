"use client";

import { useState } from "react";

export function UserAvatar({
  name,
  image,
  className = "",
  label,
}: {
  name?: string | null;
  image?: string | null;
  className?: string;
  label?: string;
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const initial = name?.trim().charAt(0).toUpperCase() || "A";
  return (
    <span
      className={`avatar user-avatar ${className}`.trim()}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      {image && image !== failedImage ? (
        // Profile photos use an authenticated route or a normalized local preview.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" referrerPolicy="no-referrer" onError={() => setFailedImage(image)} />
      ) : initial}
    </span>
  );
}
