type TemplateVariable = {
  name: string;
  description: string;
};

// Template variables
const TEMPLATE_VARIABLES: TemplateVariable[] = [
  { name: "[CONTACT_NAME]", description: "Customer name" },
  { name: "[VEHICLE]", description: "Vehicle details" },
  { name: "[BUSINESS_NAME]", description: "Your business name" },
  { name: "[BUSINESS_PHONE]", description: "Your business phone" },
  { name: "[BUSINESS_ADDRESS]", description: "Your business address" },
  { name: "[VIDEO_DIRECTIONS]", description: "Video directions" },
  { name: "[GOOGLE_MAP_LINK]", description: "Google Maps link" },
];
const TemplateVariable = ({
  VARIABLES = TEMPLATE_VARIABLES,
}: {
  VARIABLES?: TemplateVariable[];
}) => {
  return (
    <div className="font-medium text-[#66738C80]">
      <h4 className="mb-2 text-base">TEMPLATE VARIABLES</h4>
      <div>
        {VARIABLES.map((variable) => (
          <span key={variable.name} className="text- text-sm">
            {variable.name},
          </span>
        ))}
      </div>
    </div>
  );
};

export default TemplateVariable;
