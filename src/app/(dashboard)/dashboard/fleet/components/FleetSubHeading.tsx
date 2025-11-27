type propsType = {
  text: string;
  className?: string;
};
const FleetSubHeading = ({ text, className }: propsType) => {
  return (
    <h4 className={`text-xl font-semibold text-slate-600 ${className}`}>
      {text}
    </h4>
  );
};

export default FleetSubHeading;
