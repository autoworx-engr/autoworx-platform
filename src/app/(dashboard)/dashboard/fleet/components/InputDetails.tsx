import React from "react";

type propsType = {
  label: string;
  value?: string;
};
const InputDetails = ({ label, value }: propsType) => {
  return (
    <div className="mb-2 flex items-center gap-2">
      <label className="block w-32 text-right text-gray-600">{label}</label>
      <input
        type="text"
        value={value}
        readOnly
        className="block w-full rounded border border-gray-300 p-1 text-gray-600"
      />
    </div>
  );
};

export default InputDetails;
