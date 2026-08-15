type TemplateVariable = {
  name: string;
  description: string;
};

// Template variables
export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  { name: "<CLIENT>", description: "Client name" },
  { name: "<VEHICLE>", description: "Vehicle details" },
  { name: "<BUSINESS_NAME>", description: "Your business name" },
  { name: "<PHONE>", description: "Your business phone number" },
  { name: "<ADDRESS>", description: "Your business address" },
  { name: "<DATE>", description: "Date" },
  // { name: "<VIDEO_DIRECTIONS>", description: "Video directions" },
  // { name: "<GOOGLE_MAP_LINK>", description: "Google Maps link" },
  { name: "<GOOGLE_REVIEW_LINK>", description: "Google review link" },
];
const TemplateVariable = ({
  VARIABLES = TEMPLATE_VARIABLES,
}: {
  VARIABLES?: TemplateVariable[];
}) => {
  return (
    <div className="font-medium text-gray-500 ">
      <h4 className="mb-2 text-base">TEMPLATE VARIABLES</h4>
      <div className="mb-4 flex flex-wrap gap-2">
        {VARIABLES.map((variable) => (
          <span key={variable.name} className="text-sm">
            {variable.name},
          </span>
        ))}
      </div>
    </div>
  );
};

export default TemplateVariable;
