import { Router } from "express"

const grivRouter = Router();

grivRouter.get("/:id", (req, res) => {
    const grievance = getGrievanceById(id);
})

export default grivRouter;