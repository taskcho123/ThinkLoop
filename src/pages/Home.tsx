import type { DevRecord, Insight } from "../types/blog";
import type { UserProfile } from "../types/app";
import type { Project } from "../types/project";

export interface HomePageProps {
  profile: UserProfile;
  projects: Project[];
  insights: Insight[];
  devRecords: DevRecord[];
  onGoToProject: (project: Project) => void;
  onGoToInsight: () => void;
  onSelectInsight: (insight: Insight) => void;
  onWriteDevRecord: () => void;
  onSelectDevRecord: (record: DevRecord) => void;
}

export type HomePageComponent = (props: HomePageProps) => JSX.Element;
