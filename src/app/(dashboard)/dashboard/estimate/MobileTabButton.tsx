interface TabButtonProps {
  href: string;
  label: string;
  activeTab: string;
  tabKey: string;
  router: any;
  onClick: () => void;
}

const MobileTabButton = ({
  href,
  label,
  activeTab,
  tabKey,
  router,
  onClick,
}: TabButtonProps) => {
  const isActive = activeTab === tabKey;
  return (
    <button
      type="button"
      onClick={() => {
        router.push(href);
        onClick();
      }}
      className={
        "flex-1 text-center px-3 py-2 text-sm font-medium rounded-lg " +
        (isActive
          ? "bg-gradient-to-r from-primary to-[#5a66ee] text-white  shadow-indigo-500/30  hover:shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-0 active:scale-100 transition-all duration-200"
          : "bg-white border border-gray-200 text-gray-700")
      }
    >
      {label}
    </button>
  );
};

export default MobileTabButton;
