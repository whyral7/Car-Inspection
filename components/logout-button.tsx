import { buttonClass } from "./button";

export function LogoutButton({ label }: { label: string }) {
  return (
    <form action="/auth/signout" method="post">
      <button type="submit" className={buttonClass("ghost", "min-h-11 shrink-0 whitespace-nowrap px-2 text-sm")}>
        {label}
      </button>
    </form>
  );
}
