import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { vi } from "vitest";
import testPrisma from "./setup.js";

// Mock the prisma singleton to use the test client
vi.mock("../../lib/prisma.js", () => ({
  default: testPrisma,
}));

// Import app AFTER mocking prisma
const { default: app } = await import("../../app.js");
import request from "supertest";

describe("Task API E2E Tests", () => {
  beforeEach(async () => {
    // Clean up database between tests
    await testPrisma.task.deleteMany();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  describe("POST /api/tasks", () => {
    it("should create a new task", async () => {
      const res = await request(app)
        .post("/api/tasks")
        .send({ title: "E2E Task", description: "E2E Description" });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.title).toBe("E2E Task");
      expect(res.body.description).toBe("E2E Description");
      expect(res.body.completed).toBe(false);
    });
  });

  describe("POST /api/tasks", () => {
    it("should return 400 when title is missing", async () => {
      const res = await request(app)
        .post("/api/tasks")
        .send({ description: "No title" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Title is required and must be a non-empty string");
    });

    it("should return 400 when title is empty", async () => {
      const res = await request(app)
        .post("/api/tasks")
        .send({ title: "" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Title is required and must be a non-empty string");
    });

    it("should create a task without description", async () => {
      const res = await request(app)
        .post("/api/tasks")
        .send({ title: "No Description" });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe("No Description");
      expect(res.body.description).toBeNull();
    });
  });

  describe("GET /api/tasks", () => {
    it("should return an empty array when no tasks exist", async () => {
      const res = await request(app).get("/api/tasks");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("should return all tasks ordered by createdAt desc", async () => {
      const t1 = (await request(app).post("/api/tasks").send({ title: "First" })).body;
      const t2 = (await request(app).post("/api/tasks").send({ title: "Second" })).body;

      const res = await request(app).get("/api/tasks");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe("Second");
      expect(res.body[1].title).toBe("First");
    });
  });

  describe("GET /api/tasks/:id", () => {
    it("should return a task by id", async () => {
      const created = (await request(app).post("/api/tasks").send({ title: "Find Me" })).body;

      const res = await request(app).get(`/api/tasks/${created.id}`);

      expect(res.status).toBe(200);
      expect(res.body.title).toBe("Find Me");
    });

    it("should return 400 for invalid id", async () => {
      const res = await request(app).get("/api/tasks/abc");

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid task ID");
    });

    it("should return 404 when task not found", async () => {
      const res = await request(app).get("/api/tasks/99999");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Task not found");
    });
  });

  describe("PUT /api/tasks/:id", () => {
    it("should update a task", async () => {
      const created = (await request(app).post("/api/tasks").send({ title: "Before" })).body;

      const res = await request(app)
        .put(`/api/tasks/${created.id}`)
        .send({ title: "After", completed: true });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe("After");
      expect(res.body.completed).toBe(true);
    });

    it("should return 400 for invalid id", async () => {
      const res = await request(app)
        .put("/api/tasks/abc")
        .send({ title: "Nope" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid task ID");
    });

    it("should return 404 when task not found", async () => {
      const res = await request(app)
        .put("/api/tasks/99999")
        .send({ title: "Nope" });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Task not found");
    });
  });

  describe("DELETE /api/tasks/:id", () => {
    it("should delete a task", async () => {
      const created = (await request(app).post("/api/tasks").send({ title: "Delete Me" })).body;

      const res = await request(app).delete(`/api/tasks/${created.id}`);

      expect(res.status).toBe(204);
    });

    it("should return 400 for invalid id", async () => {
      const res = await request(app).delete("/api/tasks/abc");

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid task ID");
    });

    it("should return 404 when task not found", async () => {
      const res = await request(app).delete("/api/tasks/99999");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Task not found");
    });
  });
});