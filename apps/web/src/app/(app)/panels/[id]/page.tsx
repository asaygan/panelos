import { PanelDetailView } from "@/features/panels/detail/panel-detail-view";

export default async function PanelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PanelDetailView id={id} />;
}
