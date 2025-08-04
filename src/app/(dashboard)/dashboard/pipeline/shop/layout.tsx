import PipelineHeader from "../components/PipelineHeader";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const toggleButtons = [
    { label: "Pipeline", href: "/dashboard/pipeline/shop/pipeline" },
    { label: "Workorders", href: "/dashboard/pipeline/shop/workorder" },
  ];

  return (
    <div>
      <PipelineHeader
        title="Shop Pipeline"
        toggleButtons={toggleButtons}
        type="shop"
      />
      {children}
    </div>
  );
}
