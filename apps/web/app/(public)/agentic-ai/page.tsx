import type { ReactElement } from "react";
import { createApiConfiguration, readWebEnvironment } from "@/config";
import { PlanningChat } from "@/features/planning-chat";

const AgenticAiPage = (): ReactElement => {
  const api = createApiConfiguration(readWebEnvironment());
  return <PlanningChat apiBaseUrl={api.baseUrl} />;
};

export default AgenticAiPage;
