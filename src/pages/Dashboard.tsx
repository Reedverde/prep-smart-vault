import { PageContainer } from "@/components/PageContainer";
import { useUserSettings } from "@/hooks/useUserSettings";
import { Loader2 } from "lucide-react";
import { DashboardGrid } from "@/components/DashboardGrid";

const Dashboard = () => {
  const { settings, loading } = useUserSettings();

  if (loading || !settings) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-dim" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <DashboardGrid
        lat={settings.latitude}
        lng={settings.longitude}
        refreshMin={settings.refresh_interval_min || 10}
        locationName={settings.location_name}
      />
    </PageContainer>
  );
};

export default Dashboard;
