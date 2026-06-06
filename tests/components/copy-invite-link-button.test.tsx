import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CopyInviteLinkButton } from "@/components/copy-invite-link-button";

describe("CopyInviteLinkButton", () => {
  it("copies the invite link to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<CopyInviteLinkButton value="https://example.com/invite/abc" />);

    await userEvent.click(screen.getByRole("button", { name: "복사" }));

    expect(writeText).toHaveBeenCalledWith("https://example.com/invite/abc");
    expect(screen.getByRole("button", { name: "복사됨" })).toBeInTheDocument();
  });
});
