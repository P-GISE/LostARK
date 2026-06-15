import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeworkBoard } from "@/components/homework/homework-board";

describe("HomeworkBoard", () => {
  it("renders member progress and character raid checks", () => {
    // Given / When
    render(
      <HomeworkBoard
        status={{
          members: [
            {
              characters: [
                {
                  id: "character-1",
                  name: "LeaderChar",
                  raids: [
                    {
                      completed: true,
                      difficulty: "Hard",
                      gates: "1",
                      raidTemplateId: "template-1",
                      raidTemplateName: "Akkan",
                    },
                  ],
                },
              ],
              completedCount: 1,
              id: "member-1",
              nickname: "Leader",
              totalCount: 1,
            },
          ],
          weekStartDate: "2030-06-05",
        }}
      />,
    );

    // Then
    expect(screen.getByText("Leader")).toBeInTheDocument();
    expect(screen.getByText("LeaderChar")).toBeInTheDocument();
    expect(screen.getByText("1/1 완료")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Akkan · Hard 완료 해제" })).toBeInTheDocument();
  });
});
