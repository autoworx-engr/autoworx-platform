import ComponentsLightbox from "@/components/common/LightBox";

type TProps = {
  searchParams: {
    url: string;
  };
};

export default function InvoiceImageLoad({ searchParams }: TProps) {
  return <ComponentsLightbox getItems={[{ src: searchParams.url }]} />;
}
