import { beforeEach, describe, expect, it } from "vitest";
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

  it("replaceFromBackend drops stale in-memory SAL rows", () => {
    useSalWorkflowStore.setState({
      salDocuments: [
        {
          id: "sal_stale",
          projectId: "proj_1",
          title: "Stale",
          status: "draft",
          date: "2026-01-01",
          description: "",
          notes: "",
          lines: [],
        },
      ],
      projects: [{ id: "proj_old", name: "Old", description: "", client: "", year: 2025 }],
    });

    useSalWorkflowStore.getState().replaceFromBackend(
      [
        {
          id: "sal_fresh",
          projectId: "proj_1",
          title: "Fresh",
          status: "draft",
          date: "2026-02-01",
          description: "",
          notes: "",
          lines: [],
        },
      ],
      [{ id: "proj_1", name: "Fresh project", description: "", client: "", year: 2026 }],
    );

    const state = useSalWorkflowStore.getState();
    expect(state.salDocuments.map((doc) => doc.id)).toEqual(["sal_fresh"]);
    expect(state.projects.map((project) => project.id)).toEqual(["proj_1"]);
  });

  it("patchProjectSalFromBackend updates one project only", () => {
    useSalWorkflowStore.setState({
      salDocuments: [
        {
          id: "sal_a",
          projectId: "proj_a",
          title: "A",
          status: "draft",
          date: "2026-01-01",
          description: "",
          notes: "",
          lines: [],
        },
        {
          id: "sal_b_old",
          projectId: "proj_b",
          title: "B old",
          status: "draft",
          date: "2026-01-01",
          description: "",
          notes: "",
          lines: [],
        },
      ],
      projects: [],
    });

    useSalWorkflowStore.getState().patchProjectSalFromBackend(
      "proj_b",
      [
        {
          id: "sal_b_new",
          projectId: "proj_b",
          title: "B new",
          status: "draft",
          date: "2026-03-01",
          description: "",
          notes: "",
          lines: [],
        },
      ],
      [{ id: "proj_b", name: "B", description: "", client: "", year: 2026 }],
    );

    const ids = useSalWorkflowStore
      .getState()
      .salDocuments.map((doc) => doc.id)
      .sort();
    expect(ids).toEqual(["sal_a", "sal_b_new"]);
  });
});
