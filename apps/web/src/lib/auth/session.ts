import { cache } from "react";
import { serverFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/errors";
import type { Company, User } from "@/lib/api/types";
import type { components } from "@panelos/types/generated";

type MeOut = components["schemas"]["MeOut"];
type CompanyOut = components["schemas"]["CompanyOut"];

export interface Session {
  user: User;
  company: Company;
  companies: { id: string; role: string }[];
}

export const getSession = cache(async (): Promise<Session | null> => {
  try {
    const me = await serverFetch<MeOut>("/auth/me");
    let companyDto: CompanyOut | null = null;
    try {
      companyDto = await serverFetch<CompanyOut>("/companies/me");
    } catch {
      companyDto = null;
    }
    const initials = (me.name || me.email || "?")
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
    const user: User = {
      id: me.id,
      email: me.email,
      name: me.name || me.email,
      initials,
      status: "active",
    };
    const company: Company = companyDto
      ? {
          id: companyDto.id,
          name: companyDto.name,
          slug: companyDto.slug ?? "",
          short_name: companyDto.short_name ?? "PANELOS",
          standards_profile: companyDto.standards_profile === "UL 508A" ? "ul" : "iec",
        }
      : { id: "", name: "PanelOS", slug: "", short_name: "PANELOS", standards_profile: "iec" };
    const companies = (me.companies ?? []).map((c) => ({
      id: String((c as Record<string, unknown>).id ?? ""),
      role: String((c as Record<string, unknown>).role ?? ""),
    }));
    return { user, company, companies };
  } catch (err) {
    if (err instanceof ApiError && err.isAuth) return null;
    return null;
  }
});
