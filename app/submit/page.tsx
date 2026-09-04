import { getCategories } from "@/app/lib/categoriesServer";
import SubmitForm from "./SubmitForm";

export default async function Submit() {
  const categories = await getCategories();
  return <SubmitForm categories={categories} />;
}
