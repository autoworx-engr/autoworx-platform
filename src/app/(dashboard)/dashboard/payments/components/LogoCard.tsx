const LogoCard = () => {
  return (
    <div className="g:h-[65vh]">
      <div className="relative h-[475px] w-[404px] rounded-[19px] bg-background p-8 shadow-lg lg:h-[600px]">
        <div className="font-inter absolute left-0 right-0 top-[50px] text-center text-7xl font-extrabold leading-[116px] text-[#66738C] lg:text-[96px]">
          Logo
        </div>

        <div className="absolute left-[105px] right-4 top-[192px] lg:top-[326px]">
          <label
            className="font-inter block text-[16px] font-medium leading-[19px] text-[#66738C]"
            htmlFor="id"
          >
            ID
          </label>
          <input
            id="id"
            type="text"
            className="mt-2 h-[27px] w-[60%] rounded-[3px] border border-[#66738C] bg-background px-2"
          />
        </div>

        <div className="absolute left-[105px] right-4 top-[261px] lg:top-[395px]">
          <label
            className="font-inter block text-[16px] font-medium leading-[19px] text-[#66738C]"
            htmlFor="key1"
          >
            Key 1
          </label>
          <input
            id="key1"
            type="text"
            className="mt-2 h-[27px] w-[60%] rounded-[3px] border border-[#66738C] bg-background px-2"
          />
        </div>

        <div className="absolute left-[105px] right-4 top-[330px] lg:top-[463px]">
          <label
            className="font-inter block text-[16px] font-medium leading-[19px] text-[#66738C]"
            htmlFor="key2"
          >
            Key 2
          </label>
          <input
            id="key2"
            type="text"
            className="mt-2 h-[27px] w-[60%] rounded-[3px] border border-[#66738C] bg-background px-2"
          />
        </div>

        <button className="font-inter absolute left-[140px] top-[400px] rounded-md bg-primary px-6 py-2 text-[21px] font-medium leading-[25px] text-white lg:top-[530px]">
          Save
        </button>
      </div>
    </div>
  );
};

export default LogoCard;
