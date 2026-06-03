import { signOut } from "@/lib/actions/auth";
export default function SignOutButton() {
  return (
    <form action={signOut}>
      <button type="submit" className="text-sm text-gray-500 hover:text-gray-800 transition">
        로그아웃
      </button>
    </form>
  );
}
