import PipelineHeader from "../components/PipelineHeader";

export default function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const toggleButtons = [
    { label: "Pipeline", href: "/dashboard/pipeline/team/pipeline" },
    { label: "Workorders", href: "/dashboard/pipeline/team/workorder" },
  ];

  return (
    <div>
      <PipelineHeader
        title="Team Pipeline"
        toggleButtons={toggleButtons}
        type="team"
      />
      {children}
    </div>
  );
}
