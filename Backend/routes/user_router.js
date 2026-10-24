import { Router } from "express";
import { checkPassword } from "../utils/crypto";
import { getUser } from "../test/test_database";

const userRouter = Router()

userRouter.post("/", async (req, res) => {
    const { name, email, password } = req.body;
    const userRecord = await getUser(name, email); // TODO

    if (!userRecord.id) {
        return res.status(401).json({
            success: false,
            message: 'No user with such credentials exist!'
        });
    }

    if (!(await checkPassword(password, userRecord.password))) {
        return res.status(401).json({
            success: false,
            message: 'Incorrect user credentials!'
        });
    }

    return res.status(200).json({
        id: userRecord.id,
        name: userRecord.name,
        role: userRecord.role,
        email: userRecord.email
    });
})

userRouter.get("/", (req, res) => {
    // TODO : return grievances posted by this user
})


export default userRouter;