type TPipelineTitleProps = {
  title?: string;
  leadsCount?: number;
};

export default function PipelineTitle({
  title = "",
  leadsCount = 0,
}: TPipelineTitleProps) {
  return (
    <h2 className="rounded-t-lg bg-primary px-4 py-3 text-center text-white">
      <p className="text-base font-bold">
        {title}
        <span className="ml-2 rounded-lg bg-[#3F49B9] px-2">{leadsCount}</span>
      </p>
    </h2>
  );
}
