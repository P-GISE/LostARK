import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { joinGroupByInvite } from "@/server/members";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "lostark_party_member";

export default function InvitePage({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}) {
  async function join(formData: FormData) {
    "use server";
    const { inviteCode } = await params;
    const nickname = String(formData.get("nickname") ?? "");
    const member = await joinGroupByInvite({ inviteCode, nickname });
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, member.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    redirect("/");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold">Join raid group</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Enter the nickname your group knows you by.
      </p>
      <form action={join} className="mt-6 space-y-3">
        <input
          name="nickname"
          minLength={2}
          required
          className="w-full rounded border border-zinc-300 px-3 py-2"
          placeholder="Nickname"
        />
        <button className="w-full rounded bg-zinc-950 px-4 py-2 text-white">
          Join
        </button>
      </form>
    </main>
  );
}
