"use client";
import { Skeleton } from "antd";

const PipelineLoadingSkeleton = () => {
  return (
    <div className="h-full w-full overflow-hidden px-2">
      <div className="flex touch-pan-x snap-x snap-mandatory flex-nowrap justify-between gap-2 overflow-x-auto">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="mx-2 min-w-80 flex-1 rounded-md border lg:min-w-[calc(100%/6-1.5rem)]"
            style={{
              backgroundColor: "rgba(101, 113, 255, 0.15)",
              padding: "0",
            }}
          >
            <div className="rounded-lg bg-primary px-4 py-3 text-center">
              <Skeleton.Button
                active
                className="w-full"
                style={{
                  height: "24px",
                  borderRadius: "0.5rem",
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                }}
              />
            </div>
            <div className="mt-1 p-1">
              {Array.from({ length: 4 }).map((_, cardIndex) => (
                <div
                  key={cardIndex}
                  className="mx-1 my-1 rounded-xl border bg-background p-3"
                >
                  <Skeleton active paragraph={{ rows: 3 }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default PipelineLoadingSkeleton;
