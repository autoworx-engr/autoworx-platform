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
        "flex-1 text-center px-3 py-2 text-sm font-medium rounded-md " +
        (isActive
          ? "bg-[#6571FF] text-white"
          : "bg-white border border-gray-200 text-gray-700")
      }
    >
      {label}
    </button>
  );
};

export default MobileTabButton;
