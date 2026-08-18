"use client";
import {
  findNearbyCompanies,
  setLatLong,
  toggleAddressVisibility,
  toggleBusinessVisibility,
  togglePhoneVisibility,
} from "@/actions/settings/myNetwork";
import { Switch } from "@/components/Switch";
import { useDebounceCallback } from "@/hooks/useDebounceCallback";
import { errorToast, successToast } from "@/lib/toast";
import Slider from "@mui/material/Slider";
import { Company } from "@prisma/client";
import {
  Building2,
  Globe,
  Link as LinkIcon,
  MapPin,
  Phone,
  Search,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

type InitialSettings = {
  businessVisibility: boolean;
  phoneVisibility: boolean;
  addressVisibility: boolean;
  latitude: number | null;
  longitude: number | null;
};

type Props = {
  unconnectedCompanies: Company[];
  onConnect: (companyId: number, companyName: string) => void;
  initialSettings: InitialSettings;
};

export function NetworkSettingsPanel({
  unconnectedCompanies,
  onConnect,
  initialSettings,
}: Props) {
  const [businessVisibility, setBusinessVisibility] = useState(
    initialSettings.businessVisibility,
  );
  const [phoneVisibility, setPhoneVisibility] = useState(
    initialSettings.phoneVisibility,
  );
  const [addressVisibility, setAddressVisibility] = useState(
    initialSettings.addressVisibility,
  );
  const [location, setLocation] = useState({
    latitude: initialSettings.latitude,
    longitude: initialSettings.longitude,
  });
  const [locationAllow, setLocationAllow] = useState(
    !!(initialSettings.latitude && initialSettings.longitude),
  );
  const [nearbyCompanies, setNearbyCompanies] = useState<Company[]>([]);
  const [searchedNearby, setSearchedNearby] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<[number, number]>([0, 100]);
  const [rangeDebounced, setRangeDebounced] = useState<[number, number]>([
    0, 100,
  ]);

  const debouncedSetRange = useDebounceCallback(
    (value: [number, number]) => setRangeDebounced(value),
    300,
  );

  useEffect(() => {
    if (location.latitude && location.longitude) {
      findNearbyCompanies(location.latitude, location.longitude, range).then(
        (res) => setNearbyCompanies(res.data),
      );
    }
  }, [location, rangeDebounced]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    debouncedSetRange([range[0], range[1]]);
  }, [range]);

  useEffect(() => {
    const filtered = search
      ? nearbyCompanies.filter((c) =>
          c.name.toLowerCase().includes(search.toLowerCase()),
        )
      : nearbyCompanies;
    setSearchedNearby(filtered);
  }, [search, nearbyCompanies]);

  const handleLocationToggle = (value: boolean) => {
    if (!value) {
      setLocation({ latitude: null, longitude: null });
      setNearbyCompanies([]);
      setLatLong(null, null);
      setLocationAllow(false);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setLocation({ latitude, longitude });
          setLatLong(latitude, longitude);
          setLocationAllow(true);
        },
        () => {
          errorToast("Location access denied or unavailable.");
          setLocationAllow(false);
        },
      );
    }
  };

  const settingsRows = [
    {
      label: "Business Visibility",
      desc: "Show your business to other companies",
      checked: businessVisibility,
      onToggle: async (v: boolean) => {
        const res = await toggleBusinessVisibility();
        if (res?.success) {
          setBusinessVisibility(v);
          successToast("Business visibility updated");
        } else errorToast("Failed to update business visibility");
      },
    },
    {
      label: "Phone Visibility",
      desc: "Display your phone number publicly",
      checked: phoneVisibility,
      onToggle: async (v: boolean) => {
        const res = await togglePhoneVisibility();
        if (res?.success) {
          setPhoneVisibility(v);
          successToast("Phone visibility updated");
        } else errorToast("Failed to update phone visibility");
      },
    },
    {
      label: "Address Visibility",
      desc: "Show your business address",
      checked: addressVisibility,
      onToggle: async (v: boolean) => {
        const res = await toggleAddressVisibility();
        if (res?.success) {
          setAddressVisibility(v);
          successToast("Address visibility updated");
        } else errorToast("Failed to update address visibility");
      },
    },
    {
      label: "Location Access",
      desc: "Enable to discover nearby companies",
      checked: locationAllow,
      onToggle: handleLocationToggle,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Network Settings Card */}
      <div>
        <h2 className="mb-4 text-xl font-bold text-gray-600">
          Network Settings
        </h2>
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">
              Control how your business appears to other companies in the
              network
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            {settingsRows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between px-5 py-4"
              >
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {row.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{row.desc}</p>
                </div>
                <Switch
                  className="data-[state=checked]:!bg-primary/80"
                  checked={row.checked}
                  setChecked={row.onToggle}
                />
              </div>
            ))}
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">
                  Search Radius
                </p>
                <span className="text-xs font-mono bg-indigo-50 text-primary px-2.5 py-0.5 rounded-full font-medium">
                  {range[0]}–{range[1]} mi
                </span>
              </div>
              <Slider
                valueLabelDisplay="auto"
                min={0}
                max={100}
                step={1}
                value={range}
                onChange={(_, value) => {
                  if (Array.isArray(value)) setRange([value[0], value[1]]);
                }}
                sx={{
                  color: "#858cff",
                  height: 4,
                  "& .MuiSlider-thumb": {
                    height: 16,
                    width: 16,
                    backgroundColor: "#fff",
                    border: "2px solid currentColor",
                  },
                  "& .MuiSlider-rail": { opacity: 0.3 },
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Nearby Companies */}
      <div>
        <h2 className="mb-4 text-xl font-bold text-gray-600">
          Nearby Companies
        </h2>
        <div className="relative mb-3">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by Company Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 text-sm text-gray-600 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden max-h-96 overflow-y-auto thin-scrollbar">
          {!locationAllow ? (
            <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
              <MapPin size={28} className="text-gray-300 mb-2" />
              <p className="text-sm font-medium text-gray-600">
                Location access required
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Enable Location Access in Network Settings above
              </p>
            </div>
          ) : nearbyCompanies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
              <Building2 size={28} className="text-gray-300 mb-2" />
              <p className="text-sm font-medium text-gray-600">
                No companies found
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Try expanding your search radius
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {searchedNearby.map((company, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                      <Image
                        src="/icons/business.png"
                        alt={company.name}
                        width={18}
                        height={18}
                        className="opacity-60"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-600 truncate">
                        {company.name}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        {company.website && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Globe size={10} />
                            {company.website}
                          </span>
                        )}
                        {company.phone && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Phone size={10} />
                            {company.phone}
                          </span>
                        )}
                        {company.address && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <MapPin size={10} />
                            {company.address}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onConnect(company.id, company.name)}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg bg-primary hover:bg-[#5864e5] text-white transition shrink-0 ml-3 flex items-center gap-1.5"
                  >
                    <LinkIcon size={11} />
                    Connect
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
