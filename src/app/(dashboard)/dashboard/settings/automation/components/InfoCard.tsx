
 const InfoCard = ({
  icon,
  title,
  description,
  bgColor,
  borderColor,
  textColor,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}) => (
  <div
    className={`flex gap-3 p-3 rounded-lg ${bgColor} border-l-4 ${borderColor} mt-3 animate-fadeIn`}
  >
    <div className="flex-shrink-0 mt-0.5">{icon}</div>
    <div>
      <div className={`font-medium text-sm ${textColor}`}>{title}</div>
      <div className={`text-xs mt-1 ${textColor} opacity-90`}>
        {description}
      </div>
    </div>
  </div>
);

export default InfoCard;