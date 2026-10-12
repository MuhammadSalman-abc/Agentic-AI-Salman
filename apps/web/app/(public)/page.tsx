import type { ReactElement } from "react";
import { createApiConfiguration, readWebEnvironment } from "@/config";
import { WorkspaceFoundation } from "@/features/workspace-foundation";

const HomePage = (): ReactElement => {
  const api = createApiConfiguration(readWebEnvironment());
  return <WorkspaceFoundation apiBaseUrl={api.baseUrl} />;
};

export default HomePage;
