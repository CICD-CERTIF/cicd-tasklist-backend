import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import type { Task } from "@prisma/client";

// Mock complet du module de service
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
        // Empêche la pollution des logs de la console pendant l'exécution des tests d'erreurs 500
        vi.spyOn(console, 'error').mockImplementation(() => {});
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

        it("should return 500 when service throws an error", async () => {
            mockService.findAll.mockRejectedValue(new Error("Database connection failure"));
            const req = createMockRequest();
            const res = createMockResponse();

            await taskController.getAllTasks(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch tasks" });
        });
    });

    describe("getTaskById", () => {
        it("should return 200 with the requested task if ID is valid", async () => {
            mockService.findById.mockResolvedValue(mockTask);
            const req = createMockRequest({ params: { id: "1" } });
            const res = createMockResponse();

            await taskController.getTaskById(req, res);

            expect(mockService.findById).toHaveBeenCalledWith(1);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockTask);
        });

        it("should return 400 if ID is not a valid number", async () => {
            const req = createMockRequest({ params: { id: "not-a-number" } });
            const res = createMockResponse();

            await taskController.getTaskById(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: "Invalid task ID" });
        });

        it("should return 404 if the task is not found", async () => {
            mockService.findById.mockResolvedValue(null);
            const req = createMockRequest({ params: { id: "999" } });
            const res = createMockResponse();

            await taskController.getTaskById(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: "Task not found" });
        });

        it("should return 500 when service fails", async () => {
            mockService.findById.mockRejectedValue(new Error("Internal error"));
            const req = createMockRequest({ params: { id: "1" } });
            const res = createMockResponse();

            await taskController.getTaskById(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch task" });
        });
    });

    describe("createTask", () => {
        it("should return 201 with the created task when payload is valid", async () => {
            mockService.create.mockResolvedValue(mockTask);
            const req = createMockRequest({ body: { title: "Test Task", description: "Test description" } });
            const res = createMockResponse();

            await taskController.createTask(req, res);

            expect(mockService.create).toHaveBeenCalledWith({ title: "Test Task", description: "Test description" });
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(mockTask);
        });

        it("should default description to undefined if missing in request body", async () => {
            mockService.create.mockResolvedValue(mockTask);
            const req = createMockRequest({ body: { title: "Test Task" } });
            const res = createMockResponse();

            await taskController.createTask(req, res);

            expect(mockService.create).toHaveBeenCalledWith({ title: "Test Task", description: undefined });
            expect(res.status).toHaveBeenCalledWith(201);
        });

        it("should return 400 if title is missing", async () => {
            const req = createMockRequest({ body: { description: "Missing title" } });
            const res = createMockResponse();

            await taskController.createTask(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: "Title is required and must be a non-empty string" });
        });

        it("should return 400 if title is an empty string or spaces", async () => {
            const req = createMockRequest({ body: { title: "   " } });
            const res = createMockResponse();

            await taskController.createTask(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it("should return 500 when database insertion fails", async () => {
            mockService.create.mockRejectedValue(new Error("Failed to persist"));
            const req = createMockRequest({ body: { title: "Valid Title" } });
            const res = createMockResponse();

            await taskController.createTask(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: "Failed to create task" });
        });
    });

    describe("updateTask", () => {
        it("should return 200 with updated task details if input is valid", async () => {
            mockService.update.mockResolvedValue(mockTask);
            const req = createMockRequest({ params: { id: "1" }, body: { title: "New Title", completed: true } });
            const res = createMockResponse();

            await taskController.updateTask(req, res);

            expect(mockService.update).toHaveBeenCalledWith(1, { title: "New Title", description: undefined, completed: true });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockTask);
        });

        it("should return 400 during update if ID is invalid", async () => {
            const req = createMockRequest({ params: { id: "bad-id" } });
            const res = createMockResponse();

            await taskController.updateTask(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it("should return 404 if service throws 'Task not found' error", async () => {
            mockService.update.mockRejectedValue(new Error("Task not found"));
            const req = createMockRequest({ params: { id: "1" }, body: { title: "Ghost Task" } });
            const res = createMockResponse();

            await taskController.updateTask(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: "Task not found" });
        });

        it("should return 500 for generic unexpected update errors", async () => {
            mockService.update.mockRejectedValue(new Error("Unknown server error"));
            const req = createMockRequest({ params: { id: "1" }, body: { title: "Title" } });
            const res = createMockResponse();

            await taskController.updateTask(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: "Failed to update task" });
        });
    });

    describe("deleteTask", () => {
        it("should return 204 with no content upon successful removal", async () => {
            mockService.remove.mockResolvedValue(mockTask);
            const req = createMockRequest({ params: { id: "1" } });
            const res = createMockResponse();

            await taskController.deleteTask(req, res);

            expect(mockService.remove).toHaveBeenCalledWith(1);
            expect(res.status).toHaveBeenCalledWith(204);
            expect(res.send).toHaveBeenCalled();
        });

        it("should return 400 during deletion if ID is invalid", async () => {
            const req = createMockRequest({ params: { id: "invalid" } });
            const res = createMockResponse();

            await taskController.deleteTask(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it("should return 404 if the task to delete does not exist", async () => {
            mockService.remove.mockRejectedValue(new Error("Task not found"));
            const req = createMockRequest({ params: { id: "404" } });
            const res = createMockResponse();

            await taskController.deleteTask(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: "Task not found" });
        });

        it("should return 500 if deletion encounters a generic error", async () => {
            mockService.remove.mockRejectedValue(new Error("Hardware fault"));
            const req = createMockRequest({ params: { id: "1" } });
            const res = createMockResponse();

            await taskController.deleteTask(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: "Failed to delete task" });
        });
    });
});