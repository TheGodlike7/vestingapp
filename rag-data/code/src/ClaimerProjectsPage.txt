import { useEffect, useState } from "react";
import { supabase } from "./supabase";

type Project = {
  id: string;
  project_name: string;
  token_symbol: string;
};

export default function ClaimerProjectsPage({
  organizationId,
  onSelectProject,
}: {
  organizationId: string;
  onSelectProject: (project: Project) => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("vesting_projects")
      .select("id, project_name, token_symbol")
      .eq("organization_id", organizationId);

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    if (data) setProjects(data);
    setLoading(false);
  };

  run();
}, [organizationId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading projects...
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        No projects found in this organization
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {projects.map((project) => (
        <div
          key={project.id}
          onClick={() => onSelectProject(project)}
          className="project-card cursor-pointer"
        >
          <div>
            <h3 className="font-semibold text-foreground text-sm">
              {project.project_name}
            </h3>
            <p className="text-muted-foreground text-xs">
              {project.token_symbol}
            </p>
          </div>

          <button className="manage-btn text-sm">
            View →
          </button>
        </div>
      ))}
    </div>
  );
}