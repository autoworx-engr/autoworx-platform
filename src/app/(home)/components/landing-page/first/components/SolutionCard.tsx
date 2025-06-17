import Image, { StaticImageData } from "next/image";

interface SolutionCardProps {
  features: string[];
  imageSrc: string | StaticImageData;
  category: string;
}

export function SolutionCard({
  features,
  imageSrc,
  category,
}: SolutionCardProps) {
  return (
    <div className="relative left-16 z-10 h-[600px] w-full lg:left-12 xl:left-16">
      <div className="absolute -left-4 top-6 z-50 w-[200px]">
        <div className="rounded-lg bg-white px-2 py-2 text-center text-sm font-medium text-white shadow-xl">
          <p className="text-md bg-custom-gradient-lp bg-clip-text font-semibold text-transparent">
            {category}
          </p>
        </div>
      </div>
      <div className="h-full w-[300px] overflow-hidden rounded-2xl bg-white shadow-lg">
        <div className="relative h-48">
          <Image
            src={imageSrc}
            alt={category}
            className="h-full w-full object-cover"
            layout="fill"
          />
        </div>
        <div className="p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">{""}</h3>
          <ul className="space-y-2">
            {features.map((feature, index) => {
              const [title, description] = feature.split(":");
              return (
                <li key={index} className="text-sm leading-relaxed text-black">
                  <span className="font-bold">{title}</span>: {description}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
