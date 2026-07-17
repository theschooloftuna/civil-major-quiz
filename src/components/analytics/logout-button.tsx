import { Button } from "@/components/theme-custom/button";
import { logoutFromAnalytics } from "@/lib/analytics/actions";

function LogoutButton() {
  return (
    <form action={logoutFromAnalytics}>
      <Button type="submit" variant="secondary" size="sm">
        Log out
      </Button>
    </form>
  );
}

export { LogoutButton };
