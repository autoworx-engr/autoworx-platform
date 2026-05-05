"use client";

import React, { useRef } from "react";
import { useReactToPrint } from "react-to-print";

export default function QRcode({ imgUrl }: { imgUrl: string }) {
  const contentRef = useRef<HTMLImageElement>(null);
  const reactToPrintFn = useReactToPrint({
    content: () => contentRef.current,
  });

  return (
    <div>
      <div className="hidden">
        <img
          ref={contentRef}
          src={imgUrl}
          alt="qr code"
          className="mx-auto my-auto aspect-square w-[500px]"
        />
      </div>
      <button
        className="mx-auto  mt-3  flex w-fit items-center gap-1 rounded-md border border-slate-400 p-1 px-3"
        onClick={reactToPrintFn}
      >
        <svg
          fill="#66738c"
          viewBox="0 0 32 32"
          className="h-3 w-3 md:h-4 md:w-4"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
          <g
            id="SVGRepo_tracerCarrier"
            strokeLinecap="round"
            strokeLinejoin="round"
          ></g>
          <g id="SVGRepo_iconCarrier">
            {" "}
            <title>print</title>{" "}
            <path d="M30 13.75h-2.75v-7.75c0-0 0-0.001 0-0.001 0-0.345-0.14-0.657-0.365-0.883l-4-4c-0.226-0.226-0.539-0.366-0.885-0.366-0 0-0 0-0 0h-17c-0.69 0-1.25 0.56-1.25 1.25v0 11.75h-1.75c-0.69 0-1.25 0.56-1.25 1.25v0 9c0 0.69 0.56 1.25 1.25 1.25s1.25-0.56 1.25-1.25v0-7.75h25.5v7.75c0 0.69 0.56 1.25 1.25 1.25s1.25-0.56 1.25-1.25v0-9c-0-0.69-0.56-1.25-1.25-1.25h-0zM6.25 3.25h15.232l3.268 3.268v7.232h-18.5zM26 20.75h-20c-0.69 0-1.25 0.56-1.25 1.25v8c0 0.69 0.56 1.25 1.25 1.25h20c0.69-0.001 1.249-0.56 1.25-1.25v-8c-0.001-0.69-0.56-1.249-1.25-1.25h-0zM24.75 28.75h-17.5v-5.5h17.5zM26.879 17.62c-0.228-0.228-0.544-0.37-0.893-0.37-0.168 0-0.329 0.033-0.475 0.093l0.008-0.003c-0.16 0.060-0.295 0.156-0.399 0.279l-0.001 0.001c-0.119 0.109-0.213 0.242-0.277 0.392l-0.003 0.007c-0.059 0.142-0.095 0.306-0.1 0.479l-0 0.002c0.002 0.346 0.147 0.657 0.378 0.878l0 0c0.226 0.223 0.537 0.361 0.88 0.361s0.654-0.138 0.88-0.361l-0 0c0.233-0.222 0.378-0.533 0.381-0.878v-0c-0.005-0.174-0.041-0.339-0.103-0.49l0.003 0.009c-0.066-0.158-0.161-0.291-0.28-0.399l-0.001-0.001z"></path>{" "}
          </g>
        </svg>
        Print
      </button>
    </div>
  );
}
