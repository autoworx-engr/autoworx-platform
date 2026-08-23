import {
  useCompanyKnowledge,
  useSaveCompanyKnowledge,
} from "@/hooks/sales-agent/useCompanyKnowledge";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import PhoneInput from "@/components/PhoneInput";
import { getIsoCodeFromPhone } from "@/utils/getIsoCodeFromPhone";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Globe,
  Loader2,
  RefreshCw,
  Building2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
interface CompanyInfo {
  id: string;
  shopName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  hours: string | null;
  about: string | null;
  policies: string | null;
  websiteUrl: string | null;
}
export default function CompanyKnowledgeCard() {
  const { data, isLoading } = useCompanyKnowledge();
  const saveMutation = useSaveCompanyKnowledge();
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [isScrapingWebsite, setIsScrapingWebsite] = useState(false);

  useEffect(() => {
    if (data) setCompanyInfo(data);
  }, [data]);

  const handleScrapeWebsite = async () => {
    // Placeholder for website scraping logic
    setIsScrapingWebsite(true);
    setTimeout(() => setIsScrapingWebsite(false), 1500);
  };

  const handlePhoneChange = (num: string, code: string) => {
    setCompanyInfo((prev: any) => ({
      ...prev,
      phone: num ? `${code}${num}` : "",
    }));
  };

  const handleSave = () => {
    if (companyInfo) saveMutation.mutate(companyInfo);
  };

  if (isLoading || !companyInfo)
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Knowledge
          </div>
          <div>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              size="lg"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>Save Company Info</>
              )}
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Basic info, contact details, and policies - the foundation of your
          AI's knowledge
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide">
              Basic Information
            </h3>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Shop Name</Label>
                <Input
                  value={companyInfo.shopName || ""}
                  onChange={(e) =>
                    setCompanyInfo((prev: any) => ({
                      ...prev,
                      shopName: e.target.value,
                    }))
                  }
                  placeholder="Your shop name"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Phone className="h-4 w-4" /> Phone
                </Label>
                <PhoneInput
                  label=""
                  placeholder="1234567890"
                  defaultValue={data?.phone || ""}
                  defaultIsoCode={getIsoCodeFromPhone(data?.phone)}
                  onChange={handlePhoneChange}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Email
                </Label>
                <Input
                  value={companyInfo.email || ""}
                  onChange={(e) =>
                    setCompanyInfo((prev: any) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  placeholder="info@yourshop.com"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Address
                </Label>
                <Input
                  value={companyInfo.address || ""}
                  onChange={(e) =>
                    setCompanyInfo((prev: any) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  placeholder="123 Main St, City, State"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Business Hours
                </Label>
                <Input
                  value={companyInfo.hours || ""}
                  onChange={(e) =>
                    setCompanyInfo((prev: any) => ({
                      ...prev,
                      hours: e.target.value,
                    }))
                  }
                  placeholder="Mon-Fri 9am-6pm, Sat 10am-4pm"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="h-4 w-4" /> Website URL
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={companyInfo.websiteUrl || ""}
                    onChange={(e) =>
                      setCompanyInfo((prev: any) => ({
                        ...prev,
                        websiteUrl: e.target.value,
                      }))
                    }
                    placeholder="https://yourshop.com"
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleScrapeWebsite}
                    disabled={isScrapingWebsite || !companyInfo.websiteUrl}
                    title="Scrape website content for AI training"
                  >
                    {isScrapingWebsite ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Click the refresh button to scrape your website content for AI
                  training
                </p>
              </div>
            </div>
          </div>
          {/* About & Policies */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide">
              About & Policies
            </h3>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>About Your Shop</Label>
                <Textarea
                  value={companyInfo.about || ""}
                  onChange={(e) =>
                    setCompanyInfo((prev: any) => ({
                      ...prev,
                      about: e.target.value,
                    }))
                  }
                  placeholder="Tell customers about your shop, experience, certifications, what makes you special..."
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label>Policies & Notes</Label>
                <Textarea
                  value={companyInfo.policies || ""}
                  onChange={(e) =>
                    setCompanyInfo((prev: any) => ({
                      ...prev,
                      policies: e.target.value,
                    }))
                  }
                  placeholder="Deposit requirements, cancellation policy, general warranty info, payment methods..."
                  rows={5}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
