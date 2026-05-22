import { describe, it, expect, beforeEach } from "vitest";
import { useSalWorkflowStore } from "../sal-workflow-store";

describe("sal-workflow-store", () => {
  beforeEach(() => {
    localStorage.clear();
    useSalWorkflowStore.setState({
      salDocuments: [],
      projects: [],
      tariffVoices: [],
      activeProjectId: "",
      activeSalId: "",
    });
  });

  it("initializes with empty state", () => {
    const state = useSalWorkflowStore.getState();
    expect(state.salDocuments).toEqual([]);
    expect(state.activeProjectId).toBe("");
    expect(state.activeSalId).toBe("");
  });

  it("sets active project", () => {
    useSalWorkflowStore.getState().setActiveProject("proj_1");
    expect(useSalWorkflowStore.getState().activeProjectId).toBe("proj_1");
  });

  it("sets active SAL", () => {
    const docs = [
      {
        id: "sal_1",
        projectId: "proj_1",
        title: "SAL 1",
        status: "draft" as const,
        lines: [],
        date: "2026-01-01",
        description: "",
        notes: "",
      },
    ];
    useSalWorkflowStore.setState({ salDocuments: docs });
    useSalWorkflowStore.getState().setActiveSal("sal_1");
    expect(useSalWorkflowStore.getState().activeSalId).toBe("sal_1");
    expect(useSalWorkflowStore.getState().activeProjectId).toBe("proj_1");
  });

  it("initializes from backend documents", () => {
    const docs = [
      {
        id: "sal_1",
        projectId: "proj_1",
        title: "SAL 1",
        status: "draft" as const,
        date: "2026-01-01",
        description: "",
        notes: "",
        lines: [],
      },
      {
        id: "sal_2",
        projectId: "proj_1",
        title: "SAL 2",
        status: "closed" as const,
        date: "2026-02-01",
        closedAt: "2026-02-15",
        description: "",
        notes: "",
        lines: [],
      },
    ];
    useSalWorkflowStore.getState().initializeFromBackend(docs, [], []);
    expect(useSalWorkflowStore.getState().salDocuments.length).toBe(2);
  });

  it("preserves cached tariff voices when backend init has no voices", () => {
    useSalWorkflowStore.setState({
      tariffVoices: [
        {
          category: "RFI",
          code: "AC.IR.A.2001.A",
          description: "Voce salvata",
          id: "voice_1",
          projectYear: 2026,
          unit: "CAD",
          unitPrice: 100,
        },
      ],
    });

    useSalWorkflowStore.getState().initializeFromBackend([], [], []);

    expect(useSalWorkflowStore.getState().tariffVoices).toHaveLength(1);
    expect(useSalWorkflowStore.getState().tariffVoices[0]?.id).toBe("voice_1");
  });

  it("selects document by ID after init", () => {
    const docs = [
      {
        id: "sal_1",
        projectId: "proj_1",
        title: "SAL 1",
        status: "draft" as const,
        date: "2026-01-01",
        description: "",
        notes: "",
        lines: [],
      },
      {
        id: "sal_2",
        projectId: "proj_1",
        title: "SAL 2",
        status: "closed" as const,
        date: "2026-02-01",
        closedAt: "2026-02-15",
        description: "",
        notes: "",
        lines: [],
      },
    ];
    useSalWorkflowStore.getState().initializeFromBackend(docs, [], []);
    const doc = useSalWorkflowStore.getState().salDocuments.find((d) => d.id === "sal_2");
    expect(doc).toBeDefined();
    expect(doc?.status).toBe("closed");
  });

  it("creates a new SAL", () => {
    const sal = useSalWorkflowStore.getState().createSal({
      projectId: "proj_1",
      date: "2026-03-01",
      description: "Test SAL",
      notes: "",
      title: "SAL 3",
    });
    expect(sal.id).toContain("sal_");
    expect(sal.status).toBe("draft");
    expect(sal.title).toBe("SAL 3");
    expect(useSalWorkflowStore.getState().salDocuments.length).toBe(1);
  });

  it("closes a SAL", () => {
    const sal = useSalWorkflowStore.getState().createSal({
      projectId: "proj_1",
      date: "2026-03-01",
      description: "",
      notes: "",
      title: "SAL 3",
    });
    useSalWorkflowStore.getState().closeSal(sal.id);
    const closed = useSalWorkflowStore.getState().salDocuments.find((d) => d.id === sal.id);
    expect(closed?.status).toBe("closed");
    expect(closed?.closedAt).toBeDefined();
  });

  it("creates a project", () => {
    const project = useSalWorkflowStore.getState().createProject({
      name: "Project 1",
      description: "",
      client: "ACME",
      year: 2026,
    });
    expect(project.id).toContain("project_");
    expect(project.name).toBe("Project 1");
    expect(useSalWorkflowStore.getState().projects.length).toBe(1);
  });
});
