import type { RaidSignupEntryStatus, RaidSignupStatus } from "@prisma/client";

function assertNever(value: never): never {
  throw new Error(`Unhandled signup status: ${value}`);
}

export function signupStatusTone(status: RaidSignupStatus) {
  switch (status) {
    case "OPEN":
      return "success";
    case "ASSIGNING":
      return "info";
    case "FINALIZED":
      return "neutral";
    case "CANCELED":
      return "danger";
    default:
      return assertNever(status);
  }
}

export function signupStatusText(status: RaidSignupStatus) {
  switch (status) {
    case "OPEN":
      return "신청 가능";
    case "ASSIGNING":
      return "배정 중";
    case "FINALIZED":
      return "마감";
    case "CANCELED":
      return "취소";
    default:
      return assertNever(status);
  }
}

export function entryStatusTone(status: RaidSignupEntryStatus) {
  switch (status) {
    case "APPLIED":
      return "warning";
    case "ASSIGNED":
      return "info";
    case "CANCELED":
    case "FAILED":
      return "danger";
    default:
      return assertNever(status);
  }
}

export function entryStatusText(status: RaidSignupEntryStatus) {
  switch (status) {
    case "APPLIED":
      return "신청";
    case "ASSIGNED":
      return "배정됨";
    case "CANCELED":
      return "취소";
    case "FAILED":
      return "미배정";
    default:
      return assertNever(status);
  }
}

export function isActiveEntry(status: RaidSignupEntryStatus) {
  return status === "APPLIED" || status === "ASSIGNED";
}
