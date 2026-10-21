import { Router } from "express";

const userRouter = Router()

userRouter.get("/", (req, res) => {
    res.json({
        "userId": "123",
        "userName": "Jason",
        "userRole": "student"
    })
})

export default userRouter;