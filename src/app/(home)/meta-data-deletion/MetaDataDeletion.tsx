import Image from "next/image";
import Headings from "../components/landing-page/Headings";

const MetaDataDeletion = () => {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center bg-white px-4 ">
      {/* Container wrapper */}

      <div className="absolute w-full overflow-hidden">
        <Image
          src="/landing/termsConditionsbg.png"
          alt="Gradient Background"
          aria-hidden="true"
          width={1028}
          height={600}
          className="left-0 top-0 h-auto w-full object-contain sm:max-w-[600px] md:max-w-[800px] lg:max-w-[1028px]"
        />
        {/* <img
          src={bg}
          alt="Gradient Background"
          aria-hidden="true"
          className="bottom-0 right-0 w-full sm:max-w-[600px] md:max-w-[800px] lg:max-w-[1028px] h-auto object-contain translate-y-[20%] translate-x-[25%]"
        /> */}
      </div>

      {/* Header */}
      <div className="container mx-auto flex flex-col gap-10">
        <div className="mt-10 flex flex-col items-center text-center lg:mt-20 lg:space-y-2">
          <Headings title=" Data Deletion Request" />
          <p className="text-base text-gray-600 lg:text-lg">
            Last Updated: March 6th, 2025
          </p>
        </div>

        {/* Body */}
        <main className="prose prose-gray mx-auto w-full max-w-3xl space-y-4">
          <p className="text-center text-lg lg:text-xl">
            If you have connected your Facebook account or Page with Autoworx
            and wish to delete your data, <br /> you can request it at any time.
          </p>
          <p className="text-center text-lg lg:text-xl">
            To request data deletion, please contact us at privacy@autoworx.tech
          </p>
          <p className="text-center text-lg lg:text-xl">
            Once we receive your request, we will remove your data from our
            systems within 7 business days. Please note that some information
            may be retained if required by law or for legitimate
            business purposes.
          </p>
        </main>
      </div>
    </div>
  );
};

export default MetaDataDeletion;
