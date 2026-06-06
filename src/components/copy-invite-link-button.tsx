"use client";

import { useState } from "react";
import { secondaryButtonClassName } from "@/components/ui";

export function CopyInviteLinkButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copyToClipboard() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
  }

  return (
    <button
      className={secondaryButtonClassName}
      onClick={copyToClipboard}
      type="button"
    >
      {copied ? "복사됨" : "복사"}
    </button>
  );
}
