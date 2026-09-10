import type { Metadata } from "next";
import { getCategories } from "@/app/lib/categoriesServer";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getPermissionsFor } from "@/app/lib/permissions";
import RestrictedMessage from "@/app/components/RestrictedMessage";
import CategoriesManager from "./CategoriesManager";

export const metadata: Metadata = {
  title: "Categories · Admin",
};

export default async function AdminCategories() {
  const session = await getIamsSession();
  const permissions = session ? await getPermissionsFor(session.staffId, session.role) : null;
  if (!permissions?.manageCategories) {
    return (
      <div className="flex flex-col gap-[18px]">
        <h1 className="font-heading text-[21px] font-semibold tracking-[-0.02em]">Categories</h1>
        <RestrictedMessage message="You don't have permission to manage categories." />
      </div>
    );
  }

  const categories = await getCategories();

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-end justify-between gap-[9px]">
        <h1 className="font-heading text-[21px] font-semibold tracking-[-0.02em]">Categories</h1>
        <span className="text-[9.75px] text-faint">{categories.length} categories</span>
      </div>
      <CategoriesManager initialCategories={categories} />
    </div>
  );
}
