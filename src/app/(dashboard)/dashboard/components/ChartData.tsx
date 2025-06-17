import { formatCurrency } from "@/utils/formatCurrency";
import { FaCaretDown, FaCaretUp } from "react-icons/fa";

const ChartData = ({
  heading,
  subHeading,
  number = 0,
  dollarSign = false,
  columnView = false,
  largeChart = false,
  rate = 0,
  isPositive = true,
  noRate = false,
  isNumberPercent = false,
}: any) => {
  return (
    <div
      className={`${columnView ? "flex flex-col" : "flex items-center justify-between gap-x-1"} mb-4`}
    >
      <div>
        <h3 className="text-xs font-bold">{heading}</h3>
        {subHeading && <h6 className="#xl:text-sm text-xs">{subHeading}</h6>}
        <div className="#xl:mt-4 mt-2">
          <span className="text-lg font-bold xl:text-2xl">
            {dollarSign ? formatCurrency(number) : number}
            {isNumberPercent && "%"}
          </span>
        </div>
      </div>
      {!noRate && (
        <div className="mt-5 flex items-center justify-center gap-1">
          {rate != 0 &&
            (isPositive ? (
              <div className="text-lg text-[#4DB6AC]">
                <FaCaretUp />
              </div>
            ) : (
              <div className="text-lg text-red-500">
                <FaCaretDown />
              </div>
            ))}
          <div
            className={`text-lg font-bold ${rate !== 0 && (isPositive ? "text-[#4DB6AC]" : "text-red-500")}`}
          >
            {Math.abs(rate)}%
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartData;
