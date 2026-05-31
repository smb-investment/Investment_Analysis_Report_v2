import { signOut } from "@/lib/actions/auth";

export default function SignOutButton() {
  return (
    <form action={signOut}>
      <button type="submit" className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-100">
        로그아웃
      </button>
    </form>
  );
}
