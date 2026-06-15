import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeworkBoard } from "@/components/homework/homework-board";

describe("HomeworkBoard", () => {
  it("opens the current member homework and collapses other members", () => {
    // Given / When
    render(
      <HomeworkBoard
        currentMemberId="member-1"
        status={{
          members: [
            {
              characters: [
                {
                  className: "Bard",
                  id: "character-1",
                  itemLevel: 1640,
                  name: "LeaderChar",
                  raids: [],
                },
              ],
              completedCount: 1,
              id: "member-1",
              nickname: "Leader",
              totalCount: 2,
            },
            {
              characters: [
                {
                  className: "Slayer",
                  id: "character-2",
                  itemLevel: 1640,
                  name: "OtherChar",
                  raids: [],
                },
              ],
              completedCount: 0,
              id: "member-2",
              nickname: "Other",
              totalCount: 2,
            },
          ],
          weekStartDate: "2030-06-05",
        }}
      />,
    );

    // Then
    expect(screen.getByText("내 완료")).toBeInTheDocument();
    expect(screen.getByText("1/2")).toBeInTheDocument();
    expect(screen.getByLabelText("Leader 숙제")).toHaveAttribute("open");
    expect(screen.getByLabelText("Other 숙제")).not.toHaveAttribute("open");
  });

  it("renders member progress and character raid checks", () => {
    // Given / When
    render(
      <HomeworkBoard
        status={{
          members: [
            {
              characters: [
                {
                  className: "Slayer",
                  id: "character-1",
                  itemLevel: 1640,
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
    expect(screen.getByText("Slayer · Lv. 1640")).toBeInTheDocument();
    expect(screen.getByText("1/1 완료")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Akkan · Hard · 1관문 완료 해제" })).toBeInTheDocument();
  });

  it("groups raid variants with the same name into one homework item", () => {
    // Given / When
    render(
      <HomeworkBoard
        status={{
          members: [
            {
              characters: [
                {
                  className: "Breaker",
                  id: "character-1",
                  itemLevel: 1680,
                  name: "SerkaRunner",
                  raids: [
                    {
                      completed: false,
                      difficulty: "Normal",
                      gates: "1",
                      raidTemplateId: "template-normal",
                      raidTemplateName: "Serka",
                    },
                    {
                      completed: true,
                      difficulty: "Hard",
                      gates: "1",
                      raidTemplateId: "template-hard",
                      raidTemplateName: "Serka",
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
    expect(screen.getAllByText("Serka")).toHaveLength(1);
    expect(screen.getByText("완료: Hard · 1관문")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Serka · Normal · 1관문 완료 처리" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Serka · Hard · 1관문 완료 해제" })).toBeInTheDocument();
  });
});
