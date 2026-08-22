"use client";

import {
  addMailgunDomain,
  getDnsRecords,
  verifyMailgunDomain,
} from "@/actions/communication/client/mailgunActions";
import { errorToast, successToast } from "@/lib/toast";
import React, { ChangeEvent, FormEvent, useEffect, useState } from "react";

type FormData = {
  domain: string;
};

const MailgunForm: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    domain: "",
  });

  const [mgCredentials, setMgCredentials] = useState<any>([]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let res = await addMailgunDomain(formData);
      if (res.success) {
        successToast("Mailgun Domain Added Successfully");
        await fetchDnsRecords();
      } else {
        errorToast("Failed To Update ");
      }
      setFormData({
        domain: "",
      });
    } catch (error) {
      console.error("Error:", error);
    }
    setIsLoading(false);
  };

  async function fetchDnsRecords() {
    let res = await getDnsRecords();
    if (res?.success) {
      setMgCredentials(res?.data);
      setFormData({
        domain: res?.data?.domain ?? "",
      });
    }
  }
  useEffect(() => {
    fetchDnsRecords();
  }, []);

  return (
    <div className="w-full max-w-lg rounded-lg bg-background p-10 shadow-lg">
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label
            htmlFor="domain"
            className="block text-sm font-medium text-gray-700"
          >
            Domain
          </label>
          <input
            type="text"
            id="domain"
            name="domain"
            value={formData.domain}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div className="flex justify-end">
          {!mgCredentials?.isVerified && (
            <button
              type="submit"
              disabled={isLoading || mgCredentials?.isVerified}
              className="CO mr-3 rounded-md bg-primary p-2 px-10 py-1.5 text-right text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Add Domain
            </button>
          )}

          <button
            type="button"
            disabled={mgCredentials?.isVerified}
            onClick={async () => {
              await verifyMailgunDomain();
              let res = await verifyMailgunDomain();
              if (res?.success) {
                successToast("Verification requested successfully");
              }
              await fetchDnsRecords();
            }}
            className="rounded-md bg-primary p-2 px-10 py-1.5 text-right text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {mgCredentials?.isVerified ? "Verified" : "Verify"}
          </button>
        </div>
      </form>
      {!mgCredentials?.isVerified && mgCredentials?.dnsRecords && (
        <DomainInfo mgCredentials={mgCredentials} />
      )}
    </div>
  );
};

const DomainInfo: React.FC<{ mgCredentials: any }> = ({
  mgCredentials: { dnsRecords, domain },
}) => {
  return (
    <div className="mt-8">
      <h3 className="mb-4 text-xl font-semibold">Domain Information</h3>
      <div className="#bg-gray-100 rounded-md p-4">
        <p>
          <strong>Name:</strong> {dnsRecords.domain.name}
        </p>
        <p>
          <strong>State:</strong> {dnsRecords.domain.state}
        </p>
      </div>

      {dnsRecords.sending_dns_records.filter((record: any) => true).length >
        0 && (
        <>
          <h3 className="mb-4 mt-6 text-xl font-semibold">
            Sending DNS Records
          </h3>
          {dnsRecords.sending_dns_records
            .filter((record: any) => true)
            .map((record: any, index: number) => (
              <DnsRecord key={index} record={record} domain={domain} />
            ))}
        </>
      )}

      {dnsRecords.receiving_dns_records.filter((record: any) => true).length >
        0 && (
        <>
          <h3 className="mb-4 mt-6 text-xl font-semibold">
            Receiving DNS Records
          </h3>
          {dnsRecords.receiving_dns_records
            .filter((record: any) => true)
            .map((record: any, index: number) => (
              <DnsRecord key={index} record={record} domain={domain} />
            ))}
        </>
      )}
    </div>
  );
};

const DnsRecord: React.FC<{ record: any; domain: any }> = ({
  record,
  domain,
}) => {
  const handleCopy = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        successToast("Copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
      });
  };

  return (
    <div className="mb-4 rounded-md bg-gray-100 p-4">
      <p>
        <strong>Name:</strong> {record?.name || domain}
        <button
          onClick={() => handleCopy(record?.name || domain)}
          className="ml-2 rounded bg-blue-500 px-2 py-1 text-white hover:bg-blue-600"
        >
          Copy
        </button>
      </p>
      <p>
        <strong>Type:</strong> {record.record_type}
      </p>
      <p className="break-words">
        <strong>Value:</strong> {record.value}
        <button
          onClick={() => handleCopy(record.value)}
          className="ml-2 rounded bg-blue-500 px-2 py-1 text-white hover:bg-blue-600"
        >
          Copy
        </button>
      </p>
      {/* <p>
        <strong>Valid:</strong> {record.valid}
      </p> */}
      {record.priority && (
        <p>
          <strong>Priority:</strong> {record.priority}
        </p>
      )}
      <p>
        <strong>Active:</strong> {record.is_active ? "Yes" : "No"}
      </p>
    </div>
  );
};

export default MailgunForm;
