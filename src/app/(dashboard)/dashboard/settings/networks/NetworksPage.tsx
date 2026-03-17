"use client";
import { acceptCompanyJoin } from "@/actions/communication/collaboration/acceptCompanyJoin";
import { rejectCompanyJoin } from "@/actions/communication/collaboration/rejectCompanyJoin";
import {
  connectWithCompany,
  findNearbyCompanies,
  setLatLong,
  toggleAddressVisibility,
  toggleBusinessVisibility,
  togglePhoneVisibility,
} from "@/actions/settings/myNetwork";
import { Switch } from "@/components/Switch";
import { Button } from "@/components/ui/button";
import { CompanyCard } from "@/components/ui/companyCard";
import { useDebounceCallback } from "@/hooks/useDebounceCallback";
import { errorToast, successToast } from "@/lib/toast";
import Slider from "@mui/material/Slider";
import { Company } from "@prisma/client";
import { Search, Link as LinkIcon, MapPin, Phone, Globe } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
function formatDate(date: Date) {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return new Intl.DateTimeFormat("en-US", options).format(date);
}
type Props = {
  connectedCompanies: Company[] | [];
  unconnectedCompanies: Company[] | [];
  currentCompany: Company | null;
  collaborationDates: Date[] | [];
  pendingSent: {
    company: Company;
    createdAt: Date;
    joinId: number;
  }[];
  pendingReceived: {
    company: Company;
    createdAt: Date;
    joinId: number;
  }[];
  rejectSent: {
    company: Company;
    createdAt: Date;
    joinId: number;
  }[];
  rejectReceived: {
    company: Company;
    createdAt: Date;
    joinId: number;
  }[];
  active: {
    company: Company;
    joinedAt: Date;
    joinId: number;
  }[];
};

const NetworksPage = ({
  connectedCompanies: connectedCompaniesData = [],
  pendingSent,
  pendingReceived,
  active,
  rejectReceived,
  rejectSent,
  unconnectedCompanies,
  currentCompany,
}: Props) => {
  const [businessVisibility, setBusinessVisibility] = useState(true);
  const [phoneVisibility, setPhoneVisibility] = useState(true);
  const [locationAllow, setLocationAllow] = useState(false);
  const [businessAddressVisibility, setBusinessAddressVisibility] =
    useState(true);

  const [nearbyCompaniesSearch, setNearbyCompaniesSearch] =
    useState<string>("");

  const [connectedCompanies, setConnectedCompanies] = useState<any[] | []>(
    connectedCompaniesData,
  );
  const [nearbyCompanies, setNearbyCompanies] = useState<Company[] | []>([]);
  const [searchedNearbyCompanies, setSearchedNearbyCompanies] = useState<
    Company[] | []
  >([]);
  const [location, setLocation] = useState<{
    latitude: number | null;
    longitude: number | null;
  }>({
    latitude: null,
    longitude: null,
  });
  const [nearByCompanyRange, setNearByCompanyRange] = useState<
    [number, number]
  >([0, 100]);
  const [nearByCompanyRangeDebounced, setNearByCompanyRangeDebounced] =
    useState<[number, number]>([0, 100]);

  const handleConnectWithCompany = async (
    companyId: number,
    companyName: string,
  ) => {
    const result = await connectWithCompany({ targetCompanyId: companyId });
    if (result.success) {
      setNearbyCompanies((prevNearby) =>
        prevNearby.filter((company) => company.id !== companyId),
      );
      setConnectedCompanies((prevConnected) => [
        ...prevConnected,

        ...unconnectedCompanies.filter((company) => company.id === companyId),
      ]);
      successToast(`Connected with ${companyName}`);
    } else {
      errorToast(`Failed to connect with ${companyName}`);
    }
  };

  // Create a debounced function for updating the slider value
  const debouncedSetRange = useDebounceCallback((value: [number, number]) => {
    setNearByCompanyRangeDebounced(value);
  }, 300);

  useEffect(() => {
    if (location.latitude && location.longitude) {
      findNearbyCompanies(
        location.latitude,
        location.longitude,
        nearByCompanyRange,
      ).then((res) => {
        setNearbyCompanies(res.data);
      });
    }
  }, [location, nearByCompanyRangeDebounced]);

  useEffect(() => {
    debouncedSetRange([nearByCompanyRange[0], nearByCompanyRange[1]]);
  }, [nearByCompanyRange]);

  useEffect(() => {
    if (nearbyCompaniesSearch.length > 0) {
      const filteredNearbyCompanies = nearbyCompanies.filter((company) =>
        company.name
          .toLowerCase()
          .includes(nearbyCompaniesSearch.toLowerCase()),
      );
      setSearchedNearbyCompanies(filteredNearbyCompanies);
    } else {
      setSearchedNearbyCompanies(nearbyCompanies);
    }
  }, [nearbyCompaniesSearch, nearbyCompanies]);

  useEffect(() => {
    if (location.latitude && location.longitude) {
      setLocationAllow(true);
    } else {
      setLocationAllow(false);
    }
  }, [location]);

  useEffect(() => {
    if (currentCompany) {
      setBusinessVisibility(!!currentCompany?.businessVisibility);
      setPhoneVisibility(!!currentCompany?.phoneVisibility);
      setBusinessAddressVisibility(!!currentCompany?.addressVisibility);
      setLocation({
        latitude: currentCompany?.companyLatitude,
        longitude: currentCompany?.companyLongitude,
      });
    }
  }, [currentCompany]);

  return (
    <div className="min-h-full w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Collaborations Section */}
        <div>
          <h2 className="mb-6 text-2xl font-semibold text-gray-800">
            Collaborations
          </h2>

          <div className="space-y-6 rounded-xl border bg-white p-4 shadow-xl min-h-[300px]">
            {/* Active */}
            <h3 className="text-xl font-semibold text-gray-800 pt-6">
              Active Collaborations
            </h3>

            {active.length === 0 && (
              <p className="text-sm text-gray-500 italic">
                No active collaborations found
              </p>
            )}

            <div className="space-y-4 lg:max-h-72 lg:overflow-y-auto thin-scrollbar pb-4">
              {active.map(
                ({
                  company,
                  joinId,
                  joinedAt,
                }: {
                  company: Company;
                  joinId: number;
                  joinedAt: Date;
                }) => (
                  <CompanyCard
                    key={joinId}
                    company={company}
                    rightSlot={
                      <div className="text-right text-xs italic text-gray-500 pt-1">
                        <p className="font-semibold text-gray-600">
                          Collaborating Since
                        </p>
                        <p>{formatDate(joinedAt)}</p>
                      </div>
                    }
                  />
                ),
              )}
            </div>

            {/* Pending */}
            <h3 className="text-xl font-semibold text-gray-800">
              Pending Collaborations
            </h3>

            {/* Pending Sent */}
            {pendingSent.length > 0 && (
              <>
                <p className="text-sm text-gray-500">Requests sent by you</p>
                <div className="space-y-4">
                  {pendingSent.map((join: any) => {
                    return (
                      <CompanyCard
                        key={join?.joinId}
                        company={join?.company}
                        rightSlot={
                          <p className="text-sm italic text-gray-500 pt-1">
                            Collaboration request pending
                          </p>
                        }
                      />
                    );
                  })}
                </div>
              </>
            )}

            {/* Pending Received */}
            {pendingReceived.length > 0 && (
              <>
                <p className="text-sm text-gray-500">Requests received</p>
                <div className="space-y-4">
                  {pendingReceived.map(
                    ({
                      company,
                      joinId,
                    }: {
                      company: Company;
                      joinId: number;
                    }) => {
                      return (
                        <CompanyCard
                          key={joinId}
                          company={company}
                          rightSlot={
                            <div className="flex gap-2 pt-1">
                              <button
                                className="w-full disabled:bg-slate-200 bg-green-600 hover:bg-green-700 text-white font-medium py-0.5 px-3 rounded-lg shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                onClick={() =>
                                  acceptCompanyJoin(
                                    joinId,
                                    Number(currentCompany?.id),
                                  )
                                }
                              >
                                Accept
                              </button>
                              <button
                                className="w-full disabled:bg-slate-200 bg-red-600 hover:bg-red-700 text-white font-medium py-0.5 px-3 rounded-lg shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                onClick={() =>
                                  rejectCompanyJoin(
                                    joinId,
                                    Number(currentCompany?.id),
                                  )
                                }
                              >
                                Reject
                              </button>
                            </div>
                          }
                        />
                      );
                    },
                  )}
                </div>
              </>
            )}

            {pendingSent.length === 0 && pendingReceived.length === 0 && (
              <p className="text-sm text-gray-500 italic">
                No pending collaboration requests
              </p>
            )}

            {/* Rejected */}
            <h3 className="text-xl font-semibold text-gray-800">
              Rejected Collaborations
            </h3>

            {/* Rejected Sent */}
            {rejectSent?.length > 0 && (
              <>
                <p className="text-sm text-gray-500">
                  Rejected Requests sent by you
                </p>
                <div className="space-y-4">
                  {rejectSent?.map((join: any) => {
                    return (
                      <CompanyCard
                        key={join?.joinId}
                        company={join?.company}
                        rightSlot={
                          <p className="text-sm italic text-gray-500 pt-1">
                            Collaboration request rejected
                          </p>
                        }
                      />
                    );
                  })}
                </div>
              </>
            )}

            {/* 🟠 Reject Received */}
            {rejectReceived?.length > 0 && (
              <>
                <p className="text-sm text-gray-500">
                  Rejected Requests received
                </p>
                <div className="space-y-4">
                  {rejectReceived?.map(
                    ({
                      company,
                      joinId,
                    }: {
                      company: Company;
                      joinId: number;
                    }) => {
                      return (
                        <CompanyCard
                          key={joinId}
                          company={company}
                          rightSlot={
                            <div className="flex gap-2 pt-1">
                              <button
                                className="w-full disabled:bg-slate-200 bg-green-600 hover:bg-green-700 text-white font-medium py-0.5 px-3 rounded-lg shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                onClick={() =>
                                  acceptCompanyJoin(
                                    joinId,
                                    Number(currentCompany?.id),
                                  )
                                }
                              >
                                Accept
                              </button>
                            </div>
                          }
                        />
                      );
                    },
                  )}
                </div>
              </>
            )}

            {rejectSent?.length === 0 && rejectReceived?.length === 0 && (
              <p className="text-sm text-gray-500 italic">
                No rejected collaboration
              </p>
            )}
          </div>
        </div>

        {/* Network Settings & Nearby Companies Section */}
        <div>
          {/* network settings */}
          <div>
            <h2 className="mb-6 text-2xl font-semibold text-gray-800">
              Network Settings
            </h2>

            <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
              {/* settings */}
              <div className="w-full space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="font-medium text-gray-700">
                    Business Visibility
                  </span>
                  <span>
                    <Switch
                      checked={businessVisibility}
                      setChecked={async (value) => {
                        let res = await toggleBusinessVisibility();
                        if (res?.success) {
                          setBusinessVisibility(value);
                          successToast(
                            "Business visibility updated successfully",
                          );
                        } else {
                          errorToast("Failed to update business visibility");
                        }
                      }}
                    />
                  </span>
                </div>
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="font-medium text-gray-700">
                    Business Phone Visibility
                  </span>
                  <span>
                    <Switch
                      checked={phoneVisibility}
                      setChecked={async (value) => {
                        let res = await togglePhoneVisibility();
                        if (res?.success) {
                          setPhoneVisibility(value);
                          successToast(
                            "Business phone visibility updated successfully",
                          );
                        } else {
                          errorToast(
                            "Failed to update Business phone visibility",
                          );
                        }
                      }}
                    />
                  </span>
                </div>
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="font-medium text-gray-700">
                    Business Address Visibility
                  </span>
                  <span>
                    <Switch
                      checked={businessAddressVisibility}
                      setChecked={async (value) => {
                        let res = await toggleAddressVisibility();
                        if (res?.success) {
                          setBusinessAddressVisibility(value);
                          successToast(
                            "Business address visibility updated successfully",
                          );
                        } else {
                          errorToast(
                            "Failed to update business address visibility",
                          );
                        }
                      }}
                    />
                  </span>
                </div>
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="font-medium text-gray-700">
                    Allow Location for Nearby Search
                  </span>
                  <span>
                    <Switch
                      checked={locationAllow}
                      setChecked={async (value) => {
                        if (!value) {
                          setLocation({ latitude: null, longitude: null });
                          setNearbyCompanies([]);
                          setLatLong(null, null);
                          setLocationAllow(false);
                        } else {
                          if (navigator.geolocation) {
                            navigator.geolocation.getCurrentPosition(
                              (position) => {
                                setLocation({
                                  latitude: position.coords.latitude,
                                  longitude: position.coords.longitude,
                                });
                                setLatLong(
                                  position.coords.latitude,
                                  position.coords.longitude,
                                );
                              },
                            );
                            setLocationAllow(true);
                          } else {
                            setLocationAllow(false);
                          }
                          // let res = await toggleAddressVisibility();
                          // if (res?.success) {
                          //   setBusinessAddressVisibility(value);
                          //   successToast(
                          //     "Business address visibility updated successfully",
                          //   );
                          // } else {
                          //   errorToast(
                          //     "Failed to update business address visibility",
                          //   );
                          // }
                        }
                      }}
                    />
                  </span>
                </div>
                <div className="pt-2">
                  <p className="font-medium text-gray-700 mb-2">
                    Company Search Radius (Miles)
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-4">
                    <span className="w-10 text-center font-mono text-sm text-gray-600">
                      {nearByCompanyRange[0]}
                    </span>
                    <div className="flex-grow">
                      <Slider
                        valueLabelDisplay="auto"
                        min={0}
                        max={100}
                        step={1}
                        value={nearByCompanyRange}
                        onChange={(event: Event, value: number | number[]) => {
                          if (Array.isArray(value)) {
                            // Use the debounced function to update the value
                            setNearByCompanyRange([value[0], value[1]]);
                          }
                        }}
                        sx={{
                          color: "#4f46e5", // Customizing slider color to match a modern palette
                          height: 6,
                          "& .MuiSlider-thumb": {
                            height: 18,
                            width: 18,
                            backgroundColor: "#fff",
                            border: "2px solid currentColor",
                          },
                          "& .MuiSlider-track": {
                            border: "none",
                          },
                          "& .MuiSlider-rail": {
                            opacity: 0.5,
                            backgroundColor: "#bfbfbf",
                          },
                        }}
                      />
                    </div>
                    <span className="w-10 text-center font-mono text-sm text-gray-600">
                      {nearByCompanyRange[1]}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* possible collaborations nearby */}
          <div className="mt-8">
            <h3 className="mb-6 text-2xl font-semibold text-gray-800">
              Possible Collaborations Nearby
            </h3>
            <div className="space-y-4">
              <div className="relative h-10 w-full">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400">
                  <Search size={20} />
                </span>
                <input
                  name="search"
                  type="text"
                  className="h-full w-full rounded-lg border border-gray-300 pl-10 pr-4 text-gray-700 transition duration-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Search nearby companies by name..."
                  value={nearbyCompaniesSearch}
                  onChange={(e) => setNearbyCompaniesSearch(e.target.value)}
                />
              </div>
              <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-xl max-h-[400px] overflow-y-auto">
                {!locationAllow && (
                  <p className="py-10 text-center text-sm text-red-500">
                    Please **Allow Location** in Network Settings above to find
                    nearby companies.
                  </p>
                )}
                {locationAllow && nearbyCompanies.length === 0 && (
                  <p className="py-10 text-center text-sm text-gray-500">
                    No companies found within the selected range.
                  </p>
                )}
                {searchedNearbyCompanies.map((company, index) => (
                  <div
                    key={index}
                    className="flex items-center rounded-lg border border-gray-200 p-4 transition duration-200 hover:border-indigo-300 hover:shadow-sm"
                  >
                    <div className="mr-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100">
                      <Image
                        src="/icons/business.png"
                        alt={company.name}
                        width={24}
                        height={24}
                        className="opacity-70"
                      />
                    </div>
                    <div className="flex w-full items-center justify-between gap-x-4">
                      <div className="min-w-0">
                        <p className="text-base font-medium text-gray-800 truncate">
                          {company.name}
                        </p>
                        <div className="mt-0.5 space-y-0.5 text-xs text-gray-500">
                          {company.website && (
                            <p className="flex items-center">
                              <Globe
                                size={12}
                                className="mr-1 text-indigo-500"
                              />
                              {company.website}
                            </p>
                          )}
                          {/* Displaying phone/address only if visibility is on for a realistic network feel, though functionally we keep the original rendering logic. */}
                          {company.phone && (
                            <p className="flex items-center">
                              <Phone
                                size={12}
                                className="mr-1 text-indigo-500"
                              />
                              {company.phone}
                            </p>
                          )}
                          {company.address && (
                            <p className="flex items-center">
                              <MapPin
                                size={12}
                                className="mr-1 text-indigo-500"
                              />
                              {company.address}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <button
                          onClick={() => {
                            handleConnectWithCompany(company.id, company.name);
                          }}
                          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition duration-200 hover:bg-indigo-700"
                        >
                          <LinkIcon size={16} className="inline mr-1 -mt-0.5" />
                          Send Request
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworksPage;
