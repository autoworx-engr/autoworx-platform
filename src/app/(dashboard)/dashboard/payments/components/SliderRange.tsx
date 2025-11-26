import * as React from "react";
import Box from "@mui/material/Box";
import Slider from "@mui/material/Slider";
import { styled } from "@mui/material/styles";

interface SliderRangeProps {
  value: [number, number];
  onChange: (newValue: [number, number]) => void;
}

// Custom styled Slider (color adjusted to theme blue)
const CustomSlider = styled(Slider)(({ theme }) => ({
  color: "#6571FF", // theme blue for selected range
  height: 8,
  "& .MuiSlider-track": {
    background: "linear-gradient(to right, #6571FF 0%, #6571FF 100%)",
  },
  "& .MuiSlider-thumb": {
    backgroundColor: "#ffffff",
    borderRadius: "50%",
    width: 24,
    height: 24,
    border: "2px solid currentColor",
    "&:hover": {
      boxShadow: "0px 0px 0px 6px rgba(101,113,255,0.12)",
    },
  },
  "& .MuiSlider-rail": {
    backgroundColor: "#E6E9EE",
    height: 8,
  },
}));

export default function SliderRange({ value, onChange }: SliderRangeProps) {
  const handleChange = (event: Event, newValue: number | number[]) => {
    if (Array.isArray(newValue)) {
      onChange(newValue as [number, number]);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <CustomSlider
        value={value}
        onChange={handleChange}
        valueLabelDisplay="auto"
        min={0}
        max={3000}
        step={1}
      />
    </Box>
  );
}
