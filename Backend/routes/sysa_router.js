import { Router } from "express";
import { sysUserController } from "../controllers/sysa_contr";

const sysaRouter = Router()

sysaRouter.post("/", async (req, res) => {
    const { name, email, password, role } = req.body;
    const adminRecord = await getAdmin(name, email, password, role); // TODO

    if (!adminRecord == undefined) {
        return res.status(401).json({
            success: false,
            message: 'Failed admin login!'
        });
    }

    return res.json({
        id: adminRecord.id,
        name: adminRecord.name,
        role: adminRecord.role,
        email: adminRecord.email
    });
})

sysaRouter.get("/users", async (req, res) => {
    return getUsers();
})

sysaRouter.post("/users", async (req, res) => {
    return sysUserController(res, req.body.newUsers, createUser, "create")
})

sysaRouter.put("/users", async (req, res) => {
    return sysUserController(res, req.body.editUsers, editUser, "edit")
})

sysaRouter.delete("/users", async (req, res) => {
    return sysUserController(res, req.body.deleteUsers, deleteUser, "delete")
})

export default sysaRouter;