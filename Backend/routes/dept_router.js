import { Router } from "express";

const deptRouter = Router()

deptRouter.get("/", (req, res) => {
    res.json({
        "deptId": "42",
        "deptName": "CSED"
    })
})

deptRouter.post("/", (req, res) => {
      
})

export default deptRouter;