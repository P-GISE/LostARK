import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SignupForm } from "@/app/auth/signup/signup-form";

vi.mock("@/app/auth/actions", () => ({
  signupAction: vi.fn(async () => ({ error: "" })),
}));

describe("SignupForm", () => {
  it("labels display name as raid-group identity", () => {
    render(<SignupForm nextPath="" />);

    expect(screen.getByLabelText("공대 확인용 이름")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("공대 확인용 이름")).toBeInTheDocument();
    expect(screen.queryByLabelText("이름")).not.toBeInTheDocument();
  });
});
