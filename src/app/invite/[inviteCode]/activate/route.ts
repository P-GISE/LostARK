import { NextResponse } from "next/server";
import {
  getCurrentUser,
  getMemberForUserInGroup,
  setCurrentMemberSession,
} from "@/server/auth-context";
import { getGroupByInviteCode } from "@/server/groups";

type InviteActivateRouteContext = {
  readonly params: Promise<{
    readonly inviteCode: string;
  }>;
};

function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function GET(
  request: Request,
  { params }: InviteActivateRouteContext,
) {
  const { inviteCode } = await params;
  const invitePath = `/invite/${encodeURIComponent(inviteCode)}`;
  return redirectTo(request, invitePath);
}

export async function POST(
  request: Request,
  { params }: InviteActivateRouteContext,
) {
  const { inviteCode } = await params;
  const invitePath = `/invite/${encodeURIComponent(inviteCode)}`;
  const user = await getCurrentUser();
  if (!user) {
    return redirectTo(
      request,
      `/auth/login?next=${encodeURIComponent(invitePath)}`,
    );
  }

  const group = await getGroupByInviteCode(inviteCode);
  if (!group || !group.inviteEnabled) {
    return redirectTo(request, invitePath);
  }

  const member = await getMemberForUserInGroup({
    groupId: group.id,
    userId: user.id,
  });
  if (!member) {
    return redirectTo(request, invitePath);
  }

  await setCurrentMemberSession(member.id);
  return redirectTo(request, "/");
}
