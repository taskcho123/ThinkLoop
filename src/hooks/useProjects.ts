import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { Project, ProjectStatus, Reflection } from "../types/project";
import { makeId } from "../utils/id";
import { todayLabel } from "../utils/date";

export function useProjects(setProjects: Dispatch<SetStateAction<Project[]>>) {
  const createProject = useCallback((
    project: Omit<Project, "id" | "createdAt" | "reflections" | "latestReflection" | "progress">,
  ) => {
    const progressByStatus: Record<ProjectStatus, number> = {
      Planning: 0,
      Progress: 35,
      Finished: 100,
    };

    setProjects((prev) => [
      {
        ...project,
        id: makeId("project"),
        progress: progressByStatus[project.status],
        latestReflection: "아직 회고가 없습니다.",
        createdAt: todayLabel(),
        reflections: [],
      },
      ...prev,
    ]);
  }, [setProjects]);

  const updateProjectStatus = useCallback((projectId: string, status: ProjectStatus) => {
    const progressByStatus: Record<ProjectStatus, number> = {
      Planning: 15,
      Progress: 65,
      Finished: 100,
    };
    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectId ? { ...project, status, progress: progressByStatus[status] } : project,
      ),
    );
  }, [setProjects]);

  const deleteProject = useCallback((projectId: string) => {
    setProjects((prev) => prev.filter((project) => project.id !== projectId));
  }, [setProjects]);

  const addReflection = useCallback((projectId: string, fields: Omit<Reflection, "id" | "date">) => {
    const newReflection: Reflection = {
      id: `r${Date.now()}`,
      date: todayLabel(),
      ...fields,
    };
    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectId
          ? {
              ...project,
              reflections: [newReflection, ...project.reflections],
              latestReflection: fields.reflection || fields.iDid,
            }
          : project,
      ),
    );
    return newReflection;
  }, [setProjects]);

  const deleteReflection = useCallback((projectId: string, reflectionId: string) => {
    setProjects((prev) =>
      prev.map((project) => {
        if (project.id !== projectId) return project;
        const reflections = project.reflections.filter((reflection) => reflection.id !== reflectionId);
        return {
          ...project,
          reflections,
          latestReflection: reflections[0]?.reflection || reflections[0]?.iDid || "아직 회고가 없습니다.",
        };
      }),
    );
  }, [setProjects]);

  return {
    createProject,
    updateProjectStatus,
    deleteProject,
    addReflection,
    deleteReflection,
  };
}
