import { auth } from "@/auth";
import { GlobalSearch } from "@/components/search/global-search";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";

export async function Header() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex flex-1 justify-center sm:justify-start">
        <GlobalSearch />
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <ThemeToggle />

        {user && (
          <UserMenu
            name={user.name ?? ""}
            email={user.email ?? ""}
            image={user.image ?? null}
            role={user.role}
          />
        )}
      </div>
    </header>
  );
}
