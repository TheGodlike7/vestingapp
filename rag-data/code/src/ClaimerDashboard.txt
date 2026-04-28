import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "@/supabase";

type Organization = {
  id: string;
  name: string;
};

type OrganizationRow = {
    vesting_projects: {
  organization_id: string;
  organizations: {
    id: string;
    name: string;
  } | null;
} | null;
};

export default function ClaimerDashboard({
  onSelectOrganization,
}: {
  onSelectOrganization: (org: Organization) => void;
}) {
  const { publicKey } = useWallet();
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  useEffect(() => {
    if (!publicKey) return;

    const fetchOrganizations = async () => {
      const { data } = await supabase
        .from("vesting_schedules")
        .select(`vesting_projects (
            organization_id,
            organizations (id, name))
        `)
        .returns<OrganizationRow[]>();
      if (!data) return;

      const orgMap = new Map<string, Organization>();

      data.forEach((item) => {
        const org = item.vesting_projects?.organizations;
        if (org && !orgMap.has(org.id)) {
          orgMap.set(org.id, org);
        }
      });

      setOrganizations(Array.from(orgMap.values()));
    };

    fetchOrganizations();
  }, [publicKey]);

  return (
    <div className="space-y-4">
      {organizations.map((org) => (
        <div
          key={org.id}
          onClick={() => onSelectOrganization(org)}
          className="cursor-pointer"
        >
          {org.name}
        </div>
      ))}
    </div>
  );
}