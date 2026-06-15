import { db } from "@/server/db";

type PermissionPatch = {
  readonly canManageSets?: boolean;
  readonly canConfirmSchedules?: boolean;
  readonly canEditSchedules?: boolean;
  readonly canManageHomeworkForOthers?: boolean;
  readonly canManageSettings?: boolean;
};

export class MemberNotFoundError extends Error {
  readonly name = "MemberNotFoundError";

  constructor(readonly memberId: string) {
    super(`멤버를 찾을 수 없습니다: ${memberId}`);
  }
}

export class GroupPermissionError extends Error {
  readonly name = "GroupPermissionError";

  constructor(message: string) {
    super(message);
  }
}

async function getMemberWithPermissions(memberId: string) {
  const member = await db.member.findUnique({
    where: { id: memberId },
    include: { permissions: true },
  });

  if (!member) {
    throw new MemberNotFoundError(memberId);
  }

  return member;
}

export async function canManageSets(memberId: string) {
  const member = await getMemberWithPermissions(memberId);
  return member.role === "LEADER" || member.permissions?.canManageSets === true;
}

export async function requireCanManageSets(memberId: string) {
  const member = await getMemberWithPermissions(memberId);
  if (member.role === "LEADER" || member.permissions?.canManageSets === true) {
    return member;
  }

  throw new GroupPermissionError("공대 편성 권한이 필요합니다");
}

export async function requireCanManageSettings(memberId: string) {
  const member = await getMemberWithPermissions(memberId);
  if (
    member.role === "LEADER" ||
    member.permissions?.canManageSettings === true
  ) {
    return member;
  }

  throw new GroupPermissionError("공대 설정 권한이 필요합니다");
}

export async function requireCanManageHomework(memberId: string) {
  const member = await getMemberWithPermissions(memberId);
  if (
    member.role === "LEADER" ||
    member.permissions?.canManageHomeworkForOthers === true
  ) {
    return member;
  }

  throw new GroupPermissionError("숙제 관리 권한이 필요합니다");
}

export async function requireCanConfirmSchedules(memberId: string) {
  const member = await getMemberWithPermissions(memberId);
  if (
    member.role === "LEADER" ||
    member.permissions?.canConfirmSchedules === true
  ) {
    return member;
  }

  throw new GroupPermissionError("일정 확정 권한이 필요합니다");
}

export async function updateMemberPermissions(input: {
  readonly actorMemberId: string;
  readonly memberId: string;
  readonly permissions: PermissionPatch;
}) {
  const actor = await requireCanManageSettings(input.actorMemberId);
  const target = await getMemberWithPermissions(input.memberId);

  if (actor.groupId !== target.groupId) {
    throw new GroupPermissionError("같은 공대 멤버의 권한만 변경할 수 있습니다");
  }

  return db.memberPermission.upsert({
    where: { memberId: input.memberId },
    create: { memberId: input.memberId, ...input.permissions },
    update: input.permissions,
  });
}
