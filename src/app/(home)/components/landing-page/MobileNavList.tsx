import Link from "next/link";
import { useState } from "react";
import { HiChevronDown, HiChevronUp } from "react-icons/hi2";

export default function MobileNavList({ item, setOpenNav }: any) {
  const [showSubnav, setShowSubnav] = useState(false);

  const handleClick = () => {
    if (!item.subnav) {
      setOpenNav(false);
    } else {
      setShowSubnav((prev) => !prev);
    }
  };

  return (
    <li className="w-full">
      <div
        onClick={handleClick}
        className="flex cursor-pointer items-center justify-center px-5 text-2xl font-semibold uppercase text-white"
      >
        {item.link ? (
          <Link href={item.link} onClick={() => setOpenNav(false)}>
            {item.title}
          </Link>
        ) : (
          <span>{item.title}</span>
        )}
        {item.subnav && (
          <span>{showSubnav ? <HiChevronUp /> : <HiChevronDown />}</span>
        )}
      </div>

      {showSubnav && item.subnav && (
        <ul className="ml-5 mt-2 space-y-2">
          {item.subnav.map((sub: any, index: number) => (
            <li key={index}>
              <Link
                href={sub.link}
                onClick={() => setOpenNav(false)}
                className="block text-base text-white"
              >
                {sub.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
