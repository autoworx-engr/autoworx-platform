import { ChevronDown, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ComponentType, useState } from "react";
import { navIconMap } from "../navIconMap";

type TProps = {
  item: {
    title: string;
    icon?: string;
    link?: string | null;
    subnav?:
    | {
      title: string;
      link: string;
    }[]
    | null;
  };
  setOpenNav: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function MobileNavList({ item, setOpenNav }: TProps) {
  const [isOpenSubNav, setIsOpenSubNav] = useState(false);

  const mappedIcon = navIconMap[item.title] ?? item.icon;

  const renderIcon = () => {
    if (!mappedIcon) return null;

    if (typeof mappedIcon === "string") {
      return (
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-teal-100 shadow-sm shadow-teal-100">
          <Image
            src={mappedIcon}
            alt={item.title}
            width={20}
            height={20}
            className="h-5 w-5 object-contain opacity-70"
          />
        </span>
      );
    }

    const IconComponent = mappedIcon as ComponentType<{ className?: string }>;

    return (
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-teal-100 shadow-sm shadow-teal-100">
        <IconComponent className="h-5 w-5 text-slate-700" />
      </span>
    );
  };

  return (
    <li>
      <div className="flex items-center space-x-2">
        {renderIcon()}
        {item.link && !item.subnav ? (
          <Link
            onClick={() => setOpenNav(false)}
            href={item.link}
            className="flex-shrink-0 text-base text-black hover:text-black"
          >
            {item.title}
          </Link>
        ) : (
          <p
            onClick={() => setIsOpenSubNav((prev) => !prev)}
            className="flex flex-shrink-0 items-center space-x-2 text-base text-black"
          >
            <span>{item.title}</span>

            {isOpenSubNav ? (
              <ChevronDown size={25} className="text-black" />
            ) : (
              <ChevronRight size={25} className="text-black" />
            )}
          </p>
        )}
      </div>
      {isOpenSubNav && item?.subnav && (
        <ul className="mt-3 ml-12 flex flex-col items-start justify-start gap-y-4 rounded-md bg-white p-2">
          {item.subnav?.map((subItem, index) => (
            <Link
              onClick={() => setOpenNav(false)}
              key={index}
              href={subItem.link}
              className="text-base text-black"
            >
              {subItem.title}
            </Link>
          ))}
        </ul>
      )}
    </li>
  );
}
