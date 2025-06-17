import React from "react";
import { Select } from "antd";
import { User } from "@prisma/client";

interface SalesSelectorProps {
  disabled?: boolean;
  users: User[];
  onSelect: (user: User) => void;
}
const handleMousedown = (event: React.MouseEvent) => {
  event.stopPropagation();
};
const SalesSelector: React.FC<SalesSelectorProps> = ({
  users,
  onSelect,
  disabled = false,
}) => (
  <div onMouseDown={handleMousedown}>
    <Select
      disabled={disabled}
      showSearch
      style={{ width: 200 }}
      placeholder="Search"
      optionFilterProp="label"
      filterSort={(optionA, optionB) =>
        (optionA?.label ?? "")
          .toLowerCase()
          .localeCompare((optionB?.label ?? "").toLowerCase())
      }
      onSelect={(value) => {
        const selectedUser = users.find((user) => user.id === value);
        if (selectedUser) {
          onSelect(selectedUser);
        }
      }}
      options={users.map((user) => ({
        value: user.id,
        label: user.firstName + " " + user.lastName,
      }))}
    />
  </div>
);

export default SalesSelector;
