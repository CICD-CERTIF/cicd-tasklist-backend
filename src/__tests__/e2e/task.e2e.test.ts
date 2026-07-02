import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../app.ts";
import prisma from "../../lib/prisma.ts";

describe("Tasks API - End-to-End (E2E)", () => {
    
    // Avant chaque test, on nettoie notre base de données de test pour éviter les effets de bord
    beforeEach(async () => {
        await prisma.task.deleteMany({});
    });

    describe("Scénario CRUD Complet", () => {
        it("devrait orchestrer le cycle de vie complet d une tâche", async () => {
            
            // 1. POST : Création d'une tâche
            const createResponse = await request(app)
                .post("/api/tasks") 
                .send({
                    title: "Acheter le café pour l épreuve",
                    description: "Priorité haute"
                });

            expect(createResponse.status).toBe(201);
            expect(createResponse.body).toHaveProperty("id");
            expect(createResponse.body.title).toBe("Acheter le café pour l épreuve");
            const taskId = createResponse.body.id;

            // 2. GET ALL : Vérifier que la tâche est listée
            const getAllResponse = await request(app).get("/api/tasks");
            expect(getAllResponse.status).toBe(200);
            expect(getAllResponse.body.length).toBe(1);
            expect(getAllResponse.body[0].id).toBe(taskId);

            // 3. GET BY ID : Récupérer la tâche spécifiquement
            const getByIdResponse = await request(app).get(`/api/tasks/${taskId}`);
            expect(getByIdResponse.status).toBe(200);
            expect(getByIdResponse.body.title).toBe("Acheter le café pour l épreuve");

            // 4. PUT : Modifier le statut de la tâche (Passage à complété)
            const updateResponse = await request(app)
                .put(`/api/tasks/${taskId}`)
                .send({
                    completed: true
                });
            
            expect(updateResponse.status).toBe(200);
            expect(updateResponse.body.completed).toBe(true);

            // 5. DELETE : Supprimer la tâche
            const deleteResponse = await request(app).delete(`/api/tasks/${taskId}`);
            expect(deleteResponse.status).toBe(204);

            // 6. GET ALL FINAL : Vérifier que la liste est de nouveau vide
            const finalGetAll = await request(app).get("/api/tasks");
            expect(finalGetAll.body.length).toBe(0);
        });

        it("devrait rejeter la création si le titre est manquant (Validation)", async () => {
            const response = await request(app)
                .post("/api/tasks")
                .send({ description: "Sans titre" });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("error");
        });

        it("devrait renvoyer une erreur 404 si la tâche demandée n existe pas", async () => {
            const response = await request(app).get("/api/tasks/99999");
            expect(response.status).toBe(404);
        });
    });
});