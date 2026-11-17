"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { EmptyState, SkeletonRows } from "@/components/ui/feedback";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/menu";
import { useNotificationMutations, useNotifications, useUnreadCount } from "@/data/hooks";
import { useFmt } from "@/lib/format";
import { cn } from "@/lib/utils/cn";

/** Bell with a live unread count; the list is real data from /notifications. */
export function NotificationsMenu() {
  const t = useTranslations("notifications");
  const fmt = useFmt();
  const [open, setOpen] = React.useState(false);
  const { data: unread = 0 } = useUnreadCount();
  const { data, isLoading } = useNotifications(open);
  const { read, readAll } = useNotificationMutations();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={unread > 0 ? t("unreadCount", { count: unread }) : t("open")}
          className="relative"
        >
          <Bell />
          {unread > 0 && (
            <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-1.5rem))] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <h2 className="text-base font-semibold">{t("title")}</h2>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              loading={readAll.isPending}
              onClick={() => readAll.mutate()}
            >
              <CheckCheck />
              {t("markAllRead")}
            </Button>
          )}
        </div>
        <div className="scroll-thin max-h-[60dvh] overflow-y-auto">
          {isLoading ? (
            <SkeletonRows rows={4} />
          ) : !data || data.items.length === 0 ? (
            <EmptyState icon={<Bell />} title={t("empty")} description={t("emptyHint")} className="py-8" />
          ) : (
            <ul className="divide-y divide-border">
              {data.items.map((n) => {
                const body = (
                  <div className="flex gap-3 px-4 py-3">
                    <span
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        n.read_at ? "bg-transparent" : "bg-primary",
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className={cn("text-base", !n.read_at && "font-medium")}>{n.title}</div>
                      <div className="mt-0.5 line-clamp-2 text-sm text-muted">{n.body}</div>
                      <div className="mt-1 text-xs text-subtle">{fmt.relative(n.created_at)}</div>
                    </div>
                  </div>
                );
                const onOpen = () => {
                  if (!n.read_at) read.mutate(n.id);
                  setOpen(false);
                };
                return (
                  <li key={n.id}>
                    {n.link ? (
                      <Link href={n.link as never} onClick={onOpen} className="block hover:bg-surface-2">
                        {body}
                      </Link>
                    ) : (
                      <button type="button" onClick={onOpen} className="block w-full text-left hover:bg-surface-2">
                        {body}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="border-t border-border px-4 py-2">
          <Link
            href="/account?tab=notifications"
            onClick={() => setOpen(false)}
            className="text-sm text-muted hover:text-foreground"
          >
            {t("settings")}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
