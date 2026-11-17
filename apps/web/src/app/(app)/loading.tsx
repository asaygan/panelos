import { Skeleton } from "@/components/ui/feedback";
import { Page } from "@/components/ui/page";

/** Shown inside the app shell while a route segment loads. */
export default function AppLoading() {
  return (
    <Page>
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80 max-w-full" />
      <Skeleton className="mt-2 h-64 w-full" />
    </Page>
  );
}
