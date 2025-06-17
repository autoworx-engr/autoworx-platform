import PipelineHeader from "../components/PipelineHeader";


export default function SalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const toggleButtons = [
    { label: 'Pipeline', href: '/dashboard/pipeline/sales/pipeline' },
    { label: 'Leads', href: '/dashboard/pipeline/sales/lead' },
  ];

  return (
    <div>
      <PipelineHeader title="Sales Pipeline" toggleButtons={toggleButtons} type="sales"/>
      {children}
    </div>
  );
}