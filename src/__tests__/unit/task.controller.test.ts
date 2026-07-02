import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import type { Task } from "@prisma/client";

// Mock the service module
vi.mock("../../services/task.service.js", () => ({
  findAll: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

import * as taskService from "../../services/task.service.js";
import * as taskController from "../../controllers/task.controller.js";

const mockService = vi.mocked(taskService);

const mockTask: Task = {
  id: 1,
  title: "Test Task",
  description: "Test description",
  completed: false,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

function createMockResponse(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    params: {},
    body: {},
    query: {},
    ...overrides,
  } as unknown as Request;
}

describe("TaskController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAllTasks", () => {
    it("should return 200 with all tasks", async () => {
      const tasks = [mockTask];
      mockService.findAll.mockResolvedValue(tasks);
      const req = createMockRequest();
      const res = createMockResponse();

      await taskController.getAllTasks(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(tasks);
    });
  });

  describe("getTaskById", () => {
    it("should return 200 with task", async () => {
      const task = mockTask;
      mockService.findById.mockResolvedValue(task);
      const req = createMockRequest({ params: { id: task.id.toString() } });
      const res = createMockResponse();

      await taskController.getTaskById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(task)
    });

    it("should return 400 for invalid id", async () => {
      const req = createMockRequest({ params: { id: "abc" } });
      const res = createMockResponse();

      await taskController.getTaskById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid task ID" });
    });

    it("should return 404 when task not found", async () => {
      mockService.findById.mockResolvedValue(null);
      const req = createMockRequest({ params: { id: "999" } });
      const res = createMockResponse();

      await taskController.getTaskById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Task not found" });
    });

    it("should return 500 on service error", async () => {
      mockService.findById.mockRejectedValue(new Error("DB error"));
      const req = createMockRequest({ params: { id: "1" } });
      const res = createMockResponse();

      await taskController.getTaskById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch task" });
    });
  });

  describe("createTask", () => {
    it("should return 201 with created task", async () => {
      const newTask = { ...mockTask, id: 2, title: "New Task", description: "New desc" };
      mockService.create.mockResolvedValue(newTask);
      const req = createMockRequest({ body: { title: "New Task", description: "New desc" } });
      const res = createMockResponse();

      await taskController.createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(newTask);
      expect(mockService.create).toHaveBeenCalledWith({ title: "New Task", description: "New desc" });
    });

    it("should return 201 with created task and no description", async () => {
      const newTask = { ...mockTask, id: 2, title: "New Task", description: null };
      mockService.create.mockResolvedValue(newTask);
      const req = createMockRequest({ body: { title: "New Task" } });
      const res = createMockResponse();

      await taskController.createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(newTask);
      expect(mockService.create).toHaveBeenCalledWith({ title: "New Task", description: undefined });
    });

    it("should return 400 when title is missing", async () => {
      const req = createMockRequest({ body: { description: "desc" } });
      const res = createMockResponse();

      await taskController.createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Title is required and must be a non-empty string" });
    });

    it("should return 400 when title is empty string", async () => {
      const req = createMockRequest({ body: { title: "" } });
      const res = createMockResponse();

      await taskController.createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Title is required and must be a non-empty string" });
    });

    it("should return 400 when title is not a string", async () => {
      const req = createMockRequest({ body: { title: 123 } });
      const res = createMockResponse();

      await taskController.createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Title is required and must be a non-empty string" });
    });

    it("should return 500 on service error", async () => {
      mockService.create.mockRejectedValue(new Error("DB error"));
      const req = createMockRequest({ body: { title: "Task" } });
      const res = createMockResponse();

      await taskController.createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to create task" });
    });
  });

  describe("updateTask", () => {
    it("should return 200 with updated task", async () => {
      const updatedTask = { ...mockTask, title: "Updated", completed: true };
      mockService.update.mockResolvedValue(updatedTask);
      const req = createMockRequest({
        params: { id: "1" },
        body: { title: "Updated", completed: true },
      });
      const res = createMockResponse();

      await taskController.updateTask(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(updatedTask);
    });

    it("should return 400 for invalid id", async () => {
      const req = createMockRequest({ params: { id: "abc" }, body: { title: "Updated" } });
      const res = createMockResponse();

      await taskController.updateTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid task ID" });
    });

    it("should return 404 when task not found", async () => {
      mockService.update.mockRejectedValue(new Error("Task not found"));
      const req = createMockRequest({ params: { id: "999" }, body: { title: "Updated" } });
      const res = createMockResponse();

      await taskController.updateTask(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Task not found" });
    });

    it("should return 500 on service error", async () => {
      mockService.update.mockRejectedValue(new Error("DB error"));
      const req = createMockRequest({ params: { id: "1" }, body: { title: "Updated" } });
      const res = createMockResponse();

      await taskController.updateTask(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to update task" });
    });
  });

  describe("deleteTask", () => {
    it("should return 204 on successful delete", async () => {
      mockService.remove.mockResolvedValue(mockTask);
      const req = createMockRequest({ params: { id: "1" } });
      const res = createMockResponse();

      await taskController.deleteTask(req, res);

      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it("should return 400 for invalid id", async () => {
      const req = createMockRequest({ params: { id: "abc" } });
      const res = createMockResponse();

      await taskController.deleteTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid task ID" });
    });

    it("should return 404 when task not found", async () => {
      mockService.remove.mockRejectedValue(new Error("Task not found"));
      const req = createMockRequest({ params: { id: "999" } });
      const res = createMockResponse();

      await taskController.deleteTask(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Task not found" });
    });

    it("should return 500 on service error", async () => {
      mockService.remove.mockRejectedValue(new Error("DB error"));
      const req = createMockRequest({ params: { id: "1" } });
      const res = createMockResponse();

      await taskController.deleteTask(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to delete task" });
    });
  });
});