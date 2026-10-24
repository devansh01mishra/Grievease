import { Router } from "express";

const userRouter = Router()

userRouter.get("/", (req, res) => {
    res.json({
        "userId": "123",
        "userName": "Jason",
        "userRole": "student"
    })
})

userRouter.post("/", (req, res) => {
      const { name, id, password, position } = req.body;
      const hashPassword = hash()
})

export default userRouter;