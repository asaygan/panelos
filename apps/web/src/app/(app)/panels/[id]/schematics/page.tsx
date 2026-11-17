import { redirect } from "next/navigation";

export default async function PanelSchematicsRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/panels/${id}?tab=schematics`);
}
