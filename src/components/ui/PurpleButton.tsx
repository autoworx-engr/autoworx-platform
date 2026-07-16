const PurpleButton = ({
  title,
  func,
}: {
  title: string;
  func?: () => void;
}) => {
  return (
    <button
      onClick={func}
      className="
      flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white
      bg-gradient-to-r from-primary to-[#5a66ee]
      shadow-[0_4px_14px_0_rgba(101,113,255,0.39)]
      hover:shadow-[0_6px_20px_rgba(101,113,255,0.23)]
      hover:-translate-y-0.5
      active:translate-y-0 active:scale-100
      transition-all duration-300 ease-in-out"
    >
      {title}
    </button>
  );
};

export default PurpleButton;
