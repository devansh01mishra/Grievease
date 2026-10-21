import { Router } from "express";

const sysaRouter = Router()

sysaRouter.get("/", (req, res) => {
    res.send("THIS IS ADMIN")
})

export default sysaRouter;