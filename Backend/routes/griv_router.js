import { Router } from "express"

const grivRouter = Router();

grivRouter.get("/:id", (req, res) => {
    // TODO : Implement logic to fetch a grievance from database
})

grivRouter.put("/:id", (req, res) => {
    // TODO : Implement modify logic for a grievance
})

grivRouter.delete("/:id", (req, res) => {
    // TODO : Implement delete logic for a grievance
})

grivRouter.post("/create", (req, res) => {
    // TODO : Implement create logic for a grievance    
})

export default grivRouter;