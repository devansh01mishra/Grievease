import { Router } from "express";

const deptRouter = Router()

deptRouter.get("/", (req, res) => {
    res.json({
        "deptId": "42",
        "deptName": "CSED"
    })
})

export default deptRouter;